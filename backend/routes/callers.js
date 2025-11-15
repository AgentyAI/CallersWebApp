import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all caller profiles (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    let callers = [];

    if (pool) {
      try {
        const result = await pool.query(`
          SELECT 
            u.id,
            u.email,
            u.name,
            u.role,
            u.created_at,
            COUNT(DISTINCT l.id) as leads_count,
            COUNT(DISTINCT cs.script_id) as scripts_count
          FROM users u
          LEFT JOIN leads l ON u.id = l.assigned_caller_id
          LEFT JOIN caller_scripts cs ON u.id = cs.caller_id
          WHERE u.role = 'caller'
          GROUP BY u.id, u.email, u.name, u.role, u.created_at
          ORDER BY u.name, u.email
        `);
        callers = result.rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (callers.length === 0 && supabase) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('role', 'caller')
        .order('name');

      if (usersError) throw usersError;

      // Get leads count and scripts count for each caller
      const callersWithCounts = await Promise.all(
        (users || []).map(async (user) => {
          const [leadsResult, scriptsResult] = await Promise.all([
            supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_caller_id', user.id),
            supabase.from('caller_scripts').select('script_id', { count: 'exact', head: true }).eq('caller_id', user.id)
          ]);

          return {
            ...user,
            leads_count: leadsResult.count || 0,
            scripts_count: scriptsResult.count || 0
          };
        })
      );

      callers = callersWithCounts;
    }

    res.json(callers);
  } catch (error) {
    console.error('Error fetching callers:', error);
    res.status(500).json({ error: 'Error fetching callers: ' + error.message });
  }
});

// Get single caller profile with assigned scripts and leads (admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { id } = req.params;
    let caller = null;
    let scripts = [];
    let leads = [];

    if (pool) {
      try {
        // Get caller info
        const callerResult = await pool.query(
          'SELECT id, email, name, role, created_at FROM users WHERE id = $1 AND role = $2',
          [id, 'caller']
        );

        if (callerResult.rows.length === 0) {
          return res.status(404).json({ error: 'Caller not found' });
        }

        caller = callerResult.rows[0];

        // Get assigned scripts
        const scriptsResult = await pool.query(`
          SELECT s.* FROM scripts s
          INNER JOIN caller_scripts cs ON s.id = cs.script_id
          WHERE cs.caller_id = $1
          ORDER BY s.specialty
        `, [id]);
        scripts = scriptsResult.rows;

        // Get assigned leads count
        const leadsResult = await pool.query(
          'SELECT COUNT(*) as count FROM leads WHERE assigned_caller_id = $1',
          [id]
        );
        leads = [{ count: parseInt(leadsResult.rows[0].count) }];
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!caller && supabase) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('id', id)
        .eq('role', 'caller')
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Caller not found' });
        }
        throw userError;
      }

      caller = user;

      // Get assigned scripts
      const { data: scriptAssignments, error: scriptsError } = await supabase
        .from('caller_scripts')
        .select('script_id')
        .eq('caller_id', id);

      if (scriptsError) throw scriptsError;

      if (scriptAssignments && scriptAssignments.length > 0) {
        const scriptIds = scriptAssignments.map(sa => sa.script_id);
        const { data: scriptsData, error: scriptsDataError } = await supabase
          .from('scripts')
          .select('*')
          .in('id', scriptIds)
          .order('specialty');

        if (scriptsDataError) throw scriptsDataError;
        scripts = scriptsData || [];
      }

      // Get assigned leads count
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_caller_id', id);

      leads = [{ count: count || 0 }];
    }

    res.json({
      ...caller,
      scripts,
      leads_count: leads[0]?.count || 0
    });
  } catch (error) {
    console.error('Error fetching caller:', error);
    res.status(500).json({ error: 'Error fetching caller: ' + error.message });
  }
});

// Create or update caller profile (admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase, supabaseService } = req.app.locals;
    const { email, name, password, script_ids, lead_ids, lead_categories } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let caller = null;

    if (pool) {
      try {
        // Check if user exists
        const { rows: existingRows } = await pool.query(
          'SELECT id, role FROM users WHERE email = $1',
          [email]
        );

        if (existingRows.length > 0) {
          // Update existing user
          if (existingRows[0].role !== 'caller') {
            return res.status(400).json({ error: 'User exists but is not a caller' });
          }

          await pool.query(
            'UPDATE users SET name = $1 WHERE id = $2',
            [name || null, existingRows[0].id]
          );

          caller = { id: existingRows[0].id, email, name: name || null };
        } else {
          // Create new caller with password
          if (!password) {
            return res.status(400).json({ error: 'Password is required for new callers' });
          }

          // Create user in Supabase Auth first
          if (!supabaseService) {
            return res.status(500).json({ error: 'Supabase service client not available' });
          }

          const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
            email,
            password,
            email_confirm: true
          });

          if (authError) {
            return res.status(400).json({ error: `Failed to create auth user: ${authError.message}` });
          }

          // Create user record in database
          const { rows: newUserRows } = await pool.query(
            'INSERT INTO users (id, email, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
            [authUser.user.id, email, name || null, 'caller']
          );

          caller = newUserRows[0];
        }

        // Assign scripts
        if (script_ids && Array.isArray(script_ids)) {
          // Remove existing assignments
          await pool.query('DELETE FROM caller_scripts WHERE caller_id = $1', [caller.id]);
          
          // Add new assignments
          for (const scriptId of script_ids) {
            await pool.query(
              'INSERT INTO caller_scripts (caller_id, script_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [caller.id, scriptId]
            );
          }
        }

        // Assign leads by category or individual IDs
        if (lead_categories && (lead_categories.specialties?.length > 0 || lead_categories.statuses?.length > 0)) {
          let query = 'UPDATE leads SET assigned_caller_id = $1 WHERE 1=1';
          const params = [caller.id];
          let paramCount = 2;

          if (lead_categories.specialties?.length > 0) {
            query += ` AND specialty = ANY($${paramCount++})`;
            params.push(lead_categories.specialties);
          }

          if (lead_categories.statuses?.length > 0) {
            query += ` AND status = ANY($${paramCount++})`;
            params.push(lead_categories.statuses);
          }

          await pool.query(query, params);
        } else if (lead_ids && Array.isArray(lead_ids)) {
          for (const leadId of lead_ids) {
            await pool.query(
              'UPDATE leads SET assigned_caller_id = $1 WHERE id = $2',
              [caller.id, leadId]
            );
          }
        }
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!caller && supabase) {
      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (existingUser) {
        if (existingUser.role !== 'caller') {
          return res.status(400).json({ error: 'User exists but is not a caller' });
        }

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ name: name || null })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        caller = updatedUser;
      } else {
        // Create new caller with password
        if (!password) {
          return res.status(400).json({ error: 'Password is required for new callers' });
        }

        // Create user in Supabase Auth first
        const supabaseService = req.app.locals.supabaseService;
        if (!supabaseService) {
          return res.status(500).json({ error: 'Supabase service client not available' });
        }

        const { data: authUser, error: authError } = await supabaseService.auth.admin.createUser({
          email,
          password,
          email_confirm: true
        });

        if (authError) {
          return res.status(400).json({ error: `Failed to create auth user: ${authError.message}` });
        }

        // Create user record in database
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.user.id,
            email,
            name: name || null,
            role: 'caller'
          })
          .select()
          .single();

        if (insertError) throw insertError;
        caller = newUser;
      }

      // Assign scripts
      if (script_ids && Array.isArray(script_ids)) {
        // Remove existing assignments
        await supabase.from('caller_scripts').delete().eq('caller_id', caller.id);
        
        // Add new assignments
        if (script_ids.length > 0) {
          const assignments = script_ids.map(scriptId => ({
            caller_id: caller.id,
            script_id: scriptId
          }));

          const { error: assignError } = await supabase
            .from('caller_scripts')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      // Assign leads by category or individual IDs
      if (lead_categories && (lead_categories.specialties?.length > 0 || lead_categories.statuses?.length > 0)) {
        // Build filter conditions
        let query = supabase.from('leads').select('id');
        
        const conditions = [];
        if (lead_categories.specialties?.length > 0) {
          conditions.push(`specialty.in.(${lead_categories.specialties.join(',')})`);
        }
        if (lead_categories.statuses?.length > 0) {
          conditions.push(`status.in.(${lead_categories.statuses.join(',')})`);
        }

        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        const { data: matchingLeads, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        if (matchingLeads && matchingLeads.length > 0) {
          const leadIds = matchingLeads.map(l => l.id);
          const { error: updateError } = await supabase
            .from('leads')
            .update({ assigned_caller_id: caller.id })
            .in('id', leadIds);

          if (updateError) throw updateError;
        }
      } else if (lead_ids && Array.isArray(lead_ids)) {
        for (const leadId of lead_ids) {
          const { error: leadError } = await supabase
            .from('leads')
            .update({ assigned_caller_id: caller.id })
            .eq('id', leadId);

          if (leadError) throw leadError;
        }
      }
    }

    res.json(caller);
  } catch (error) {
    console.error('Error saving caller:', error);
    res.status(500).json({ error: 'Error saving caller: ' + error.message });
  }
});

// Update caller profile (admin only)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { id } = req.params;
    const { name, script_ids, lead_ids, lead_categories } = req.body;

    if (pool) {
      try {
        // Update caller info
        if (name !== undefined) {
          await pool.query(
            'UPDATE users SET name = $1 WHERE id = $2 AND role = $3',
            [name, id, 'caller']
          );
        }

        // Update script assignments
        if (script_ids !== undefined && Array.isArray(script_ids)) {
          await pool.query('DELETE FROM caller_scripts WHERE caller_id = $1', [id]);
          
          for (const scriptId of script_ids) {
            await pool.query(
              'INSERT INTO caller_scripts (caller_id, script_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [id, scriptId]
            );
          }
        }

        // Update lead assignments by category or individual IDs
        if (lead_categories && (lead_categories.specialties?.length > 0 || lead_categories.statuses?.length > 0)) {
          let query = 'UPDATE leads SET assigned_caller_id = $1 WHERE 1=1';
          const params = [id];
          let paramCount = 2;

          if (lead_categories.specialties?.length > 0) {
            query += ` AND specialty = ANY($${paramCount++})`;
            params.push(lead_categories.specialties);
          }

          if (lead_categories.statuses?.length > 0) {
            query += ` AND status = ANY($${paramCount++})`;
            params.push(lead_categories.statuses);
          }

          await pool.query(query, params);
        } else if (lead_ids !== undefined && Array.isArray(lead_ids)) {
          for (const leadId of lead_ids) {
            await pool.query(
              'UPDATE leads SET assigned_caller_id = $1 WHERE id = $2',
              [id, leadId]
            );
          }
        }

        const { rows } = await pool.query(
          'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
          [id]
        );

        if (rows.length === 0) {
          return res.status(404).json({ error: 'Caller not found' });
        }

        res.json(rows[0]);
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (supabase) {
      // Update caller info
      if (name !== undefined) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ name })
          .eq('id', id)
          .eq('role', 'caller');

        if (updateError) throw updateError;
      }

      // Update script assignments
      if (script_ids !== undefined && Array.isArray(script_ids)) {
        await supabase.from('caller_scripts').delete().eq('caller_id', id);
        
        if (script_ids.length > 0) {
          const assignments = script_ids.map(scriptId => ({
            caller_id: id,
            script_id: scriptId
          }));

          const { error: assignError } = await supabase
            .from('caller_scripts')
            .insert(assignments);

          if (assignError) throw assignError;
        }
      }

      // Update lead assignments by category or individual IDs
      if (lead_categories && (lead_categories.specialties?.length > 0 || lead_categories.statuses?.length > 0)) {
        // Build query for matching leads
        const conditions = [];
        if (lead_categories.specialties?.length > 0) {
          conditions.push(`specialty.in.(${lead_categories.specialties.join(',')})`);
        }
        if (lead_categories.statuses?.length > 0) {
          conditions.push(`status.in.(${lead_categories.statuses.join(',')})`);
        }

        if (conditions.length > 0) {
          const { data: matchingLeads, error: fetchError } = await supabase
            .from('leads')
            .select('id')
            .or(conditions.join(','));

          if (fetchError) throw fetchError;

          if (matchingLeads && matchingLeads.length > 0) {
            const leadIds = matchingLeads.map(l => l.id);
            const { error: updateError } = await supabase
              .from('leads')
              .update({ assigned_caller_id: id })
              .in('id', leadIds);

            if (updateError) throw updateError;
          }
        }
      } else if (lead_ids !== undefined && Array.isArray(lead_ids)) {
        for (const leadId of lead_ids) {
          const { error: leadError } = await supabase
            .from('leads')
            .update({ assigned_caller_id: id })
            .eq('id', leadId);

          if (leadError) throw leadError;
        }
      }

      const { data: caller, error: fetchError } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('id', id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Caller not found' });
        }
        throw fetchError;
      }

      res.json(caller);
    }
  } catch (error) {
    console.error('Error updating caller:', error);
    res.status(500).json({ error: 'Error updating caller: ' + error.message });
  }
});

// Get available scripts for assignment
router.get('/:id/available-scripts', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    let scripts = [];

    if (pool) {
      try {
        const result = await pool.query('SELECT * FROM scripts ORDER BY specialty');
        scripts = result.rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    if (scripts.length === 0 && supabase) {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .order('specialty');

      if (error) throw error;
      scripts = data || [];
    }

    res.json(scripts);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Error fetching scripts: ' + error.message });
  }
});

// Get available leads for assignment
router.get('/:id/available-leads', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    let leads = [];

    if (pool) {
      try {
        const result = await pool.query(
          'SELECT id, full_name, specialty, status FROM leads ORDER BY full_name'
        );
        leads = result.rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    if (leads.length === 0 && supabase) {
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, specialty, status')
        .order('full_name');

      if (error) throw error;
      leads = data || [];
    }

    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Error fetching leads: ' + error.message });
  }
});

export default router;


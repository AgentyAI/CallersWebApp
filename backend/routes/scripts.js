import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get script by specialty
router.get('/:specialty', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { specialty } = req.params;

    let script = null;

    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT * FROM scripts WHERE specialty = $1',
          [specialty]
        );

        if (rows.length > 0) {
          script = rows[0];
        }
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!script && supabase) {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('specialty', specialty)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      script = data;
    }

    if (!script) {
      // Return default script if none exists
      return res.json({
        specialty,
        opening_line: 'Hello, this is [Your Name] calling from [Company].',
        qualification: 'I wanted to see if you might be interested in learning about our services.',
        talking_points: 'Key points to discuss...',
        objection_handling: 'Common objections and responses...',
        closing_line: 'Would you be available for a brief call this week?'
      });
    }

    res.json(script);
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: `Error fetching script: ${error.message}` });
  }
});

// Get all scripts (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    
    // Check if admin
    let user = null;
    if (pool) {
      try {
        const { rows: userRows } = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [req.user.id]
        );
        if (userRows.length > 0) {
          user = userRows[0];
        }
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!user && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      user = data;
    }

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch scripts
    let scripts = [];
    if (pool) {
      try {
        const { rows } = await pool.query('SELECT * FROM scripts ORDER BY specialty');
        scripts = rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
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
    res.status(500).json({ error: `Error fetching scripts: ${error.message}` });
  }
});

// Create or update script (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    
    // Check if admin
    let user = null;
    if (pool) {
      try {
        const { rows: userRows } = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [req.user.id]
        );
        if (userRows.length > 0) {
          user = userRows[0];
        }
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!user && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', req.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      user = data;
    }

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { specialty, opening_line, qualification, talking_points, objection_handling, closing_line } = req.body;

    if (!specialty) {
      return res.status(400).json({ error: 'Specialty is required' });
    }

    // Save script
    if (pool) {
      try {
        const { rows } = await pool.query(
          `INSERT INTO scripts (specialty, opening_line, qualification, talking_points, objection_handling, closing_line)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (specialty) 
           DO UPDATE SET 
             opening_line = EXCLUDED.opening_line,
             qualification = EXCLUDED.qualification,
             talking_points = EXCLUDED.talking_points,
             objection_handling = EXCLUDED.objection_handling,
             closing_line = EXCLUDED.closing_line,
             updated_at = NOW()
           RETURNING *`,
          [specialty, opening_line || null, qualification || null, talking_points || null, objection_handling || null, closing_line || null]
        );

        return res.json(rows[0]);
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (supabase) {
      const scriptData = {
        specialty: specialty.trim(),
        opening_line: opening_line || null,
        qualification: qualification || null,
        talking_points: talking_points || null,
        objection_handling: objection_handling || null,
        closing_line: closing_line || null,
        updated_at: new Date().toISOString()
      };

      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('scripts')
        .upsert(scriptData, {
          onConflict: 'specialty',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }

      return res.json(data);
    }

    return res.status(500).json({ error: 'Database not configured' });
  } catch (error) {
    console.error('Error saving script:', error);
    res.status(500).json({ error: `Error saving script: ${error.message}` });
  }
});

export default router;


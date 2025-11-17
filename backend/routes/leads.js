import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all leads for the authenticated caller
router.get('/', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { status, specialty, tag, search } = req.query;
    
    let leads = [];

    if (pool) {
      try {
        let query = `
          SELECT 
            l.*,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags,
            COUNT(DISTINCT ca.id) as call_count,
            MAX(ca.created_at) as last_call_at
          FROM leads l
          LEFT JOIN lead_tags lt ON l.id = lt.lead_id
          LEFT JOIN tags t ON lt.tag_id = t.id
          LEFT JOIN call_attempts ca ON l.id = ca.lead_id
          WHERE l.assigned_caller_id = $1
        `;
        
        const params = [req.user.id];
        let paramCount = 1;

        if (status) {
          paramCount++;
          query += ` AND l.status = $${paramCount}`;
          params.push(status);
        }

        if (specialty) {
          paramCount++;
          query += ` AND l.specialty = $${paramCount}`;
          params.push(specialty);
        }

        if (search) {
          paramCount++;
          query += ` AND (l.full_name ILIKE $${paramCount} OR l.notes ILIKE $${paramCount})`;
          params.push(`%${search}%`);
        }

        query += ` GROUP BY l.id ORDER BY l.updated_at DESC`;

        const { rows } = await pool.query(query, params);
        leads = rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (leads.length === 0 && supabase) {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('assigned_caller_id', req.user.id);

      if (status) {
        query = query.eq('status', status);
      }

      if (specialty) {
        query = query.eq('specialty', specialty);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      const { data: leadsData, error: leadsError } = await query.order('updated_at', { ascending: false });

      if (leadsError) {
        console.error('Supabase query error:', leadsError);
        throw leadsError;
      }

      // Get tags and call attempts for all leads
      if (leadsData && leadsData.length > 0) {
        const leadIds = leadsData.map(l => l.id);
        
        // Get tags
        const { data: leadTagsData } = await supabase
          .from('lead_tags')
          .select('lead_id, tags(id, name, color)')
          .in('lead_id', leadIds);

        // Get call attempts
        const { data: callAttemptsData } = await supabase
          .from('call_attempts')
          .select('id, lead_id, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false });

        // Group tags and call attempts by lead_id
        const tagsByLead = new Map();
        const callAttemptsByLead = new Map();
        const lastCallByLead = new Map();

        (leadTagsData || []).forEach(lt => {
          if (lt.tags) {
            if (!tagsByLead.has(lt.lead_id)) {
              tagsByLead.set(lt.lead_id, []);
            }
            tagsByLead.get(lt.lead_id).push(lt.tags);
          }
        });

        (callAttemptsData || []).forEach(ca => {
          if (!callAttemptsByLead.has(ca.lead_id)) {
            callAttemptsByLead.set(ca.lead_id, []);
            lastCallByLead.set(ca.lead_id, ca.created_at);
          }
          callAttemptsByLead.get(ca.lead_id).push(ca);
        });

        // Transform Supabase response to match pool response format
        leads = leadsData.map(lead => {
          const tags = tagsByLead.get(lead.id) || [];
          const callAttempts = callAttemptsByLead.get(lead.id) || [];
          const call_count = callAttempts.length;
          const last_call_at = lastCallByLead.get(lead.id) || null;

          return {
            ...lead,
            tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color })),
            call_count,
            last_call_at
          };
        });
      }
    }
    
    // Filter by tag if provided
    let filteredRows = leads;
    if (tag) {
      filteredRows = leads.filter(row => 
        row.tags.some(t => t.name === tag)
      );
    }

    res.json(filteredRows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Error fetching leads' });
  }
});

// Get single lead
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { id } = req.params;
    let lead = null;
    let callAttempts = [];
    let appointments = [];

    if (pool) {
      try {
        // Get lead with tags
        const leadQuery = `
          SELECT 
            l.*,
            COALESCE(
              json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
              FILTER (WHERE t.id IS NOT NULL),
              '[]'
            ) as tags
          FROM leads l
          LEFT JOIN lead_tags lt ON l.id = lt.lead_id
          LEFT JOIN tags t ON lt.tag_id = t.id
          WHERE l.id = $1 AND l.assigned_caller_id = $2
          GROUP BY l.id
        `;
        
        const { rows: leadRows } = await pool.query(leadQuery, [id, req.user.id]);

        if (leadRows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }

        lead = leadRows[0];

        // Get call attempts
        const { rows: callRows } = await pool.query(
          'SELECT * FROM call_attempts WHERE lead_id = $1 ORDER BY created_at DESC',
          [id]
        );
        callAttempts = callRows;

        // Get appointments
        const { rows: appointmentRows } = await pool.query(
          'SELECT * FROM appointments WHERE lead_id = $1 ORDER BY scheduled_at DESC',
          [id]
        );
        appointments = appointmentRows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!lead && supabase) {
      // Get lead
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .eq('assigned_caller_id', req.user.id)
        .single();

      if (leadError) {
        if (leadError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Lead not found' });
        }
        throw leadError;
      }

      if (!leadData) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Get tags
      const { data: leadTagsData } = await supabase
        .from('lead_tags')
        .select('tags(id, name, color)')
        .eq('lead_id', id);

      const tags = (leadTagsData || []).map(lt => lt.tags).filter(Boolean);

      lead = {
        ...leadData,
        tags: tags.map(t => ({ id: t.id, name: t.name, color: t.color }))
      };

      // Get call attempts
      const { data: callAttemptsData } = await supabase
        .from('call_attempts')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      
      callAttempts = callAttemptsData || [];

      // Get appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .eq('lead_id', id)
        .order('scheduled_at', { ascending: false });
      
      appointments = appointmentsData || [];
    }

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({
      ...lead,
      call_attempts: callAttempts,
      appointments: appointments
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Error fetching lead' });
  }
});

// Update lead
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    const { id } = req.params;
    const { phone, email, notes, status, first_name, last_name, tags } = req.body;

    let leadExists = false;

    if (pool) {
      try {
        // Verify ownership
        const { rows: checkRows } = await pool.query(
          'SELECT id FROM leads WHERE id = $1 AND assigned_caller_id = $2',
          [id, req.user.id]
        );

        if (checkRows.length === 0) {
          return res.status(404).json({ error: 'Lead not found' });
        }

        leadExists = true;

        // Build update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (phone !== undefined) {
          updates.push(`phone = $${paramCount++}`);
          values.push(phone);
        }
        if (email !== undefined) {
          updates.push(`email = $${paramCount++}`);
          values.push(email);
        }
        if (notes !== undefined) {
          updates.push(`notes = $${paramCount++}`);
          values.push(notes);
        }
        if (status !== undefined) {
          updates.push(`status = $${paramCount++}`);
          values.push(status);
        }
        if (first_name !== undefined) {
          updates.push(`first_name = $${paramCount++}`);
          values.push(first_name);
        }
        if (last_name !== undefined) {
          updates.push(`last_name = $${paramCount++}`);
          values.push(last_name);
        }

        if (updates.length > 0) {
          values.push(id);
          await pool.query(
            `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramCount}`,
            values
          );
        }

        // Update tags if provided
        if (tags !== undefined) {
          await pool.query('DELETE FROM lead_tags WHERE lead_id = $1', [id]);
          
          if (tags.length > 0) {
            for (const tagName of tags) {
              // Get or create tag
              let { rows: tagRows } = await pool.query(
                'SELECT id FROM tags WHERE name = $1',
                [tagName]
              );
              
              let tagId;
              if (tagRows.length === 0) {
                const { rows: newTagRows } = await pool.query(
                  'INSERT INTO tags (name) VALUES ($1) RETURNING id',
                  [tagName]
                );
                tagId = newTagRows[0].id;
              } else {
                tagId = tagRows[0].id;
              }
              
              await pool.query(
                'INSERT INTO lead_tags (lead_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [id, tagId]
              );
            }
          }
        }

        // Calculate data completeness score
        const { rows: updatedLead } = await pool.query(
          'SELECT * FROM leads WHERE id = $1',
          [id]
        );
        
        const lead = updatedLead[0];
        let score = 0;
        if (lead.first_name) score += 20;
        if (lead.last_name) score += 20;
        if (lead.phone) score += 20;
        if (lead.email) score += 20;
        if (lead.notes) score += 20;
        
        await pool.query(
          'UPDATE leads SET data_completeness_score = $1 WHERE id = $2',
          [score, id]
        );
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (!leadExists && supabase) {
      // Verify ownership
      const { data: checkData, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', id)
        .eq('assigned_caller_id', req.user.id)
        .single();

      if (checkError || !checkData) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Build update object
      const updateData = {};
      if (phone !== undefined) updateData.phone = phone;
      if (email !== undefined) updateData.email = email;
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined) updateData.status = status;
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', id);

        if (updateError) {
          throw updateError;
        }
      }

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await supabase
          .from('lead_tags')
          .delete()
          .eq('lead_id', id);
        
        if (tags.length > 0) {
          for (const tagName of tags) {
            // Get or create tag
            let { data: tagData } = await supabase
              .from('tags')
              .select('id')
              .eq('name', tagName)
              .single();
            
            let tagId;
            if (!tagData) {
              const { data: newTagData, error: tagError } = await supabase
                .from('tags')
                .insert({ name: tagName })
                .select('id')
                .single();
              
              if (tagError) throw tagError;
              tagId = newTagData.id;
            } else {
              tagId = tagData.id;
            }
            
            await supabase
              .from('lead_tags')
              .upsert({ lead_id: id, tag_id: tagId });
          }
        }
      }

      // Calculate data completeness score
      const { data: updatedLead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      if (updatedLead) {
        let score = 0;
        if (updatedLead.first_name) score += 20;
        if (updatedLead.last_name) score += 20;
        if (updatedLead.phone) score += 20;
        if (updatedLead.email) score += 20;
        if (updatedLead.notes) score += 20;
        
        await supabase
          .from('leads')
          .update({ data_completeness_score: score })
          .eq('id', id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Error updating lead' });
  }
});

// Log call attempt
router.post('/:id/calls', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const {
      outcome,
      notes,
      interest_level,
      appointment_likelihood,
      decision_maker_reached,
      call_control,
      objection_handling
    } = req.body;

    // Verify ownership
    const { rows: checkRows } = await pool.query(
      'SELECT id FROM leads WHERE id = $1 AND assigned_caller_id = $2',
      [id, req.user.id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { rows } = await pool.query(
      `INSERT INTO call_attempts (
        lead_id, caller_id, outcome, notes, interest_level, 
        appointment_likelihood, decision_maker_reached, call_control, objection_handling
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        id, req.user.id, outcome, notes, interest_level,
        appointment_likelihood, decision_maker_reached, call_control, objection_handling
      ]
    );

    // Update lead status if needed
    if (outcome === 'appointment_booked') {
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['appointment_booked', id]
      );
    } else if (outcome === 'not_interested') {
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['not_interested', id]
      );
    } else if (outcome === 'contacted') {
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['contacted', id]
      );
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error logging call:', error);
    res.status(500).json({ error: 'Error logging call' });
  }
});

export default router;


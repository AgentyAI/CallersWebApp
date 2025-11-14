import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get all leads for the authenticated caller
router.get('/', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { status, specialty, tag, search } = req.query;
    
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
    
    // Filter by tag if provided
    let filteredRows = rows;
    if (tag) {
      filteredRows = rows.filter(row => 
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
    const { pool } = req.app.locals;
    const { id } = req.params;

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

    // Get call attempts
    const { rows: callRows } = await pool.query(
      'SELECT * FROM call_attempts WHERE lead_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Get appointments
    const { rows: appointmentRows } = await pool.query(
      'SELECT * FROM appointments WHERE lead_id = $1 ORDER BY scheduled_at DESC',
      [id]
    );

    res.json({
      ...leadRows[0],
      call_attempts: callRows,
      appointments: appointmentRows
    });
  } catch (error) {
    console.error('Error fetching lead:', error);
    res.status(500).json({ error: 'Error fetching lead' });
  }
});

// Update lead
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { phone, email, notes, status, first_name, last_name, tags } = req.body;

    // Verify ownership
    const { rows: checkRows } = await pool.query(
      'SELECT id FROM leads WHERE id = $1 AND assigned_caller_id = $2',
      [id, req.user.id]
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

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


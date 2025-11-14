import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all leads (admin)
router.get('/leads', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { status, specialty, caller_id } = req.query;

    let query = `
      SELECT 
        l.*,
        u.name as caller_name,
        u.email as caller_email,
        COALESCE(
          json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
          FILTER (WHERE t.id IS NOT NULL),
          '[]'
        ) as tags,
        COUNT(DISTINCT ca.id) as call_count,
        COUNT(DISTINCT a.id) as appointment_count
      FROM leads l
      LEFT JOIN users u ON l.assigned_caller_id = u.id
      LEFT JOIN lead_tags lt ON l.id = lt.lead_id
      LEFT JOIN tags t ON lt.tag_id = t.id
      LEFT JOIN call_attempts ca ON l.id = ca.lead_id
      LEFT JOIN appointments a ON l.id = a.lead_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

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

    if (caller_id) {
      paramCount++;
      query += ` AND l.assigned_caller_id = $${paramCount}`;
      params.push(caller_id);
    }

    query += ` GROUP BY l.id, u.name, u.email ORDER BY l.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Error fetching leads' });
  }
});

// Upload leads (admin)
router.post('/leads', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { leads, caller_id } = req.body;

    const insertedLeads = [];

    for (const leadData of leads) {
      const { full_name, specialty, assigned_caller_id } = leadData;
      
      // Parse first and last name
      const nameParts = full_name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      const { rows } = await pool.query(
        `INSERT INTO leads (full_name, first_name, last_name, specialty, assigned_caller_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [full_name, first_name, last_name, specialty, assigned_caller_id || caller_id]
      );

      insertedLeads.push(rows[0]);
    }

    res.json({ success: true, leads: insertedLeads });
  } catch (error) {
    console.error('Error uploading leads:', error);
    res.status(500).json({ error: 'Error uploading leads' });
  }
});

// Get caller performance metrics
router.get('/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool } = req.app.locals;

    // Overall metrics
    const { rows: overallRows } = await pool.query(`
      SELECT 
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'appointment_booked' THEN l.id END) as appointments_booked,
        COUNT(DISTINCT ca.id) as total_calls,
        COUNT(DISTINCT CASE WHEN ca.outcome = 'contacted' THEN ca.id END) as calls_contacted,
        COUNT(DISTINCT CASE WHEN l.data_completeness_score >= 60 THEN l.id END) as leads_enriched
      FROM leads l
      LEFT JOIN call_attempts ca ON l.id = ca.lead_id
    `);

    // Per-caller metrics
    const { rows: callerRows } = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(DISTINCT l.id) as leads_assigned,
        COUNT(DISTINCT CASE WHEN l.status = 'appointment_booked' THEN l.id END) as appointments_booked,
        COUNT(DISTINCT ca.id) as calls_made,
        COUNT(DISTINCT CASE WHEN ca.outcome = 'contacted' THEN ca.id END) as calls_contacted,
        AVG(ca.interest_level) as avg_interest_level,
        AVG(ca.appointment_likelihood) as avg_appointment_likelihood
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_caller_id
      LEFT JOIN call_attempts ca ON l.id = ca.lead_id
      WHERE u.role = 'caller'
      GROUP BY u.id, u.name, u.email
    `);

    // Specialty breakdown
    const { rows: specialtyRows } = await pool.query(`
      SELECT 
        l.specialty,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT CASE WHEN l.status = 'appointment_booked' THEN l.id END) as appointments_booked,
        COUNT(DISTINCT ca.id) as total_calls
      FROM leads l
      LEFT JOIN call_attempts ca ON l.id = ca.lead_id
      GROUP BY l.specialty
      ORDER BY appointments_booked DESC
    `);

    res.json({
      overall: overallRows[0],
      callers: callerRows,
      specialties: specialtyRows
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Error fetching metrics' });
  }
});

// Get all callers
router.get('/callers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { rows } = await pool.query(
      'SELECT id, email, name, role, created_at FROM users WHERE role = $1 ORDER BY name',
      ['caller']
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching callers:', error);
    res.status(500).json({ error: 'Error fetching callers' });
  }
});

// Assign lead to caller
router.post('/leads/:id/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { id } = req.params;
    const { caller_id } = req.body;

    const { rows } = await pool.query(
      'UPDATE leads SET assigned_caller_id = $1 WHERE id = $2 RETURNING *',
      [caller_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error assigning lead:', error);
    res.status(500).json({ error: 'Error assigning lead' });
  }
});

export default router;


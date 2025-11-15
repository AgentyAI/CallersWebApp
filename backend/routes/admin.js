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
    const { pool, supabase } = req.app.locals;

    // Try pool first, then fallback to Supabase
    let overallRows, callerRows, specialtyRows;

    if (pool) {
      try {
        // Overall metrics
        const overallResult = await pool.query(`
          SELECT 
            COUNT(DISTINCT l.id) as total_leads,
            COUNT(DISTINCT CASE WHEN l.status = 'appointment_booked' THEN l.id END) as appointments_booked,
            COUNT(DISTINCT ca.id) as total_calls,
            COUNT(DISTINCT CASE WHEN ca.outcome = 'contacted' THEN ca.id END) as calls_contacted,
            COUNT(DISTINCT CASE WHEN l.data_completeness_score >= 60 THEN l.id END) as leads_enriched
          FROM leads l
          LEFT JOIN call_attempts ca ON l.id = ca.lead_id
        `);
        overallRows = overallResult.rows;

        // Per-caller metrics
        const callerResult = await pool.query(`
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
        callerRows = callerResult.rows;

        // Specialty breakdown
        const specialtyResult = await pool.query(`
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
        specialtyRows = specialtyResult.rows;
      } catch (poolError) {
        console.warn('Pool queries failed, using Supabase client:', poolError.message);
        // Fall through to Supabase client
      }
    }

    // Use Supabase client if pool failed or doesn't exist
    if (!overallRows && supabase) {
      // Fetch all data and calculate metrics in JavaScript
      const [leadsResult, callAttemptsResult, appointmentsResult, usersResult] = await Promise.all([
        supabase.from('leads').select('id, status, data_completeness_score, specialty, assigned_caller_id'),
        supabase.from('call_attempts').select('id, lead_id, outcome, interest_level, appointment_likelihood'),
        supabase.from('appointments').select('id, lead_id'),
        supabase.from('users').select('id, name, email, role').eq('role', 'caller')
      ]);

      if (leadsResult.error) throw leadsResult.error;
      if (callAttemptsResult.error) throw callAttemptsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;
      if (usersResult.error) throw usersResult.error;

      const leads = leadsResult.data || [];
      const callAttempts = callAttemptsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const callers = usersResult.data || [];

      // Calculate overall metrics
      const totalLeads = leads.length;
      const appointmentsBooked = leads.filter(l => l.status === 'appointment_booked').length;
      const totalCalls = callAttempts.length;
      const callsContacted = callAttempts.filter(ca => ca.outcome === 'contacted').length;
      const leadsEnriched = leads.filter(l => l.data_completeness_score >= 60).length;

      overallRows = [{
        total_leads: totalLeads,
        appointments_booked: appointmentsBooked,
        total_calls: totalCalls,
        calls_contacted: callsContacted,
        leads_enriched: leadsEnriched
      }];

      // Calculate per-caller metrics
      callerRows = callers.map(caller => {
        const callerLeads = leads.filter(l => l.assigned_caller_id === caller.id);
        const callerLeadIds = new Set(callerLeads.map(l => l.id));
        const callerCallAttempts = callAttempts.filter(ca => callerLeadIds.has(ca.lead_id));
        const callerAppointments = callerLeads.filter(l => l.status === 'appointment_booked').length;
        const contactedCalls = callerCallAttempts.filter(ca => ca.outcome === 'contacted').length;
        
        const interestLevels = callerCallAttempts.map(ca => ca.interest_level).filter(v => v != null);
        const appointmentLikelihoods = callerCallAttempts.map(ca => ca.appointment_likelihood).filter(v => v != null);

        return {
          id: caller.id,
          name: caller.name,
          email: caller.email,
          leads_assigned: callerLeads.length,
          appointments_booked: callerAppointments,
          calls_made: callerCallAttempts.length,
          calls_contacted: contactedCalls,
          avg_interest_level: interestLevels.length > 0 
            ? interestLevels.reduce((a, b) => a + b, 0) / interestLevels.length 
            : null,
          avg_appointment_likelihood: appointmentLikelihoods.length > 0
            ? appointmentLikelihoods.reduce((a, b) => a + b, 0) / appointmentLikelihoods.length
            : null
        };
      });

      // Calculate specialty breakdown
      const specialtyMap = new Map();
      leads.forEach(lead => {
        if (!lead.specialty) return;
        if (!specialtyMap.has(lead.specialty)) {
          specialtyMap.set(lead.specialty, {
            specialty: lead.specialty,
            total_leads: 0,
            appointments_booked: 0,
            total_calls: 0
          });
        }
        const spec = specialtyMap.get(lead.specialty);
        spec.total_leads++;
        if (lead.status === 'appointment_booked') {
          spec.appointments_booked++;
        }
      });

      callAttempts.forEach(ca => {
        const lead = leads.find(l => l.id === ca.lead_id);
        if (lead && lead.specialty) {
          const spec = specialtyMap.get(lead.specialty);
          if (spec) {
            spec.total_calls++;
          }
        }
      });

      specialtyRows = Array.from(specialtyMap.values())
        .sort((a, b) => b.appointments_booked - a.appointments_booked);
    }

    if (!overallRows) {
      throw new Error('No database connection available');
    }

    res.json({
      overall: overallRows[0] || {
        total_leads: 0,
        appointments_booked: 0,
        total_calls: 0,
        calls_contacted: 0,
        leads_enriched: 0
      },
      callers: callerRows || [],
      specialties: specialtyRows || []
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Error fetching metrics: ' + error.message });
  }
});

// Get all callers
router.get('/callers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    let rows = [];

    if (pool) {
      try {
        const result = await pool.query(
          'SELECT id, email, name, role, created_at FROM users WHERE role = $1 ORDER BY name',
          ['caller']
        );
        rows = result.rows;
      } catch (poolError) {
        console.warn('Pool query failed, using Supabase client:', poolError.message);
      }
    }

    // Fallback to Supabase client
    if (rows.length === 0 && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, created_at')
        .eq('role', 'caller')
        .order('name');

      if (error) throw error;
      rows = data || [];
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching callers:', error);
    res.status(500).json({ error: 'Error fetching callers: ' + error.message });
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


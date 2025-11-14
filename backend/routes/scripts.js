import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get script by specialty
router.get('/:specialty', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { specialty } = req.params;

    const { rows } = await pool.query(
      'SELECT * FROM scripts WHERE specialty = $1',
      [specialty]
    );

    if (rows.length === 0) {
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

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching script:', error);
    res.status(500).json({ error: 'Error fetching script' });
  }
});

// Get all scripts (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // Check if admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { rows } = await pool.query('SELECT * FROM scripts ORDER BY specialty');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching scripts:', error);
    res.status(500).json({ error: 'Error fetching scripts' });
  }
});

// Create or update script (admin only)
router.post('/', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    
    // Check if admin
    const { rows: userRows } = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userRows.length === 0 || userRows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { specialty, opening_line, qualification, talking_points, objection_handling, closing_line } = req.body;

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
      [specialty, opening_line, qualification, talking_points, objection_handling, closing_line]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error saving script:', error);
    res.status(500).json({ error: 'Error saving script' });
  }
});

export default router;


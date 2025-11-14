import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { google } from 'googleapis';

const router = express.Router();

// Create appointment and book on Google Calendar
router.post('/', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { lead_id, scheduled_at, notes, access_token, refresh_token } = req.body;

    // Verify ownership
    const { rows: leadRows } = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND assigned_caller_id = $2',
      [lead_id, req.user.id]
    );

    if (leadRows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leadRows[0];

    // Create appointment in database first
    const { rows: appointmentRows } = await pool.query(
      `INSERT INTO appointments (lead_id, caller_id, scheduled_at, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [lead_id, req.user.id, scheduled_at, notes]
    );

    const appointment = appointmentRows[0];

    // Book on Google Calendar if tokens provided
    if (access_token && refresh_token) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        oauth2Client.setCredentials({
          access_token,
          refresh_token
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // Create Google Meet link
        const event = {
          summary: `Appointment with ${lead.full_name}`,
          description: notes || `Appointment with ${lead.full_name} (${lead.specialty})`,
          start: {
            dateTime: scheduled_at,
            timeZone: 'UTC',
          },
          end: {
            dateTime: new Date(new Date(scheduled_at).getTime() + 30 * 60 * 1000).toISOString(),
            timeZone: 'UTC',
          },
          conferenceData: {
            createRequest: {
              requestId: appointment.id,
              conferenceSolutionKey: { type: 'hangoutsMeet' }
            }
          },
          attendees: lead.email ? [{ email: lead.email }] : [],
        };

        const { data: calendarEvent } = await calendar.events.insert({
          calendarId: 'primary',
          conferenceDataVersion: 1,
          requestBody: event,
        });

        // Update appointment with Google Calendar info
        await pool.query(
          `UPDATE appointments 
           SET google_calendar_event_id = $1, google_meet_link = $2 
           WHERE id = $3`,
          [
            calendarEvent.id,
            calendarEvent.conferenceData?.entryPoints?.[0]?.uri || calendarEvent.hangoutLink,
            appointment.id
          ]
        );

        // Update appointment with meet link
        appointment.google_meet_link = calendarEvent.conferenceData?.entryPoints?.[0]?.uri || calendarEvent.hangoutLink;
        appointment.google_calendar_event_id = calendarEvent.id;
      } catch (calendarError) {
        console.error('Error creating calendar event:', calendarError);
        // Don't fail the request if calendar fails
      }
    }

    // Update lead status
    await pool.query(
      'UPDATE leads SET status = $1 WHERE id = $2',
      ['appointment_booked', lead_id]
    );

    // Log call attempt
    await pool.query(
      `INSERT INTO call_attempts (lead_id, caller_id, outcome, notes)
       VALUES ($1, $2, $3, $4)`,
      [lead_id, req.user.id, 'appointment_booked', `Appointment scheduled for ${scheduled_at}`]
    );

    res.json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Error creating appointment' });
  }
});

// Get appointments for caller
router.get('/', authenticate, async (req, res) => {
  try {
    const { pool } = req.app.locals;
    const { rows } = await pool.query(
      `SELECT a.*, l.full_name, l.specialty, l.email as lead_email, l.phone as lead_phone
       FROM appointments a
       JOIN leads l ON a.lead_id = l.id
       WHERE a.caller_id = $1
       ORDER BY a.scheduled_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Error fetching appointments' });
  }
});

export default router;


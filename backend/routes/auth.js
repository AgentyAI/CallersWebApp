import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const { pool, supabase } = req.app.locals;
    console.log('Fetching user for ID:', req.user.id);
    console.log('User email:', req.user.email);
    
    // Try using Supabase client first (works without direct DB connection)
    if (supabase) {
      try {
        const { data: userData, error: supabaseError } = await supabase
          .from('users')
          .select('id, email, role, name')
          .eq('id', req.user.id)
          .single();

        if (supabaseError && supabaseError.code !== 'PGRST116') { // PGRST116 = not found
          console.error('Supabase query error:', supabaseError);
          throw supabaseError;
        }

        if (userData) {
          console.log('User found via Supabase client:', userData);
          return res.json(userData);
        }

        // User doesn't exist, create it
        console.log('User not found, creating via Supabase client...');
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .upsert({
            id: req.user.id,
            email: req.user.email,
            role: 'caller'
          }, {
            onConflict: 'id'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user via Supabase:', insertError);
          throw insertError;
        }

        console.log('Created user via Supabase client:', newUser);
        return res.json(newUser);
      } catch (supabaseErr) {
        console.log('Supabase client query failed, falling back to direct connection');
      }
    }

    // Fallback to direct PostgreSQL connection (if available)
    if (!pool) {
      console.error('Database pool not available and Supabase client also failed');
      return res.status(500).json({ error: 'Database not configured' });
    }

    const { rows } = await pool.query(
      'SELECT id, email, role, name FROM users WHERE id = $1',
      [req.user.id]
    );

    console.log('User query result:', rows.length, 'rows found');

    if (rows.length === 0) {
      console.log('User not found in database, creating...');
      // Create user if doesn't exist
      try {
        await pool.query(
          'INSERT INTO users (id, email, role) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email',
          [req.user.id, req.user.email, 'caller']
        );
        
        const { rows: newRows } = await pool.query(
          'SELECT id, email, role, name FROM users WHERE id = $1',
          [req.user.id]
        );
        
        console.log('Created user:', newRows[0]);
        return res.json(newRows[0]);
      } catch (insertError) {
        console.error('Error creating user:', insertError);
        return res.status(500).json({ error: `Error creating user: ${insertError.message}` });
      }
    }

    console.log('Returning user:', rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: `Error fetching user: ${error.message}` });
  }
});

export default router;


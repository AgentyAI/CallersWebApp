import { createClient } from '@supabase/supabase-js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('No token provided in request');
      return res.status(401).json({ error: 'No token provided' });
    }

    // Use the anon client from app.locals (created after env vars are loaded)
    const supabase = req.app.locals.supabaseAnon;
    
    if (!supabase) {
      console.error('Supabase client not configured in app.locals');
      return res.status(500).json({ error: 'Supabase client not configured' });
    }

    console.log('Validating token...');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Token validation error:', error.message);
      return res.status(401).json({ error: `Invalid token: ${error.message}` });
    }
    
    if (!user) {
      console.error('No user returned from token validation');
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('User authenticated:', user.id, user.email);
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ error: `Authentication failed: ${error.message}` });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const { pool, supabase } = req.app.locals;
    let user = null;

    if (pool) {
      try {
        const { rows } = await pool.query(
          'SELECT role FROM users WHERE id = $1',
          [req.user.id]
        );
        if (rows.length > 0) {
          user = rows[0];
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

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Error checking admin status' });
  }
};


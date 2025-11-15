import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import authRoutes from './routes/auth.js';
import leadsRoutes from './routes/leads.js';
import scriptsRoutes from './routes/scripts.js';
import appointmentsRoutes from './routes/appointments.js';
import adminRoutes from './routes/admin.js';
import callersRoutes from './routes/callers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Database connection - Use Supabase connection string
// Note: Direct DB connection is optional - Supabase client will be used as fallback
let pool;
let poolConnectionFailed = false;

try {
  if (process.env.SUPABASE_DB_URL) {
    // Supabase provides a direct database connection URL
    console.log('Attempting direct database connection via SUPABASE_DB_URL...');
    pool = new Pool({
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      // Add connection timeout and retry settings
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10
    });
  } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) {
    // Use DATABASE_URL if it's a Supabase connection
    console.log('Attempting direct database connection via DATABASE_URL...');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      max: 10
    });
  } else {
    // Fallback: construct from Supabase URL (for Supabase hosted databases)
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl) {
      // Extract project ref from Supabase URL
      const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef && process.env.SUPABASE_DB_PASSWORD) {
        console.log('Attempting direct database connection via constructed URL...');
        pool = new Pool({
          host: `db.${projectRef}.supabase.co`,
          port: 5432,
          database: 'postgres',
          user: 'postgres',
          password: process.env.SUPABASE_DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          max: 10
        });
      }
    }
  }
} catch (poolError) {
  console.warn('Failed to create database pool:', poolError.message);
  pool = null;
  poolConnectionFailed = true;
}

// Database pool is optional - we can use Supabase client for queries
if (!pool) {
  console.log('ℹ️  No direct database connection configured. Using Supabase client for all queries (this is normal).');
}

// Supabase client for auth (using service role key for backend operations)
// Also create anon client for auth middleware
if (!process.env.SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is not set in environment variables');
}

if (!process.env.SUPABASE_ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY is not set in environment variables');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
}

const supabaseService = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

console.log('Supabase clients initialized');
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

// Make database and supabase available to routes
app.locals.pool = pool;
app.locals.supabase = supabaseService; // Use service role for database queries
app.locals.supabaseService = supabaseService; // Service role client for admin operations (auth)
app.locals.supabaseAnon = supabaseAnon; // For auth middleware

// Test database connection (optional - non-blocking)
if (pool) {
  pool.query('SELECT 1')
    .then(() => {
      console.log('✓ Direct database connection successful');
    })
    .catch((err) => {
      poolConnectionFailed = true;
      // Suppress the error if it's a connection/auth issue - we'll use Supabase client instead
      if (err.message.includes('Tenant or user not found') || 
          err.message.includes('password authentication failed') ||
          err.message.includes('connection')) {
        console.log('ℹ️  Direct database connection unavailable (using Supabase client instead - this is fine)');
      } else {
        console.warn('Direct database connection test failed:', err.message);
        console.log('ℹ️  Will use Supabase client for all queries');
      }
    });
} else {
  console.log('ℹ️  Using Supabase client for all database queries (no direct connection configured)');
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/callers', callersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


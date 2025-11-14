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
let pool;
if (process.env.SUPABASE_DB_URL) {
  // Supabase provides a direct database connection URL
  console.log('Using SUPABASE_DB_URL for database connection');
  pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
} else if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) {
  // Use DATABASE_URL if it's a Supabase connection
  console.log('Using DATABASE_URL (Supabase) for database connection');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Fallback: construct from Supabase URL (for Supabase hosted databases)
  const supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl) {
    // Extract project ref from Supabase URL
    const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1];
    if (projectRef && process.env.SUPABASE_DB_PASSWORD) {
      console.log('Constructing Supabase database connection from URL');
      pool = new Pool({
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: process.env.SUPABASE_DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
      });
    } else {
      console.error('Missing SUPABASE_DB_PASSWORD. Please set it in .env');
    }
  }
}

if (!pool) {
  console.error('Error: No database connection configured. Please set DATABASE_URL or SUPABASE_DB_URL in .env');
  process.exit(1);
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
app.locals.supabase = supabaseService;
app.locals.supabaseAnon = supabaseAnon; // For auth middleware

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/admin', adminRoutes);

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


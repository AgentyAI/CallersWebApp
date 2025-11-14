# Cold Caller App

A comprehensive web application for managing cold calling operations, supporting both callers and administrators.

## Tech Stack

- **Frontend**: Next.js 14 with React, TypeScript, and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Calendar Integration**: Google Calendar API

## Project Structure

```
Cold callers app/
├── frontend/          # Next.js application
├── backend/           # Express API server
└── idea.md           # Detailed specification
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Supabase account (for authentication)
- Google Cloud project with Calendar API enabled (for appointment booking)

### 1. Supabase Setup

1. **Create a Supabase project** (if you haven't already):
   - Go to https://supabase.com and create a new project
   - Wait for the project to be fully provisioned

2. **Database schema is already applied!** 
   - The schema has been automatically applied via Supabase MCP
   - You can verify tables exist in Supabase Dashboard > Table Editor

3. **Get your Supabase credentials**:
   - Go to Supabase Dashboard > Settings > API
   - Copy your `Project URL` and `anon` `public` key
   - Go to Settings > Database to get your database connection string
   - Go to Settings > API to get your `service_role` key (keep this secret!)

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your Supabase configuration:
```
PORT=3001
# Get from Supabase Dashboard > Settings > Database > Connection string (URI mode)
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Get from Supabase Dashboard > Settings > API
SUPABASE_URL=https://[PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Google Calendar API (for appointment booking)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

FRONTEND_URL=http://localhost:3000
```

**Quick setup**: Your Supabase project URL is: `https://cziokfhomhxtiqgigryw.supabase.co`
- Get your anon key from Supabase Dashboard > Settings > API
- Get your service_role key from the same page (scroll down)
- Get your database password from Supabase Dashboard > Settings > Database (or reset it if needed)

5. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

### 4. Supabase Authentication Setup

1. **Enable Email authentication**:
   - Go to Supabase Dashboard > Authentication > Providers
   - Make sure "Email" is enabled
   - Configure email templates if needed

2. **Set up your environment variables**:
   - Backend `.env`: Add `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - Frontend `.env.local`: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Users are automatically created**: When a user logs in for the first time, they'll be added to the `users` table with role 'caller' by default. Admins can be created by updating the database directly or through the Supabase dashboard.

### 5. Google Calendar API Setup

1. Go to Google Cloud Console
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to backend `.env`

## Features

### For Callers

- **Lead Management**: View assigned leads with filtering and search
- **Lead Profiles**: Detailed lead information with enrichment capabilities
- **Calling Scripts**: Embedded scripts based on doctor specialty
- **Call Logging**: Log call attempts with ratings and outcomes
- **Appointment Booking**: Schedule appointments with Google Calendar integration
- **Performance Tracking**: View personal stats and metrics

### For Administrators

- **Dashboard**: Overview of all metrics and performance
- **Lead Upload**: Bulk upload leads via CSV
- **Script Management**: Create and edit calling scripts by specialty
- **Caller Performance**: Track individual caller metrics
- **Pipeline Analytics**: Specialty breakdown and conversion rates

## User Roles

- **Caller**: Assigned leads, can log calls and book appointments
- **Admin**: Full access to all features, can manage leads, scripts, and view analytics

## API Endpoints

### Authentication
- `GET /api/auth/me` - Get current user

### Leads
- `GET /api/leads` - Get caller's leads
- `GET /api/leads/:id` - Get lead details
- `PATCH /api/leads/:id` - Update lead
- `POST /api/leads/:id/calls` - Log call attempt

### Scripts
- `GET /api/scripts/:specialty` - Get script by specialty
- `GET /api/scripts` - Get all scripts (admin)
- `POST /api/scripts` - Create/update script (admin)

### Appointments
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - Get caller's appointments

### Admin
- `GET /api/admin/leads` - Get all leads
- `POST /api/admin/leads` - Upload leads
- `GET /api/admin/metrics` - Get performance metrics
- `GET /api/admin/callers` - Get all callers
- `POST /api/admin/leads/:id/assign` - Assign lead to caller

## Development

### Running in Development Mode

1. Start the backend:
```bash
cd backend
npm run dev
```

2. Start the frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

### Building for Production

1. Build the frontend:
```bash
cd frontend
npm run build
npm start
```

2. The backend uses `node server.js` in production (set `NODE_ENV=production`)

## Notes

- The app uses Supabase Auth for authentication. Users are automatically created in the database on first login.
- Google Calendar integration requires OAuth tokens. In production, implement a proper OAuth flow.
- The design uses a clean, minimal aesthetic with white backgrounds and blue accent colors.
- All data is persisted in PostgreSQL with proper relationships and indexes.

## License

ISC


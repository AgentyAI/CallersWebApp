# Quick Setup Guide

## Your Supabase Project

Your Supabase project is already set up and the database schema has been applied!

- **Project URL**: `https://cziokfhomhxtiqgigryw.supabase.co`
- **Anon Key**: Get from Supabase Dashboard > Settings > API

## Step-by-Step Setup

### 1. Get Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project (or create one if needed)
3. Go to **Settings > API**:
   - Copy the `Project URL` → This is your `SUPABASE_URL`
   - Copy the `anon` `public` key → This is your `SUPABASE_ANON_KEY`
   - Copy the `service_role` `secret` key → This is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

4. Go to **Settings > Database**:
   - Find "Connection string" section
   - Select "URI" mode
   - Copy the connection string → This is your `SUPABASE_DB_URL`
   - Replace `[YOUR-PASSWORD]` with your actual database password
   - If you don't know the password, you can reset it in the same section

### 2. Backend Setup

```bash
cd backend
```

1. Copy the example env file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Supabase credentials:
```env
PORT=3001
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.cziokfhomhxtiqgigryw.supabase.co:5432/postgres
SUPABASE_URL=https://cziokfhomhxtiqgigryw.supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SERVICE-ROLE-KEY]
FRONTEND_URL=http://localhost:3000
```

3. Install dependencies:
```bash
npm install
```

4. Start the server:
```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
```

1. Copy the example env file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and add your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://cziokfhomhxtiqgigryw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. Install dependencies:
```bash
npm install
```

4. Start the development server:
```bash
npm run dev
```

### 4. Create Your First User

1. Go to http://localhost:3000/login
2. Click "Sign up" (or use Supabase Dashboard > Authentication > Users > Add user)
3. Create an account with email/password
4. The user will be automatically added to the `users` table with role 'caller'

### 5. Make a User an Admin (Optional)

You can make a user an admin by:

1. Going to Supabase Dashboard > Table Editor > `users`
2. Find your user and edit the `role` field to `admin`
3. Or run this SQL in Supabase SQL Editor:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Verify Everything Works

1. ✅ Backend running on http://localhost:3001
2. ✅ Frontend running on http://localhost:3000
3. ✅ Can log in at http://localhost:3000/login
4. ✅ Database tables exist (check Supabase Dashboard > Table Editor)

## Troubleshooting

### "No database connection configured"
- Make sure `SUPABASE_DB_URL` is set correctly in `backend/.env`
- Check that your database password is correct
- Verify the connection string format

### "Invalid token" or auth errors
- Make sure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in both `.env` files
- Check that Email authentication is enabled in Supabase Dashboard

### Database schema not found
- The schema was already applied via Supabase MCP
- Check Supabase Dashboard > Table Editor to see if tables exist
- If tables are missing, you can run the SQL from `backend/database/schema.sql` in Supabase SQL Editor


# Vercel Deployment Guide

This guide will help you deploy the Cold Callers app to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A Supabase project with the database schema set up
3. All environment variables configured

## Deployment Steps

### Option A: Deploy via Command Line (CLI)

#### 1. Install Vercel CLI

```bash
npm i -g vercel
```

#### 2. Navigate to Project Root

```bash
cd "/Users/alex/Desktop/Code/Cold callers app"
```

#### 3. Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate. Follow the prompts.

#### 4. Link Your Project (First Time Only)

```bash
vercel link
```

When prompted:
- **Set up and develop?** → Yes
- **Which scope?** → Select your account/team
- **Link to existing project?** → No (for first deployment)
- **Project name?** → `cold-callers-app` (or your preferred name)
- **Directory?** → `./` (current directory)

#### 5. Set Environment Variables

Set all required environment variables. Replace the placeholder values with your actual Supabase credentials:

```bash
vercel env  add SUPABASE_URL
# When prompted, paste your Supabase URL (e.g., https://xxx.supabase.co)
# Select: Production, Preview, and Development

vercel env add SUPABASE_ANON_KEY
# Paste your Supabase anon key
# Select: Production, Preview, and Development

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste your Supabase service role key (keep this secret!)
# Select: Production, Preview, and Development

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste the same Supabase URL as above
# Select: Production, Preview, and Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste the same anon key as above
# Select: Production, Preview, and Development
```

**Optional environment variables** (if you have direct database access):

```bash
vercel env add SUPABASE_DB_URL
# Paste your database connection string
# Select: Production, Preview, and Development

# Or alternatively:
vercel env add DATABASE_URL
# Paste your database connection string
# Select: Production, Preview, and Development
```

#### 6. Deploy to Production

```bash
vercel --prod
```

This will:
- Build your application
- Deploy to production
- Give you a production URL

#### 7. (Optional) Deploy to Preview

For testing before production:

```bash
vercel
```

This creates a preview deployment.

#### Useful Commands

```bash
# View deployment logs
vercel logs

# View environment variables
vercel env ls

# Remove an environment variable
vercel env rm VARIABLE_NAME

# View project info
vercel inspect

# List all deployments
vercel ls
```

---

### Option B: Deploy via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Vercel will automatically detect the Next.js framework
4. Configure the following settings:
   - **Root Directory**: Leave as root (or set to `frontend` if needed)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `npm install`

### 3. Environment Variables

Add the following environment variables in the Vercel dashboard (Settings → Environment Variables):

#### Required Environment Variables

**Supabase Configuration:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (keep this secret!)

**Optional Database Connection:**
- `SUPABASE_DB_URL` - Direct database connection string (optional)
- `DATABASE_URL` - Alternative database connection string (optional)
- `SUPABASE_DB_PASSWORD` - Database password if using direct connection (optional)

**Frontend Configuration:**
- `NEXT_PUBLIC_SUPABASE_URL` - Same as SUPABASE_URL (for frontend)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Same as SUPABASE_ANON_KEY (for frontend)
- `NEXT_PUBLIC_API_URL` - Leave empty for production (uses relative URLs)

**Optional:**
- `FRONTEND_URL` - Your production frontend URL (auto-detected by Vercel)
- `PORT` - Not needed for Vercel (serverless functions)

### 4. Deploy

Click "Deploy" and wait for the build to complete. Vercel will provide you with a deployment URL.

## Project Structure

The project is configured as follows:

- **Frontend**: Next.js app in `/frontend`
- **Backend API**: Express server converted to serverless functions in `/api`
- **Configuration**: `vercel.json` handles routing

## How It Works

1. Vercel automatically builds the Next.js frontend
2. API requests to `/api/*` are routed to the serverless function at `/api/index.js`
3. The serverless function wraps the Express backend
4. All routes are handled by the Express app

## Troubleshooting

### Build Errors

- Ensure all dependencies are listed in `package.json`
- Check that Node.js version is compatible (18.x or higher)
- Review build logs in Vercel dashboard

### API Errors

- Verify all environment variables are set correctly
- Check that Supabase credentials are valid
- Review function logs in Vercel dashboard

### CORS Issues

- The backend is configured to allow requests from the Vercel domain
- If you need to add custom domains, update `FRONTEND_URL` environment variable

## Custom Domain

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update `FRONTEND_URL` environment variable if needed

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same as SUPABASE_URL (for frontend) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same as SUPABASE_ANON_KEY (for frontend) |
| `SUPABASE_DB_URL` | No | Direct database connection string |
| `DATABASE_URL` | No | Alternative database connection string |
| `SUPABASE_DB_PASSWORD` | No | Database password |
| `FRONTEND_URL` | No | Production frontend URL (auto-detected) |
| `NEXT_PUBLIC_API_URL` | No | API URL (leave empty for production) |

## Local Development

For local development, you can still run the backend and frontend separately:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

The frontend will connect to `http://localhost:3001` by default in development.

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review function logs in Vercel dashboard
3. Verify environment variables are set correctly
4. Ensure Supabase project is properly configured


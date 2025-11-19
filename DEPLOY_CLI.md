# Quick CLI Deployment Guide

## Exact Commands to Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm i -g vercel
```

### Step 2: Navigate to Project
```bash
cd "/Users/alex/Desktop/Code/Cold callers app"
```

### Step 3: Login
```bash
vercel login
```

### Step 4: Link Project (First Time)
```bash
vercel link
```
- Answer prompts (create new project, name it `cold-callers-app`)

### Step 5: Add Environment Variables

**Required Variables:**

```bash
vercel env add SUPABASE_URL
# Paste: https://your-project.supabase.co
# Select: Production, Preview, Development (all three)

vercel env add SUPABASE_ANON_KEY
# Paste: your-anon-key-here
# Select: Production, Preview, Development

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Paste: your-service-role-key-here
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://your-project.supabase.co (same as SUPABASE_URL)
# Select: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste: your-anon-key-here (same as SUPABASE_ANON_KEY)
# Select: Production, Preview, Development
```

**Optional (if using direct DB connection):**

```bash
vercel env add SUPABASE_DB_URL
# Paste: postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
# Select: Production, Preview, Development
```

### Step 6: Deploy
```bash
vercel --prod
```

### Step 7: Done!
Your app will be live at the URL provided by Vercel.

---

## Quick Reference Commands

```bash
# View logs
vercel logs

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME

# View project info
vercel inspect

# List deployments
vercel ls

# Deploy preview (for testing)
vercel
```


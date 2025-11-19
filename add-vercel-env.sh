#!/bin/bash

# Add environment variables to Vercel
# This script will prompt you to confirm each variable

echo "🚀 Adding environment variables to Vercel..."
echo "⚠️  Note: You'll need to select 'Production', 'Preview', and 'Development' for each variable"
echo ""

# Read values from .env
SUPABASE_DB_URL=$(grep "^SUPABASE_DB_URL=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SUPABASE_URL=$(grep "^SUPABASE_URL=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
GOOGLE_REDIRECT_URI=$(grep "^GOOGLE_REDIRECT_URI=" backend/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'")

echo "Adding SUPABASE_URL..."
echo "$SUPABASE_URL" | vercel env add SUPABASE_URL production
echo "$SUPABASE_URL" | vercel env add SUPABASE_URL preview  
echo "$SUPABASE_URL" | vercel env add SUPABASE_URL development

echo "Adding SUPABASE_ANON_KEY..."
echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY production
echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY preview
echo "$SUPABASE_ANON_KEY" | vercel env add SUPABASE_ANON_KEY development

echo "Adding SUPABASE_SERVICE_ROLE_KEY..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview
echo "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY development

echo "Adding NEXT_PUBLIC_SUPABASE_URL..."
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview
echo "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL development

echo "Adding NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
echo "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development

echo "Adding SUPABASE_DB_URL..."
echo "$SUPABASE_DB_URL" | vercel env add SUPABASE_DB_URL production
echo "$SUPABASE_DB_URL" | vercel env add SUPABASE_DB_URL preview
echo "$SUPABASE_DB_URL" | vercel env add SUPABASE_DB_URL development

echo "Adding GOOGLE_CLIENT_ID..."
echo "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID production
echo "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID preview
echo "$GOOGLE_CLIENT_ID" | vercel env add GOOGLE_CLIENT_ID development

echo "Adding GOOGLE_CLIENT_SECRET..."
echo "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET production
echo "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET preview
echo "$GOOGLE_CLIENT_SECRET" | vercel env add GOOGLE_CLIENT_SECRET development

echo "Adding GOOGLE_REDIRECT_URI..."
echo "$GOOGLE_REDIRECT_URI" | vercel env add GOOGLE_REDIRECT_URI production
echo "$GOOGLE_REDIRECT_URI" | vercel env add GOOGLE_REDIRECT_URI preview
echo "$GOOGLE_REDIRECT_URI" | vercel env add GOOGLE_REDIRECT_URI development

echo ""
echo "✅ All environment variables added!"
echo "Run 'vercel env ls' to verify"


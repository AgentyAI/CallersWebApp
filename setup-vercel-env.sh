#!/bin/bash

# Script to add environment variables to Vercel from .env file
# Usage: ./setup-vercel-env.sh

echo "🚀 Setting up Vercel environment variables..."
echo ""

# Read .env file
ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: $ENV_FILE not found"
    exit 1
fi

# Function to add env var to Vercel
add_env_var() {
    local var_name=$1
    local var_value=$2
    
    echo "Adding $var_name..."
    echo "$var_value" | vercel env add "$var_name" production
    echo "$var_value" | vercel env add "$var_name" preview
    echo "$var_value" | vercel env add "$var_name" development
    echo "✅ $var_name added"
    echo ""
}

# Parse .env file and add variables
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # Skip PORT and FRONTEND_URL (not needed for Vercel)
    if [[ "$key" == "PORT" || "$key" == "FRONTEND_URL" ]]; then
        continue
    fi
    
    # Add NEXT_PUBLIC_ prefix for frontend variables that need it
    if [[ "$key" == "SUPABASE_URL" ]]; then
        add_env_var "SUPABASE_URL" "$value"
        add_env_var "NEXT_PUBLIC_SUPABASE_URL" "$value"
    elif [[ "$key" == "SUPABASE_ANON_KEY" ]]; then
        add_env_var "SUPABASE_ANON_KEY" "$value"
        add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$value"
    else
        add_env_var "$key" "$value"
    fi
    
done < "$ENV_FILE"

echo "✨ All environment variables added to Vercel!"
echo ""
echo "To verify, run: vercel env ls"


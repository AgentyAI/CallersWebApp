#!/usr/bin/env node

// Script to add environment variables to Vercel using the Vercel API
// This requires VERCEL_TOKEN to be set, or you can run: vercel env add manually

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envFile = join(__dirname, 'backend', '.env');

if (!existsSync(envFile)) {
  console.error('❌ backend/.env file not found');
  process.exit(1);
}

// Read .env file
const envContent = readFileSync(envFile, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=');
      // Remove quotes
      value = value.replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value;
    }
  }
});

// Variables to add (skip PORT and FRONTEND_URL)
const varsToAdd = {
  'SUPABASE_URL': envVars.SUPABASE_URL,
  'SUPABASE_ANON_KEY': envVars.SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': envVars.SUPABASE_SERVICE_ROLE_KEY,
  'NEXT_PUBLIC_SUPABASE_URL': envVars.SUPABASE_URL, // Same as SUPABASE_URL
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': envVars.SUPABASE_ANON_KEY, // Same as SUPABASE_ANON_KEY
  'SUPABASE_DB_URL': envVars.SUPABASE_DB_URL,
  'GOOGLE_CLIENT_ID': envVars.GOOGLE_CLIENT_ID,
  'GOOGLE_CLIENT_SECRET': envVars.GOOGLE_CLIENT_SECRET,
  'GOOGLE_REDIRECT_URI': envVars.GOOGLE_REDIRECT_URI,
};

console.log('📝 Environment variables to add:');
Object.keys(varsToAdd).forEach(key => {
  console.log(`  - ${key}`);
});
console.log('\n⚠️  This script will generate commands for you to run.');
console.log('   Since vercel env add is interactive, please run the generated script.\n');

// Generate bash script
const scriptContent = `#!/bin/bash
# Auto-generated script to add Vercel environment variables
# Run this script: bash add-env-auto.sh

${Object.entries(varsToAdd).map(([key, value]) => {
  if (!value) return `# ${key} - SKIPPED (not found in .env)`;
  return `# ${key}
echo "${value}" | vercel env add ${key} production
echo "${value}" | vercel env add ${key} preview  
echo "${value}" | vercel env add ${key} development
echo ""`;
}).join('\n\n')}

echo "✅ Done! Run 'vercel env ls' to verify"
`;

writeFileSync('add-env-auto.sh', scriptContent);
chmodSync('add-env-auto.sh', '755');

console.log('✅ Generated script: add-env-auto.sh');
console.log('   Run: bash add-env-auto.sh\n');


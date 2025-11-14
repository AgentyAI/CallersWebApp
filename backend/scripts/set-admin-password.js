import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setAdminPassword() {
  try {
    // Update user password and confirm email using Admin API
    const { data, error } = await supabase.auth.admin.updateUserById(
      '645dd509-022e-4066-98db-cbf38f6569df',
      { 
        password: '6934544241Aa',
        email_confirm: true  // Confirm the email
      }
    );

    if (error) {
      console.error('Error setting password:', error);
      return;
    }

    console.log('Password set and email confirmed successfully!');
    console.log('User:', data.user?.email);
    console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
  } catch (err) {
    console.error('Error:', err);
  }
}

setAdminPassword();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminAccount() {
  try {
    const email = 'v.karagiannisplanb@gmail.com';
    const password = '9j544an82K8';

    // Create user in Supabase Auth using Admin API
    console.log('Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true  // Confirm the email automatically
    });

    if (authError) {
      console.error('Error creating user in Auth:', authError);
      return;
    }

    if (!authData.user) {
      console.error('No user returned from Auth creation');
      return;
    }

    console.log('User created in Auth:', authData.user.id, authData.user.email);

    // Create user record in users table with admin role
    console.log('Creating user record in database with admin role...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
        id: authData.user.id,
        email: email,
        role: 'admin'
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (userError) {
      console.error('Error creating user record:', userError);
      // Try to delete the auth user if database insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return;
    }

    console.log('Admin account created successfully!');
    console.log('User ID:', userData.id);
    console.log('Email:', userData.email);
    console.log('Role:', userData.role);
  } catch (err) {
    console.error('Error:', err);
  }
}

createAdminAccount();


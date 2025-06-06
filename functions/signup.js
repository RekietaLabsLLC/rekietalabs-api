import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Sign up a new user and store first + last name
 */
export async function signUp({ email, password, firstName, lastName }) {
  // 1. Sign up user with email & password
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // 2. Insert first and last name into 'users' table linked to new user's id
  const { user } = signUpData;
  const { error: dbError } = await supabase.from('users').insert([
    {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
    },
  ]);

  if (dbError) {
    return { error: dbError.message };
  }

  return { message: 'User signed up successfully', userId: user.id };
}

// Example usage (uncomment to test)
// signUp({ email: 'test@example.com', password: 'password123', firstName: 'John', lastName: 'Doe' })
//   .then(console.log)
//   .catch(console.error);

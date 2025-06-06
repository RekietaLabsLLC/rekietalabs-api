// Import dependencies
import express from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Express app
const app = express();
app.use(express.json()); // Allows us to parse JSON in POST requests

// Initialize Supabase client with Render env vars
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Signup endpoint
app.post('/signup', async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  // Basic validation
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });

    if (error) {
      console.error('Supabase signup error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Success!
    return res.status(200).json({ message: 'User created successfully.', user: data.user });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
});

// Start server on required port
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 MyLabs Signup API running on port ${port}`);
});

// functions/login.js
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 10001;

// Supabase keys from your Render Environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(bodyParser.json());

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = data.user;
    const session = data.session;

    return res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata.first_name,
        last_name: user.user_metadata.last_name,
      },
      token: session.access_token,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 MyLabs Login API running on port ${port}`);
});

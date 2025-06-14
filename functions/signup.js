// functions/signup.js
import express from 'express';
import { supabase } from './supabaseClient.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'User created. Please confirm your email.',
      user: data.user,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;

import express from 'express';
import { supabase } from './supabaseClient.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: 'User signed up successfully',
    user: data.user,
  });
});

export default router;

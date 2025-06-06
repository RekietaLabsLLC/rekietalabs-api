import express from 'express';
import { supabase } from './supabaseClient.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res.json({
    message: 'User logged in successfully',
    user: data.user,
  });
});

export default router;

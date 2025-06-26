// functions/signup.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post('/', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: Create Supabase user (do NOT confirm email automatically)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { first_name, last_name }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const user = data.user;

    // Step 2: Send to Make webhook for email delivery
    const webhookResponse = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        user_id: user.id,
        first_name
      })
    });

    if (!webhookResponse.ok) {
      console.error('Webhook failed:', await webhookResponse.text());
      return res.status(500).json({ error: 'Failed to send confirmation email' });
    }

    return res.status(200).json({
      message: 'User created successfully. Please check your email to confirm your account.',
      user_id: user.id
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fetch from 'node-fetch';

dotenv.config();
const router = express.Router();

// Initialize Supabase client with service role to prevent auto-verification
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
    // Step 1: Create the user (unverified)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name, last_name },
      email_confirm: false, // Disable auto verification
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const user = data.user;

    // Step 2: Create a token (expires in 15 minutes)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store token in user_metadata
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        email_token: token,
        email_token_expiry: expiresAt
      }
    });

    // Step 3: Send email via Make webhook
    await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Verify your RekietaLabs account',
        first_name,
        confirm_link: `https://accounts.rekietalabs.com/email/confirm?email=${encodeURIComponent(email)}&token=${token}&uid=${user.id}`
      })
    });

    return res.status(200).json({
      message: 'User created. Please check your email to confirm your account.',
      user_id: user.id
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

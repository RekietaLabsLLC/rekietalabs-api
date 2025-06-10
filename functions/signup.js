// functions/signup.js

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Supabase config
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Email transporter config
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // true if using port 465 (recommended for Zoho)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

router.post('/', async (req, res) => {
  const { first_name, last_name, email, password } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Create user in Supabase
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // We want the user to confirm via email we send
      user_metadata: {
        first_name,
        last_name,
      },
    });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Create the confirmation link (custom — you will handle the frontend part)
    const confirmLink = `https://your-frontend-site.com/verify-email?email=${encodeURIComponent(email)}`;

    // Send confirmation email
    await transporter.sendMail({
      from: `"RekietaLabs No-Reply" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify your RekietaLabs Account',
      text: `Hello ${first_name},

Please verify your RekietaLabs account by clicking the link below:

${confirmLink}

If you did not request this, please ignore this email.

Thank you,
RekietaLabs Team`,
    });

    res.json({
      message: 'User created successfully. Verification email sent.',
      user,
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

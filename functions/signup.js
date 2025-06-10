import { createClient } from '@supabase/supabase-js';
import express from 'express';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

router.post('/', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: false,  // Let Supabase handle confirmation via SMTP
      user_metadata: {
        first_name,
        last_name,
      },
      email_confirm_redirect_to: process.env.EMAIL_CONFIRM_REDIRECT || 'https://your-frontend-site.com/confirm',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(201).json({
      message: 'User created successfully. Please check your email to confirm your account.',
      user: data.user,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

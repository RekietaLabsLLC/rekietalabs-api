import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const makeWebhookUrl = 'https://hook.us2.make.com/adb3g76va111srplut8i7wj5pcz856y2';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

router.post('/', async (req, res) => {
  const { email, password, first_name, last_name } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Step 1: Create account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    const user = data.user;

    // Step 2: Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

    // Step 3: Store token in Supabase table
    const { error: insertError } = await adminSupabase
      .from('email_tokens')
      .insert([{ email, token, user_id: user.id, expires_at }]);

    if (insertError) {
      console.error('Token insert error:', insertError);
      return res.status(500).json({ error: 'Failed to store token' });
    }

    // Step 4: Send confirmation email via Make
    await axios.post(makeWebhookUrl, {
      email,
      first_name,
      last_name,
      token,
      user_id: user.id,
      confirmation_url: `https://accounts.rekietalabs.com/email/confirm?${encodeURIComponent(email)}?${token}?${user.id}`
    });

    return res.status(200).json({
      message: 'User created. Please confirm your email using the link sent.',
      user: user
    });

  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

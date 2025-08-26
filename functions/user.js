import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Create Supabase client with service role key (server-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /mylabs/user
// Returns logged-in user info based on HTTP-only cookie
router.get('/', async (req, res) => {
  try {
    const token = req.cookies['mylabs_access_token'];

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify session using Supabase auth
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Send safe user info
    const userInfo = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      provider: user.user_metadata?.provider || null,
    };

    return res.status(200).json({ user: userInfo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

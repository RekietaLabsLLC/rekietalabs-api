// ./functions/oauth.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /oauth?provider=<provider_id>
router.get('/', async (req, res) => {
  try {
    const providerId = req.query.provider;
    if (!providerId) return res.status(400).json({ error: 'Provider not specified' });

    // Get provider metadata
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .limit(1);

    if (providerError || !providers || providers.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = providers[0];

    // Get user ID from session cookie (replace with your auth logic)
    const sessionToken = req.headers.cookie?.split('mylabs_session=')[1];
    let userId = null;
    if (sessionToken) {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      if (!error && user) userId = user.id;
    }

    // Check if user has provider linked
    let is_linked = false;
    if (userId) {
      const { data: linked } = await supabase
        .from('user_providers')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .limit(1);

      is_linked = linked && linked.length > 0;
    }

    res.json({
      name: provider.name,
      logo_url: provider.logo_url,
      external_settings_url: provider.external_settings_url,
      is_linked
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

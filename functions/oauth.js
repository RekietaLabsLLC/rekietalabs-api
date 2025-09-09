// oauth.js
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// GET /oauth?provider=<provider_id>
app.get('/', async (req, res) => {
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

    // Example: get user ID from session cookie
    const sessionToken = req.headers.cookie?.split('mylabs_session=')[1];
    let userId = null;
    if (sessionToken) {
      const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
      if (!error && user) userId = user.id;
    }

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

// Start the server if this file is run directly
const PORT = process.env.PORT || 10001;
app.listen(PORT, () => {
  console.log(`OAuth API running on port ${PORT}`);
});

export default app;

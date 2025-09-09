import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(cors());

// Initialize Supabase client using environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware to get logged-in user (example using session cookie)
// Replace with your actual session logic
const getUserIdFromSession = async (req) => {
  const sessionToken = req.headers.cookie?.split('mylabs_session=')[1];
  if (!sessionToken) return null;

  const { data: { user }, error } = await supabase.auth.getUser(sessionToken);
  if (error || !user) return null;
  return user.id;
};

// GET /OAuth?provider=<provider_id>
app.get('/OAuth', async (req, res) => {
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

    // Get current logged-in user
    const userId = await getUserIdFromSession(req);

    let is_linked = false;
    if (userId) {
      const { data: linked, error: linkError } = await supabase
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OAuth API running on port ${PORT}`);
});

import express from 'express';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const router = express.Router();

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Allowed origins
const allowedOrigins = [
  'https://accounts.rekietalabs.com',
  'https://market.rekietalabs.com',
  'https://giftcard.hub.rekietalabs.com',
  'https://customer.portal.hub.rekietalabs.com',
  'https://staff.portal.hub.rekietalabs.com',
];

// Middleware for CORS
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

// -----------------------------
// POST /plan-pick
// -----------------------------
// Body: { user_id: string, plan: 'basic' | 'premium', email: string }
router.post('/', async (req, res) => {
  try {
    const { user_id, plan, email } = req.body;

    if (!user_id || !plan || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user exists in Supabase
    const { data: userData, error: userError } = await supabase
      .from('mylabs_users')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Staff override: staff users automatically get premium
    let finalPlan = plan;
    if (userData.is_staff) {
      finalPlan = 'premium';
    }

    // Map plan to Stripe Price IDs
    const priceMap = {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    };

    const stripePriceId = priceMap[finalPlan];
    if (!stripePriceId) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `https://accounts.rekietalabs.com/mylabs/dashboard`,
      cancel_url: `https://accounts.rekietalabs.com/mylabs/pick-plan?cancelled=true`,
      metadata: {
        user_id,
        selected_plan: finalPlan,
      },
    });

    // Save intended plan in Supabase (pending Stripe confirmation)
    const { error: updateError } = await supabase
      .from('mylabs_users')
      .update({ pending_plan: finalPlan })
      .eq('id', user_id);

    if (updateError) {
      console.error('Failed to update pending plan:', updateError);
    }

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// /functions/mylabs-plan-pick.js
import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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
  "https://accounts.rekietalabs.com",
  "https://market.rekietalabs.com",
  "https://giftcard.hub.rekietalabs.com",
  "https://customer.portal.hub.rekietalabs.com",
  "https://staff.portal.hub.rekietalabs.com",
];

// CORS middleware
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  next();
});

// POST /plan-pick
// Body: { user_id: string, plan: 'basic' | 'premium', email: string }
router.post("/", async (req, res) => {
  try {
    const { user_id, plan, email } = req.body;
    if (!user_id || !plan || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Fetch subscription row
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: "User subscription not found" });
    }

    // Staff override: automatically premium
    let finalPlan = plan;
    if (subscription.is_staff) {
      finalPlan = "premium";
    }

    // Map to Stripe Price IDs
    const priceMap = {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    };
    const stripePriceId = priceMap[finalPlan];
    if (!stripePriceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `https://accounts.rekietalabs.com/mylabs/dashboard`,
      cancel_url: `https://accounts.rekietalabs.com/mylabs/pick-plan?cancelled=true`,
      metadata: {
        user_id,
        selected_plan: finalPlan,
      },
    });

    // Save pending plan in Supabase
    const { error: updateError } = await supabase
      .from("user_subscriptions")
      .update({ plan: finalPlan })
      .eq("user_id", user_id);

    if (updateError) console.error("Failed to update subscription:", updateError);

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

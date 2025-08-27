// /functions/mylabs-plan-pick.js
import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const router = express.Router();

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Allowed origins
const allowedOrigins = [
  "https://accounts.rekietalabs.com",
  "https://market.rekietalabs.com",
  "https://giftcard.hub.rekietalabs.com",
  "https://customer.portal.hub.rekietalabs.com",
  "https://staff.portal.hub.rekietalabs.com",
];

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
router.post("/", async (req, res) => {
  try {
    const { user_id, plan, email } = req.body;

    if (!user_id || !plan || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user exists in mylabs_users
    const { data: profile, error: profileError } = await supabase
      .from("mylabs_users")
      .select("id, is_staff")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User not found in mylabs_users" });
    }

    // Staff override
    let finalPlan = plan;
    if (profile.is_staff) {
      finalPlan = "premium";
    }

    // Stripe price IDs
    const priceMap = {
      basic: process.env.STRIPE_BASIC_PRICE_ID,
      premium: process.env.STRIPE_PREMIUM_PRICE_ID,
    };

    const stripePriceId = priceMap[finalPlan];
    if (!stripePriceId) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `https://accounts.rekietalabs.com/mylabs/dashboard`,
      cancel_url: `https://accounts.rekietalabs.com/mylabs/pick-plan?cancelled=true`,
      metadata: { user_id, plan: finalPlan },
    });

    // Upsert subscription row
    const { error: subError } = await supabase.from("user_subscriptions").upsert(
      {
        user_id,
        plan: finalPlan,
        stripe_customer_id: null, // set later by webhook
        stripe_subscription_id: null,
        current_period_end: null,
        is_staff: profile.is_staff || false,
      },
      { onConflict: "user_id" }
    );

    if (subError) {
      console.error("Failed to upsert subscription:", subError);
    }

    res.json({ checkout_url: session.url });
  } catch (err) {
    console.error("plan-pick error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

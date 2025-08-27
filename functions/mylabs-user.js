// /functions/mylabs-user.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const router = express.Router();
router.use(cookieParser());

// Initialize Supabase client with Service Role Key (server-side only)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.get("/", async (req, res) => {
  try {
    const token = req.cookies["mylabs-session"];
    if (!token) {
      return res.status(401).json({ error: "No session found" });
    }

    // Get user from Supabase
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    // Fetch subscription info from user_subscriptions
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, user_id, plan, is_staff, stripe_customer_id, stripe_subscription_id, current_period_end")
      .eq("user_id", userData.user.id)
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: "Subscription not found for this user" });
    }

    res.json({
      id: userData.user.id,
      name: userData.user.user_metadata?.full_name || userData.user.email,
      email: userData.user.email,
      plan: subscription.plan,
      isStaff: subscription.is_staff,
      stripeCustomerId: subscription.stripe_customer_id || null,
      stripeSubscriptionId: subscription.stripe_subscription_id || null,
      currentPeriodEnd: subscription.current_period_end || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

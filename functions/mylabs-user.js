// /functions/mylabs-user.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const router = express.Router();
router.use(cookieParser());

// Supabase (service role)
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

    // Verify Supabase user
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const userId = userData.user.id;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("mylabs_users")
      .select("id, full_name, email, is_staff")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User not found in mylabs_users" });
    }

    // Get subscription info
    const { data: subData, error: subError } = await supabase
      .from("user_subscriptions")
      .select("plan, current_period_end, is_staff")
      .eq("user_id", userId)
      .single();

    if (subError && subError.code !== "PGRST116") {
      console.error("Subscription fetch error:", subError);
      return res.status(500).json({ error: "Failed to fetch subscription" });
    }

    res.json({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      isStaff: profile.is_staff || subData?.is_staff || false,
      plan: subData?.plan || "none",
      subscription: subData || null,
    });
  } catch (err) {
    console.error("mylabs-user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

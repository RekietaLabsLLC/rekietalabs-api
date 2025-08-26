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
    const token = req.cookies["mylabs-session"]; // or wherever your login sets it
    if (!token) {
      return res.status(401).json({ error: "No session found" });
    }

    // Get user from Supabase using the service role key
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData.user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    // Fetch extra user info from your users table
    const { data: userInfo, error: infoError } = await supabase
      .from("mylabs_users")
      .select("id, full_name, email, plan_type, is_staff")
      .eq("id", userData.user.id)
      .single();

    if (infoError || !userInfo) {
      return res.status(404).json({ error: "User not found in database" });
    }

    // Return only safe info
    res.json({
      id: userInfo.id,
      name: userInfo.full_name,
      email: userInfo.email,
      plan: userInfo.plan_type,
      isStaff: userInfo.is_staff || false,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

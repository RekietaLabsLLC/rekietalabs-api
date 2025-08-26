import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Public config endpoint for login
router.get("/", (req, res) => {
  res.set("Cache-Control", "no-store"); // prevent caching
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY, // expose ONLY anon key
  });
});

export default router;

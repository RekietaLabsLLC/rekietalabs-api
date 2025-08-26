import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Allowed origins for this route only
const allowedOrigins = [
  "https://accounts.rekietalabs.com",
  "https://market.rekietalabs.com",
  "https://giftcard.hub.rekietalabs.com",
  "https://customer.portal.hub.rekietalabs.com",
  "https://staff.portal.hub.rekietalabs.com",
];

router.get("/", (req, res) => {
  const origin = req.headers.origin;

  // Block if origin not in whitelist
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed" });
  }

  res.set("Cache-Control", "no-store"); // avoid stale keys
  res.set("Access-Control-Allow-Origin", origin || ""); // explicitly allow the request origin
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});

export default router;

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

dotenv.config();

const router = express.Router();
router.use(cookieParser());

// Allowed origins for this route only
const allowedOrigins = [
  "https://accounts.rekietalabs.com",
  "https://accounts.rekietalabs.com/mylabs/login",
  "https://accounts.rekietalabs.com/mylabs/pick-plan",
  "https://market.rekietalabs.com",
  "https://giftcard.hub.rekietalabs.com",
  "https://customer.portal.hub.rekietalabs.com",
  "https://staff.portal.hub.rekietalabs.com",
];

// GET route to provide Supabase config
router.get("/", (req, res) => {
  const origin = req.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed" });
  }

  res.set("Cache-Control", "no-store");
  res.set("Access-Control-Allow-Origin", origin || "");
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  });
});

// POST route to store GitHub token in secure cookie
router.post("/github-token", (req, res) => {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: "Forbidden: Origin not allowed" });
  }

  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: "Missing access token" });

  // Set HTTP-only, Secure cookie
  res.cookie("github_token", access_token, {
    httpOnly: true,
    secure: true, // only for HTTPS
    sameSite: "Strict",
    maxAge: 3600 * 1000, // 1 hour
  });

  res.set("Access-Control-Allow-Origin", origin || "");
  res.json({ message: "Token stored successfully" });
});

export default router;

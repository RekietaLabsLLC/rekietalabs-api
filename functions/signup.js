// functions/signup.js
import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Supabase admin client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reconstruct PUBLIC KEY for encryption
const PUBLIC_KEY =
  "-----BEGIN PUBLIC KEY-----\n" +
  process.env.PUBLIC_KEY +
  "\n-----END PUBLIC KEY-----";

router.post("/", async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ error: "Missing fields." });
    }

    // 1. Encrypt password using public key
    const encryptedPassword = crypto
      .publicEncrypt(
        {
          key: PUBLIC_KEY,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(password)
      )
      .toString("base64");

    // 2. Generate 6-digit code
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Insert into pending_signups table
    const { error: insertErr } = await supabase
      .from("pending_signups")
      .insert([
        {
          email,
          encrypted_password: encryptedPassword,
          first_name,
          last_name,
          verify_code: verifyCode,
          attempts_left: 3,
        },
      ]);

    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: "Database insert failed." });
    }

    // 4. Build verify URL
    const verifyUrl =
      `https://accounts.rekietalabs.com/mylabs/verify` +
      `?email=${encodeURIComponent(email)}`;

    // 5. Send email through Zoho API
    const emailResp = await fetch(process.env.ZOHO_SEND_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "Your MyLabs Verification Code",
        message: `Hi ${first_name},

Your MyLabs verification code is:

${verifyCode}

Enter this on the verification screen to finish creating your account.`,
      }),
    });

    if (!emailResp.ok) {
      console.error(await emailResp.text());
      return res.status(500).json({ error: "Email send failed." });
    }

    return res.status(200).json({
      message: "Signup started. Code sent.",
      redirect: verifyUrl,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;

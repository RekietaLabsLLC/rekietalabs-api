// functions/pos.js
import express from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

dotenv.config();
const router = express.Router();

// --- GitHub Setup ---
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_POS;
const stockPath = 'pos-stock.json';

// --- Employee PINs ---
const pins = ["7606", "4646"];

// --- Update stock.json in GitHub ---
async function updateStock(newStock) {
  const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path: stockPath
  });
  const sha = res.data.sha;
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path: stockPath,
    message: 'Update stock from POS',
    content: Buffer.from(JSON.stringify(newStock, null, 2)).toString('base64'),
    sha
  });
}

// --- Email Setup ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ORDERS_USER,
    pass: process.env.ORDERS_PASS
  }
});

async function sendEmail(to, subject, body) {
  try {
    await transporter.sendMail({
      from: process.env.ORDERS_USER,
      to,
      subject,
      text: body
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

// --- POS Route ---
router.post('/', async (req, res) => {
  const { action, pin, email, items, payment } = req.body;

  try {
    // --- PIN Validation ---
    if (action === 'validate-pin') {
      if (pins.includes(pin)) {
        return res.json({ success: true });
      } else {
        return res.json({ success: false });
      }
    }

    // --- Checkout ---
    if (action === 'checkout') {
      if (!items || items.length === 0)
        return res.json({ success: false, message: "Cart is empty" });

      // Load current stock
      const stockRes = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
        owner, repo, path: stockPath
      });
      const stockData = JSON.parse(Buffer.from(stockRes.data.content, 'base64').toString());

      // Update stock
      for (const cartItem of items) {
        const prod = stockData.find(p => p.name === cartItem.name);
        if (!prod) return res.json({ success: false, message: `Product not found: ${cartItem.name}` });
        if (cartItem.qty > prod.stock) return res.json({ success: false, message: `Insufficient stock for: ${cartItem.name}` });
        prod.stock -= cartItem.qty;
      }

      // Save updated stock to GitHub
      await updateStock(stockData);

      // Generate receipt link
      const receiptId = crypto.randomBytes(6).toString('hex');
      const receiptUrl = `https://receipts.rekietalabs.com/market/${receiptId}`;

      // Send receipt email if provided
      if (email) {
        const body = `Thank you for your purchase!\n\nPayment type: ${payment}\nReceipt: ${receiptUrl}`;
        await sendEmail(email, 'Your RekietaLabs POS Receipt', body);
      }

      return res.json({ success: true, receiptUrl });
    }

    return res.json({ success: false, message: "Unknown action" });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: "Server error" });
  }
});

export default router;

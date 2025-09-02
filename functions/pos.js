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
const stockOwner = process.env.GITHUB_REPO_OWNER;
const stockRepo = process.env.GITHUB_REPO_POS;
const stockPath = 'pos-stock.json';

const receiptOwner = 'RekietaLabsLLC';
const receiptRepo = 'RekietaLabs-Receipts';
const receiptFolder = 'market';

// --- Employee PINs from API ---
const pins = ["7606", "4646"];

// --- Update stock.json in GitHub ---
async function updateStock(newStock) {
  const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: stockOwner,
    repo: stockRepo,
    path: stockPath
  });
  const sha = res.data.sha;
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: stockOwner,
    repo: stockRepo,
    path: stockPath,
    message: 'Update stock from POS',
    content: Buffer.from(JSON.stringify(newStock, null, 2)).toString('base64'),
    sha
  });
}

// --- Email Setup ---
const transporter = nodemailer.createTransport({
  service: 'zoho',
  auth: {
    user: process.env.ORDERS_USER,
    pass: process.env.ORDERS_PASS
  }
});

async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: process.env.ORDERS_USER,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

// --- Create Receipt HTML in Receipts Repo ---
async function createReceiptHTML(items, total, payment, receiptId) {
  const htmlContent = `
  <html>
  <head>
    <meta charset="UTF-8">
    <title>Receipt ${receiptId}</title>
    <style>
      body { font-family: Arial,sans-serif; background: #0a0a0a; color: #fff; padding: 30px; }
      h1 { color: #1753aa; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #fff; padding: 8px; text-align: left; }
      th { background: #1753aa; color: #fff; }
      a.button { display:inline-block; padding:10px 20px; background:#1753aa; color:#fff; text-decoration:none; border-radius:6px; margin-top:20px; }
    </style>
  </head>
  <body>
    <img src="https://rekietalabs.com/IMG_0926.jpeg" style="width:80px; border-radius:50%;">
    <h1>Thank you for your purchase!</h1>
    <p>Payment Method: ${payment}</p>
    <table>
      <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
      ${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${(i.price*i.qty).toFixed(2)}</td></tr>`).join('')}
      <tr><td colspan="2"><strong>Total</strong></td><td>$${total.toFixed(2)}</td></tr>
    </table>
    <p><a class="button" href="#">Download as PDF</a></p>
  </body>
  </html>
  `;

  // Commit to GitHub
  const path = `${receiptFolder}/${receiptId}.html`;
  const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner: receiptOwner,
    repo: receiptRepo,
    path
  }).catch(()=>null);

  const sha = res?.data?.sha;
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner: receiptOwner,
    repo: receiptRepo,
    path,
    message: `Create receipt ${receiptId}`,
    content: Buffer.from(htmlContent).toString('base64'),
    sha
  });

  return `https://receipts.rekietalabs.com/market/${receiptId}`;
}

// --- POS Route ---
router.post('/', async (req, res) => {
  const { action, pin, items, payment, email } = req.body;

  try {
    // PIN validation
    if(action === 'validate-pin') {
      return res.json({ success: pins.includes(pin) });
    }

    // Checkout
    if(action === 'checkout') {
      if(!items || items.length===0) return res.json({ success:false, message:"Cart is empty" });

      // Load stock
      const stockRes = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner: stockOwner, repo: stockRepo, path: stockPath });
      const stockData = JSON.parse(Buffer.from(stockRes.data.content,'base64').toString());

      // Compute total and check stock
      let total = 0;
      for(const cartItem of items) {
        const prod = stockData.find(p=>p.name===cartItem.name);
        if(!prod) return res.json({ success:false, message:`Product not found: ${cartItem.name}`});
        if(cartItem.qty>prod.stock) return res.json({ success:false, message:`Insufficient stock for: ${cartItem.name}`});
        total += cartItem.qty*prod.price;
      }

      // Update stock **after successful checkout**
      for(const cartItem of items) {
        const prod = stockData.find(p=>p.name===cartItem.name);
        prod.stock -= cartItem.qty;
      }
      await updateStock(stockData);

      // Create receipt
      const receiptId = crypto.randomBytes(6).toString('hex');
      const receiptUrl = await createReceiptHTML(items, total, payment, receiptId);

      // Send email
      if(email) {
        const html = `
          <div style="font-family:Arial,sans-serif; color:#fff; background:#0a0a0a; padding:20px; text-align:center;">
            <img src="https://rekietalabs.com/IMG_0926.jpeg" style="width:80px; border-radius:50%; margin-bottom:15px;">
            <h2 style="color:#1753aa;">Thank you for your purchase!</h2>
            <p>Payment: ${payment}</p>
            <h3>Total: $${total.toFixed(2)}</h3>
            <p><a href="${receiptUrl}" style="color:#fff; background:#1753aa; padding:10px 20px; border-radius:8px; text-decoration:none;">View Receipt</a></p>
          </div>`;
        await sendEmail(email, "Your RekietaLabs Receipt", html);
      }

      return res.json({ success:true, receiptUrl });
    }

    return res.json({ success:false, message:"Unknown action" });

  } catch(err) {
    console.error(err);
    return res.json({ success:false, message:"Server error" });
  }
});

export default router;

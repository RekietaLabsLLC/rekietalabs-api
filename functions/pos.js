import express from 'express';
import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

dotenv.config();
const router = express.Router();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = process.env.GITHUB_REPO_OWNER;
const repo = process.env.GITHUB_REPO_POS;
const stockPath = 'pos-stock.json';

// Employee PINs
const pins = ["7606","4646"];

async function updateStock(newStock){
  const res = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path: stockPath
  });
  const sha = res.data.sha;
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner, repo, path: stockPath,
    message: 'Update stock from POS',
    content: Buffer.from(JSON.stringify(newStock,null,2)).toString('base64'),
    sha
  });
}

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
  } catch(err){
    console.error("Failed to send email:", err);
  }
}

router.post('/', async (req,res)=>{
  const { action, pin, items, payment, email } = req.body;
  try{
    if(action === 'validate-pin'){
      return res.json({ success: pins.includes(pin) });
    }

    if(action === 'checkout'){
      if(!items || items.length === 0)
        return res.json({ success:false, message:"Cart is empty" });

      const stockRes = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', { owner, repo, path: stockPath });
      const stockData = JSON.parse(Buffer.from(stockRes.data.content,'base64').toString());

      let total = 0;
      for(const cartItem of items){
        const prod = stockData.find(p=>p.name===cartItem.name);
        if(!prod) return res.json({ success:false, message:`Product not found: ${cartItem.name}` });
        if(cartItem.qty>prod.stock) return res.json({ success:false, message:`Insufficient stock for: ${cartItem.name}` });
        prod.stock -= cartItem.qty;
        total += cartItem.qty * prod.price;
      }

      await updateStock(stockData);

      const receiptId = crypto.randomBytes(6).toString('hex');
      const receiptUrl = `https://receipts.rekietalabs.com/market/${receiptId}`;

      if(email){
        const html = `
          <div style="font-family:Arial,sans-serif; color:#1753aa; text-align:center; padding:20px; background:#0a0a0a;">
            <img src="https://rekietalabs.com/IMG_0926.jpeg" style="width:100px; border-radius:50%; margin-bottom:20px;">
            <h2>Thank you for your purchase!</h2>
            <p>Payment: ${payment}</p>
            <h3>Total: $${total.toFixed(2)}</h3>
            <p><a href="${receiptUrl}" style="color:#ffffff; background:#1753aa; padding:10px 20px; border-radius:8px; text-decoration:none;">View Receipt</a></p>
          </div>`;
        await sendEmail(email, "Your RekietaLabs Receipt", html);
      }

      return res.json({ success:true, receiptUrl });
    }

    return res.json({ success:false, message:"Unknown action" });

  }catch(err){
    console.error(err);
    return res.json({ success:false, message:"Server error" });
  }
});

export default router;

import express from 'express';
import { Low, JSONFile } from 'lowdb';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '../db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { tickets: [] };
  await db.write();
}

// Utility to generate random ID
function generateId() {
  return crypto.randomBytes(8).toString('hex');
}

// Setup transporter (use your env vars for Zoho)
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS,
  },
});

router.use(async (req, res, next) => {
  await initDB();
  next();
});

// Create ticket endpoint
router.post('/create', async (req, res) => {
  const { email, subject, description } = req.body;
  if (!email || !subject || !description)
    return res.status(400).json({ error: "Missing required fields" });

  const id = generateId();
  const newTicket = {
    id,
    email,
    subject,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
    messages: [],
  };
  db.data.tickets.push(newTicket);
  await db.write();

  // Send notification email (optional)
  transporter.sendMail({
    from: `"RekietaLabs Support" <${process.env.ZOHO_USER}>`,
    to: process.env.ZOHO_USER,
    subject: `New Ticket #${id}: ${subject}`,
    text: `New ticket created:\nSubject: ${subject}\nDescription: ${description}\nFrom: ${email}`,
  }).catch(console.error);

  res.json({ success: true, ticketId: id });
});

// Get ticket by ID + email for security
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { email } = req.query;
  const ticket = db.data.tickets.find(t => t.id === id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.email !== email) return res.status(403).json({ error: "Unauthorized" });
  res.json(ticket);
});

// Add more endpoints as needed...

export default router;

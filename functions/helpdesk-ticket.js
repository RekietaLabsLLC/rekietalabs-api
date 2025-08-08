// functions/helpdesk-ticket.js
import express from "express";
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import nodemailer from "nodemailer";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "../db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDB() {
  await db.read();
  db.data ||= { tickets: [] };
  await db.write();
}

// Generate a secure random ticket ID
function generateId() {
  return crypto.randomBytes(8).toString("hex");
}

// Admin PIN middleware
function checkAdminPin(req, res, next) {
  const pin = req.headers["x-admin-pin"] || req.query.pin;
  if (pin === process.env.ADMIN_PIN) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized: Invalid PIN" });
  }
}

// Nodemailer transporter with Zoho SMTP
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

// Create new ticket
router.post("/create", async (req, res) => {
  const { email, subject, description } = req.body;
  if (!email || !subject || !description)
    return res.status(400).json({ error: "Missing required fields" });

  const id = generateId();
  const ticket = {
    id,
    email,
    subject,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  db.data.tickets.push(ticket);
  await db.write();

  // Send notification email to support
  const mailOptions = {
    from: `"RekietaLabs Support" <${process.env.ZOHO_USER}>`,
    to: process.env.ZOHO_USER,
    subject: `New Support Ticket #${id}: ${subject}`,
    text: `New ticket created:\n\nSubject: ${subject}\nDescription: ${description}\nFrom: ${email}\n\nView ticket: ${process.env.SITE_URL}/helpdesk/ticket/status=open&ticketid=${id}`,
  };

  transporter.sendMail(mailOptions).catch(console.error);

  res.json({ success: true, ticketId: id });
});

// Get ticket by ID with email verification
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const email = req.query.email;
  const ticket = db.data.tickets.find((t) => t.id === id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });
  if (ticket.email !== email)
    return res.status(403).json({ error: "Email does not match ticket owner" });
  res.json(ticket);
});

// Admin: Get all tickets (PIN protected)
router.get("/admin/all", checkAdminPin, async (req, res) => {
  res.json(db.data.tickets);
});

// Admin: Add a message to a ticket (reply)
router.post("/admin/:id/message", checkAdminPin, async (req, res) => {
  const id = req.params.id;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const ticket = db.data.tickets.find((t) => t.id === id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const msgObj = {
    id: generateId(),
    sender: "support",
    message,
    createdAt: new Date().toISOString(),
  };

  ticket.messages.push(msgObj);
  ticket.updatedAt = new Date().toISOString();
  await db.write();

  // Notify user by email
  const mailOptions = {
    from: `"RekietaLabs Support" <${process.env.ZOHO_USER}>`,
    to: ticket.email,
    subject: `Update on your ticket #${ticket.id}: ${ticket.subject}`,
    text: `Support replied:\n\n${message}\n\nView your ticket: ${process.env.SITE_URL}/helpdesk/ticket/status=${ticket.status}&ticketid=${ticket.id}`,
  };
  transporter.sendMail(mailOptions).catch(console.error);

  res.json({ success: true, message: msgObj });
});

export default router;

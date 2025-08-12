import express from 'express';
import { Octokit } from '@octokit/rest';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const router = express.Router();

const {
  GITHUB_TOKEN,
  GITHUB_REPO_OWNER,
  GITHUB_REPO_NAME,
  SUPPORT_SYSTEM_SMTP_HOST,
  SUPPORT_SYSTEM_SMTP_PORT,
  SUPPORT_SYSTEM_SMTP_USER,
  SUPPORT_SYSTEM_SMTP_PASS,
  TICKET_LINK_BASE,
} = process.env;

if (
  !GITHUB_TOKEN ||
  !GITHUB_REPO_OWNER ||
  !GITHUB_REPO_NAME ||
  !SUPPORT_SYSTEM_SMTP_HOST ||
  !SUPPORT_SYSTEM_SMTP_PORT ||
  !SUPPORT_SYSTEM_SMTP_USER ||
  !SUPPORT_SYSTEM_SMTP_PASS ||
  !TICKET_LINK_BASE
) {
  throw new Error('Missing required environment variables for tickets module');
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const transporter = nodemailer.createTransport({
  host: SUPPORT_SYSTEM_SMTP_HOST,
  port: Number(SUPPORT_SYSTEM_SMTP_PORT),
  secure: true,
  auth: {
    user: SUPPORT_SYSTEM_SMTP_USER,
    pass: SUPPORT_SYSTEM_SMTP_PASS,
  },
});

// Utility: create random username/password
function generateRandomCredentials() {
  return {
    username: crypto.randomBytes(4).toString('hex'),
    password: crypto.randomBytes(6).toString('hex'),
  };
}

// Utility: get base64 content for file upload
function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

// Generate ticket ID (timestamp + random)
function generateTicketId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rand = crypto.randomBytes(3).toString('hex');
  return `ticket-${ts}-${rand}`;
}

// Commit file to GitHub
async function commitFile(path, content, message) {
  let sha;
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path,
    });
    sha = data.sha;
  } catch {
    sha = undefined;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    path,
    message,
    content: toBase64(content),
    sha,
  });
}

router.post('/', async (req, res) => {
  /*
    Expected JSON body:
    {
      creator_email,
      subject,
      description,
      priority,
      creator_name
    }
  */

  // We do not check lock status here for brevity, add if needed

  const { creator_email, subject, description, priority, creator_name } = req.body;
  if (!creator_email || !subject || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ticketId = generateTicketId();
  const credentials = generateRandomCredentials();

  const newTicket = {
    id: ticketId,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    creator_email,
    creator_name: creator_name || '',
    subject,
    description,
    priority: priority || 'normal',
    assigned_to: null,
    messages: [
      {
        from: 'user',
        message: description,
        timestamp: new Date().toISOString(),
      },
    ],
    credentials,
  };

  try {
    const ticketPath = `tickets/${ticketId}/data.json`;
    await commitFile(ticketPath, JSON.stringify(newTicket, null, 2), `Create ticket ${ticketId}`);

    const supportUrl = `${TICKET_LINK_BASE}/ticket?ticketid=${ticketId}&supportstaff=unassigned`;

    await transporter.sendMail({
      from: `"RekietaLabs Support" <${SUPPORT_SYSTEM_SMTP_USER}>`,
      to: creator_email,
      subject: `Your Support Ticket ${ticketId}`,
      html: `
        <p>Hello ${creator_name || 'Customer'},</p>
        <p>Your support ticket has been created.</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p>You can view and reply to your ticket using the link below while it remains open:</p>
        <p><a href="${supportUrl}">${supportUrl}</a></p>
        <p><strong>Login Credentials:</strong></p>
        <ul>
          <li>Username: <code>${credentials.username}</code></li>
          <li>Password: <code>${credentials.password}</code></li>
        </ul>
        <p><em>Keep this email safe. If lost, you will need to create a new ticket.</em></p>
      `,
    });

    res.json({ message: 'Ticket created', ticketId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

export default router;

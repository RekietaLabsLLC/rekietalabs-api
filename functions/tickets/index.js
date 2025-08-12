// functions/tickets/index.js
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
  ADMIN_SECRET_KEY,
  STAFF_SECRET_KEY,
} = process.env;

if (
  !GITHUB_TOKEN ||
  !GITHUB_REPO_OWNER ||
  !GITHUB_REPO_NAME ||
  !SUPPORT_SYSTEM_SMTP_HOST ||
  !SUPPORT_SYSTEM_SMTP_PORT ||
  !SUPPORT_SYSTEM_SMTP_USER ||
  !SUPPORT_SYSTEM_SMTP_PASS ||
  !TICKET_LINK_BASE ||
  !ADMIN_SECRET_KEY ||
  !STAFF_SECRET_KEY
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

// Utilities
function generateRandomCredentials() {
  return {
    username: crypto.randomBytes(4).toString('hex'),
    password: crypto.randomBytes(6).toString('hex'),
  };
}

function toBase64(str) {
  return Buffer.from(str).toString('base64');
}

function safeJSONParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// GitHub helpers
async function getFileContent(path) {
  try {
    const response = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path,
    });
    const buff = Buffer.from(response.data.content, 'base64');
    return buff.toString('utf-8');
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

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

async function getLockStatus() {
  const raw = await getFileContent('lock-status.json');
  if (!raw) {
    return { ticket_site_locked: false, staff_portal_locked: false };
  }
  return safeJSONParse(raw) || { ticket_site_locked: false, staff_portal_locked: false };
}

async function updateLockStatus(newStatus) {
  const content = JSON.stringify(newStatus, null, 2);
  await commitFile('lock-status.json', content, 'Update lock status');
}

function generateTicketId() {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const rand = crypto.randomBytes(3).toString('hex');
  return `ticket-${ts}-${rand}`;
}

// Middleware
function checkAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || key !== ADMIN_SECRET_KEY) {
    return res.status(403).json({ error: 'Forbidden: admin only' });
  }
  next();
}

function checkStaffOrAdmin(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (key && key === ADMIN_SECRET_KEY) return next();
  const staffKey = req.headers['x-staff-key'];
  if (staffKey && staffKey === STAFF_SECRET_KEY) return next();
  return res.status(403).json({ error: 'Forbidden: staff or admin only' });
}

// Routes

// Get lock status
router.get('/lock-status', async (req, res) => {
  try {
    const status = await getLockStatus();
    res.json(status);
  } catch {
    res.status(500).json({ error: 'Failed to get lock status' });
  }
});

// Update lock status (admin only)
router.post('/lock-status/update', checkAdmin, async (req, res) => {
  const { ticket_site_locked, staff_portal_locked } = req.body;
  if (typeof ticket_site_locked !== 'boolean' || typeof staff_portal_locked !== 'boolean') {
    return res.status(400).json({ error: 'Invalid lock status values' });
  }
  try {
    await updateLockStatus({ ticket_site_locked, staff_portal_locked });
    res.json({ message: 'Lock status updated' });
  } catch {
    res.status(500).json({ error: 'Failed to update lock status' });
  }
});

// Create ticket
router.post('/create', async (req, res) => {
  const lockStatus = await getLockStatus();
  if (lockStatus.ticket_site_locked) {
    return res.status(423).json({ error: 'Ticket creation is currently locked' });
  }

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

// Get open tickets (staff/admin)
router.get('/open', checkStaffOrAdmin, async (req, res) => {
  try {
    const contents = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: 'tickets',
    });

    const tickets = [];
    for (const item of contents.data) {
      if (item.type === 'dir') {
        const dataRaw = await getFileContent(`tickets/${item.name}/data.json`);
        if (!dataRaw) continue;
        const ticketData = safeJSONParse(dataRaw);
        if (ticketData && ticketData.status === 'open') tickets.push(ticketData);
      }
    }

    res.json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch open tickets' });
  }
});

// Get closed tickets (admin only)
router.get('/closed', checkAdmin, async (req, res) => {
  try {
    const contents = await octokit.repos.getContent({
      owner: GITHUB_REPO_OWNER,
      repo: GITHUB_REPO_NAME,
      path: 'tickets',
    });

    const tickets = [];
    for (const item of contents.data) {
      if (item.type === 'dir') {
        const dataRaw = await getFileContent(`tickets/${item.name}/data.json`);
        if (!dataRaw) continue;
        const ticketData = safeJSONParse(dataRaw);
        if (ticketData && ticketData.status === 'closed') tickets.push(ticketData);
      }
    }

    res.json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch closed tickets' });
  }
});

// Get ticket by ID (auth required)
router.get('/:id', async (req, res) => {
  const ticketId = req.params.id;
  const { username, password } = req.headers;

  if (!username || !password) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    if (!ticket.credentials || ticket.credentials.username !== username || ticket.credentials.password !== password) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    if (ticket.status === 'closed') {
      return res.status(410).json({ error: 'Ticket is closed; access link invalidated' });
    }

    res.json({ ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

// Reply to ticket
router.post('/:id/reply', async (req, res) => {
  const ticketId = req.params.id;
  const { username, password, from, message } = req.body;

  if (!username || !password || !from || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['user', 'staff', 'admin'].includes(from)) {
    return res.status(400).json({ error: 'Invalid "from" field' });
  }

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    if (from === 'user') {
      if (!ticket.credentials || ticket.credentials.username !== username || ticket.credentials.password !== password) {
        return res.status(403).json({ error: 'Invalid credentials' });
      }
      if (ticket.status === 'closed') {
        return res.status(410).json({ error: 'Ticket is closed; cannot reply' });
      }
    }

    ticket.messages.push({
      from,
      message,
      timestamp: new Date().toISOString(),
    });
    ticket.updated_at = new Date().toISOString();

    await commitFile(`tickets/${ticketId}/data.json`, JSON.stringify(ticket, null, 2), `Reply added to ticket ${ticketId}`);

    res.json({ message: 'Reply added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Add internal note (staff/admin)
router.post('/:id/note', checkStaffOrAdmin, async (req, res) => {
  const ticketId = req.params.id;
  const { note } = req.body;

  if (!note) return res.status(400).json({ error: 'Note is required' });

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    if (!ticket.notes) ticket.notes = [];
    ticket.notes.push({
      note,
      author: 'staff',
      timestamp: new Date().toISOString(),
    });
    ticket.updated_at = new Date().toISOString();

    await commitFile(`tickets/${ticketId}/data.json`, JSON.stringify(ticket, null, 2), `Note added to ticket ${ticketId}`);

    res.json({ message: 'Note added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// Assign ticket (admin only)
router.post('/:id/assign', checkAdmin, async (req, res) => {
  const ticketId = req.params.id;
  const { assigned_to } = req.body;

  if (!assigned_to) return res.status(400).json({ error: 'assigned_to is required' });

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    ticket.assigned_to = assigned_to;
    ticket.updated_at = new Date().toISOString();

    await commitFile(`tickets/${ticketId}/data.json`, JSON.stringify(ticket, null, 2), `Ticket ${ticketId} assigned to ${assigned_to}`);

    res.json({ message: `Ticket assigned to ${assigned_to}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
});

// Close ticket (admin only)
router.post('/:id/close', checkAdmin, async (req, res) => {
  const ticketId = req.params.id;
  const { closed_by } = req.body;

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    ticket.status = 'closed';
    ticket.closed_at = new Date().toISOString();
    ticket.closed_by = closed_by || 'admin';
    ticket.updated_at = new Date().toISOString();

    await commitFile(`tickets/${ticketId}/data.json`, JSON.stringify(ticket, null, 2), `Ticket ${ticketId} closed`);

    res.json({ message: 'Ticket closed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// Reopen ticket (admin only)
router.post('/:id/reopen', checkAdmin, async (req, res) => {
  const ticketId = req.params.id;

  try {
    const dataRaw = await getFileContent(`tickets/${ticketId}/data.json`);
    if (!dataRaw) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = safeJSONParse(dataRaw);
    if (!ticket) return res.status(500).json({ error: 'Corrupted ticket data' });

    ticket.status = 'open';
    delete ticket.closed_at;
    delete ticket.closed_by;
    ticket.updated_at = new Date().toISOString();

    await commitFile(`tickets/${ticketId}/data.json`, JSON.stringify(ticket, null, 2), `Ticket ${ticketId} reopened`);

    res.json({ message: 'Ticket reopened' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reopen ticket' });
  }
});

export default router;

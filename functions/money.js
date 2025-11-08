require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const { Octokit } = require('@octokit/rest');

const app = express();
app.use(bodyParser.json());

// -------------------- In-memory storage --------------------
let verificationCode = null;
let loggedInUser = null;

// -------------------- Hard-coded login --------------------
const LOGIN_USERNAME = 'kmrekieta';
const LOGIN_PASSWORD = 'Beauty11';

// -------------------- GitHub Setup --------------------
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
const GITHUB_OWNER = process.env.GITHUB_OWNER;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_FOLDER = process.env.GITHUB_FOLDER || 'logs';

// -------------------- Zoho Helper Functions --------------------
async function getAccessToken() {
  const params = new URLSearchParams();
  params.append('refresh_token', process.env.ZOHO_REFRESH_TOKEN);
  params.append('client_id', process.env.ZOHO_CLIENT_ID);
  params.append('client_secret', process.env.ZOHO_CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    body: params
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get Zoho access token');
  return data.access_token;
}

async function sendVerificationEmail(toEmail, code) {
  const accessToken = await getAccessToken();
  const body = {
    fromAddress: process.env.ZOHO_FROM_EMAIL,
    toAddress: toEmail,
    subject: 'Your Verification Code',
    content: `Your 6-digit verification code is: ${code}`
  };

  const res = await fetch('https://mail.zoho.com/api/accounts/<YOUR_ACCOUNT_ID>/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) throw new Error('Failed to send verification email');
}

// -------------------- Routes --------------------

// 1️⃣ /money/login
app.post('/money/login', async (req, res) => {
  const { username, password } = req.body;
  if (username === LOGIN_USERNAME && password === LOGIN_PASSWORD) {
    // generate 6-digit code
    verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      await sendVerificationEmail(process.env.ZOHO_FROM_EMAIL, verificationCode);
      loggedInUser = username;
      res.json({ success: true, message: 'Verification code sent' });
    } catch (err) {
      res.json({ success: false, message: err.message });
    }
  } else {
    res.json({ success: false, message: 'Invalid username or password' });
  }
});

// 2️⃣ /money/verify
app.post('/money/verify', (req, res) => {
  const { code } = req.body;
  if (!loggedInUser) return res.json({ success: false, message: 'Login required' });

  if (code === verificationCode) {
    verificationCode = null; // reset code after successful verify
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid verification code' });
  }
});

// 3️⃣ /money/logs
app.get('/money/logs', async (req, res) => {
  try {
    const { data } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_FOLDER,
      ref: GITHUB_BRANCH
    });

    const logs = [];
    for (const file of data) {
      if (file.type === 'file' && file.name.endsWith('.json')) {
        const contentRes = await fetch(file.download_url);
        const contentJson = await contentRes.json();
        logs.push(contentJson);
      }
    }
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4️⃣ /money/add
app.post('/money/add', async (req, res) => {
  const logData = req.body;
  if (!loggedInUser) return res.json({ success: false, message: 'Login required' });

  const fileName = `${logData.date.replace(/-/g,'')}_${Date.now()}.json`;
  const content = Buffer.from(JSON.stringify(logData, null, 2)).toString('base64');

  try {
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: `${GITHUB_FOLDER}/${fileName}`,
      message: `Add transaction ${fileName}`,
      content: content,
      branch: GITHUB_BRANCH
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Money API running on port ${PORT}`));

export default router;

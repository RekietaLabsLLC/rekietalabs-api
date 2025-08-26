// Check required env vars BEFORE starting server
const requiredEnvVars = [
  'GITHUB_TOKEN',
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME',
  'SUPPORT_SYSTEM_SMTP_HOST',
  'SUPPORT_SYSTEM_SMTP_PORT',
  'SUPPORT_SYSTEM_SMTP_USER',
  'SUPPORT_SYSTEM_SMTP_PASS',
  'TICKET_LINK_BASE',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
} else {
  console.log('All required environment variables are set.');
}

// -----------------------------
// Imports
// -----------------------------
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Route imports
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js';
import giftcardBuySessionHandler from './functions/giftcard-buy-session.js';
import ticketsRouter from './functions/tickets/index.js';
import configLoginRouter from './functions/config-login.js';
import userRouter from './functions/user.js'; // new route for dashboard info

// -----------------------------
// Setup
// -----------------------------
dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// -----------------------------
// Middleware
// -----------------------------
app.use(cors({
  origin: [
    'https://accounts.rekietalabs.com',
    'https://market.rekietalabs.com',
    'https://giftcard.hub.rekietalabs.com',
    'https://customer.portal.hub.rekietalabs.com',
    'https://staff.portal.hub.rekietalabs.com',
  ],
  credentials: true, // <-- allow cookies
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-key', 'x-staff-key', 'username', 'password'],
}));
app.use(express.json());
app.use(cookieParser());

// -----------------------------
// Routes
// -----------------------------
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/market-session', marketSessionHandler);
app.use('/giftcard-buy-session', giftcardBuySessionHandler);
app.use('/tickets', ticketsRouter);
app.use('/config-login', configLoginRouter); // handles GitHub token and sets cookie
app.use('/mylabs/user', userRouter); // secure route for dashboard info

// Health checks
app.get('/market-session', (req, res) => {
  res.send('🛒 Market Session API live');
});

app.get('/giftcard-buy-session', (req, res) => {
  res.send('🎁 Gift Card Buy Session API live');
});

app.get('/', (req, res) => {
  res.send('🔒 RekietaLabs API is live!');
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

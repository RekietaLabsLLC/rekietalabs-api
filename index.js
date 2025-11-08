// Check required env vars BEFORE starting server
const requiredEnvVars = [
  'SUPABASE_URL'
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
import configLoginRouter from './functions/config-login.js';
import userRouter from './functions/user.js';
import mylabsPlanPickRouter from './functions/mylabs-plan-pick.js';
import myLabsUserRouter from './functions/mylabs-user.js';
import oauthRouter from './functions/oauth.js';
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
  ],
  credentials: true, // allow cookies
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
app.use('/config-login', configLoginRouter);
app.use('/mylabs/user', userRouter);
app.use('/mylabs/plan-pick', mylabsPlanPickRouter);
app.use('/mylabs/user', myLabsUserRouter);
app.use('/oauth', oauthRouter);

// Health checks
app.get('/market-session', (req, res) => res.send('🛒 Market Session API live'));
app.get('/giftcard-buy-session', (req, res) => res.send('🎁 Gift Card Buy Session API live'));
app.get('/', (req, res) => res.send('🔒 RekietaLabs API is live!'));
// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

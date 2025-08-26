const requiredEnvVars = [
  'GITHUB_TOKEN',
  'GITHUB_REPO_OWNER',
  'GITHUB_REPO_NAME',
  'SUPPORT_SYSTEM_SMTP_HOST',
  'SUPPORT_SYSTEM_SMTP_PORT',
  'SUPPORT_SYSTEM_SMTP_USER',
  'SUPPORT_SYSTEM_SMTP_PASS',
  'TICKET_LINK_BASE',
];

const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
} else {
  console.log('All required environment variables are set.');
}

// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Existing route handlers
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/market-session', marketSessionHandler);
app.use('/giftcard-buy-session', giftcardBuySessionHandler);

// Tickets routes
app.use('/tickets', ticketsRouter);

// Config for login frontend
app.use('/config-login', configLoginRouter);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS Configuration (add your allowed origins)
app.use(cors({
  origin: [
    'https://accounts.rekietalabs.com',
    'https://market.rekietalabs.com',
    'https://giftcard.hub.rekietalabs.com',
    'https://customer.portal.hub.rekietalabs.com', // Add your customer portal origin
    'https://staff.portal.hub.rekietalabs.com',    // Add your staff portal origin
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-key', 'x-staff-key', 'username', 'password'],
}));

app.use(express.json());

// Existing route handlers
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/market-session', marketSessionHandler);
app.use('/giftcard-buy-session', giftcardBuySessionHandler);

// Tickets routes
app.use('/tickets', ticketsRouter);

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

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

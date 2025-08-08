// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Existing route imports
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js';

// New import for gift card buy session handler
import giftcardBuySessionHandler from './functions/giftcard-buy-session.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS Configuration (add your allowed origins)
app.use(cors({
  origin: [
    'https://accounts.rekietalabs.com',
    'https://market.rekietalabs.com',
    'https://giftcard.hub.rekietalabs.com', // Add gift card frontend origin here
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Existing route handlers
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/market-session', marketSessionHandler);

// New gift card buy session POST handler
app.use('/giftcard-buy-session', giftcardBuySessionHandler);

// Health check for market-session
app.get('/market-session', (req, res) => {
  res.send('🛒 Market Session API live');
});

// Health check for giftcard-buy-session
app.get('/giftcard-buy-session', (req, res) => {
  res.send('🎁 Gift Card Buy Session API live');
});

// Root health check
app.get('/', (req, res) => {
  res.send('🔒 RekietaLabs API is live!');
});

app.listen(PORT, () => {
  console.log('✅ Server running on port ${PORT}');

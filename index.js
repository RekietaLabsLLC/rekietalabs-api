// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Existing route imports
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js';
import giftcardBuySessionHandler from './functions/giftcard-buy-session.js';

// New ticket routes import
import ticketsRouter from './functions/tickets/index.js';

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

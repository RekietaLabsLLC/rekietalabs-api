// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Existing route imports
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js';
import giftcardBuySessionHandler from './functions/giftcard-buy-session.js';

// New helpdesk route import
import helpdeskTicketRouter from './functions/helpdesk-ticket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS Configuration (add your allowed origins)
app.use(cors({
  origin: [
    'https://accounts.rekietalabs.com',
    'https://market.rekietalabs.com',
    'https://giftcard.hub.rekietalabs.com',
    // Add your frontend origins for helpdesk if needed
    'https://help.rekietalabs.com',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-admin-pin'],
}));

app.use(express.json());

// Existing route handlers
app.use('/signup', signupRouter);
app.use('/login', loginRouter);
app.use('/market-session', marketSessionHandler);
app.use('/giftcard-buy-session', giftcardBuySessionHandler);

// New helpdesk route handler
app.use('/helpdesk-ticket', helpdeskTicketRouter);

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
  console.log(`✅ Server running on port ${PORT}`);
});

// index.js
import express from 'express';
import cors from 'cors';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js'; // ✅ IMPORT
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CORS Configuration
app.use(cors({
  origin: [
    'https://accounts.rekietalabs.com',
    'https://market.rekietalabs.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ✅ Route Imports
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// ✅ Market Session POST
app.use('/market-session', marketSessionHandler);

// ✅ Health Check for /market-session
app.get('/market-session', (req, res) => {
  res.send('🛒 Market Session API live');
});

// ✅ Root Health Check
app.get('/', (req, res) => {
  res.send('🔒 RekietaLabs API is live!');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

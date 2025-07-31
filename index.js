// index.js
import express from 'express';
import cors from 'cors';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import marketSessionHandler from './functions/market-session.js'; // ✅ IMPORT API
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ CORS Settings
app.use(cors({
  origin: '*', // You can lock this down if needed
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ✅ Routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// ✅ Add the market-session route directly
app.use('/market-session', marketSessionHandler);

// Root Health Check
app.get('/', (req, res) => {
  res.send('🔒 RekietaLabs API is live!');
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

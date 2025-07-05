// index.js
import express from 'express';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// ✅ Add CORS middleware
app.use(
  cors({
    origin: 'https://accounts.rekietalabs.com',
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Health check
app.get('/', (req, res) => {
  res.send('🔒 RekietaLabs API is live!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

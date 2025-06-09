// index.js

import express from 'express';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Health check
app.get('/', (req, res) => {
  res.send('API is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});

// Import dependencies
import express from 'express';
import dotenv from 'dotenv';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';

// Load environment variables
dotenv.config();

// Create express app
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Log all requests (optional, good for debugging)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Health check
app.get('/', (req, res) => {
  res.send('RekietaLabs API is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RekietaLabs API running on port ${PORT}`);
});

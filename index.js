// index.js
import express from 'express';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

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

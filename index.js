import express from 'express';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware to parse JSON bodies
app.use(express.json());

// Use your routes
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Simple health check route
app.get('/', (req, res) => {
  res.send('API is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

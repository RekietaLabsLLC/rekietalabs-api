import express from 'express';
import signupRouter from './functions/signup.js';
import loginRouter from './functions/login.js';

const app = express();

app.use(express.json()); // to parse JSON bodies

// Use your route files
app.use('/signup', signupRouter);
app.use('/login', loginRouter);

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

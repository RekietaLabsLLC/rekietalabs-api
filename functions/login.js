import express from 'express';
const router = express.Router();

// Example login route
router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // Add your Supabase login logic here (simplified example)
  try {
    // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    // For demo, pretend login succeeded:
    res.json({
      message: 'User logged in successfully',
      user: { email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

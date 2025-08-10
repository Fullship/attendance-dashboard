// Temporary mock login for testing without database
router.post('/mock-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Mock login attempt:', email);
    
    // Mock admin user for testing
    if (email === 'admin@company.com' && password === 'admin123') {
      // Create JWT token
      const token = jwt.sign(
        { userId: 1, email: 'admin@company.com' }, 
        process.env.JWT_SECRET, 
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: {
          id: 1,
          email: 'admin@company.com',
          firstName: 'Admin',
          lastName: 'User',
          isAdmin: true
        }
      });
    }
    
    res.status(400).json({ message: 'Invalid credentials' });
    
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

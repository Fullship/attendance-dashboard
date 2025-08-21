#!/usr/bin/env node

// Simple backend test without Redis rate limiting
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3002;

// Load environment - try both locations
try {
  require('dotenv').config({ path: path.join(__dirname, '.env.local') });
} catch (e) {
  try {
    require('dotenv').config({ path: path.join(__dirname, 'backend', '.env.local') });
  } catch (e2) {
    console.log('⚠️ No dotenv found, continuing without it');
  }
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'attendance-backend', timestamp: new Date().toISOString() });
});

// Simple auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request received:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      error: 'Email and password required',
      received: { email: !!email, password: !!password }
    });
  }
  
  // Simple test response
  if (email === 'admin@example.com' && password === 'password') {
    return res.json({ 
      message: 'Login successful',
      user: { id: 1, email, role: 'admin' },
      token: 'test-token-123'
    });
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

// Catch all API routes
app.all('/api/*', (req, res) => {
  console.log(`📡 ${req.method} ${req.path}`, req.body || req.query);
  res.json({ 
    message: 'API endpoint reached',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Simple backend server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Test login: http://localhost:${PORT}/api/auth/login`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Backend server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Backend server shutting down...');
  process.exit(0);
});

#!/usr/bin/env node

// Load environment variables explicitly
const dotenv = require('dotenv');
const path = require('path');

// Load .env file from current directory
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('✅ Environment variables loaded successfully');
  
  // Force the correct port if it's wrong
  if (process.env.PORT !== '3002') {
    console.log('⚠️  PORT was', process.env.PORT, '- forcing to 3002');
    process.env.PORT = '3002';
  }
  
  console.log('PORT:', process.env.PORT);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
}

// Start the server
require('./server.js');

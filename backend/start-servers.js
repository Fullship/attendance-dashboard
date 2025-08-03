#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting attendance dashboard servers...');
console.log('📡 Backend will run on: http://localhost:3001');
console.log('🌐 Frontend will run on: http://localhost:3000');
console.log('');

// Start backend
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname),
  stdio: 'inherit'
});

// Start frontend
const frontend = spawn('npm', ['start'], {
  cwd: path.join(__dirname, '../frontend'),
  stdio: 'inherit',
  env: { ...process.env, PORT: '3000' }
});

// Handle process cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

backend.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Backend server exited with code', code);
  }
});

frontend.on('exit', (code) => {
  if (code !== 0) {
    console.error('❌ Frontend server exited with code', code);
  }
});

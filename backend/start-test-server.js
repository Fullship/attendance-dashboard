#!/usr/bin/env node

/**
 * Simple server starter for testing query logging
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting backend server for query logging test...');

const serverProcess = spawn('node', ['server.js'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    QUERY_LOG_ENABLED: 'true',
    QUERY_LOG_SLOW_THRESHOLD: '200', // Lower threshold for testing
    QUERY_LOG_N1_THRESHOLD: '3', // Lower threshold for testing
  },
});

serverProcess.on('close', code => {
  console.log(`\n📊 Server stopped with code ${code}`);
  process.exit(code);
});

serverProcess.on('error', err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  serverProcess.kill('SIGTERM');
});

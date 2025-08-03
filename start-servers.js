#!/usr/bin/env node

const PortManager = require('./backend/port-manager');

console.log('🚀 Attendance Dashboard Startup Manager');
console.log('=====================================');
console.log('This tool will automatically:');
console.log('• Find available ports for backend and frontend');
console.log('• Update .env configurations');
console.log('• Start both servers with proper CORS settings');
console.log('');

const portManager = new PortManager();
portManager.setupAndStart();

#!/usr/bin/env node

const express = require('express');
const app = express();

// Load the users routes
const userRoutes = require('./routes/users');

// Print all routes defined in userRoutes
console.log('Routes defined in userRoutes:');
userRoutes.stack.forEach((layer) => {
  console.log('  ', layer.route.path, ':', Object.keys(layer.route.methods));
});

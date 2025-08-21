#!/usr/bin/env node

/**
 * Direct Proxy Test - Bypass React Dev Server Issues
 * Tests the proxy routing logic directly without relying on React dev server
 */

const http = require('http');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = 3000;
const BACKEND_PORT = 3002;

// Create the same proxy middleware as setupProxy.js
const apiProxy = createProxyMiddleware('/api', {
  target: `http://localhost:${BACKEND_PORT}`,
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy Error:', err.message);
    res.writeHead(500, {
      'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({
      error: 'Proxy Error',
      message: err.message
    }));
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[PROXY REQ] ${req.method} ${req.url} -> http://localhost:${BACKEND_PORT}${req.url}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log(`[PROXY RES] ${proxyRes.statusCode} ${req.method} ${req.url}`);
  }
});

// Create simple HTTP server with proxy
const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  
  if (req.url.startsWith('/api')) {
    // Use proxy for API calls
    apiProxy(req, res);
  } else {
    // Simple response for non-API calls
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Proxy test server running',
      timestamp: new Date().toISOString(),
      url: req.url
    }));
  }
});

server.listen(PORT, () => {
  console.log(`🧪 Proxy Test Server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying /api/* to http://localhost:${BACKEND_PORT}`);
  console.log(`\n🔍 Test Commands:`);
  console.log(`curl http://localhost:${PORT}/health`);
  console.log(`curl -X POST http://localhost:${PORT}/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'`);
});

server.on('error', (err) => {
  console.error('❌ Server Error:', err.message);
  process.exit(1);
});

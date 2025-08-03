#!/usr/bin/env node

/**
 * Load Testing Script for Attendance Dashboard API
 *
 * This script generates realistic load on the API endpoints to create
 * performance data for Clinic.js analysis.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: 'http://localhost:3002',
  concurrentUsers: 10,
  testDurationSeconds: 60,
  endpoints: [
    { path: '/api/auth/login', method: 'POST', weight: 20 },
    { path: '/api/admin/employees', method: 'GET', weight: 30 },
    { path: '/api/admin/attendance', method: 'GET', weight: 25 },
    { path: '/api/admin/teams', method: 'GET', weight: 15 },
    { path: '/api/admin/locations', method: 'GET', weight: 10 },
  ],
  authToken: null,
};

// Test data
const testUser = {
  email: 'admin@example.com',
  password: 'admin123',
};

class LoadTester {
  constructor() {
    this.results = {
      requests: [],
      startTime: Date.now(),
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      requestsPerSecond: 0,
    };
    this.isRunning = false;
  }

  async authenticate() {
    console.log('🔐 Authenticating...');

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(testUser);

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.token) {
              config.authToken = response.token;
              console.log('✅ Authentication successful');
              resolve();
            } else {
              console.log('❌ Authentication failed - no token received');
              resolve(); // Continue without auth
            }
          } catch (error) {
            console.log('⚠️  Authentication response parse error:', error.message);
            resolve(); // Continue without auth
          }
        });
      });

      req.on('error', error => {
        console.log('⚠️  Authentication error:', error.message);
        resolve(); // Continue without auth
      });

      req.write(postData);
      req.end();
    });
  }

  makeRequest(endpoint) {
    return new Promise(resolve => {
      const startTime = Date.now();

      const options = {
        hostname: 'localhost',
        port: 3002,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          ...(config.authToken && { Authorization: `Bearer ${config.authToken}` }),
        },
      };

      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;

          const result = {
            endpoint: endpoint.path,
            method: endpoint.method,
            statusCode: res.statusCode,
            responseTime,
            timestamp: startTime,
            success: res.statusCode >= 200 && res.statusCode < 300,
          };

          this.recordResult(result);
          resolve(result);
        });
      });

      req.on('error', error => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          statusCode: 0,
          responseTime,
          timestamp: startTime,
          success: false,
          error: error.message,
        };

        this.recordResult(result);
        resolve(result);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        const result = {
          endpoint: endpoint.path,
          method: endpoint.method,
          statusCode: 0,
          responseTime: 5000,
          timestamp: startTime,
          success: false,
          error: 'Timeout',
        };
        this.recordResult(result);
        resolve(result);
      });

      req.end();
    });
  }

  recordResult(result) {
    this.results.requests.push(result);
    this.results.totalRequests++;

    if (result.success) {
      this.results.successfulRequests++;
    } else {
      this.results.failedRequests++;
    }

    this.results.minResponseTime = Math.min(this.results.minResponseTime, result.responseTime);
    this.results.maxResponseTime = Math.max(this.results.maxResponseTime, result.responseTime);
  }

  selectRandomEndpoint() {
    const totalWeight = config.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;

    for (const endpoint of config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }

    return config.endpoints[0];
  }

  async runUser(userId) {
    console.log(`👤 Starting user ${userId}`);

    while (this.isRunning) {
      const endpoint = this.selectRandomEndpoint();
      await this.makeRequest(endpoint);

      // Random delay between requests (50-500ms)
      const delay = Math.random() * 450 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`👤 User ${userId} finished`);
  }

  calculateStats() {
    const totalTime = (this.results.endTime - this.results.startTime) / 1000;
    this.results.requestsPerSecond = this.results.totalRequests / totalTime;

    const responseTimes = this.results.requests.map(r => r.responseTime);
    this.results.averageResponseTime =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    this.results.p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    this.results.p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
    this.results.p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    this.results.p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  }

  generateReport() {
    const report = `
🚀 Load Test Report
===================

⏱️  Test Duration: ${(this.results.endTime - this.results.startTime) / 1000}s
👥 Concurrent Users: ${config.concurrentUsers}
📊 Total Requests: ${this.results.totalRequests}
✅ Successful: ${this.results.successfulRequests}
❌ Failed: ${this.results.failedRequests}
📈 Success Rate: ${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(
      2
    )}%

🔄 Throughput: ${this.results.requestsPerSecond.toFixed(2)} req/s

⏱️  Response Times:
   Average: ${this.results.averageResponseTime.toFixed(2)}ms
   Min: ${this.results.minResponseTime}ms
   Max: ${this.results.maxResponseTime}ms
   50th percentile: ${this.results.p50}ms
   90th percentile: ${this.results.p90}ms
   95th percentile: ${this.results.p95}ms
   99th percentile: ${this.results.p99}ms

📈 Endpoint Performance:
${config.endpoints
  .map(ep => {
    const endpointRequests = this.results.requests.filter(r => r.endpoint === ep.path);
    const avgTime =
      endpointRequests.reduce((sum, r) => sum + r.responseTime, 0) / endpointRequests.length;
    const successRate =
      (endpointRequests.filter(r => r.success).length / endpointRequests.length) * 100;
    return `   ${ep.method} ${ep.path}: ${avgTime.toFixed(2)}ms avg, ${successRate.toFixed(
      1
    )}% success`;
  })
  .join('\n')}
`;

    console.log(report);

    // Save detailed results
    const resultsFile = path.join(__dirname, `load-test-results-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`📁 Detailed results saved to: ${resultsFile}`);
  }

  async run() {
    console.log('🚀 Starting Load Test...');
    console.log(`Target: ${config.baseUrl}`);
    console.log(`Duration: ${config.testDurationSeconds}s`);
    console.log(`Concurrent Users: ${config.concurrentUsers}`);

    // Authenticate first
    await this.authenticate();

    this.isRunning = true;
    this.results.startTime = Date.now();

    // Start concurrent users
    const userPromises = Array.from({ length: config.concurrentUsers }, (_, i) =>
      this.runUser(i + 1)
    );

    // Stop after configured duration
    setTimeout(() => {
      console.log('⏱️  Test duration reached, stopping...');
      this.isRunning = false;
      this.results.endTime = Date.now();
    }, config.testDurationSeconds * 1000);

    // Wait for all users to finish
    await Promise.all(userPromises);

    this.calculateStats();
    this.generateReport();
  }
}

// Run if called directly
if (require.main === module) {
  const tester = new LoadTester();

  process.on('SIGINT', () => {
    console.log('\n⏹️  Test interrupted by user');
    tester.isRunning = false;
    tester.results.endTime = Date.now();
    tester.calculateStats();
    tester.generateReport();
    process.exit(0);
  });

  tester.run().catch(console.error);
}

module.exports = LoadTester;

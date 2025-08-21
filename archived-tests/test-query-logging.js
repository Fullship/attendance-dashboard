#!/usr/bin/env node

/**
 * Test script to verify query logging and N+1 detection
 */

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3002';

class QueryLogTester {
  constructor() {
    this.authToken = null;
    this.startTime = Date.now();
  }

  async login() {
    try {
      console.log('🔐 Logging in as admin...');
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123',
      });

      this.authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } catch (error) {
      console.error('❌ Login failed:', error.response?.data || error.message);
      return false;
    }
  }

  async makeRequest(url, description) {
    try {
      console.log(`\n📡 ${description}...`);
      const response = await axios.get(`${BASE_URL}${url}`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });
      console.log(`✅ ${description} completed`);
      return response.data;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.response?.data || error.message);
      return null;
    }
  }

  async triggerN1Queries() {
    console.log('\n🔄 Triggering potential N+1 queries...');

    // These requests should trigger multiple queries per request
    await this.makeRequest('/api/users', 'Fetching users list');
    await this.makeRequest('/api/attendance/employees', 'Fetching employees');
    await this.makeRequest('/api/admin/analytics/overview', 'Fetching analytics overview');

    // Make multiple similar requests to trigger pattern detection
    for (let i = 0; i < 3; i++) {
      await this.makeRequest('/api/users', `Fetching users list (${i + 1})`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async checkQueryStats() {
    console.log('\n📊 Checking query statistics...');
    const stats = await this.makeRequest('/api/performance/query-stats', 'Getting query stats');

    if (stats) {
      console.log('\n📈 Query Statistics:');
      console.log(`Total Queries: ${stats.totalQueries || 0}`);
      console.log(`Average Duration: ${stats.averageDuration || 0}ms`);
      console.log(
        `Cache Hit Rate: ${(((stats.cacheHits || 0) / (stats.totalQueries || 1)) * 100).toFixed(
          2
        )}%`
      );

      if (stats.slowQueries?.length > 0) {
        console.log('\n🐌 Slow Queries Detected:');
        stats.slowQueries.slice(0, 3).forEach((query, i) => {
          console.log(`  ${i + 1}. ${query.query.substring(0, 100)}... (${query.duration}ms)`);
        });
      }
    }

    return stats;
  }

  async checkQueryPatterns() {
    console.log('\n🔍 Checking query patterns...');
    const patterns = await this.makeRequest(
      '/api/performance/query-patterns',
      'Getting query patterns'
    );

    if (patterns) {
      console.log('\n📋 Query Patterns:');

      if (patterns.queryPatterns) {
        Object.entries(patterns.queryPatterns)
          .slice(0, 5)
          .forEach(([pattern, data]) => {
            console.log(`\n  Pattern: ${pattern.substring(0, 80)}...`);
            console.log(`    Count: ${data.count}`);
            console.log(`    Avg Duration: ${data.avgDuration}ms`);

            if (data.potentialN1) {
              console.log(`    ⚠️  Potential N+1 detected!`);
            }
          });
      }

      if (patterns.n1Alerts?.length > 0) {
        console.log('\n🚨 N+1 Query Alerts:');
        patterns.n1Alerts.forEach((alert, i) => {
          console.log(`  ${i + 1}. ${alert.pattern} (${alert.count} occurrences)`);
        });
      }
    }

    return patterns;
  }

  async generateReport() {
    console.log('\n📝 Generating analysis report...');
    const today = new Date().toISOString().split('T')[0];
    const report = await this.makeRequest(
      `/api/performance/analysis-report/${today}`,
      'Generating analysis report'
    );

    if (report) {
      console.log('\n📊 Analysis Report Summary:');
      console.log(`Total Queries: ${report.totalQueries || 0}`);
      console.log(`Unique Patterns: ${report.uniquePatterns || 0}`);
      console.log(`N+1 Patterns: ${report.n1Patterns || 0}`);
      console.log(`Performance Issues: ${report.performanceIssues || 0}`);

      if (report.recommendations?.length > 0) {
        console.log('\n💡 Recommendations:');
        report.recommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`);
        });
      }
    }

    return report;
  }

  async testLogFiles() {
    console.log('\n📁 Checking log files...');
    const logFiles = await this.makeRequest('/api/performance/log-files', 'Getting log files list');

    if (logFiles?.files?.length > 0) {
      console.log('\n📄 Available Log Files:');
      logFiles.files.slice(0, 5).forEach((file, i) => {
        console.log(`  ${i + 1}. ${file.filename} (${file.date})`);
      });
    } else {
      console.log('No log files found yet');
    }

    return logFiles;
  }

  async runTests() {
    console.log('🚀 Starting Query Logging Test Suite');
    console.log('=====================================\n');

    // Login first
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ Cannot proceed without authentication');
      return;
    }

    // Wait a moment for any initial setup
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger some queries
    await this.triggerN1Queries();

    // Wait for logs to be processed
    console.log('\n⏳ Waiting for logs to be processed...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check statistics
    await this.checkQueryStats();
    await this.checkQueryPatterns();
    await this.generateReport();
    await this.testLogFiles();

    console.log('\n✨ Test completed!');
    console.log('\n💡 To view real-time monitoring:');
    console.log(`   GET ${BASE_URL}/api/performance/live-queries`);
    console.log('\n🔧 To analyze logs manually:');
    console.log('   cd backend && node scripts/analyze-query-patterns.js');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new QueryLogTester();
  tester.runTests().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = QueryLogTester;

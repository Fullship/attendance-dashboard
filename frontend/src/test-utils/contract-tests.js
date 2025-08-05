#!/usr/bin/env node
/**
 * API Contract Test Runner
 * 
 * This script runs API contract tests for the admin panel components.
 * Since we're using TypeScript modules, we'll recreate the contracts here.
 */

// Recreate the contract definitions (simplified for JS execution)
const adminAPIContracts = [
  {
    endpoint: '/api/admin/metrics',
    method: 'GET',
    description: 'Get real-time system metrics',
    expectedResponse: {
      status: 200,
      schema: {
        requests: { total: 'number', rps: 'number' },
        responseTime: { avg: 'number', p95: 'number', p99: 'number' },
        memory: { used: 'number', total: 'number', percentage: 'number' },
        cpu: { usage: 'number', load: 'array' },
        database: { connections: 'number', queries: 'number' },
        cache: { hitRate: 'number', operations: 'number' },
        errors: { rate: 'number', count: 'number' },
        activeUsers: 'number'
      }
    },
    mockResponse: {
      requests: { total: 45678, rps: 23.5 },
      responseTime: { avg: 45.2, p95: 120.3, p99: 234.5 },
      memory: { used: 512 * 1024 * 1024, total: 2048 * 1024 * 1024, percentage: 25.0 },
      cpu: { usage: 35.2, load: [0.5, 0.8, 1.2] },
      database: { connections: 15, queries: 1234 },
      cache: { hitRate: 87.5, operations: 5678 },
      errors: { rate: 0.2, count: 12 },
      activeUsers: 142
    }
  },
  {
    endpoint: '/api/admin/cache/stats',
    method: 'GET',
    description: 'Get cache statistics and performance metrics',
    expectedResponse: {
      status: 200,
      schema: {
        hitRate: 'number',
        missRate: 'number',
        totalOperations: 'number',
        totalHits: 'number',
        totalMisses: 'number',
        memory: { used: 'number', available: 'number', percentage: 'number' },
        keys: { total: 'number', expired: 'number', withTtl: 'number' },
        performance: { avgResponseTime: 'number', operationsPerSecond: 'number' },
        byType: 'object'
      }
    },
    mockResponse: {
      hitRate: 87.5,
      missRate: 12.5,
      totalOperations: 15432,
      totalHits: 13503,
      totalMisses: 1929,
      memory: { used: 128 * 1024 * 1024, available: 512 * 1024 * 1024, percentage: 25 },
      keys: { total: 2341, expired: 45, withTtl: 1876 },
      performance: { avgResponseTime: 2.3, operationsPerSecond: 234.5 },
      byType: {
        'user_sessions': { hits: 5623, misses: 234, operations: 5857 },
        'api_cache': { hits: 4521, misses: 678, operations: 5199 },
        'page_cache': { hits: 3359, misses: 1017, operations: 4376 }
      }
    }
  },
  {
    endpoint: '/api/admin/cluster/status',
    method: 'GET',
    description: 'Get cluster worker status and health information',
    expectedResponse: {
      status: 200,
      schema: {
        master: { pid: 'number', uptime: 'number', memory: 'number' },
        workers: 'array',
        stats: {
          totalWorkers: 'number',
          aliveWorkers: 'number',
          totalMemory: 'number',
          totalRequests: 'number',
          totalConnections: 'number',
          restartCount: 'number'
        },
        health: 'string'
      }
    },
    mockResponse: {
      master: { pid: 8754, uptime: 3600, memory: 64 * 1024 * 1024 },
      workers: [
        { id: 1, pid: 8755, uptime: 3600, restarts: 0, status: 'online', memory: 45 * 1024 * 1024, cpu: 25.3, connections: 23, requests: 4567 }
      ],
      stats: {
        totalWorkers: 4,
        aliveWorkers: 4,
        totalMemory: 1024 * 1024 * 1024,
        totalRequests: 45678,
        totalConnections: 156,
        restartCount: 0
      },
      health: 'healthy'
    }
  }
];

/**
 * Validate API response against contract schema
 */
function validateAPIResponse(contract, response) {
  const errors = [];
  
  function validateSchema(schema, data, path = '') {
    for (const [key, expectedType] of Object.entries(schema)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (!(key in data)) {
        errors.push(`Missing required field: ${currentPath}`);
        continue;
      }
      
      const value = data[key];
      
      if (expectedType === 'array') {
        if (!Array.isArray(value)) {
          errors.push(`Expected array at ${currentPath}, got ${typeof value}`);
        }
      } else if (expectedType === 'object') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
          errors.push(`Expected object at ${currentPath}, got ${typeof value}`);
        }
      } else if (typeof expectedType === 'object') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          validateSchema(expectedType, value, currentPath);
        } else {
          errors.push(`Expected object at ${currentPath}, got ${typeof value}`);
        }
      } else if (typeof value !== expectedType) {
        errors.push(`Expected ${expectedType} at ${currentPath}, got ${typeof value}`);
      }
    }
  }
  
  validateSchema(contract.expectedResponse.schema, response);
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create mock fetch function for API contract testing
 */
function createContractTestFetch(contracts = adminAPIContracts) {
  return (url, options = {}) => {
    const method = options.method || 'GET';
    const contract = contracts.find(c => 
      url.includes(c.endpoint) && c.method === method
    );
    
    if (!contract) {
      console.warn(`No contract found for ${method} ${url}`);
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Contract not found' })
      });
    }
    
    console.log(`[Contract Test] ${method} ${url} - ${contract.description}`);
    
    return Promise.resolve({
      ok: true,
      status: contract.expectedResponse.status,
      json: () => Promise.resolve(contract.mockResponse)
    });
  };
}

/**
 * Test runner for API contracts
 */
class APIContractTester {
  constructor(contracts = adminAPIContracts) {
    this.contracts = contracts;
    this.originalFetch = null;
  }
  
  /**
   * Setup mock fetch for testing
   */
  setup() {
    // In Node.js environment, we'll simulate fetch
    global.fetch = createContractTestFetch(this.contracts);
  }
  
  /**
   * Restore original fetch
   */
  teardown() {
    if (this.originalFetch) {
      global.fetch = this.originalFetch;
    }
  }
  
  /**
   * Test all contracts
   */
  async testAllContracts() {
    const results = [];
    let passed = 0;
    let failed = 0;
    
    for (const contract of this.contracts) {
      try {
        const response = await fetch(contract.endpoint, {
          method: contract.method,
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        const validation = validateAPIResponse(contract, data);
        
        if (validation.valid) {
          passed++;
        } else {
          failed++;
        }
        
        results.push({
          contract,
          passed: validation.valid,
          errors: validation.errors
        });
        
      } catch (error) {
        failed++;
        results.push({
          contract,
          passed: false,
          errors: [`Request failed: ${error}`]
        });
      }
    }
    
    return { passed, failed, results };
  }
  
  /**
   * Generate contract documentation
   */
  generateDocumentation() {
    let doc = '# API Contract Documentation\n\n';
    
    for (const contract of this.contracts) {
      doc += `## ${contract.method} ${contract.endpoint}\n\n`;
      doc += `**Description:** ${contract.description}\n\n`;
      doc += `**Expected Status:** ${contract.expectedResponse.status}\n\n`;
      doc += `**Response Schema:**\n\`\`\`json\n${JSON.stringify(contract.expectedResponse.schema, null, 2)}\n\`\`\`\n\n`;
      doc += `**Mock Response:**\n\`\`\`json\n${JSON.stringify(contract.mockResponse, null, 2)}\n\`\`\`\n\n`;
      doc += '---\n\n';
    }
    
    return doc;
  }
}

async function runContractTests() {
  console.log('🚀 Starting API Contract Tests...\n');
  
  const tester = new APIContractTester(adminAPIContracts);
  
  try {
    // Setup mock environment
    tester.setup();
    
    console.log('📋 Testing API Contracts...');
    const results = await tester.testAllContracts();
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📝 Total: ${results.passed + results.failed}`);
    
    // Detailed results
    if (results.failed > 0) {
      console.log('\n🔍 Failed Tests:');
      results.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`\n❌ ${result.contract.method} ${result.contract.endpoint}`);
          console.log(`   Description: ${result.contract.description}`);
          console.log(`   Errors:`);
          result.errors.forEach(error => {
            console.log(`   - ${error}`);
          });
        });
    }
    
    // Generate documentation
    console.log('\n📚 Generating API Documentation...');
    const documentation = tester.generateDocumentation();
    require('fs').writeFileSync('./api-contracts-documentation.md', documentation);
    console.log('✅ Documentation saved to: api-contracts-documentation.md');
    
    // Cleanup
    tester.teardown();
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Contract tests failed:', error);
    tester.teardown();
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception during contract tests:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection during contract tests:', reason);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runContractTests();
}

module.exports = { runContractTests };

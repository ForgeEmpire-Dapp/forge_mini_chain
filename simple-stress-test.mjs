/**
 * @fileoverview Simple stress test script for the Forge Mini Chain blockchain
 * This is a simplified version that demonstrates the core functionality.
 */

import http from 'http';
import crypto from 'crypto';

// Configuration for quick test
const CONFIG = {
  API_URL: 'http://localhost:8080',
  CONCURRENT_TRANSACTIONS: 5,
  READ_REQUESTS_PER_SECOND: 20,
  TEST_DURATION_SECONDS: 5
};

// Test results tracking
const testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0
};

// HTTP request helper
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Perform a random read operation
async function performRandomReadOperation() {
  const endpoints = [
    '/health',
    '/head'
  ];
  
  const randomEndpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const options = {
    hostname: 'localhost',
    port: 8080,
    path: randomEndpoint,
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  };
  
  const response = await httpRequest(options);
  if (response.statusCode >= 200 && response.statusCode < 300) {
    return response.data;
  } else {
    throw new Error(`HTTP ${response.statusCode}`);
  }
}

// Test 1: Quick API Read Test
async function testAPIReads() {
  console.log('📊 Starting Quick API Read Test...');
  
  const startTime = Date.now();
  const endTime = startTime + (CONFIG.TEST_DURATION_SECONDS * 1000);
  
  while (Date.now() < endTime) {
    try {
      await performRandomReadOperation();
      testResults.successfulRequests++;
    } catch (error) {
      testResults.failedRequests++;
    }
    testResults.totalRequests++;
    
    // Small delay to control request rate
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`✅ Quick API Read Test Completed`);
  console.log(`   - Total Requests: ${testResults.totalRequests}`);
  console.log(`   - Successful: ${testResults.successfulRequests}`);
  console.log(`   - Failed: ${testResults.failedRequests}`);
  console.log(`   - Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
}

// Test 2: Concurrent Transaction Test
async function testConcurrentTransactions() {
  console.log('🧪 Starting Concurrent Transaction Test...');
  
  const promises = [];
  
  for (let i = 0; i < CONFIG.CONCURRENT_TRANSACTIONS; i++) {
    const promise = new Promise(async (resolve) => {
      // Simple transaction object (will likely fail due to invalid signature)
      const transaction = {
        tx: {
          type: "transfer",
          from: "0x" + crypto.randomBytes(20).toString('hex'),
          to: "0x" + crypto.randomBytes(20).toString('hex'),
          amount: "1000",
          nonce: Math.floor(Math.random() * 1000),
          gasLimit: "50000",
          gasPrice: "2000000000"
        },
        signature: "0x" + crypto.randomBytes(64).toString('hex'),
        pubkey: "0x" + crypto.randomBytes(64).toString('hex'),
        hash: "0x" + crypto.randomBytes(32).toString('hex')
      };
      
      const postData = JSON.stringify(transaction);
      
      const options = {
        hostname: 'localhost',
        port: 8080,
        path: '/tx',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      try {
        const response = await httpRequest(options, postData);
        if (response.statusCode >= 200 && response.statusCode < 300) {
          testResults.successfulTransactions++;
        } else {
          testResults.failedTransactions++;
        }
      } catch (error) {
        testResults.failedTransactions++;
      }
      
      testResults.totalTransactions++;
      resolve();
    });
    
    promises.push(promise);
  }
  
  await Promise.all(promises);
  
  console.log(`✅ Concurrent Transaction Test Completed`);
  console.log(`   - Total Transactions: ${testResults.totalTransactions}`);
  console.log(`   - Successful: ${testResults.successfulTransactions}`);
  console.log(`   - Failed: ${testResults.failedTransactions}`);
}

// Main test runner
async function runSimpleStressTests() {
  console.log('🚀 Simple Blockchain Stress Test');
  console.log('==============================');
  
  try {
    // Run individual tests
    await testAPIReads();
    console.log(''); // Add spacing
    
    await testConcurrentTransactions();
    console.log(''); // Add spacing
    
    // Print summary
    console.log('📈 TEST SUMMARY');
    console.log('==============');
    console.log(`API Read Operations:`);
    console.log(`  - Total Requests: ${testResults.totalRequests}`);
    console.log(`  - Successful: ${testResults.successfulRequests}`);
    console.log(`  - Failed: ${testResults.failedRequests}`);
    console.log(`  - Success Rate: ${((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2)}%`);
    
    console.log(`\nTransaction Submissions:`);
    console.log(`  - Total Transactions: ${testResults.totalTransactions}`);
    console.log(`  - Successful: ${testResults.successfulTransactions}`);
    console.log(`  - Failed: ${testResults.failedTransactions}`);
    console.log(`  - Success Rate: ${testResults.totalTransactions > 0 ? ((testResults.successfulTransactions / testResults.totalTransactions) * 100).toFixed(2) : 0}%`);
    
    const totalOperations = testResults.totalRequests + testResults.totalTransactions;
    const successfulOperations = testResults.successfulRequests + testResults.successfulTransactions;
    console.log(`\nOverall Performance:`);
    console.log(`  - Total Operations: ${totalOperations}`);
    console.log(`  - Successful: ${successfulOperations}`);
    console.log(`  - Failed: ${testResults.failedRequests + testResults.failedTransactions}`);
    console.log(`  - Success Rate: ${totalOperations > 0 ? ((successfulOperations / totalOperations) * 100).toFixed(2) : 0}%`);
    
  } catch (error) {
    console.error('❌ Stress test encountered an error:', error.message);
    process.exit(1);
  }
}

// Run the tests
runSimpleStressTests().catch(console.error);
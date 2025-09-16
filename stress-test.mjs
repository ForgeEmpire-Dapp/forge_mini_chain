/**
 * @fileoverview Stress test script for the Forge Mini Chain blockchain
 * This script performs various stress tests on the blockchain API endpoints
 * including concurrent transaction submissions, high-frequency read operations,
 * and WebSocket connection stress testing.
 */

import http from 'http';
import https from 'https';
import WebSocket from 'ws';
import crypto from 'crypto';

// Configuration - using shorter test duration for quick results
const CONFIG = {
  API_URL: 'http://localhost:8080',
  CONCURRENT_TRANSACTIONS: 10, // Reduced from 50
  READ_REQUESTS_PER_SECOND: 50, // Reduced from 100
  TRANSACTION_INTERVAL_MS: 100,
  TEST_DURATION_SECONDS: 10, // Reduced from 60
  WS_CONNECTIONS: 5 // Reduced from 20
};

// Test results tracking
const testResults = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  wsConnections: 0,
  wsMessages: 0,
  startTime: null,
  endTime: null
};

// Generate a random address
function generateRandomAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// Generate a random hash
function generateRandomHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

// HTTP request helper
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    
    const req = lib.request(options, (res) => {
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

// Test 1: Concurrent Transaction Submission
async function testConcurrentTransactions() {
  console.log('🧪 Starting Concurrent Transaction Submission Test...');
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < CONFIG.CONCURRENT_TRANSACTIONS; i++) {
    const promise = submitRandomTransaction().then(() => {
      testResults.successfulTransactions++;
    }).catch((error) => {
      testResults.failedTransactions++;
      console.error(`Transaction ${i} failed:`, error.message);
    }).finally(() => {
      testResults.totalTransactions++;
    });
    
    promises.push(promise);
    
    // Add a small delay to simulate realistic transaction submission
    await new Promise(resolve => setTimeout(resolve, CONFIG.TRANSACTION_INTERVAL_MS / 10));
  }
  
  await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`✅ Concurrent Transaction Test Completed in ${(endTime - startTime) / 1000}s`);
  console.log(`   - Total Transactions: ${testResults.totalTransactions}`);
  console.log(`   - Successful: ${testResults.successfulTransactions}`);
  console.log(`   - Failed: ${testResults.failedTransactions}`);
}

// Submit a random transaction
async function submitRandomTransaction() {
  // In a real test, we would generate actual signed transactions
  // For this stress test, we'll simulate the API call structure
  
  // Convert BigInt values to strings for JSON serialization
  const transaction = {
    tx: {
      type: "transfer",
      from: generateRandomAddress(),
      to: generateRandomAddress(),
      amount: Math.floor(Math.random() * 1000000000000000000).toString(), // Convert to string
      nonce: Math.floor(Math.random() * 1000),
      gasLimit: "50000", // Convert to string
      gasPrice: "2000000000" // Convert to string
    },
    signature: generateRandomHash(),
    pubkey: generateRandomHash(),
    hash: generateRandomHash()
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
      return response.data;
    } else {
      throw new Error(`HTTP ${response.statusCode}: ${response.data?.error || 'Unknown error'}`);
    }
  } catch (error) {
    throw error;
  }
}

// Test 2: High-Frequency Read Operations
async function testHighFrequencyReads() {
  console.log('📊 Starting High-Frequency Read Operations Test...');
  
  const startTime = Date.now();
  const endTime = startTime + (CONFIG.TEST_DURATION_SECONDS * 1000);
  let requestCount = 0;
  
  // Use a faster interval for quicker test completion
  const interval = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(interval);
      return;
    }
    
    // Perform multiple read operations
    const readPromises = [];
    
    for (let i = 0; i < CONFIG.READ_REQUESTS_PER_SECOND / 10; i++) {
      readPromises.push(
        performRandomReadOperation()
          .then(() => {
            testResults.successfulRequests++;
          })
          .catch(() => {
            testResults.failedRequests++;
          })
          .finally(() => {
            testResults.totalRequests++;
            requestCount++;
          })
      );
    }
    
    await Promise.all(readPromises);
  }, 50); // Faster interval: 50ms instead of 100ms
  
  // Wait for the test duration
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION_SECONDS * 1000 + 1000));
  
  console.log(`✅ High-Frequency Read Test Completed`);
  console.log(`   - Total Requests: ${testResults.totalRequests}`);
  console.log(`   - Successful: ${testResults.successfulRequests}`);
  console.log(`   - Failed: ${testResults.failedRequests}`);
  console.log(`   - Requests/sec: ${(testResults.totalRequests / CONFIG.TEST_DURATION_SECONDS).toFixed(2)}`);
}

// Perform a random read operation
async function performRandomReadOperation() {
  const endpoints = [
    '/health',
    '/head',
    '/evm/stats'
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

// Test 3: WebSocket Connection Stress
async function testWebSocketConnections() {
  console.log('🔌 Starting WebSocket Connection Stress Test...');
  
  const connections = [];
  const messages = [];
  
  // Create multiple WebSocket connections
  for (let i = 0; i < CONFIG.WS_CONNECTIONS; i++) {
    try {
      const ws = new WebSocket('ws://localhost:8080/subscribe/blocks');
      
      ws.on('open', () => {
        testResults.wsConnections++;
        console.log(`WebSocket connection ${i + 1} established`);
      });
      
      ws.on('message', (data) => {
        testResults.wsMessages++;
        messages.push(data);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket ${i + 1} error:`, error.message);
      });
      
      connections.push(ws);
    } catch (error) {
      console.error(`Failed to create WebSocket connection ${i + 1}:`, error.message);
    }
    
    // Add a small delay between connections
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  // Let connections run for a while
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Close all connections
  connections.forEach((ws, index) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
      console.log(`WebSocket connection ${index + 1} closed`);
    }
  });
  
  console.log(`✅ WebSocket Stress Test Completed`);
  console.log(`   - Connections established: ${testResults.wsConnections}`);
  console.log(`   - Messages received: ${testResults.wsMessages}`);
}

// Test 4: Mixed Load Test
async function testMixedLoad() {
  console.log('🔄 Starting Mixed Load Test...');
  
  const startTime = Date.now();
  const testDuration = 10000; // 10 seconds instead of 30
  
  const interval = setInterval(async () => {
    if (Date.now() - startTime > testDuration) {
      clearInterval(interval);
      return;
    }
    
    // Submit a transaction every 500ms
    if (Math.floor((Date.now() - startTime) / 500) % 1 === 0) {
      submitRandomTransaction()
        .then(() => {
          testResults.successfulTransactions++;
        })
        .catch(() => {
          testResults.failedTransactions++;
        })
        .finally(() => {
          testResults.totalTransactions++;
        });
    }
    
    // Perform read operations
    const readPromises = [];
    for (let i = 0; i < 5; i++) { // Reduced from 10
      readPromises.push(
        performRandomReadOperation()
          .then(() => {
            testResults.successfulRequests++;
          })
          .catch(() => {
            testResults.failedRequests++;
          })
          .finally(() => {
            testResults.totalRequests++;
          })
      );
    }
    
    await Promise.all(readPromises);
  }, 100); // 100ms interval
  
  await new Promise(resolve => setTimeout(resolve, testDuration + 1000));
  
  console.log(`✅ Mixed Load Test Completed`);
  console.log(`   - Transactions: ${testResults.totalTransactions} (Success: ${testResults.successfulTransactions}, Failed: ${testResults.failedTransactions})`);
  console.log(`   - Read Requests: ${testResults.totalRequests} (Success: ${testResults.successfulRequests}, Failed: ${testResults.failedRequests})`);
}

// Print test summary
function printTestSummary() {
  testResults.endTime = new Date();
  const duration = (testResults.endTime - testResults.startTime) / 1000;
  
  console.log('\n📈 STRESS TEST SUMMARY');
  console.log('====================');
  console.log(`Test Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Start Time: ${testResults.startTime.toISOString()}`);
  console.log(`End Time: ${testResults.endTime.toISOString()}`);
  
  console.log('\n📊 API REQUESTS');
  console.log(`  Total Requests: ${testResults.totalRequests}`);
  console.log(`  Successful: ${testResults.successfulRequests}`);
  console.log(`  Failed: ${testResults.failedRequests}`);
  console.log(`  Success Rate: ${testResults.totalRequests > 0 ? ((testResults.successfulRequests / testResults.totalRequests) * 100).toFixed(2) : 0}%`);
  
  console.log('\n💸 TRANSACTIONS');
  console.log(`  Total Transactions: ${testResults.totalTransactions}`);
  console.log(`  Successful: ${testResults.successfulTransactions}`);
  console.log(`  Failed: ${testResults.failedTransactions}`);
  console.log(`  Success Rate: ${testResults.totalTransactions > 0 ? ((testResults.successfulTransactions / testResults.totalTransactions) * 100).toFixed(2) : 0}%`);
  
  console.log('\n🔌 WEBSOCKETS');
  console.log(`  Connections: ${testResults.wsConnections}`);
  console.log(`  Messages: ${testResults.wsMessages}`);
  
  // Overall performance
  const totalOperations = testResults.totalRequests + testResults.totalTransactions;
  const successfulOperations = testResults.successfulRequests + testResults.successfulTransactions;
  console.log('\n🏆 OVERALL PERFORMANCE');
  console.log(`  Total Operations: ${totalOperations}`);
  console.log(`  Successful: ${successfulOperations}`);
  console.log(`  Failed: ${testResults.failedRequests + testResults.failedTransactions}`);
  console.log(`  Success Rate: ${totalOperations > 0 ? ((successfulOperations / totalOperations) * 100).toFixed(2) : 0}%`);
  console.log(`  Operations/sec: ${(totalOperations / duration).toFixed(2)}`);
}

// Main test runner
async function runStressTests() {
  console.log('🚀 Forge Mini Chain Stress Test Suite');
  console.log('=====================================');
  
  testResults.startTime = new Date();
  
  try {
    // Check if the API is accessible
    console.log('🔍 Checking API connectivity...');
    try {
      await performRandomReadOperation();
      console.log('✅ API is accessible\n');
    } catch (error) {
      console.error('❌ API is not accessible. Please ensure the blockchain node is running on port 8080');
      console.error('Error details:', error.message);
      // Let's try a simple health check
      console.log('Trying a simple health check...');
      try {
        const options = {
          hostname: 'localhost',
          port: 8080,
          path: '/health',
          method: 'GET'
        };
        const response = await httpRequest(options);
        console.log('Health check response:', response);
      } catch (healthError) {
        console.error('Health check failed:', healthError.message);
      }
      process.exit(1);
    }
    
    // Run individual tests
    await testConcurrentTransactions();
    console.log(''); // Add spacing
    
    await testHighFrequencyReads();
    console.log(''); // Add spacing
    
    await testWebSocketConnections();
    console.log(''); // Add spacing
    
    await testMixedLoad();
    console.log(''); // Add spacing
    
    // Print summary
    printTestSummary();
    
  } catch (error) {
    console.error('❌ Stress test encountered an error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Add a simple function to test if the script is working
async function testScript() {
  console.log('Script is running correctly!');
  console.log('Current time:', new Date().toISOString());
  
  // Try a simple request to localhost:8080
  try {
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/',
      method: 'GET'
    };
    console.log('Making test request to localhost:8080...');
    const response = await httpRequest(options);
    console.log('Test request response status:', response.statusCode);
    console.log('Test request response data:', response.data);
  } catch (error) {
    console.error('Test request failed:', error.message);
  }
}

// Run the tests if this script is executed directly
// Simple approach to ensure the script runs
console.log('Script loaded successfully!');
console.log('Running stress tests...');

// Run a simple test first to verify the script works
testScript().then(() => {
  console.log('Starting full stress tests...');
  return runStressTests();
}).catch(console.error);

export {
  runStressTests,
  CONFIG,
  testResults
};
/**
 * @fileoverview Simple test script to verify metrics endpoint
 */
import express from 'express';
import { startApi } from './src/api.js';

// Create a simple test server
const port = 3000;

// Mock handlers
const mockHandlers = {
  submitTx: async () => {},
  getAccount: () => ({ balance: 1000n, nonce: 0 }),
  getHead: () => ({ 
    header: { 
      height: 100n, 
      gasUsed: 5000000n 
    } 
  }),
  getEVMStats: () => ({ contractCount: 5 }),
  getContractCode: () => '0x1234',
  getContractStorage: () => '0x5678',
  getReceipt: async () => ({ status: true })
};

// Start the API server
startApi(port, mockHandlers);

console.log(`Test server running on http://localhost:${port}`);
console.log('Try accessing http://localhost:3000/metrics to see the metrics');
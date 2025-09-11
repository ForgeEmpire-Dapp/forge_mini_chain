#!/usr/bin/env node

/**
 * @fileoverview Demo script to showcase Phase 1 enhancements
 */

import { generateKeyPair } from "./dist/crypto.js";
import { signTx } from "./dist/tx.js";

console.log("🚀 Phase 1 Enhanced Mini Blockchain Demo\n");

// Create demo accounts
console.log("1. Creating demo accounts...");
const alice = generateKeyPair();
const bob = generateKeyPair();

console.log(`   Alice: ${alice.address}`);
console.log(`   Bob: ${bob.address}\n`);

// Create enhanced transaction with gas
console.log("2. Creating enhanced transaction with gas mechanism...");
const tx = {
  type: "transfer",
  from: alice.address,
  to: bob.address,
  amount: 1000000000000000000n, // 1 ETH in wei
  nonce: 1,
  gasLimit: 50000n,
  gasPrice: 2000000000n, // 2 Gwei
  data: "0x" // Optional data field
};

console.log("   Transaction details:");
console.log(`   - Type: ${tx.type}`);
console.log(`   - From: ${tx.from}`);
console.log(`   - To: ${tx.to}`);
console.log(`   - Amount: ${tx.amount} wei (1 ETH)`);
console.log(`   - Gas Limit: ${tx.gasLimit}`);
console.log(`   - Gas Price: ${tx.gasPrice} wei (2 Gwei)`);
console.log(`   - Estimated Fee: ${tx.gasLimit * tx.gasPrice} wei\n`);

// Sign the transaction
console.log("3. Signing transaction...");
const chainId = "forge-mini";
const signedTx = signTx(tx, chainId, alice.privateKey, alice.publicKey);

console.log(`   Signed transaction hash: ${signedTx.hash}\n`);

// Create curl command for submission
console.log("4. API submission command:");
console.log("   To submit this transaction to a running node, use:");
console.log(`   curl -X POST -H "Content-Type: application/json" \\`);
// Convert BigInt to string for JSON serialization
const serializableSignedTx = JSON.parse(JSON.stringify(signedTx, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
));
console.log(`        -d '${JSON.stringify(serializableSignedTx, null, 2)}' \\`);
console.log(`        http://localhost:8080/tx\n`);

console.log("5. Start the enhanced blockchain node:");
console.log("   For Leader Node:");
console.log(`   $env:LEADER="1"; npm run dev\n`);
console.log("   For Follower Node:");
console.log(`   $env:API_PORT="8081"; $env:P2P_PORT="0"; $env:LEADER_WS="ws://localhost:7071"; npm run dev\n`);

console.log("🎯 Phase 1 Enhancements Include:");
console.log("   ✅ Gas mechanism with fees");
console.log("   ✅ Enhanced transaction validation");
console.log("   ✅ Rate limiting protection");
console.log("   ✅ Comprehensive error handling");
console.log("   ✅ Graceful shutdown procedures");
console.log("   ✅ Gas-based transaction prioritization");
console.log("   ✅ Block gas limit enforcement\n");

console.log("📋 Environment Variables:");
console.log("   BLOCK_GAS_LIMIT=10000000    # 10M gas per block");
console.log("   MIN_GAS_PRICE=1000000000    # 1 Gwei minimum");
console.log("   BASE_FEE=1000000000         # 1 Gwei base fee");
console.log("   LEADER=1                    # Leader mode");
console.log("   API_PORT=8080               # API port");
console.log("   P2P_PORT=7071               # P2P port\n");

console.log("🔍 To monitor the node:");
console.log("   GET /health                 # Node health");
console.log("   GET /head                   # Latest block");
console.log("   GET /account/<address>      # Account state");
console.log("   POST /tx                    # Submit transaction\n");

console.log("Ready to demonstrate Phase 1 MVP enhancements! 🎉");
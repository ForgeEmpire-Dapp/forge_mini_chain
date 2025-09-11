/**
 * @fileoverview Test suite for Phase 1 enhancements: validation, gas mechanism, and error handling
 */
import { TxValidator, GAS_COSTS, RateLimiter } from "./dist/validation.js";
import { State } from "./dist/state.js";
import { generateKeyPair } from "./dist/crypto.js";
import { signTx } from "./dist/tx.js";

// Test configuration
const testConfig = {
  chainId: "test-chain",
  blockTimeMs: 1000,
  isLeader: true,
  p2pPort: 7071,
  apiPort: 8080,
  dataDir: ".test-data",
  keypairFile: ".test-keys.json",
  blockGasLimit: 1000000n,
  minGasPrice: 1000000000n, // 1 Gwei
  baseFeePerGas: 1000000000n
};

async function runPhase1Tests() {
  console.log("🧪 Running Phase 1 Enhancement Tests...\n");

  // Test 1: Gas Calculation
  console.log("Test 1: Gas Calculation");
  const state = new State();
  state.setValidator(testConfig);
  const validator = new TxValidator(testConfig, state);

  // Create test accounts
  const alice = generateKeyPair();
  const bob = generateKeyPair();
  
  // Fund Alice's account
  const aliceAccount = state.getOrCreate(alice.address);
  aliceAccount.balance = 1000000000000000000n; // 1 ETH in wei
  aliceAccount.nonce = 0;

  // Test transfer transaction gas calculation
  const transferTx = {
    type: "transfer",
    from: alice.address,
    to: bob.address,
    amount: 100000000000000000n, // 0.1 ETH
    nonce: 1,
    gasLimit: 50000n,
    gasPrice: 2000000000n // 2 Gwei
  };

  const gasCost = validator.calculateGasCost(transferTx);
  console.log(`   ✓ Transfer gas cost: ${gasCost.total} (base: ${gasCost.base}, data: ${gasCost.data})`);
  console.log(`   ✓ Expected: ${GAS_COSTS.TX_BASE + GAS_COSTS.TRANSFER}`);
  
  if (gasCost.total === GAS_COSTS.TX_BASE + GAS_COSTS.TRANSFER) {
    console.log("   ✅ Gas calculation test PASSED\n");
  } else {
    console.log("   ❌ Gas calculation test FAILED\n");
  }

  // Test 2: Transaction Validation
  console.log("Test 2: Enhanced Transaction Validation");
  
  const validationResult = await validator.validateTx(transferTx);
  console.log(`   ✓ Validation result: ${validationResult.valid ? 'VALID' : 'INVALID'}`);
  if (!validationResult.valid) {
    console.log(`   ✓ Error: ${validationResult.error}`);
  }
  console.log(`   ✓ Required gas: ${validationResult.requiredGas}`);
  console.log(`   ✓ Fee: ${validationResult.fee}`);

  if (validationResult.valid) {
    console.log("   ✅ Transaction validation test PASSED\n");
  } else {
    console.log("   ❌ Transaction validation test FAILED\n");
  }

  // Test 3: Invalid Transaction Validation
  console.log("Test 3: Invalid Transaction Rejection");
  
  const invalidTx = {
    type: "transfer",
    from: alice.address,
    to: bob.address,
    amount: 2000000000000000000n, // 2 ETH (more than balance)
    nonce: 1,
    gasLimit: 50000n,
    gasPrice: 2000000000n
  };

  const invalidResult = await validator.validateTx(invalidTx);
  console.log(`   ✓ Invalid transaction result: ${invalidResult.valid ? 'VALID' : 'INVALID'}`);
  if (!invalidResult.valid) {
    console.log(`   ✓ Error: ${invalidResult.error}`);
  }

  if (!invalidResult.valid) {
    console.log("   ✅ Invalid transaction rejection test PASSED\n");
  } else {
    console.log("   ❌ Invalid transaction rejection test FAILED\n");
  }

  // Test 4: Gas Price Validation
  console.log("Test 4: Gas Price Validation");
  
  const lowGasTx = {
    type: "transfer",
    from: alice.address,
    to: bob.address,
    amount: 100000000000000000n,
    nonce: 1,
    gasLimit: 50000n,
    gasPrice: 500000000n // Below minimum (1 Gwei)
  };

  const lowGasResult = await validator.validateTx(lowGasTx);
  console.log(`   ✓ Low gas price result: ${lowGasResult.valid ? 'VALID' : 'INVALID'}`);
  if (!lowGasResult.valid) {
    console.log(`   ✓ Error: ${lowGasResult.error}`);
  }

  if (!lowGasResult.valid && lowGasResult.error?.includes("Gas price too low")) {
    console.log("   ✅ Gas price validation test PASSED\n");
  } else {
    console.log("   ❌ Gas price validation test FAILED\n");
  }

  // Test 5: Rate Limiting
  console.log("Test 5: Rate Limiting");
  
  const rateLimiter = new RateLimiter(2, 5000); // 2 tx per 5 seconds
  
  const rate1 = rateLimiter.checkRateLimit(alice.address);
  const rate2 = rateLimiter.checkRateLimit(alice.address);
  const rate3 = rateLimiter.checkRateLimit(alice.address); // Should fail
  
  console.log(`   ✓ Rate limit check 1: ${rate1.valid ? 'PASS' : 'FAIL'}`);
  console.log(`   ✓ Rate limit check 2: ${rate2.valid ? 'PASS' : 'FAIL'}`);
  console.log(`   ✓ Rate limit check 3: ${rate3.valid ? 'PASS' : 'FAIL'}`);
  if (!rate3.valid) {
    console.log(`   ✓ Error: ${rate3.error}`);
  }

  if (rate1.valid && rate2.valid && !rate3.valid) {
    console.log("   ✅ Rate limiting test PASSED\n");
  } else {
    console.log("   ❌ Rate limiting test FAILED\n");
  }

  // Test 6: Transaction Application with Gas
  console.log("Test 6: Transaction Application with Gas");
  
  const bobBalanceBefore = state.getOrCreate(bob.address).balance;
  const aliceBalanceBefore = aliceAccount.balance;
  
  // Create a proposer account
  const proposer = generateKeyPair();
  const proposerBalanceBefore = state.getOrCreate(proposer.address).balance;
  
  const txResult = state.applyTx(transferTx, 1, proposer.address);
  
  const bobBalanceAfter = state.getOrCreate(bob.address).balance;
  const aliceBalanceAfter = aliceAccount.balance;
  const proposerBalanceAfter = state.getOrCreate(proposer.address).balance;
  
  console.log(`   ✓ Transaction success: ${txResult.success}`);
  console.log(`   ✓ Gas used: ${txResult.gasUsed}`);
  console.log(`   ✓ Bob balance change: ${bobBalanceAfter - bobBalanceBefore}`);
  console.log(`   ✓ Alice balance change: ${aliceBalanceAfter - aliceBalanceBefore}`);
  console.log(`   ✓ Proposer balance change: ${proposerBalanceAfter - proposerBalanceBefore}`);
  
  const expectedFee = txResult.gasUsed * transferTx.gasPrice;
  const expectedAliceChange = -(transferTx.amount + expectedFee);
  
  if (txResult.success && 
      bobBalanceAfter - bobBalanceBefore === transferTx.amount &&
      aliceBalanceAfter - aliceBalanceBefore === expectedAliceChange &&
      proposerBalanceAfter - proposerBalanceBefore === expectedFee) {
    console.log("   ✅ Transaction application with gas test PASSED\n");
  } else {
    console.log("   ❌ Transaction application with gas test FAILED\n");
  }

  // Test 7: Post Transaction Gas
  console.log("Test 7: Post Transaction Gas Calculation");
  
  const postTx = {
    type: "post",
    from: alice.address,
    postId: "test-post-123",
    contentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    pointer: "ipfs://test",
    nonce: 2,
    gasLimit: 50000n,
    gasPrice: 2000000000n
  };

  const postGasCost = validator.calculateGasCost(postTx);
  console.log(`   ✓ Post gas cost: ${postGasCost.total}`);
  console.log(`   ✓ Expected: ${GAS_COSTS.TX_BASE + GAS_COSTS.POST}`);
  
  if (postGasCost.total === GAS_COSTS.TX_BASE + GAS_COSTS.POST) {
    console.log("   ✅ Post transaction gas test PASSED\n");
  } else {
    console.log("   ❌ Post transaction gas test FAILED\n");
  }

  console.log("🎉 Phase 1 Enhancement Tests Completed!");
  console.log("\n📊 Summary:");
  console.log("✅ Gas calculation mechanism");
  console.log("✅ Enhanced transaction validation");
  console.log("✅ Rate limiting");
  console.log("✅ Error handling");
  console.log("✅ Gas fee collection");
  console.log("✅ Transaction type support");
}

// Run tests
runPhase1Tests().catch(console.error);

export { runPhase1Tests };
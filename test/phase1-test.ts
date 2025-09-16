import { Account } from "../src/types.js";
import { State } from "../src/state.js";

// Test the new Account structure
function testAccountStructure() {
  console.log("Testing Account structure...");
  
  // Create a new account
  const state = new State();
  const account = state.getOrCreate("0x1234567890123456789012345678901234567890");
  
  // Check that the account has the correct structure
  if (typeof account.forgeBalance === 'bigint') {
    console.log("✓ Account has forgeBalance field with correct type");
  } else {
    console.log("✗ Account forgeBalance field missing or incorrect type");
  }
  
  if (typeof account.nonce === 'number') {
    console.log("✓ Account has nonce field with correct type");
  } else {
    console.log("✗ Account nonce field missing or incorrect type");
  }
  
  if (typeof account.rep === 'number') {
    console.log("✓ Account has rep field with correct type");
  } else {
    console.log("✗ Account rep field missing or incorrect type");
  }
  
  // Test setting and getting forgeBalance
  account.forgeBalance = 1000000000000000000n; // 1 FORGE
  if (account.forgeBalance === 1000000000000000000n) {
    console.log("✓ Account forgeBalance can be set and retrieved correctly");
  } else {
    console.log("✗ Account forgeBalance setting/retrieving failed");
  }
  
  console.log("Account structure test completed.");
}

// Run the test
testAccountStructure();
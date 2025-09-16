# Native Token Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing a native FORGE token in the mini blockchain. Follow these steps to integrate the token with proper tokenomics while maintaining backward compatibility.

## Prerequisites

- Node.js 16+
- TypeScript 4.5+
- Familiarity with the existing mini blockchain codebase
- Access to the project repository

## Implementation Steps

### Phase 1: Core Data Structure Changes (Days 1-2) ✅

#### Step 1: Update Account Structure

1. Open [src/types.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts)
2. Modify the [Account](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L124-L131) type to rename [balance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L111-L111) to [forgeBalance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L125-L125):

```typescript
export type Account = {
  forgeBalance: bigint;     // Changed from 'balance: bigint'
  nonce: number;
  rep: number;
  codeHash?: Hex;
  storageRoot?: Hex;
  isContract?: boolean;
};
```

#### Step 2: Update Chain Configuration

1. In [src/types.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts), modify [ChainConfig](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L111-L133) to add token parameters:

```typescript
export type ChainConfig = {
  chainId: string;
  blockTimeMs: number;
  isLeader: boolean;
  leaderWsURL?: string;
  p2pPort: number;
  apiPort: number;
  dataDir: string;
  keypairFile: string;
  // Gas mechanism
  blockGasLimit: bigint;
  minGasPrice: bigint;
  baseFeePerGas: bigint;
  // Native token configuration
  blockReward: bigint;      // New field
  initialSupply: bigint;    // New field
  supplyCap: bigint;        // New field
};
```

#### Step 3: Update Account Management

1. Open [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts)
2. Update the [getOrCreate](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts#L46-LL53) method:

```typescript
getOrCreate(addr: string): Account {
  const a = this.accounts.get(addr);
  if (a) return a;
  const fresh: Account = { 
    forgeBalance: 0n,  // Changed from 'balance: 0n'
    nonce: 0, 
    rep: 0 
  };
  this.accounts.set(addr, fresh);
  return fresh;
}
```

#### Step 4: Add Backward Compatibility

1. Add a temporary migration function to [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts):

```typescript
/**
 * Migrates existing accounts from old balance field to forgeBalance field
 * Temporary function for backward compatibility
 */
migrateAccountBalances(): void {
  for (const [address, account] of this.accounts.entries()) {
    // If account has old balance field but no forgeBalance, migrate it
    if ('balance' in account && !('forgeBalance' in account)) {
      account.forgeBalance = (account as any).balance;
      delete (account as any).balance;
      logger.info('Migrated account balance', { address });
    }
  }
}
```

### Phase 2: Transaction Processing Updates (Days 3-4) ✅

#### Step 5: Update Fee Processing

1. In [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts), update the [applyTx](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts#L55-L297) method to use [forgeBalance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L125-L125):

```typescript
// Replace this line:
// const totalFee = gasCost.total * tx.gasPrice;
// if (from.balance < totalFee) {

// With:
const totalFee = gasCost.total * tx.gasPrice;
if (from.forgeBalance < totalFee) {
  throw new Error(`Insufficient FORGE balance for gas: required ${totalFee}, available ${from.forgeBalance}`);
}

// Replace this line:
// from.balance -= totalFee;

// With:
from.forgeBalance -= totalFee;

// Replace this line:
// proposerAccount.balance += totalFee;

// With:
proposerAccount.forgeBalance += totalFee;
```

#### Step 6: Update Transfer Transactions

1. In [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts), update the transfer transaction logic:

```typescript
if (tx.type === "transfer") {
  const transferTx = tx as any;
  const to = this.getOrCreate(transferTx.to);
  
  // Check FORGE balance for transfer
  if (from.forgeBalance < transferTx.amount) {
    throw new Error(`Insufficient FORGE balance for transfer: required ${transferTx.amount}, available ${from.forgeBalance}`);
  }
  
  // Transfer FORGE tokens
  from.forgeBalance -= transferTx.amount;
  to.forgeBalance += transferTx.amount;
  from.nonce++;
  
  // ... rest of the logic
}
```

#### Step 7: Update Contract Transactions

1. Update contract deployment value transfers:

```typescript
// In deploy transaction handling:
if (deployTx.value > 0n) {
  if (from.forgeBalance < deployTx.value) {
    throw new Error(`Insufficient FORGE balance for deployment: required ${deployTx.value}, available ${from.forgeBalance}`);
  }
  from.forgeBalance -= deployTx.value;
  // Contract account creation with value...
}

// In call transaction handling:
if (callTx.value > 0n) {
  if (from.forgeBalance < callTx.value) {
    throw new Error(`Insufficient FORGE balance for call: required ${callTx.value}, available ${from.forgeBalance}`);
  }
  from.forgeBalance -= callTx.value;
  const contractAccount = this.getOrCreate(callTx.to);
  contractAccount.forgeBalance += callTx.value;
}
```

### Phase 3: Tokenomics Implementation (Days 5-6) ✅

#### Step 8: Add Block Reward System

1. Add the block reward distribution method to [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts):

```typescript
/**
 * Distributes block rewards to the proposer
 * @param proposer The address of the block proposer
 * @param blockReward The amount of FORGE tokens to reward
 */
distributeBlockReward(proposer: string, blockReward: bigint): void {
  const proposerAccount = this.getOrCreate(proposer);
  proposerAccount.forgeBalance += blockReward;
  
  logger.info('Block reward distributed', { 
    proposer: proposer,
    reward: blockReward.toString()
  });
}
```

#### Step 9: Update Block Application

1. Modify the [applyBlock](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts#L299-L323) function in [src/state.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts):

```typescript
export async function applyBlock(
  state: State, 
  block: { txs: SignedTx[]; header: { height: number; proposer: string } },
  blockReward?: bigint  // Add optional block reward parameter
): Promise<{ totalGasUsed: bigint; txResults: Array<{ txHash: string; result: TxExecutionResult }> }> {
  let totalGasUsed = 0n;
  const txResults: Array<{ txHash: string; result: TxExecutionResult }> = [];
  
  // Apply all transactions
  for (const stx of block.txs) {
    const result = await state.applyTx(stx.tx, block.header.height, block.header.proposer);
    totalGasUsed += result.gasUsed;
    txResults.push({ txHash: stx.hash, result });
  }
  
  // Distribute block reward to proposer if specified
  if (blockReward) {
    state.distributeBlockReward(block.header.proposer, blockReward);
  }
  
  return { totalGasUsed, txResults };
}
```

#### Step 10: Implement Dynamic Base Fee Calculation

1. Add the EIP-1559 style base fee calculation to [src/blockchain.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/blockchain.ts):

```typescript
/**
 * Calculates the base fee for a new block based on parent block utilization
 * @param parentBlock The parent block to base calculations on
 * @returns The calculated base fee in FORGE token wei
 */
calculateBaseFee(parentBlock: Block): bigint {
  // EIP-1559 parameters
  const ELASTICITY_MULTIPLIER = 8n;
  const gasTarget = parentBlock.header.gasLimit / 2n;
  
  // If the parent block used exactly the target gas, keep the same base fee
  if (parentBlock.header.gasUsed === gasTarget) {
    return parentBlock.header.baseFeePerGas;
  }
  
  // Calculate the base fee delta
  const gasUsedDelta = parentBlock.header.gasUsed - gasTarget;
  const baseFeeDelta = (parentBlock.header.baseFeePerGas * gasUsedDelta) / 
                      (gasTarget * ELASTICITY_MULTIPLIER);
  
  // Ensure base fee doesn't go below minimum
  const newBaseFee = parentBlock.header.baseFeePerGas + baseFeeDelta;
  return newBaseFee > this.cfg.minGasPrice ? newBaseFee : this.cfg.minGasPrice;
}
```

2. Update the [buildNextBlock](file:///c:/Users/dubci/Desktop/mini_chain/src/blockchain.ts#L305-L357) method to use dynamic base fees:

```typescript
buildNextBlock(): Block {
  // ... existing logic ...
  
  // Calculate new base fee based on current head block
  let newBaseFee = this.cfg.baseFeePerGas;
  if (this.head) {
    newBaseFee = this.calculateBaseFee(this.head);
  }
  
  return buildBlock(
    height, 
    prev, 
    this.keys.address, 
    this.keys.privateKey, 
    selectedTxs,
    blockGasUsed,
    this.cfg.blockGasLimit,
    newBaseFee  // Use calculated base fee
  );
}
```

### Phase 4: Configuration and Genesis (Days 7-8) ✅

#### Step 11: Update Node Configuration

1. In [src/node.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/node.ts), update the [getChainConfig](file:///c:/Users/dubci/Desktop/mini_chain/src/node.ts#L17-L34) function:

```typescript
function getChainConfig() {
  return {
    chainId: process.env.CHAIN_ID || "forge-mini",
    blockTimeMs: parseInt(process.env.BLOCK_MS || "500"),
    isLeader: process.env.LEADER === "1",
    leaderWsURL: process.env.LEADER_WS || "ws://localhost:7071",
    p2pPort: parseInt(process.env.P2P_PORT || (process.env.LEADER === "1" ? "7071" : "0")),
    apiPort: parseInt(process.env.API_PORT || (process.env.LEADER === "1" ? "8080" : "8081")),
    dataDir: process.env.DATA_DIR || (process.env.LEADER === "1" ? ".data" : `.data-follower-${process.env.API_PORT || "8081"}`),
    keypairFile: process.env.KEY_FILE || ".keys/ed25519.json",
    // Gas mechanism configuration
    blockGasLimit: BigInt(process.env.BLOCK_GAS_LIMIT || "30000000"), // 30M gas
    minGasPrice: BigInt(process.env.MIN_GAS_PRICE || "1000000000"), // 1 Gwei FORGE
    baseFeePerGas: BigInt(process.env.BASE_FEE || "1000000000"), // 1 Gwei FORGE
    // Native token configuration
    blockReward: BigInt(process.env.BLOCK_REWARD || "5000000000000000000"), // 5 FORGE
    initialSupply: BigInt(process.env.INITIAL_SUPPLY || "1000000000000000000000000000"), // 1B FORGE
    supplyCap: BigInt(process.env.SUPPLY_CAP || "2000000000000000000000000000") // 2B FORGE
  };
}
```

#### Step 12: Add Genesis Configuration Support

1. Create a new file [src/genesis.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/genesis.ts):

```typescript
/**
 * @fileoverview Genesis block configuration and initialization
 */
import { State } from "./state.js";
import logger from './logger.js';

export type GenesisAccount = {
  forgeBalance: string;
};

export type GenesisConfig = {
  alloc: {
    [address: string]: GenesisAccount;
  };
  blockReward: string;
  chainId: string;
  initialSupply: string;
};

/**
 * Initializes the blockchain state with genesis configuration
 * @param state The blockchain state to initialize
 * @param genesisConfig The genesis configuration with initial allocations
 */
export async function initializeGenesis(state: State, genesisConfig: GenesisConfig): Promise<void> {
  logger.info('Initializing genesis state', { 
    chainId: genesisConfig.chainId,
    accountCount: Object.keys(genesisConfig.alloc).length
  });
  
  // Allocate initial balances
  for (const [address, account] of Object.entries(genesisConfig.alloc)) {
    const genesisAccount = state.getOrCreate(address);
    genesisAccount.forgeBalance = BigInt(account.forgeBalance);
  }
  
  logger.info('Genesis state initialized', { 
    totalSupply: genesisConfig.initialSupply
  });
}
```

### Phase 5: API Endpoints (Days 9-10) ✅

#### Step 13: Add Token Supply Endpoint

1. In [src/api.ts](file:///c:/Users/dubci/Desktop/mini_chain/src/api.ts), add new endpoints:

```typescript
// Add helper function for formatting token amounts
function formatForgeTokens(wei: bigint): string {
  const forge = Number(wei) / 1e18;
  return forge.toFixed(2) + " FORGE";
}

// Add supply endpoint
app.get("/supply", (req, res) => {
  try {
    // Calculate current total supply
    let totalSupply = 0n;
    for (const account of chain.state.accounts.values()) {
      totalSupply += account.forgeBalance;
    }
    
    const supplyInfo = {
      totalSupply: totalSupply.toString(),
      totalSupplyFormatted: formatForgeTokens(totalSupply),
      supplyCap: cfg.supplyCap.toString(),
      supplyCapFormatted: formatForgeTokens(cfg.supplyCap),
      percentageMinted: Number((totalSupply * 100n) / cfg.supplyCap)
    };
    
    res.json(supplyInfo);
  } catch (error) {
    logger.error('Supply retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message });
  }
});

// Add tokenomics endpoint
app.get("/tokenomics", (req, res) => {
  try {
    const tokenomics = {
      tokenName: "Forge Token",
      tokenSymbol: "FORGE",
      decimals: 18,
      blockReward: cfg.blockReward.toString(),
      blockRewardFormatted: formatForgeTokens(cfg.blockReward),
      minGasPrice: cfg.minGasPrice.toString(),
      minGasPriceFormatted: formatForgeTokens(cfg.minGasPrice) + " per gas",
      blockGasLimit: cfg.blockGasLimit.toString(),
      supplyCap: cfg.supplyCap.toString(),
      supplyCapFormatted: formatForgeTokens(cfg.supplyCap)
    };
    
    res.json(tokenomics);
  } catch (error) {
    logger.error('Tokenomics retrieval failed', { error: (error as Error).message });
    res.status(500).json({ error: (error as Error).message });
  }
});
```

#### Step 14: Update Account Endpoint

1. Update the account endpoint to show FORGE balance explicitly:

```typescript
app.get("/account/:addr", (req, res) => {
  const account = handlers.getAccount(req.params.addr) || null;
  
  // Format response with explicit token information
  if (account) {
    const formattedAccount = {
      ...account,
      forgeBalance: account.forgeBalance.toString(),
      forgeBalanceFormatted: formatForgeTokens(account.forgeBalance)
    };
    
    res.json(JSON.parse(JSON.stringify(formattedAccount, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    )));
  } else {
    res.json(null);
  }
});
```

### Phase 6: Explorer Integration (Days 11-12) ✅

#### Step 15: Update Block Explorer

1. In [explorer/public/app.js](file:///c:/Users/dubci/Desktop/mini_chain/explorer/public/app.js), update the account display:

```javascript
function displayAccountDetails(account, address) {
    return `
        <div class="account-details">
            <div class="account-info">
                <div class="account-item">
                    <span class="account-label">Address</span>
                    <span class="account-value">${address}</span>
                </div>
                <div class="account-item">
                    <span class="account-label">FORGE Balance</span>
                    <span class="account-value">${formatForgeBalance(account.forgeBalance)}</span>
                </div>
                <div class="account-item">
                    <span class="account-label">Nonce</span>
                    <span class="account-value">${account.nonce || 0}</span>
                </div>
                <div class="account-item">
                    <span class="account-label">Reputation</span>
                    <span class="account-value">${account.rep || 0}</span>
                </div>
            </div>
        </div>
    `;
}

function formatForgeBalance(balance) {
    if (!balance) return "0.00 FORGE";
    const forge = parseFloat(balance) / 1e18;
    return forge.toFixed(2) + " FORGE";
}
```

### Phase 7: Testing (Days 13-14) ✅

#### Step 16: Add Unit Tests

1. Create test file [test/token.test.ts](file:///c:/Users/dubci/Desktop/mini_chain/test/token.test.ts):

```typescript
import { State } from "../src/state.js";
import { describe, it, expect } from "vitest";

describe('Native Token Implementation', () => {
  it('should create new accounts with zero FORGE balance', () => {
    const state = new State();
    const account = state.getOrCreate('0x1234567890123456789012345678901234567890');
    expect(account.forgeBalance).toBe(0n);
  });
  
  it('should properly deduct gas fees in FORGE tokens', async () => {
    const state = new State();
    // Setup account with FORGE balance
    const account = state.getOrCreate('0x1234567890123456789012345678901234567890');
    account.forgeBalance = 1000000000000000000n; // 1 FORGE
    
    // Create a mock transaction
    const tx = {
      type: "transfer",
      nonce: 1,
      from: "0x1234567890123456789012345678901234567890",
      gasLimit: 21000n,
      gasPrice: 1000000000n, // 1 Gwei
      to: "0xabcdef123456789012345678901234567890abcd",
      amount: 100000000000000000n // 0.1 FORGE
    };
    
    // Mock validation result
    state.validator = {
      calculateGasCost: () => ({ base: 21000n, data: 0n, total: 21000n })
    } as any;
    
    // Apply transaction
    await state.applyTx(tx, 1, '0xproposer');
    
    // Check balance after fee deduction
    expect(account.forgeBalance).toBe(979000000000000000n); // 1 - 0.021 FORGE
  });
  
  it('should distribute block rewards to proposers', () => {
    const state = new State();
    const proposerAddress = '0x1234567890123456789012345678901234567890';
    
    // Check initial balance
    const proposerAccount = state.getOrCreate(proposerAddress);
    expect(proposerAccount.forgeBalance).toBe(0n);
    
    // Distribute reward
    const blockReward = 5000000000000000000n; // 5 FORGE
    state.distributeBlockReward(proposerAddress, blockReward);
    
    // Check updated balance
    expect(proposerAccount.forgeBalance).toBe(blockReward);
  });
});
```

### Phase 8: Documentation (Days 15) ✅

#### Step 17: Update Documentation

1. Update [README.md](file:///c:/Users/dubci/Desktop/mini_chain/README.md) with token information
2. Add examples of token transactions
3. Document environment variables
4. Update API documentation

## Testing and Validation

### Run Unit Tests
```bash
npm test
```

### Test Token Functionality
1. Start the blockchain node
2. Create accounts with initial balances
3. Submit transactions with gas fees
4. Verify block rewards are distributed
5. Check token supply endpoints

### Performance Testing
1. Measure transaction processing times
2. Test block creation with rewards
3. Verify API response times

## Deployment

### Environment Configuration
```bash
# Token Configuration
BLOCK_REWARD=5000000000000000000          # 5 FORGE per block
INITIAL_SUPPLY=1000000000000000000000000000  # 1 billion FORGE
SUPPLY_CAP=2000000000000000000000000000      # 2 billion FORGE cap

# Gas Configuration
BLOCK_GAS_LIMIT=30000000    # 30M gas per block
MIN_GAS_PRICE=1000000000    # 1 Gwei FORGE minimum
BASE_FEE=1000000000         # 1 Gwei FORGE base fee
```

### Genesis Configuration Example
```json
{
  "alloc": {
    "0x1234567890123456789012345678901234567890": {
      "forgeBalance": "500000000000000000000000000"
    },
    "0xabcdef123456789012345678901234567890abcd": {
      "forgeBalance": "300000000000000000000000000"
    }
  },
  "blockReward": "5000000000000000000",
  "chainId": "forge-mainnet",
  "initialSupply": "1000000000000000000000000000"
}
```

## Troubleshooting

### Common Issues

1. **Balance Mismatch**: Ensure all balance references are updated to [forgeBalance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L125-L125)
2. **Transaction Failures**: Check gas price and balance validation logic
3. **Block Reward Issues**: Verify block reward distribution in [applyBlock](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts#L299-L323)
4. **API Errors**: Ensure BigInt serialization in JSON responses

### Rollback Procedure
1. Revert code changes
2. Restore database from backup
3. Restart nodes with original configuration

## Conclusion

Following this implementation guide will successfully integrate a native FORGE token into the mini blockchain with proper tokenomics. The phased approach ensures a smooth integration while maintaining backward compatibility. After implementation, the blockchain will have a robust economic model that incentivizes network participation and security.
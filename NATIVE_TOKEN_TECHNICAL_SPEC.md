# Native Token Technical Specification

## Overview

This document provides detailed technical specifications for implementing a native FORGE token in the mini blockchain. The implementation will enhance the existing gas mechanism with explicit token semantics and introduce a comprehensive tokenomics model.

## 1. Core Data Structure Changes

### 1.1 Account Structure Modification

#### Current Structure
```typescript
export type Account = {
  balance: bigint;
  nonce: number;
  rep: number;
  codeHash?: Hex;
  storageRoot?: Hex;
  isContract?: boolean;
};
```

#### Updated Structure
```typescript
export type Account = {
  forgeBalance: bigint;     // Explicitly named FORGE token balance
  nonce: number;
  rep: number;
  codeHash?: Hex;
  storageRoot?: Hex;
  isContract?: boolean;
};
```

### 1.2 Chain Configuration Enhancement

#### Updated ChainConfig
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
  blockReward: bigint;      // FORGE tokens per block
  initialSupply: bigint;    // Initial token supply in wei
  supplyCap: bigint;        // Maximum token supply in wei
};
```

### 1.3 Genesis Configuration

#### New Genesis Configuration Type
```typescript
export type GenesisAccount = {
  forgeBalance: string;     // Initial FORGE balance (in wei)
};

export type GenesisConfig = {
  alloc: {
    [address: string]: GenesisAccount;
  };
  blockReward: string;      // FORGE per block (in wei)
  chainId: string;
  initialSupply: string;    // Total initial supply (in wei)
};
```

## 2. State Management Implementation

### 2.1 Account Creation and Management

#### Updated getOrCreate Method
```typescript
/**
 * Retrieves an account by address, or creates a new one if it doesn't exist.
 * @param addr The address of the account to retrieve or create.
 * @returns The account object.
 */
getOrCreate(addr: string): Account {
  const a = this.accounts.get(addr);
  if (a) return a;
  const fresh: Account = { 
    forgeBalance: 0n, 
    nonce: 0, 
    rep: 0 
  };
  this.accounts.set(addr, fresh);
  return fresh;
}
```

### 2.2 Transaction Fee Processing

#### Updated applyTx Method (Extract)
```typescript
async applyTx(tx: Tx, height: number, proposer: string): Promise<TxExecutionResult> {
  let gasUsed = 0n;
  
  try {
    // Calculate gas cost
    const gasCost = this.validator?.calculateGasCost(tx) || {
      base: GAS_COSTS.TX_BASE,
      data: 0n,
      total: GAS_COSTS.TX_BASE
    };
    
    const from = this.getOrCreate(tx.from);
    const totalFee = gasCost.total * tx.gasPrice;
    
    // Validate FORGE balance for gas fees
    if (from.forgeBalance < totalFee) {
      throw new Error(`Insufficient FORGE balance for gas: required ${totalFee}, available ${from.forgeBalance}`);
    }
    
    // Deduct gas fee in FORGE tokens
    from.forgeBalance -= totalFee;
    gasUsed = gasCost.total;
    
    // Credit gas fee to proposer in FORGE tokens
    const proposerAccount = this.getOrCreate(proposer);
    proposerAccount.forgeBalance += totalFee;
    
    // ... rest of transaction processing
  } catch (error) {
    // Error handling remains the same
  }
}
```

### 2.3 Block Reward Implementation

#### New Block Reward Function
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
    reward: blockReward
  });
}
```

## 3. Gas Mechanism Enhancement

### 3.1 Dynamic Base Fee Calculation

#### EIP-1559 Style Implementation
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
  return newBaseFee > this.config.minGasPrice ? newBaseFee : this.config.minGasPrice;
}
```

### 3.2 Transaction Validation Enhancement

#### Updated Validation to Check FORGE Balance
```typescript
/**
 * Validates a transaction comprehensively including FORGE token balance
 */
async validateTx(tx: Tx, currentBlockGasUsed: bigint = 0n): Promise<ValidationResult> {
  try {
    // ... existing validation steps ...
    
    // Calculate total cost in FORGE tokens
    const gasCost = this.calculateGasCost(tx);
    const totalCost = gasCost.total * tx.gasPrice + this.getTransferAmount(tx);
    
    // Check FORGE token balance
    const account = this.state.getOrCreate(tx.from);
    if (account.forgeBalance < totalCost) {
      return {
        valid: false,
        error: `Insufficient FORGE balance: required ${totalCost}, available ${account.forgeBalance}`
      };
    }

    return {
      valid: true,
      requiredGas: gasCost.total,
      fee: gasCost.total * tx.gasPrice
    };

  } catch (error) {
    return {
      valid: false,
      error: `Validation error: ${(error as Error).message}`
    };
  }
}
```

## 4. Blockchain Initialization

### 4.1 Genesis Block Processing

#### New Genesis Processing Function
```typescript
/**
 * Initializes the blockchain state with genesis configuration
 * @param genesisConfig The genesis configuration with initial allocations
 */
async initializeGenesis(genesisConfig: GenesisConfig): Promise<void> {
  logger.info('Initializing genesis state', { 
    chainId: genesisConfig.chainId,
    accountCount: Object.keys(genesisConfig.alloc).length
  });
  
  // Allocate initial balances
  for (const [address, account] of Object.entries(genesisConfig.alloc)) {
    const genesisAccount: Account = {
      forgeBalance: BigInt(account.forgeBalance),
      nonce: 0,
      rep: 0
    };
    this.state.accounts.set(address, genesisAccount);
  }
  
  logger.info('Genesis state initialized', { 
    totalSupply: genesisConfig.initialSupply
  });
}
```

### 4.2 Configuration Loading

#### Updated Configuration with Token Parameters
```typescript
function getChainConfig(): ChainConfig {
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
    blockGasLimit: BigInt(process.env.BLOCK_GAS_LIMIT || "30000000"), // 30M gas per block
    minGasPrice: BigInt(process.env.MIN_GAS_PRICE || "1000000000"), // 1 Gwei FORGE
    baseFeePerGas: BigInt(process.env.BASE_FEE || "1000000000"), // 1 Gwei FORGE
    
    // Native token configuration
    blockReward: BigInt(process.env.BLOCK_REWARD || "5000000000000000000"), // 5 FORGE per block
    initialSupply: BigInt(process.env.INITIAL_SUPPLY || "1000000000000000000000000000"), // 1 billion FORGE
    supplyCap: BigInt(process.env.SUPPLY_CAP || "2000000000000000000000000000") // 2 billion FORGE cap
  };
}
```

## 5. Block Building and Processing

### 5.1 Enhanced Block Building

#### Updated buildNextBlock Method
```typescript
/**
 * Builds the next block from transactions in the mempool with gas optimization.
 * @returns The newly built block.
 */
buildNextBlock(): Block {
  // ... existing block building logic ...
  
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
    newBaseFee
  );
}
```

### 5.2 Block Application with Rewards

#### Updated applyBlock Function
```typescript
export async function applyBlock(
  state: State, 
  block: { txs: SignedTx[]; header: { height: number; proposer: string } },
  blockReward: bigint
): Promise<{ totalGasUsed: bigint; txResults: Array<{ txHash: string; result: TxExecutionResult }> }> {
  let totalGasUsed = 0n;
  const txResults: Array<{ txHash: string; result: TxExecutionResult }> = [];
  
  // Apply all transactions
  for (const stx of block.txs) {
    const result = await state.applyTx(stx.tx, block.header.height, block.header.proposer);
    totalGasUsed += result.gasUsed;
    txResults.push({ txHash: stx.hash, result });
  }
  
  // Distribute block reward to proposer
  state.distributeBlockReward(block.header.proposer, blockReward);
  
  return { totalGasUsed, txResults };
}
```

## 6. API Endpoints

### 6.1 Token Supply Endpoint

#### New Supply Endpoint Implementation
```typescript
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

// Helper function to format token amounts
function formatForgeTokens(wei: bigint): string {
  const forge = Number(wei) / 1e18;
  return forge.toFixed(2) + " FORGE";
}
```

### 6.2 Enhanced Account Endpoint

#### Updated Account Endpoint
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
    
    res.json(formattedAccount);
  } else {
    res.json(null);
  }
});
```

### 6.3 Tokenomics Endpoint

#### New Tokenomics Endpoint
```typescript
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

## 7. Explorer Integration

### 7.1 Account Display Enhancement

#### Updated Explorer Account Display
```javascript
// In explorer/public/app.js
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

## 8. Testing Considerations

### 8.1 Unit Test Examples

#### Account Balance Tests
```typescript
describe('Account Management', () => {
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
    
    // Create transaction with gas cost
    const tx = createTestTransaction();
    tx.gasLimit = 21000n;
    tx.gasPrice = 1000000000n; // 1 Gwei
    
    // Apply transaction
    await state.applyTx(tx, 1, '0xproposer');
    
    // Check balance after fee deduction
    expect(account.forgeBalance).toBe(979000000000000000n); // 1 - 0.021 FORGE
  });
});
```

#### Block Reward Tests
```typescript
describe('Block Rewards', () => {
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

## 9. Configuration Examples

### 9.1 Environment Variables

```bash
# Token Configuration
BLOCK_REWARD=5000000000000000000          # 5 FORGE per block
INITIAL_SUPPLY=1000000000000000000000000000  # 1 billion FORGE
SUPPLY_CAP=2000000000000000000000000000      # 2 billion FORGE cap

# Gas Configuration (FORGE-denominated)
BLOCK_GAS_LIMIT=30000000    # 30M gas per block
MIN_GAS_PRICE=1000000000    # 1 Gwei FORGE minimum
BASE_FEE=1000000000         # 1 Gwei FORGE base fee

# Network Configuration
CHAIN_ID=forge-mainnet
BLOCK_MS=500
LEADER=1
API_PORT=8080
P2P_PORT=7071
```

### 9.2 Genesis Configuration Example

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

## 10. Migration Considerations

### 10.1 Backward Compatibility

To maintain backward compatibility:
1. Keep the existing [balance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L111-L111) field temporarily with a deprecation warning
2. Add automatic migration for existing accounts
3. Provide clear documentation for the transition

### 10.2 Data Migration Script

```typescript
/**
 * Migrates existing accounts from old balance field to forgeBalance field
 */
function migrateAccountBalances(state: State): void {
  for (const [address, account] of state.accounts.entries()) {
    // If account has old balance field but no forgeBalance, migrate it
    if ('balance' in account && !('forgeBalance' in account)) {
      account.forgeBalance = (account as any).balance;
      delete (account as any).balance;
      logger.info('Migrated account balance', { address });
    }
  }
}
```

This technical specification provides a comprehensive guide for implementing the native FORGE token in the mini blockchain, ensuring proper integration with the existing gas mechanism while introducing robust tokenomics.
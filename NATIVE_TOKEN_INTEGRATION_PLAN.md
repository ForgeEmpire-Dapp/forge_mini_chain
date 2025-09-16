# Native Token Integration Plan for Mini Blockchain

## Executive Summary

This document outlines a comprehensive plan to integrate a native token with tokenomics into the mini blockchain for transaction fees. The blockchain already has a gas mechanism in place, but we will enhance it with a proper native token that has a well-defined tokenomics model.

## Current State Analysis

### Existing Gas Mechanism
The blockchain already implements:
- Gas-based transaction fees with configurable gas limits and prices
- Transaction fee collection to block proposers
- Gas cost calculations for different transaction types
- Account balance management with BigInt values

### Current Account Structure
```typescript
export type Account = {
  forgeBalance: bigint;        // This is now our native token balance
  nonce: number;
  rep: number;
  codeHash?: Hex;
  storageRoot?: Hex;
  isContract?: boolean;
};
```

### Current Gas Configuration (Defaults)
- Block Gas Limit: 30,000,000 gas
- Minimum Gas Price: 1 Gwei FORGE
- Base Fee: 1 Gwei FORGE

## Proposed Native Token Integration

### 1. Token Design

#### Token Name and Symbol
- **Name**: Forge Token
- **Symbol**: FORGE
- **Decimals**: 18 (Ethereum-compatible)

#### Token Properties
- Native utility token for gas fees
- Account balances already stored as BigInt (perfect for token amounts)
- No separate token contract needed (native token at protocol level)

### 2. Tokenomics Model

#### Initial Distribution
- **Total Supply**: 1,000,000,000 FORGE (1 billion tokens)
- **Genesis Allocation**: 
  - 500,000,000 FORGE to development team/foundation (locked with vesting)
  - 300,000,000 FORGE to early contributors and validators
  - 100,000,000 FORGE to community incentives and airdrops
  - 100,000,000 FORGE reserved for future ecosystem development

#### Inflation Model
- **Block Rewards**: 5 FORGE per block to proposer (in addition to gas fees)
- **Annual Inflation**: ~10% in first year, decreasing over time
- **Max Supply**: 2,000,000,000 FORGE (hard cap)

#### Fee Structure
- **Gas Pricing**: Dynamic based on network congestion (EIP-1559 style)
- **Minimum Gas Price**: 1 Gwei FORGE
- **Base Fee**: Adjusts based on block utilization
- **Tip**: Optional priority fee for faster transaction inclusion

### 3. Implementation Plan

#### Phase 1: Core Token Integration (Week 1-2) ✅

##### 1.1 Genesis Block Enhancement
- Modify genesis block creation to include initial token distribution
- Add genesis accounts with pre-allocated FORGE balances
- Update blockchain initialization to handle token distribution

##### 1.2 Account Balance Semantics
- Rename account [balance](file:///c:/Users/dubci/Desktop/mini_chain/src/types.ts#L111-L111) field to be explicitly FORGE token balance
- Update all references to clarify that balance represents FORGE tokens
- Add documentation to explain balance semantics

##### 1.3 Gas Mechanism Enhancement
- Update gas calculations to explicitly use FORGE tokens
- Modify fee collection to specify FORGE token transfers
- Enhance validation to check FORGE token sufficiency for gas fees

#### Phase 2: Tokenomics Implementation (Week 3-4) ✅

##### 2.1 Block Reward System
- Add block reward mechanism to [applyBlock](file:///c:/Users/dubci/Desktop/mini_chain/src/state.ts#L352-L372) function
- Implement reward distribution to block proposers
- Add configuration parameters for block rewards

##### 2.2 Dynamic Fee Mechanism
- Implement EIP-1559 style fee mechanism:
  - Base fee adjustment based on block gas usage
  - Tip mechanism for priority transactions
  - Maximum fee limits to prevent excessive fees

##### 2.3 Inflation Tracking
- Add metrics to track token supply and inflation
- Implement supply cap enforcement
- Add API endpoints for tokenomics data

#### Phase 3: Developer Experience (Week 5) ✅

##### 3.1 API Enhancement
- Add token-specific API endpoints:
  - `/supply` - Current token supply
  - `/inflation` - Inflation rate data
  - `/rewards` - Block reward information
- Enhance existing endpoints with token-specific information

##### 3.2 Explorer Integration
- Update block explorer to display FORGE token balances
- Add tokenomics dashboard with supply and inflation data
- Show block rewards in block details

##### 3.3 Documentation
- Create comprehensive documentation for the native token
- Update transaction examples with FORGE token amounts
- Add tokenomics explanation to README

### 4. Technical Implementation Details

#### 4.1 State Management Changes

##### Account Structure Enhancement
```typescript
export type Account = {
  forgeBalance: bigint;   // Explicitly named FORGE token balance
  nonce: number;
  rep: number;
  codeHash?: Hex;
  storageRoot?: Hex;
  isContract?: boolean;
};
```

##### Genesis Configuration
```typescript
export type GenesisConfig = {
  alloc: {
    [address: string]: {
      forgeBalance: string;  // Initial FORGE allocation
    }
  };
  blockReward: string;     // FORGE per block
  chainId: string;
};
```

#### 4.2 Transaction Processing Changes

##### Fee Collection Enhancement
```typescript
// In state.ts applyTx function
const totalFee = gasCost.total * tx.gasPrice;
if (from.forgeBalance < totalFee) {
  throw new Error(`Insufficient FORGE balance for gas: required ${totalFee}, available ${from.forgeBalance}`);
}
from.forgeBalance -= totalFee;

// Credit gas fee + block reward to proposer
const proposerAccount = this.getOrCreate(proposer);
proposerAccount.forgeBalance += totalFee + blockReward;
```

#### 4.3 Gas Mechanism Enhancement

##### Dynamic Base Fee Calculation
```typescript
// In blockchain.ts or a new gas manager
function calculateBaseFee(parentBlock: Block): bigint {
  const gasTarget = parentBlock.header.gasLimit / 2n;
  
  if (parentBlock.header.gasUsed === gasTarget) {
    return parentBlock.header.baseFeePerGas;
  }
  
  const gasUsedDelta = parentBlock.header.gasUsed - gasTarget;
  const baseFeeDelta = (parentBlock.header.baseFeePerGas * gasUsedDelta) / gasTarget / 8n;
  
  return parentBlock.header.baseFeePerGas + baseFeeDelta;
}
```

### 5. Configuration Updates

#### Environment Variables
```bash
# Token Configuration
BLOCK_REWARD=5000000000000000000          # 5 FORGE per block
INITIAL_SUPPLY=1000000000000000000000000000  # 1 billion FORGE
SUPPLY_CAP=2000000000000000000000000000      # 2 billion FORGE cap

# Gas Configuration (already exists but will be FORGE-denominated)
BLOCK_GAS_LIMIT=30000000    # Increased to 30M gas per block
MIN_GAS_PRICE=1000000000    # 1 Gwei FORGE minimum
BASE_FEE=1000000000         # 1 Gwei FORGE base fee
```

#### Chain Configuration Enhancement
```typescript
export type ChainConfig = {
  // Existing fields...
  blockGasLimit: bigint;
  minGasPrice: bigint;
  baseFeePerGas: bigint;
  
  // New token fields
  blockReward: bigint;      // FORGE per block
  initialSupply: bigint;    // Initial token supply
  supplyCap: bigint;        // Maximum token supply
};
```

### 6. API Endpoints

#### New Endpoints
- `GET /supply` - Returns current token supply information
- `GET /tokenomics` - Returns detailed tokenomics data
- `GET /rewards` - Returns block reward information

#### Enhanced Existing Endpoints
- `GET /account/:addr` - Will show FORGE balance explicitly
- `GET /head` - Will include base fee information
- `POST /tx` - Will validate FORGE balance for gas fees

### 7. Security Considerations

#### 7.1 Supply Protection
- Implement supply cap enforcement at the protocol level
- Add validation to prevent minting beyond the cap
- Ensure block rewards don't exceed configured amounts

#### 7.2 Balance Validation
- Strengthen balance validation for all transaction types
- Add overflow/underflow protection for balance operations
- Implement comprehensive testing for edge cases

#### 7.3 Consensus Security
- Ensure block reward distribution cannot be manipulated
- Add validation for proposer addresses
- Implement proper error handling for reward distribution failures

### 8. Testing Plan

#### 8.1 Unit Tests
- Test token balance operations (transfer, fee deduction, reward distribution)
- Validate gas fee calculations with FORGE tokens
- Test supply cap enforcement
- Verify block reward distribution

#### 8.2 Integration Tests
- End-to-end transaction processing with FORGE fees
- Block creation with reward distribution
- Genesis block token allocation
- API endpoint responses with token information

#### 8.3 Performance Tests
- Measure transaction processing with token operations
- Benchmark block creation with rewards
- Test API response times with token queries

### 9. Migration Plan

#### 9.1 Backward Compatibility
- Maintain compatibility with existing transactions
- Ensure existing accounts can use FORGE tokens
- Provide migration path for any existing balances

#### 9.2 Genesis Migration
- Create new genesis block with token allocations
- Provide tooling for existing networks to migrate
- Document migration procedures

### 10. Future Enhancements

#### 10.1 Staking Mechanism
- Implement FORGE token staking for network security
- Add validator selection based on stake
- Introduce staking rewards

#### 10.2 Governance
- Use FORGE tokens for governance voting
- Implement proposal and voting mechanisms
- Add governance parameter updates

#### 10.3 DeFi Integration
- Enable FORGE token usage in DeFi protocols
- Add token swap functionality
- Implement lending and borrowing with FORGE

## Conclusion

This plan provides a comprehensive approach to integrating a native FORGE token with well-defined tokenomics into the mini blockchain. The implementation leverages the existing gas mechanism while enhancing it with proper token semantics and economic incentives. The phased approach ensures a smooth integration with minimal disruption to existing functionality.
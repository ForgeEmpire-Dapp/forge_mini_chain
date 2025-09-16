# Wallet Creation and Contract Deployment Guide

This guide explains how to use the new wallet creation and smart contract deployment features integrated into the Forge Mini Chain Explorer.

## Prerequisites

1. Node.js (v18 or higher)
2. npm package manager

## Starting the System

### Option 1: Manual Start (Recommended for Development)

1. Start the blockchain node:
   ```bash
   # In the root directory
   npm run dev
   ```

2. Start the explorer:
   ```bash
   # In the explorer directory
   cd explorer
   npm start
   ```

### Option 2: Combined Start Script

```bash
# In the root directory
npm run dev:full
```

Note: If you get a port conflict error, stop any existing processes using ports 8080 and 3000 first.

## Using the Wallet Creation Feature

1. Open your browser and navigate to http://localhost:3000
2. Click on the "Wallet" tab
3. Select your preferred cryptographic algorithm:
   - Ed25519 (Default, faster)
   - Secp256k1 (Ethereum compatible)
4. Click "Generate New Wallet"
5. Your new wallet details will appear:
   - Address (public, can be shared)
   - Public Key (public, can be shared)
   - Private Key (private, keep secret!)
6. Click "Download Key Pair" to save your keys to a JSON file

## Using the Smart Contract Deployment Feature

1. Open your browser and navigate to http://localhost:3000
2. Click on the "Deploy Contract" tab
3. Fill in the required fields:
   - Deployer Address: Your wallet address
   - Deployer Private Key: Your wallet private key
   - Contract Bytecode: The compiled bytecode of your smart contract
   - Constructor Arguments (optional): Any arguments for the contract constructor
   - Gas Limit: Maximum gas to use (default 3000000)
   - Gas Price: Price per gas unit (default 1)
4. Click "Deploy Contract"
5. The deployment result will show:
   - Transaction Hash
   - Contract Address
   - Deployment Status

## Security Best Practices

### Wallet Security
1. Always generate wallets locally in your browser
2. Never share your private key with anyone
3. Store your private key in a secure location
4. Consider using a hardware wallet for significant funds

### Deployment Security
1. Audit smart contracts before deployment
2. Test contracts thoroughly on a local network
3. Use appropriate gas limits to prevent excessive fees
4. Verify contract addresses after deployment

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Stop existing processes using ports 8080 and 3000
   - Use different ports by modifying the configuration

2. **Connection refused**:
   - Ensure the blockchain node is running
   - Check that the API is accessible at http://localhost:8080

3. **Deployment fails**:
   - Verify the deployer has sufficient funds
   - Check that the bytecode is valid
   - Ensure gas limit is sufficient for deployment

### Checking System Status

1. Blockchain health: http://localhost:8080/health
2. Latest block: http://localhost:8080/head
3. Account details: http://localhost:8080/account/{address}

## API Endpoints

The explorer uses the following API endpoints from the blockchain node:

- GET `/health` - Node status
- GET `/head` - Latest block
- GET `/account/:addr` - Account details
- GET `/evm/stats` - EVM statistics
- POST `/tx` - Submit transactions

## Technical Details

### Cryptographic Algorithms

1. **Ed25519**:
   - Fast signature scheme
   - Used by default for new wallets
   - Not Ethereum compatible

2. **Secp256k1**:
   - Ethereum compatible
   - Compatible with most Ethereum tools
   - Slightly slower than Ed25519

### Wallet Generation Process

1. Keys are generated locally in the browser
2. No private keys are transmitted over the network
3. Addresses are derived using standard algorithms
4. All cryptographic operations use browser-native Web Crypto API

### Contract Deployment Process

1. Contract bytecode is sent to the blockchain node
2. A deployment transaction is created and signed
3. The transaction is submitted to the network
4. The contract address is calculated and displayed
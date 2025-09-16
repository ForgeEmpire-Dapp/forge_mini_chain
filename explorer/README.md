# Forge Mini Chain Explorer

A blockchain explorer for the Forge Mini Chain with additional wallet creation and smart contract deployment capabilities.

## Features

1. **Block Explorer** - View the latest blocks and transactions on the blockchain
2. **Account Lookup** - Search for account details by address
3. **Wallet Creation** - Generate new wallets with Ed25519 or Secp256k1 cryptography
4. **Smart Contract Deployment** - Deploy smart contracts to the blockchain

## Wallet Creation

The wallet creation feature allows you to generate new key pairs locally in your browser:

1. Navigate to the "Wallet" tab
2. Select your preferred cryptographic algorithm:
   - Ed25519 (Default)
   - Secp256k1 (Ethereum Compatible)
3. Click "Generate New Wallet"
4. Your new wallet details will be displayed
5. Download your key pair for safe storage

**Important**: Never share your private key with anyone. Anyone with access to your private key can control your wallet.

## Smart Contract Deployment

Deploy smart contracts to the Forge Mini Chain:

1. Navigate to the "Deploy Contract" tab
2. Enter the deployer's address and private key
3. Paste the contract bytecode
4. Optionally provide constructor arguments
5. Set gas limit and gas price
6. Click "Deploy Contract"

The deployment result will show the transaction hash and contract address.

## Development

To run the explorer:

```bash
npm install
npm start
```

The explorer will be available at http://localhost:3000

## Security Notes

- All cryptographic operations are performed locally in your browser
- Private keys are never transmitted over the network
- Always verify you're on the correct website before entering private keys
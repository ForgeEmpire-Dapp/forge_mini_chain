# Forge Empire — Mini Blockchain (MVP)

🚀 **A production-ready, EVM-compatible mini blockchain with smart contract support!**

**Core Features:**
- Post provenance (content hashes + IPFS pointers)
- Reputation scoring
- Token transfers (tips/rewards)
- **🆕 Smart Contract Deployment & Execution**
- **🆕 EVM Compatibility with Ethereum Virtual Machine**
- **🆕 ECDSA (secp256k1) Signatures for Ethereum Compatibility**

## 🏗️ Architecture Features

- **🚀 Fast, Centralized Consensus:** Single leader node for high throughput
- **🔗 Smart Contract Support:** Full EVM integration with contract deployment and interaction
- **🔐 Multi-Algorithm Cryptography:** Both Ed25519 and secp256k1 (Ethereum-compatible) signatures
- **💾 LevelDB Database:** High-performance key-value storage with state snapshots
- **⛽ Gas Mechanism:** EIP-1559 style gas pricing and execution limits
- **🌐 WebSocket P2P:** Efficient peer-to-peer communication
- **🛡️ Robust Error Handling:** Circuit breakers, graceful shutdown, and recovery
- **📊 Enhanced Validation:** Comprehensive transaction validation with rate limiting

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Test Core Functionality

```bash
# Test cryptographic functions
node test-final.js

# Test EVM and smart contract demo
npm run demo:phase2
```

### 4. Start the Leader Node

The leader node produces blocks and handles smart contract execution.

**Windows (PowerShell):**
```powershell
$env:LEADER="1"; npm run dev
```

**Linux/macOS:**
```bash
LEADER=1 npm run dev
```

### 5. Start Follower Nodes (Optional)

Follower nodes sync with the leader for distributed operation.

**Windows (PowerShell):**
```powershell
$env:API_PORT="8081"; $env:P2P_PORT="0"; $env:LEADER_WS="ws://localhost:7071"; npm run dev
```

**Linux/macOS:**
```bash
API_PORT=8081 P2P_PORT=0 LEADER_WS=ws://localhost:7071 npm run dev
```

## 📡 API Reference

The EVM-enabled blockchain node exposes comprehensive HTTP API endpoints:

### Core Endpoints
- `GET /health`: Node health status and statistics
- `GET /head`: Latest block with transaction details
- `GET /block/:height`: Retrieve block by height
- `GET /account/:addr`: Account state (balance, nonce, reputation, contract code)
- `POST /tx`: Submit any transaction type (transfer, post, reputation, deploy, call)

### Smart Contract Endpoints
- `GET /contract/:address`: Contract state and metadata
- `GET /contract/:address/storage`: Contract storage inspection
- `GET /evm/stats`: EVM execution statistics

### Enhanced Features
- **Gas Tracking**: All responses include gas usage information
- **Event Logs**: Contract execution events in transaction receipts
- **Multi-Algorithm Support**: Accepts both Ed25519 and secp256k1 signed transactions

## 🌐 Block Explorer

A comprehensive web-based block explorer for monitoring blockchain activity:

```bash
cd explorer
npm install
npm start
```

**Features:**
- Real-time block and transaction monitoring
- Smart contract transaction visualization
- Account balance and contract state inspection
- Gas usage analytics
- EVM execution traces

**Available at:** `http://localhost:3000`

## 🔐 Client-Side Signing & Smart Contract Deployment

### Transaction Signing Examples

The `client-example` directory demonstrates transaction signing for both signature algorithms:

```bash
cd client-example
node sign-tx.js
```

### Smart Contract Demo

Run the comprehensive EVM demo showcasing contract deployment and interaction:

```bash
npm run demo:phase2
```

**Demo includes:**
- ECDSA (secp256k1) key pair generation
- ERC20 token contract deployment
- Contract function calls (transfer)
- Gas estimation and fee calculation
- Complete transaction signing workflow

### Key Generation

**Ed25519 (Original):**
```javascript
import { generateKeyPair, SignatureAlgorithm } from './dist/crypto.js';
const keypair = generateKeyPair(SignatureAlgorithm.ED25519);
```

**secp256k1 (Ethereum-compatible):**
```javascript
import { generateKeyPair, SignatureAlgorithm } from './dist/crypto.js';
const keypair = generateKeyPair(SignatureAlgorithm.SECP256K1);
```

## 📤 Submit Transactions

### Standard Transaction Submission

```bash
curl -X POST -H "Content-Type: application/json" \
     -d @signed-tx.json \
     http://localhost:8080/tx
```

### Smart Contract Deployment Example

```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{
       "tx": {
         "type": "deploy",
         "from": "0x...",
         "bytecode": "0x608060405234801561001057600080fd5b50...",
         "value": "0",
         "gasLimit": "2000000",
         "gasPrice": "20000000000",
         "nonce": 1
       },
       "signature": "0x...",
       "hash": "0x...",
       "algorithm": "secp256k1"
     }' \
     http://localhost:8080/tx
```

### Contract Interaction Example

```bash
curl -X POST -H "Content-Type: application/json" \
     -d '{
       "tx": {
         "type": "call",
         "from": "0x...",
         "to": "0x742c3f0f6e8a14b9c7d5e2a3b8f6c4d8e9a1c7b5",
         "data": "0xa9059cbb000000000000000000000000...",
         "value": "0",
         "gasLimit": "100000",
         "gasPrice": "20000000000",
         "nonce": 2
       },
       "signature": "0x...",
       "hash": "0x...",
       "algorithm": "secp256k1"
     }' \
     http://localhost:8080/tx
```

## 📝 Transaction Types

### Traditional Transactions

**Transfer:**
```json
{
  "type": "transfer",
  "from": "0x...",
  "to": "0x...",
  "amount": "100",
  "nonce": 1,
  "gasLimit": "21000",
  "gasPrice": "1000000000"
}
```

**Post:**
```json
{
  "type": "post",
  "from": "0x...",
  "postId": "...",
  "contentHash": "0x...",
  "pointer": "ipfs://...",
  "nonce": 1,
  "gasLimit": "50000",
  "gasPrice": "1000000000"
}
```

**Reputation:**
```json
{
  "type": "rep",
  "from": "0x...",
  "target": "0x...",
  "delta": 1,
  "reason": "helpful post",
  "nonce": 1,
  "gasLimit": "30000",
  "gasPrice": "1000000000"
}
```

### 🆕 Smart Contract Transactions

**Deploy Contract:**
```json
{
  "type": "deploy",
  "from": "0x...",
  "bytecode": "0x608060405234801561001057600080fd5b50...",
  "constructorArgs": "0x...",
  "value": "0",
  "nonce": 1,
  "gasLimit": "2000000",
  "gasPrice": "20000000000"
}
```

**Call Contract:**
```json
{
  "type": "call",
  "from": "0x...",
  "to": "0x742c3f0f6e8a14b9c7d5e2a3b8f6c4d8e9a1c7b5",
  "data": "0xa9059cbb000000000000000000000000...",
  "value": "0",
  "nonce": 2,
  "gasLimit": "100000",
  "gasPrice": "20000000000"
}
```

## 🏗️ Configuration Options

### Environment Variables

```bash
# Node Configuration
LEADER=1                           # Run as leader node
CHAIN_ID=forge-mini               # Blockchain identifier
BLOCK_MS=500                       # Block production interval
DATA_DIR=.data                     # Database directory

# Network Configuration
API_PORT=8080                      # HTTP API port
P2P_PORT=7071                      # P2P WebSocket port
LEADER_WS=ws://localhost:7071      # Leader node WebSocket URL

# Gas Configuration
BLOCK_GAS_LIMIT=10000000          # Max gas per block (10M)
MIN_GAS_PRICE=1000000000          # Minimum gas price (1 Gwei)
BASE_FEE=1000000000               # Base fee per gas (1 Gwei)

# Security
KEY_FILE=.keys/ed25519.json       # Key file location
```

## 🔧 Development & Testing

### Available Scripts

```bash
npm run dev          # Start development node
npm run build        # Compile TypeScript
npm run test:phase1  # Test basic functionality
npm run demo:phase1  # Basic blockchain demo
npm run demo:phase2  # EVM smart contract demo
npm run demo:evm     # Alias for phase2 demo
```

### Testing Smart Contracts

1. **Deploy a test contract:**
   ```bash
   npm run demo:phase2
   ```

2. **Start the blockchain:**
   ```powershell
   $env:LEADER="1"; npm run dev
   ```

3. **Submit the generated transactions:**
   Use the curl commands from the demo output

## 🚀 Production Deployment

### Docker Deployment (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 8080 7071
CMD ["npm", "start"]
```

### Multi-Node Setup

1. **Leader Node:**
   ```bash
   LEADER=1 API_PORT=8080 P2P_PORT=7071 npm start
   ```

2. **Follower Nodes:**
   ```bash
   API_PORT=8081 LEADER_WS=ws://leader-ip:7071 npm start
   API_PORT=8082 LEADER_WS=ws://leader-ip:7071 npm start
   ```

### Production Deployment Guide

For detailed production deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

## 📊 Monitoring & Analytics

### Health Endpoints

```bash
# Node health
curl http://localhost:8080/health

# EVM statistics
curl http://localhost:8080/evm/stats

# Latest block
curl http://localhost:8080/head
```

### Performance Metrics

- **Block Production:** ~500ms intervals (configurable)
- **Transaction Throughput:** Limited by gas per block (10M gas default)
- **Contract Execution:** Full EVM compatibility
- **Database:** LevelDB with automatic state snapshots

## 🚀 Phase 3: Enhanced APIs & Developer Experience

### New REST API Endpoints
- `GET /evm/stats`: EVM execution statistics
- `GET /contract/:address/code`: Contract bytecode retrieval
- `GET /contract/:address/storage/:key`: Contract storage inspection
- `GET /tx/:hash/receipt`: Transaction execution receipts

### WebSocket Real-Time Subscriptions
- `WS /subscribe/blocks`: Real-time block notifications
- `WS /subscribe/transactions`: Real-time transaction notifications
- `WS /subscribe/events`: Real-time smart contract event notifications

### JavaScript/TypeScript SDK
A comprehensive SDK is available in the `sdk/` directory for easier blockchain interaction:
```javascript
import { ForgeEmpireSDK } from '@forge-empire/sdk';

const sdk = new ForgeEmpireSDK('http://localhost:8080');
const account = await sdk.getAccount('0x...');
```

## 🌟 Integration Notes (Forge Empire)

### Best Practices

- **📁 Off-chain Storage:** Keep media on IPFS/S3, store only hashes via PostTx
- **🔄 State Mirroring:** Mirror blockchain state to query-friendly databases
- **⛽ Gas Management:** Monitor gas usage for cost-effective operations
- **🔐 Key Management:** Use hardware wallets or secure key stores in production
- **📊 Monitoring:** Implement comprehensive logging and metrics

### Smart Contract Integration

- **💰 Token Economy:** Deploy ERC20 tokens for platform rewards
- **🏆 Reputation Contracts:** Implement on-chain reputation algorithms
- **🎮 Gamification:** Create achievement and reward smart contracts
- **🔒 Access Control:** Implement role-based permissions via contracts

## 🛣️ Roadmap & Future Upgrades

### Phase 4: Advanced Features
- [ ] Multi-signature transactions
- [ ] Cross-chain bridge capabilities
- [ ] Optimistic rollups for scaling
- [ ] Token standards (ERC-20, ERC-721 equivalent)
- [ ] Decentralized governance contracts

### Phase 5: Production Scaling
- [ ] Validator set rotation
- [ ] Stake-weighted consensus
- [ ] Slashing mechanisms
- [ ] State channels for micropayments
- [ ] Layer 2 scaling solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 Congratulations! You now have a fully functional, EVM-compatible blockchain with smart contract support!**

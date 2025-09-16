# Forge Empire — Blockchain 

🚀 **A production-ready, EVM-compatible mini blockchain with smart contract support!**

**Core Features:**
- Post provenance (content hashes + IPFS pointers)
- Reputation scoring
- Token transfers (tips/rewards)
- **🆕 Smart Contract Deployment & Execution**
- **🆕 EVM Compatibility with Ethereum Virtual Machine**
- **🆕 ECDSA (secp256k1) Signatures for Ethereum Compatibility**
- **✅ Native FORGE Token with Comprehensive Tokenomics**

## 🏗️ Architecture Features

- **🚀 Fast, Centralized Consensus:** Single leader node for high throughput
- **🔗 Smart Contract Support:** Full EVM integration with contract deployment and interaction
- **🔐 Multi-Algorithm Cryptography:** Both Ed25519 and secp256k1 (Ethereum-compatible) signatures
- **💾 LevelDB Database:** High-performance key-value storage with state snapshots
- **⛽ Gas Mechanism:** EIP-1559 style gas pricing and execution limits
- **💰 Native Token Integration:** FORGE token as native utility token with block rewards
- **📈 Dynamic Fee Mechanism:** Base fee adjustment based on network congestion
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

### 6. Start the Enhanced Explorer

The enhanced explorer includes wallet creation, smart contract deployment, and tokenomics dashboard:

```bash
cd explorer
npm install
npm start
```

Access the explorer at `http://localhost:3000`

### 7. Start Both Node and Explorer Together

For convenience, you can start both the blockchain node and explorer with a single command:

```bash
npm run dev:full
```

This will start:
- Blockchain node on port 8080
- Explorer on port 3000

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

### Tokenomics Endpoints
- `GET /supply`: Current FORGE token supply information
- `GET /tokenomics`: Detailed tokenomics parameters

### Enhanced Features
- **Gas Tracking**: All responses include gas usage information
- **Event Logs**: Contract execution events in transaction receipts
- **Multi-Algorithm Support**: Accepts both Ed25519 and secp256k1 signed transactions
- **Native Token Support**: All balances and fees denominated in FORGE tokens

## 🌐 Block Explorer

A comprehensive web-based block explorer for monitoring blockchain activity with enhanced wallet creation, smart contract deployment, and tokenomics dashboard:

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
- **✅ Wallet Creation**: Generate new wallets with Ed25519 or Secp256k1 cryptography directly in your browser
- **✅ Smart Contract Deployment**: Deploy smart contracts through a user-friendly web interface
- **✅ Tokenomics Dashboard**: View FORGE token supply, inflation, and economic parameters
- **✅ Tabbed Interface**: Easy navigation between blocks, wallet creation, contract deployment, and tokenomics

**Available at:** `http://localhost:3000`

### Wallet Creation in Explorer

The enhanced explorer now includes a wallet creation feature that allows users to generate new key pairs locally in their browser:

1. Navigate to the "Wallet" tab in the explorer
2. Select your preferred cryptographic algorithm:
   - Ed25519 (Default)
   - Secp256k1 (Ethereum Compatible)
3. Click "Generate New Wallet"
4. Your new wallet details will be displayed:
   - Address (public, can be shared)
   - Public Key (public, can be shared)
   - Private Key (private, keep secret!)
5. Download your key pair for safe storage

**Security Note**: All cryptographic operations are performed locally in your browser. Private keys are never transmitted over the network.

### Smart Contract Deployment in Explorer

Deploy smart contracts through the explorer with a simple web interface:

1. Navigate to the "Deploy Contract" tab
2. Enter the deployer's address and private key
3. Paste the contract bytecode
4. Optionally provide constructor arguments
5. Set gas limit and gas price
6. Click "Deploy Contract"
7. View the deployment result showing transaction hash and contract address

### Tokenomics Dashboard

View comprehensive information about the native FORGE token:

1. Navigate to the "Tokenomics" tab in the explorer
2. View current token supply information:
   - Total supply
   - Supply cap
   - Percentage of total supply minted
3. View tokenomics parameters:
   - Token name and symbol
   - Decimals
   - Block reward
   - Minimum gas price
   - Block gas limit
4. Learn about the FORGE token utility

### Tabbed Interface

The explorer features a tabbed interface for easy navigation:

- **Blocks Tab**: View latest blockchain activity
- **Wallet Tab**: Create new wallets with cryptographic key pairs
- **Deploy Contract Tab**: Deploy smart contracts through a web form
- **Tokenomics Tab**: View FORGE token supply and economic parameters

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
         "nonce": 2,
         "gasLimit": "100000",
         "gasPrice": "20000000000"
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
  "amount": "1000000000000000000",
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
BLOCK_GAS_LIMIT=30000000          # Max gas per block (30M)
MIN_GAS_PRICE=1000000000          # Minimum gas price (1 Gwei FORGE)
BASE_FEE=1000000000               # Base fee per gas (1 Gwei FORGE)

# Native Token Configuration
BLOCK_REWARD=5000000000000000000  # Block reward (5 FORGE)
INITIAL_SUPPLY=1000000000000000000000000000  # Initial supply (1B FORGE)
SUPPLY_CAP=2000000000000000000000000000      # Supply cap (2B FORGE)

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
npm run dev:full     # Start both node and explorer
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

For detailed production deployment instructions, see [DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md)

## 📊 Monitoring & Analytics

### Health Endpoints

```bash
# Node health with detailed status
curl http://localhost:8080/health

# EVM statistics
curl http://localhost:8080/evm/stats

# Latest block
curl http://localhost:8080/head

# Token supply information
curl http://localhost:8080/supply

# Tokenomics parameters
curl http://localhost:8080/tokenomics

# Prometheus metrics
curl http://localhost:8080/metrics
```

### Health Check Response
The health endpoint provides detailed status information:
```json
{
  "status": "ok",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "blockchain": {
    "initialized": true,
    "hasHead": true,
    "evm": {
      "status": "ok",
      "contracts": 5
    }
  },
  "memory": {
    "rss": 45,
    "heapTotal": 30,
    "heapUsed": 20
  }
}
```

### Performance Metrics

- **Block Production:** ~500ms intervals (configurable)
- **Transaction Throughput:** Limited by gas per block (30M gas default)
- **Contract Execution:** Full EVM compatibility
- **Database:** LevelDB with automatic state snapshots

### Logging
The application uses structured logging with Winston:
- Console output for development
- JSON log files for production
- Log levels: error, warn, info, debug
- Automatic log rotation (10MB max size, 5 files)

## 🚀 Phase 3: Enhanced APIs & Developer Experience

### New REST API Endpoints
- `GET /evm/stats`: EVM execution statistics
- `GET /contract/:address/code`: Contract bytecode retrieval
- `GET /contract/:address/storage/:key`: Contract storage inspection
- `GET /tx/:hash/receipt`: Transaction execution receipts
- `GET /supply`: Current FORGE token supply information
- `GET /tokenomics`: Detailed tokenomics parameters

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
- **💰 Token Economics:** Understand FORGE token utility for transaction fees and block rewards
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

## 📚 Documentation

### Native Token Integration
For detailed information about the native FORGE token implementation, see:
- [NATIVE_TOKEN_INTEGRATION_PLAN.md](docs/native-token/NATIVE_TOKEN_INTEGRATION_PLAN.md) - Complete implementation plan
- [NATIVE_TOKEN_FEATURE_SUMMARY.md](docs/native-token/NATIVE_TOKEN_FEATURE_SUMMARY.md) - Feature overview
- [NATIVE_TOKEN_IMPLEMENTATION_GUIDE.md](docs/native-token/NATIVE_TOKEN_IMPLEMENTATION_GUIDE.md) - Step-by-step implementation guide
- [NATIVE_TOKEN_PROJECT_SUMMARY.md](docs/native-token/NATIVE_TOKEN_PROJECT_SUMMARY.md) - Project completion summary

### AI Agents Framework
For detailed information about the AI Agents framework, see:
- [AI_AGENTS_INTEGRATION_PLAN.md](docs/ai-agents/AI_AGENTS_INTEGRATION_PLAN.md) - High-level integration plan
- [AI_AGENT_FRAMEWORK_TECHNICAL_SPEC.md](docs/ai-agents/AI_AGENT_FRAMEWORK_TECHNICAL_SPEC.md) - Detailed technical specification
- [AI_AGENTS_IMPLEMENTATION_GUIDE.md](docs/ai-agents/AI_AGENTS_IMPLEMENTATION_GUIDE.md) - Step-by-step implementation guide
- [AI_AGENTS_FEATURE_SUMMARY.md](docs/ai-agents/AI_AGENTS_FEATURE_SUMMARY.md) - Feature overview

## 🤖 AI Agents Framework

The Forge Empire now includes an AI Agents Framework that enables autonomous interactions with the blockchain.

### Features

- **Autonomous Agents**: Create agents that can automatically interact with smart contracts
- **Transaction Agents**: Automate routine transfers and contract interactions
- **Analytics Agents**: Analyze blockchain data for insights and patterns
- **REST API**: Manage agents through a comprehensive API
- **Explorer Integration**: Control agents directly from the blockchain explorer

### Getting Started with AI Agents

1. Navigate to the AI agents directory:
   ```bash
   cd ai-agents
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the agent framework:
   ```bash
   npm run build
   ```

4. Start the agent framework:
   ```bash
   npm start
   ```

The agent framework will be available at `http://localhost:3001`

### Agent Management in Explorer

The blockchain explorer includes an "Agents" tab where you can:
- View all registered agents
- Start/stop agents
- Run agents immediately
- Monitor agent status

### Creating Custom Agents

To create custom agents:

1. Extend the `BaseAgent` class
2. Implement the `perceive`, `plan`, and `execute` methods
3. Register your agent with the `AgentManager`
4. Schedule your agent to run at specified intervals

Example:
```typescript
class CustomAgent extends BaseAgent {
  async perceive(): Promise<any> {
    // Implement perception logic
  }
  
  async plan(perception: any): Promise<any> {
    // Implement planning logic
  }
  
  async execute(plan: any): Promise<any> {
    // Implement execution logic
  }
}
```

## 🛠️ Development Environment

### Terminal Usage
This project was developed primarily on Windows. When running commands, be aware of the following:

**Windows PowerShell:**
- Use semicolons `;` or separate lines for chaining commands instead of `&&`
- Example: `cd sdk; npm run build` or run commands on separate lines

**Windows Command Prompt:**
- Supports `&&` for command chaining
- Example: `cd sdk && npm run build`

**macOS/Linux:**
- Use `&&` for command chaining
- Example: `cd sdk && npm run build`

### Required Tools
- Node.js (v18+ recommended)
- npm
- TypeScript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**🎉 EVM-compatible blockchain with smart contract support and native FORGE token!**

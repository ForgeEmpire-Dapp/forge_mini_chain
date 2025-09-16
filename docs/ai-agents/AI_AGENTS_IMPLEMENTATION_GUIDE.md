# AI Agents Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing AI agents within the Forge Mini Chain ecosystem. It covers the integration with existing components, required modifications, and best practices for deployment.

## Prerequisites

Before implementing AI agents, ensure you have:

1. A working Forge Mini Chain node (leader or follower)
2. The explorer application running
3. Node.js v18+ installed
4. TypeScript development environment
5. PostgreSQL database for agent data storage
6. Basic understanding of the existing codebase

## Implementation Steps

### Step 1: Create the AI Agents Directory Structure

First, create the directory structure for the AI agents framework:

```bash
mkdir ai-agents
cd ai-agents
npm init -y
mkdir src
mkdir src/agents
mkdir src/core
mkdir src/blockchain
mkdir src/ml
mkdir src/utils
mkdir src/api
```

### Step 2: Install Required Dependencies

Install the necessary packages for the AI agents framework:

```bash
npm install express ws axios ethers winston pg dotenv
npm install --save-dev typescript ts-node @types/node @types/express jest
```

Create a [tsconfig.json](file:///c:/Users/dubci/Desktop/mini_chain/sdk/tsconfig.json) file:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 3: Implement the Base Agent Framework

Create the core agent classes in `src/core/`:

#### Base Agent (`src/core/base-agent.ts`)

```typescript
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { BlockchainClient } from '../blockchain/client';

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  blockchain: any;
  schedule?: string;
}

export abstract class BaseAgent extends EventEmitter {
  protected config: AgentConfig;
  protected blockchainClient: BlockchainClient;
  protected logger: Logger;
  protected running: boolean = false;

  constructor(config: AgentConfig) {
    super();
    this.config = config;
    this.logger = new Logger(`Agent:${config.id}`);
    this.blockchainClient = new BlockchainClient(config.blockchain);
  }

  abstract async perceive(): Promise<any>;
  abstract async plan(perception: any): Promise<any>;
  abstract async execute(plan: any): Promise<any>;

  async run(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Agent is disabled, skipping execution');
      return;
    }

    try {
      this.logger.info('Starting agent cycle');
      const perception = await this.perceive();
      const plan = await this.plan(perception);
      const result = await this.execute(plan);
      
      this.logger.info('Agent cycle completed', { result });
      this.emit('cycleComplete', result);
    } catch (error) {
      this.logger.error('Agent cycle failed', { error });
      this.emit('cycleError', error);
    }
  }

  async start(): Promise<void> {
    this.running = true;
    this.logger.info('Agent started');
    this.emit('started');
  }

  async stop(): Promise<void> {
    this.running = false;
    this.logger.info('Agent stopped');
    this.emit('stopped');
  }

  getStatus(): { running: boolean; enabled: boolean } {
    return {
      running: this.running,
      enabled: this.config.enabled
    };
  }
}
```

### Step 4: Implement Blockchain Integration

Create blockchain integration components in `src/blockchain/`:

#### Blockchain Client (`src/blockchain/client.ts`)

```typescript
import axios from 'axios';
import { WebSocket } from 'ws';

export class BlockchainClient {
  private apiEndpoint: string;
  private wsEndpoint: string;
  private httpClient: any;

  constructor(config: { apiEndpoint: string; wsEndpoint: string }) {
    this.apiEndpoint = config.apiEndpoint;
    this.wsEndpoint = config.wsEndpoint;
    this.httpClient = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 5000
    });
  }

  async getAccount(address: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/account/${address}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account: ${error}`);
    }
  }

  async getHead(): Promise<any> {
    try {
      const response = await this.httpClient.get('/head');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get head block: ${error}`);
    }
  }

  async submitTransaction(transaction: any): Promise<string> {
    try {
      const response = await this.httpClient.post('/tx', transaction);
      return response.data.hash;
    } catch (error) {
      throw new Error(`Failed to submit transaction: ${error}`);
    }
  }

  subscribeToBlocks(callback: (block: any) => void): void {
    const ws = new WebSocket(`${this.wsEndpoint}/subscribe/blocks`);
    
    ws.on('open', () => {
      console.log('Connected to block subscription');
    });

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'block') {
          callback(message.data);
        }
      } catch (error) {
        console.error('Error parsing block message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
}
```

### Step 5: Implement Agent Types

Create specific agent implementations in `src/agents/`:

#### Transaction Agent (`src/agents/transaction-agent.ts`)

```typescript
import { BaseAgent, AgentConfig } from '../core/base-agent';

interface TransactionAgentConfig extends AgentConfig {
  transferRules: Array<{
    from: string;
    to: string;
    amount: string;
    condition: string;
  }>;
}

interface TransactionPlan {
  transactions: Array<{
    from: string;
    to: string;
    amount: string;
  }>;
}

export class TransactionAgent extends BaseAgent {
  private transferRules: any[];

  constructor(config: TransactionAgentConfig) {
    super(config);
    this.transferRules = config.transferRules || [];
  }

  async perceive(): Promise<any> {
    // Get current blockchain state
    const head = await this.blockchainClient.getHead();
    const accounts = await Promise.all(
      this.transferRules.map(rule => this.blockchainClient.getAccount(rule.from))
    );

    return {
      blockHeight: head.header.height,
      accounts: accounts.reduce((acc, account, index) => {
        acc[this.transferRules[index].from] = account;
        return acc;
      }, {} as any)
    };
  }

  async plan(perception: any): Promise<TransactionPlan> {
    const transactions = [];

    for (const rule of this.transferRules) {
      const account = perception.accounts[rule.from];
      
      // Simple condition: only transfer if balance is sufficient
      if (account && BigInt(account.balance) > BigInt(rule.amount)) {
        transactions.push({
          from: rule.from,
          to: rule.to,
          amount: rule.amount
        });
      }
    }

    return { transactions };
  }

  async execute(plan: TransactionPlan): Promise<any> {
    const results = [];

    for (const tx of plan.transactions) {
      try {
        // In a real implementation, you would need to sign the transaction
        // This is a simplified example
        const transaction = {
          tx: {
            type: 'transfer',
            from: tx.from,
            to: tx.to,
            amount: tx.amount,
            nonce: 1, // This should be properly managed
            gasLimit: '21000',
            gasPrice: '1000000000'
          },
          signature: 'mock-signature',
          hash: 'mock-hash'
        };

        const txHash = await this.blockchainClient.submitTransaction(transaction);
        results.push({ success: true, txHash });
      } catch (error) {
        results.push({ success: false, error: (error as Error).message });
      }
    }

    return results;
  }
}
```

### Step 6: Implement Agent Management

Create agent management components in `src/core/`:

#### Agent Manager (`src/core/agent-manager.ts`)

```typescript
import { BaseAgent } from './base-agent';
import { Logger } from '../utils/logger';

export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private logger: Logger;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.logger = new Logger('AgentManager');
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.config.id, agent);
    this.logger.info(`Agent registered: ${agent.config.id}`);
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.stop();
      this.agents.delete(agentId);
      this.clearSchedule(agentId);
      this.logger.info(`Agent unregistered: ${agentId}`);
    }
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): Array<{ id: string; name: string; type: string; status: any }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      name: agent.config.name,
      type: agent.config.type,
      status: agent.getStatus()
    }));
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.start();
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
    }
  }

  scheduleAgent(agentId: string, interval: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Clear existing schedule if any
      this.clearSchedule(agentId);
      
      // Set up new schedule
      const timer = setInterval(async () => {
        try {
          await agent.run();
        } catch (error) {
          this.logger.error(`Scheduled run failed for agent ${agentId}`, { error });
        }
      }, interval);
      
      this.timers.set(agentId, timer);
      this.logger.info(`Agent scheduled: ${agentId} every ${interval}ms`);
    }
  }

  private clearSchedule(agentId: string): void {
    const timer = this.timers.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(agentId);
    }
  }

  async startAll(): Promise<void> {
    for (const [id, agent] of this.agents) {
      if (agent.config.enabled) {
        await agent.start();
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const [id, agent] of this.agents) {
      await agent.stop();
    }
    
    // Clear all schedules
    for (const [agentId, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
  }
}
```

### Step 7: Create the API Server

Create the API server in `src/api/`:

#### API Server (`src/api/server.ts`)

```typescript
import express from 'express';
import { AgentManager } from '../core/agent-manager';
import { Logger } from '../utils/logger';

export class AgentApiServer {
  private app: express.Application;
  private agentManager: AgentManager;
  private logger: Logger;
  private port: number;

  constructor(agentManager: AgentManager, port: number = 3001) {
    this.app = express();
    this.agentManager = agentManager;
    this.logger = new Logger('AgentApiServer');
    this.port = port;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // List all agents
    this.app.get('/api/v1/agents', (req, res) => {
      try {
        const agents = this.agentManager.listAgents();
        res.json(agents);
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get agent by ID
    this.app.get('/api/v1/agents/:agentId', (req, res) => {
      try {
        const agent = this.agentManager.getAgent(req.params.agentId);
        if (agent) {
          res.json({
            id: agent.config.id,
            name: agent.config.name,
            type: agent.config.type,
            status: agent.getStatus()
          });
        } else {
          res.status(404).json({ error: 'Agent not found' });
        }
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Create/register new agent
    this.app.post('/api/v1/agents', (req, res) => {
      try {
        // In a real implementation, you would create and register the agent
        // based on the request body
        res.status(201).json({ message: 'Agent created', agentId: req.body.id });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Start agent
    this.app.post('/api/v1/agents/:agentId/start', (req, res) => {
      try {
        this.agentManager.startAgent(req.params.agentId);
        res.json({ message: 'Agent started' });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Stop agent
    this.app.post('/api/v1/agents/:agentId/stop', (req, res) => {
      try {
        this.agentManager.stopAgent(req.params.agentId);
        res.json({ message: 'Agent stopped' });
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Run agent immediately
    this.app.post('/api/v1/agents/:agentId/run', async (req, res) => {
      try {
        const agent = this.agentManager.getAgent(req.params.agentId);
        if (agent) {
          await agent.run();
          res.json({ message: 'Agent run completed' });
        } else {
          res.status(404).json({ error: 'Agent not found' });
        }
      } catch (error) {
        res.status(500).json({ error: (error as Error).message });
      }
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      this.logger.info(`Agent API server started on port ${this.port}`);
    });
  }
}
```

### Step 8: Create Utility Modules

Create utility modules in `src/utils/`:

#### Logger (`src/utils/logger.ts`)

```typescript
export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  info(message: string, metadata?: any): void {
    this.log('INFO', message, metadata);
  }

  warn(message: string, metadata?: any): void {
    this.log('WARN', message, metadata);
  }

  error(message: string, metadata?: any): void {
    this.log('ERROR', message, metadata);
  }

  debug(message: string, metadata?: any): void {
    this.log('DEBUG', message, metadata);
  }

  private log(level: string, message: string, metadata?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      name: this.name,
      message,
      metadata
    };
    
    console.log(JSON.stringify(logEntry));
  }
}
```

### Step 9: Create the Main Application Entry Point

Create the main entry point in `src/index.ts`:

```typescript
import { AgentManager } from './core/agent-manager';
import { AgentApiServer } from './api/server';
import { TransactionAgent } from './agents/transaction-agent';
import { Logger } from './utils/logger';

async function main() {
  const logger = new Logger('Main');
  logger.info('Starting AI Agent Framework');

  // Create agent manager
  const agentManager = new AgentManager();

  // Create and register sample agents
  const transactionAgent = new TransactionAgent({
    id: 'sample-transaction-agent',
    name: 'Sample Transaction Agent',
    type: 'transaction',
    enabled: true,
    blockchain: {
      apiEndpoint: 'http://localhost:8080',
      wsEndpoint: 'ws://localhost:8080'
    },
    transferRules: [
      {
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: '100',
        condition: 'balance > 1000'
      }
    ]
  });

  agentManager.registerAgent(transactionAgent);

  // Schedule the agent to run every 30 seconds
  agentManager.scheduleAgent('sample-transaction-agent', 30000);

  // Create and start API server
  const apiServer = new AgentApiServer(agentManager, 3001);
  apiServer.start();

  // Start all agents
  await agentManager.startAll();

  logger.info('AI Agent Framework started successfully');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Shutting down AI Agent Framework');
    await agentManager.stopAll();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('Failed to start AI Agent Framework:', error);
  process.exit(1);
});
```

### Step 10: Update Package Scripts

Update the [package.json](file:///c:/Users/dubci/Desktop/mini_chain/package.json) file to include build and run scripts:

```json
{
  "name": "forge-mini-chain-ai-agents",
  "version": "1.0.0",
  "description": "AI Agents Framework for Forge Mini Chain",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.13.0",
    "axios": "^1.4.0",
    "winston": "^3.10.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.1",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "@types/ws": "^8.5.4"
  }
}
```

### Step 11: Integrate with Existing Explorer

To integrate with the existing explorer, modify the explorer's HTML and JavaScript:

#### Add Agent Management Tab (`explorer/public/index.html`)

Add a new tab for agent management:

```html
<!-- Add to the tabs section -->
<div class="tab" data-tab="agents">Agents</div>

<!-- Add the agents tab content -->
<div class="tab-content" id="agents-tab">
  <div class="content-section">
    <div class="section-header">
      <h2><i class="fas fa-robot"></i> AI Agents</h2>
      <button class="refresh-btn" id="refresh-agents">
        <i class="fas fa-sync-alt"></i> Refresh
      </button>
    </div>
    <div id="agents-container">
      <div class="loading">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading agents...</p>
      </div>
    </div>
  </div>
</div>
```

#### Add Agent Management JavaScript (`explorer/public/app.js`)

Add agent management functionality:

```javascript
// Add to the DOM elements section
const refreshAgentsButton = document.getElementById('refresh-agents');
const agentsContainer = document.getElementById('agents-container');

// Add to the event listeners section
refreshAgentsButton.addEventListener('click', loadAgents);

// Add the loadAgents function
async function loadAgents() {
  agentsContainer.innerHTML = `
    <div class="loading">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading agents...</p>
    </div>
  `;

  try {
    const response = await fetch('http://localhost:3001/api/v1/agents');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const agents = await response.json();
    
    if (agents.length === 0) {
      agentsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-robot"></i>
          <p>No agents found</p>
          <button class="btn btn-primary" id="create-agent-btn">
            <i class="fas fa-plus"></i> Create Agent
          </button>
        </div>
      `;
      return;
    }
    
    let agentsHtml = '';
    agents.forEach(agent => {
      agentsHtml += `
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <i class="fas fa-robot"></i>
              ${agent.name}
            </div>
            <div class="block-hash">${agent.id}</div>
          </div>
          
          <div class="block-info">
            <div class="info-item">
              <span class="info-label">Type</span>
              <span class="info-value">${agent.type}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Status</span>
              <span class="info-value">${agent.status.running ? 'Running' : 'Stopped'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Enabled</span>
              <span class="info-value">${agent.status.enabled ? 'Yes' : 'No'}</span>
            </div>
          </div>
          
          <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-primary" onclick="startAgent('${agent.id}')">
              <i class="fas fa-play"></i> Start
            </button>
            <button class="btn btn-warning" onclick="stopAgent('${agent.id}')">
              <i class="fas fa-stop"></i> Stop
            </button>
            <button class="btn btn-secondary" onclick="runAgent('${agent.id}')">
              <i class="fas fa-bolt"></i> Run Now
            </button>
          </div>
        </div>
      `;
    });
    
    agentsContainer.innerHTML = agentsHtml;
  } catch (error) {
    console.error('Error loading agents:', error);
    agentsContainer.innerHTML = `
      <div class="error-message">
        <p>Error loading agents: ${error.message}</p>
        <p>Make sure the AI Agent Framework is running on port 3001.</p>
      </div>
    `;
  }
}

// Add agent control functions
async function startAgent(agentId) {
  try {
    const response = await fetch(`http://localhost:3001/api/v1/agents/${agentId}/start`, {
      method: 'POST'
    });
    
    if (response.ok) {
      showNotification('Agent started successfully');
      loadAgents(); // Refresh the list
    } else {
      throw new Error('Failed to start agent');
    }
  } catch (error) {
    showNotification(`Error starting agent: ${error.message}`, 'error');
  }
}

async function stopAgent(agentId) {
  try {
    const response = await fetch(`http://localhost:3001/api/v1/agents/${agentId}/stop`, {
      method: 'POST'
    });
    
    if (response.ok) {
      showNotification('Agent stopped successfully');
      loadAgents(); // Refresh the list
    } else {
      throw new Error('Failed to stop agent');
    }
  } catch (error) {
    showNotification(`Error stopping agent: ${error.message}`, 'error');
  }
}

async function runAgent(agentId) {
  try {
    const response = await fetch(`http://localhost:3001/api/v1/agents/${agentId}/run`, {
      method: 'POST'
    });
    
    if (response.ok) {
      showNotification('Agent run initiated successfully');
    } else {
      throw new Error('Failed to run agent');
    }
  } catch (error) {
    showNotification(`Error running agent: ${error.message}`, 'error');
  }
}

// Add to the initial data loading
loadAgents();
```

### Step 12: Update Main README

Update the main project README to include information about the AI agents:

#### Add to `README.md`

```markdown
## 🤖 AI Agents Framework

The Forge Mini Chain now includes an AI Agents Framework that enables autonomous interactions with the blockchain.

### Features

- **Autonomous Agents**: Create agents that can automatically interact with smart contracts
- **Transaction Agents**: Automate routine transactions based on predefined rules
- **Analytics Agents**: Analyze blockchain data to identify patterns and trends
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
```

## Testing the Implementation

### Unit Tests

Create unit tests for the agent framework:

```bash
mkdir test
touch test/agent.test.ts
touch test/blockchain-client.test.ts
```

Example test file (`test/agent.test.ts`):

```typescript
import { BaseAgent, AgentConfig } from '../src/core/base-agent';

class TestAgent extends BaseAgent {
  async perceive(): Promise<any> {
    return { test: 'perception' };
  }
  
  async plan(perception: any): Promise<any> {
    return { test: 'plan' };
  }
  
  async execute(plan: any): Promise<any> {
    return { test: 'execution' };
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  
  beforeEach(() => {
    const config: AgentConfig = {
      id: 'test-agent',
      name: 'Test Agent',
      type: 'test',
      enabled: true,
      blockchain: {
        apiEndpoint: 'http://localhost:8080',
        wsEndpoint: 'ws://localhost:8080'
      }
    };
    
    agent = new TestAgent(config);
  });
  
  it('should initialize with correct config', () => {
    expect(agent.config.id).toBe('test-agent');
  });
  
  it('should have correct initial status', () => {
    const status = agent.getStatus();
    expect(status.running).toBe(false);
    expect(status.enabled).toBe(true);
  });
});
```

### Integration Tests

Create integration tests to verify the agent framework works with the blockchain:

```typescript
describe('Agent Integration', () => {
  it('should connect to blockchain node', async () => {
    // Test blockchain client connection
  });
  
  it('should submit transactions', async () => {
    // Test transaction submission
  });
});
```

## Deployment

### Docker Deployment

Create a Dockerfile for the agent framework:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]
```

### Docker Compose

Update the main docker-compose.yml to include the agent framework:

```yaml
version: '3.8'

services:
  blockchain:
    build: .
    ports:
      - "8080:8080"
    environment:
      - LEADER=1

  explorer:
    build: ./explorer
    ports:
      - "3000:3000"
    depends_on:
      - blockchain

  ai-agents:
    build: ./ai-agents
    ports:
      - "3001:3001"
    environment:
      - BLOCKCHAIN_API=http://blockchain:8080
      - BLOCKCHAIN_WS=ws://blockchain:8080
    depends_on:
      - blockchain
```

## Security Considerations

1. **Agent Authentication**: Implement proper authentication for agent APIs
2. **Transaction Signing**: Ensure agents properly sign transactions
3. **Access Control**: Limit agent permissions to only what they need
4. **Rate Limiting**: Prevent agents from overwhelming the blockchain
5. **Audit Logs**: Maintain logs of all agent activities

## Monitoring and Metrics

1. **Agent Health**: Monitor agent status and performance
2. **Transaction Metrics**: Track transactions submitted by agents
3. **Error Rates**: Monitor agent error rates and failures
4. **Resource Usage**: Track CPU and memory usage of agents

## Conclusion

This implementation guide provides a comprehensive approach to integrating AI agents into the Forge Mini Chain ecosystem. By following these steps, you can create a powerful framework for autonomous blockchain interactions while maintaining security and performance standards.

The implementation includes:
- A modular agent framework with extensible base classes
- Blockchain integration through REST API and WebSocket connections
- Agent management through a dedicated API server
- Explorer integration for user-friendly agent control
- Proper testing and deployment strategies
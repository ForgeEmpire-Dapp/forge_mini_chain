# AI Agents Framework for Forge Mini Chain

## Overview

This framework enables autonomous agents to interact with the Forge Mini Chain blockchain. Agents can perform various tasks such as automated transactions, analytics, and smart contract interactions.

## Features

- **Autonomous Agents**: Create agents that can automatically interact with the blockchain
- **Transaction Agents**: Automate routine transfers and contract interactions
- **Analytics Agents**: Analyze blockchain data for insights and patterns
- **REST API**: Manage agents through a comprehensive API
- **Explorer Integration**: Control agents directly from the blockchain explorer

## Getting Started

### Prerequisites

- Node.js v18+
- A running Forge Mini Chain node

### Installation

```bash
npm install
```

### Building

```bash
npm run build
```

### Running

```bash
npm start
```

The agent framework will be available at `http://localhost:3001`

## API Endpoints

### Agent Management
- `GET /api/v1/agents` - List all agents
- `POST /api/v1/agents` - Create/register a new agent
- `GET /api/v1/agents/{agentId}` - Get agent details
- `PUT /api/v1/agents/{agentId}` - Update agent configuration
- `DELETE /api/v1/agents/{agentId}` - Delete/unregister an agent
- `POST /api/v1/agents/{agentId}/start` - Start agent execution
- `POST /api/v1/agents/{agentId}/stop` - Stop agent execution
- `POST /api/v1/agents/{agentId}/run` - Run agent immediately

### Health and Monitoring
- `GET /health` - System health check
- `GET /metrics` - Prometheus metrics
- `GET /api/v1/agents/{agentId}/status` - Get agent status
- `GET /api/v1/agents/{agentId}/logs` - Get agent logs
- `GET /api/v1/agents/{agentId}/metrics` - Get agent metrics

## Creating Custom Agents

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

## Architecture

The framework consists of several key components:

1. **Base Agent Classes**: Abstract classes that define the agent interface
2. **Blockchain Integration Layer**: Components that interact with the Forge Mini Chain
3. **Agent Management System**: System for registering, starting, stopping, and scheduling agents
4. **API Server**: REST API for managing agents
5. **Utility Modules**: Logging and other helper functions

## Security

- All agent interactions with the blockchain require proper authentication
- Agent configurations are stored securely
- API endpoints are protected with appropriate security measures

## Monitoring

- Built-in logging for all agent activities
- Health check endpoint for monitoring system status
- Metrics collection for performance monitoring
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
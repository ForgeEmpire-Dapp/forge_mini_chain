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

  abstract perceive(): Promise<any>;
  abstract plan(perception: any): Promise<any>;
  abstract execute(plan: any): Promise<any>;

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

  getConfig(): AgentConfig {
    return this.config;
  }

  getStatus(): { running: boolean; enabled: boolean } {
    return {
      running: this.running,
      enabled: this.config.enabled
    };
  }
}
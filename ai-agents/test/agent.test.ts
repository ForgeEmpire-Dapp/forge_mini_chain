import { BaseAgent, AgentConfig } from '../src/core/base-agent';

// Mock the logger to avoid console output during tests
jest.mock('../src/utils/logger', () => {
  return {
    Logger: jest.fn().mockImplementation(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    }))
  };
});

// Mock the blockchain client to avoid actual network calls
jest.mock('../src/blockchain/client', () => {
  return {
    BlockchainClient: jest.fn().mockImplementation(() => ({
      getHead: jest.fn().mockResolvedValue({ header: { height: 1 } }),
      getAccount: jest.fn().mockResolvedValue({ balance: '1000000000000000000' }),
      submitTransaction: jest.fn().mockResolvedValue('0x123456789')
    }))
  };
});

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
  let config: AgentConfig;
  
  beforeEach(() => {
    config = {
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
  
  describe('constructor', () => {
    it('should initialize with correct config', () => {
      expect(agent.getConfig().id).toBe('test-agent');
      expect(agent.getConfig().name).toBe('Test Agent');
    });
  });
  
  describe('getStatus', () => {
    it('should return correct initial status', () => {
      const status = agent.getStatus();
      expect(status.running).toBe(false);
      expect(status.enabled).toBe(true);
    });
  });
  
  describe('run', () => {
    it('should execute the perception-plan-execute cycle', async () => {
      const perceptionSpy = jest.spyOn(agent, 'perceive');
      const planSpy = jest.spyOn(agent, 'plan');
      const executeSpy = jest.spyOn(agent, 'execute');
      
      await agent.run();
      
      expect(perceptionSpy).toHaveBeenCalled();
      expect(planSpy).toHaveBeenCalled();
      expect(executeSpy).toHaveBeenCalled();
    });
    
    it('should not run when agent is disabled', async () => {
      // Create a disabled agent
      const disabledConfig = { ...config, enabled: false };
      const disabledAgent = new TestAgent(disabledConfig);
      
      const perceptionSpy = jest.spyOn(disabledAgent, 'perceive');
      const planSpy = jest.spyOn(disabledAgent, 'plan');
      const executeSpy = jest.spyOn(disabledAgent, 'execute');
      
      await disabledAgent.run();
      
      expect(perceptionSpy).not.toHaveBeenCalled();
      expect(planSpy).not.toHaveBeenCalled();
      expect(executeSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('start and stop', () => {
    it('should update running status correctly', async () => {
      // Initially not running
      expect(agent.getStatus().running).toBe(false);
      
      // Start the agent
      await agent.start();
      expect(agent.getStatus().running).toBe(true);
      
      // Stop the agent
      await agent.stop();
      expect(agent.getStatus().running).toBe(false);
    });
  });
});
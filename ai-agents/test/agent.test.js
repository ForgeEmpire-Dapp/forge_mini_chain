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

// Simple test to verify mocks are working
describe('BaseAgent', () => {
  it('should create mock logger', () => {
    const { Logger } = require('../src/utils/logger');
    const logger = new Logger('test');
    expect(logger).toBeDefined();
  });

  it('should create mock blockchain client', () => {
    const { BlockchainClient } = require('../src/blockchain/client');
    const client = new BlockchainClient({
      apiEndpoint: 'http://localhost:8080',
      wsEndpoint: 'ws://localhost:8080'
    });
    expect(client).toBeDefined();
  });
});
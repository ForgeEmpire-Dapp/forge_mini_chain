/**
 * @fileoverview This file is the main entry point for a node in the blockchain network.
 * It initializes the configuration, sets up the keypair, creates a new blockchain instance,
 * establishes the P2P network, and starts the API server with enhanced error handling.
 */
import fs from "node:fs";
import path from "node:path";
import { startApi } from "./api.js";
import { startP2P } from "./p2p.js";
import { Blockchain } from "./blockchain.js";
import { ChainConfig } from "./types.js";
import { generateKeyPair, loadKeyPair } from "./crypto.js";
import logger from './logger.js';
import { ErrorHandler, ShutdownHandler } from "./errors.js";

/**
 * Get the chain configuration from environment variables.
 * @returns {ChainConfig} The chain configuration.
 */
function getChainConfig() {
  return {
    chainId: process.env.CHAIN_ID || "forge-mini",
    blockTimeMs: parseInt(process.env.BLOCK_MS || "500"),
    isLeader: process.env.LEADER === "1",
    leaderWsURL: process.env.LEADER_WS || "ws://localhost:7071",
    p2pPort: parseInt(process.env.P2P_PORT || (process.env.LEADER === "1" ? "7071" : "0")),
    apiPort: parseInt(process.env.API_PORT || (process.env.LEADER === "1" ? "8080" : "8081")),
    // Each node gets its own data directory to avoid database conflicts
    dataDir: process.env.DATA_DIR || (process.env.LEADER === "1" ? ".data" : `.data-follower-${process.env.API_PORT || "8081"}`),
    keypairFile: process.env.KEY_FILE || ".keys/ed25519.json",
    // Gas mechanism configuration
    blockGasLimit: BigInt(process.env.BLOCK_GAS_LIMIT || "30000000"), // 30M gas per block
    minGasPrice: BigInt(process.env.MIN_GAS_PRICE || "1000000000"), // 1 Gwei FORGE
    baseFeePerGas: BigInt(process.env.BASE_FEE || "1000000000"), // 1 Gwei FORGE
    // Native token configuration
    blockReward: BigInt(process.env.BLOCK_REWARD || "5000000000000000000"), // 5 FORGE
    initialSupply: BigInt(process.env.INITIAL_SUPPLY || "1000000000000000000000000000"), // 1B FORGE
    supplyCap: BigInt(process.env.SUPPLY_CAP || "2000000000000000000000000000") // 2B FORGE cap
  };
}

/**
 * Get the node's keypair, either by loading it from a file or generating a new one.
 * @param {ChainConfig} cfg - The chain configuration.
 * @returns {Promise<{publicKey: string, privateKey: string, address: string}>} The node's keypair.
 */
async function getNodeKeyPair(cfg: ChainConfig) {
  // Create directory for keypair if it doesn't exist
  fs.mkdirSync(path.dirname(cfg.keypairFile), { recursive: true });
  let kp: any;
  // Load or generate a new keypair
  if (fs.existsSync(cfg.keypairFile)) {
    kp = loadKeyPair(cfg.keypairFile);
  } else {
    kp = generateKeyPair();
    fs.writeFileSync(cfg.keypairFile, JSON.stringify(kp, null, 2));
  }
  logger.info(`Node address: ${kp.address}`);
  return kp;
}

/**
 * Start the leader node's block production.
 * @param {Blockchain} chain - The blockchain instance.
 * @param {ChainConfig} cfg - The chain configuration.
 * @param {{publicKey: string, privateKey: string, address: string}} kp - The node's keypair.
 * @param {ErrorHandler} errorHandler - The error handler instance.
 */
function startLeaderNode(chain: Blockchain, cfg: ChainConfig, kp: any, errorHandler: ErrorHandler) {
  const p2p = startP2P(chain, cfg.p2pPort, kp.publicKey, kp.privateKey, kp.address, errorHandler);
  p2p.listen(cfg.p2pPort);
  
  // Enhanced block production with error handling
  const blockInterval = setInterval(async () => {
    try {
      const block = chain.buildNextBlock();
      await chain.addBlock(block);
      p2p.broadcast({ kind: "block", data: block });
    } catch (error) {
      errorHandler.logError(
        error as Error,
        'Block Production',
        { mempool_size: chain.mempool.length }
      );
    }
  }, cfg.blockTimeMs);
  
  // Register cleanup for block production
  const shutdownHandler = ShutdownHandler.getInstance();
  shutdownHandler.onShutdown(async () => {
    console.log('[shutdown] Stopping block production...');
    clearInterval(blockInterval);
  });
}

async function startNode() {
  try {
    const cfg = getChainConfig();
    const kp = await getNodeKeyPair(cfg);
    const chain = new Blockchain(cfg, kp);
    const errorHandler = ErrorHandler.getInstance();
    
    // Initialize shutdown handler
    const shutdownHandler = ShutdownHandler.getInstance();
    shutdownHandler.init();
    
    // Register blockchain shutdown
    shutdownHandler.onShutdown(() => chain.shutdown());
    
    // Initialize blockchain
    await chain.init();
    
    // Start leader node block production
    if (cfg.isLeader) {
      startLeaderNode(chain, cfg, kp, errorHandler);
    }
    
    // Start the API server with enhanced error handling
    startApi(cfg.apiPort, {
      submitTx: async (stx) => {
        await errorHandler.handleError(
          () => chain.addTx(stx),
          'Transaction Submission',
          1, // No retries for transaction submission
          0
        );
      },
      getAccount: (addr: string) => chain.state.accounts.get(addr),
      getAllAccounts: () => chain.state.accounts,
      getHead: () => chain.head || null,
      getEVMStats: () => chain.getEVMStats(),
      getContractCode: (address: string) => chain.getContractCode(address),
      getContractStorage: (address: string, key: string) => chain.getContractStorage(address, key),
      getReceipt: (txHash: string) => chain.getReceipt(txHash),
      subscribeToBlocks: (callback) => chain.subscribeToBlocks(callback),
      subscribeToTransactions: (callback) => chain.subscribeToTransactions(callback),
      subscribeToEvents: (callback) => chain.subscribeToEvents(callback),
      unsubscribeFromBlocks: (callback) => chain.unsubscribeFromBlocks(callback),
      unsubscribeFromTransactions: (callback) => chain.unsubscribeFromTransactions(callback),
      unsubscribeFromEvents: (callback) => chain.unsubscribeFromEvents(callback)
    });
    
    logger.info('Node started successfully', { 
      chainId: cfg.chainId,
      address: kp.address,
      mode: cfg.isLeader ? 'Leader' : 'Follower',
      apiPort: cfg.apiPort,
      p2pPort: cfg.p2pPort
    });
    
  } catch (err) {
    logger.error('Failed to start node', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
    
    const errorHandler = ErrorHandler.getInstance(); // Fix the variable reference
    errorHandler.logError(
      err instanceof Error ? err : new Error(String(err)),
      'Node Initialization'
    );
    
    process.exit(1);
  }
}

// Start the node
startNode().catch(err => {
  logger.error('Unhandled error in node startup', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });
});

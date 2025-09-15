/**
 * @fileoverview This file is the main entry point for a node in the blockchain network.
 * It initializes the configuration, sets up the keypair, creates a new blockchain instance,
 * establishes the P2P network, and starts the API server with enhanced error handling.
 */
import fs from "node:fs";
import path from "node:path";
import { Blockchain } from "./blockchain.js";
import { P2P } from "./p2p.js";
import { startApi } from "./api.js";
import { ChainConfig } from "./types.js";
import { generateKeyPair } from "./crypto.js";
import { ErrorHandler, ShutdownHandler, TransactionError, ConsensusError } from "./errors.js";

// Initialize error handling and graceful shutdown
const errorHandler = ErrorHandler.getInstance();
const shutdownHandler = ShutdownHandler.getInstance();
shutdownHandler.init();

async function startNode() {
try {
// Configuration for the blockchain node
const cfg: ChainConfig = {
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
blockGasLimit: BigInt(process.env.BLOCK_GAS_LIMIT || "10000000"), // 10M gas per block
minGasPrice: BigInt(process.env.MIN_GAS_PRICE || "1000000000"), // 1 Gwei
baseFeePerGas: BigInt(process.env.BASE_FEE || "1000000000"), // 1 Gwei
};


// Create directory for keypair if it doesn't exist
fs.mkdirSync(path.dirname(cfg.keypairFile), { recursive: true });
let kp;
// Load or generate a new keypair
if (fs.existsSync(cfg.keypairFile)) {
kp = JSON.parse(fs.readFileSync(cfg.keypairFile, "utf8"));
} else {
kp = generateKeyPair();
fs.writeFileSync(cfg.keypairFile, JSON.stringify(kp, null, 2));
}
console.log(`[keys] address ${kp.address}`);


// Initialize the blockchain with the configuration and keypair
const chain = new Blockchain(cfg, { pub: kp.publicKey, priv: kp.privateKey, address: kp.address });

// Initialize blockchain database and EVM
await chain.init();

// Initialize the validator for enhanced transaction validation
chain.state.setValidator(cfg);


// Initialize the P2P network with enhanced error handling
const p2p = new P2P(
async (tx) => {
  try {
    await chain.addTx(tx);
  } catch (error) {
    errorHandler.logError(
      error as Error,
      'P2P Transaction Processing',
      { txHash: tx.hash, from: tx.tx.from }
    );
    throw new TransactionError(
      `Failed to process transaction: ${(error as Error).message}`,
      tx.hash
    );
  }
},
(b) => {
  (async () => {
    try { 
      await chain.addBlock(b); 
      console.log(`[block] imported #${b.header.height} (${b.txs.length} tx, ${b.header.gasUsed} gas)`);
    }
    catch (error) { 
      errorHandler.logError(
        error as Error,
        'Block Import',
        { blockHeight: b.header.height, blockHash: b.hash }
      );
      throw new ConsensusError(
        `Failed to import block: ${(error as Error).message}`,
        b.header.height
      );
    }
  })();
}
);


// Register shutdown callbacks
shutdownHandler.onShutdown(async () => {
  console.log('[shutdown] Stopping P2P server...');
  // Add P2P shutdown logic here when needed
});

shutdownHandler.onShutdown(async () => {
  console.log('[shutdown] Persisting mempool...');
  // Save current mempool state
  try {
    const mempoolPath = path.join(cfg.dataDir, cfg.chainId, 'mempool.json');
    fs.writeFileSync(mempoolPath, JSON.stringify(chain.mempool, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (error) {
    console.error('[shutdown] Failed to persist mempool:', error);
  }
});

// Start the P2P network and block production if the node is a leader
if (cfg.isLeader) {
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
  shutdownHandler.onShutdown(async () => {
    console.log('[shutdown] Stopping block production...');
    clearInterval(blockInterval);
  });
} else {
  // Follower node connects to the leader with retry logic
  if (cfg.leaderWsURL) {
    await errorHandler.handleError(
      () => {
        p2p.connect(cfg.leaderWsURL!);
        return Promise.resolve();
      },
      'Leader Connection',
      5,
      2000
    );
  }
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
  console.log(`[node] Node started successfully on chain ${cfg.chainId}`);
  console.log(`[node] Address: ${kp.address}`);
  console.log(`[node] Mode: ${cfg.isLeader ? 'Leader' : 'Follower'}`);
  console.log(`[node] API: http://localhost:${cfg.apiPort}`);
  if (cfg.isLeader) {
    console.log(`[node] P2P: ws://localhost:${cfg.p2pPort}`);
  }
  
} catch (err) {
  console.error('Failed to start node:');
  console.error('Error type:', typeof err);
  
  if (err instanceof Error) {
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    errorHandler.logError(
      err,
      'Node Initialization'
    );
  } else {
    console.error('Error value:', err);
  }
  
  process.exit(1);
}
}

// Start the node
startNode().catch(console.error);
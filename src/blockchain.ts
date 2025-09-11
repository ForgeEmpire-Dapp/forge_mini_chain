/**
 * @fileoverview This file defines the Blockchain class, which is the core of the blockchain implementation.
 * It manages the chain of blocks, the mempool of pending transactions, and the state of the blockchain.
 */
import fs from "node:fs";
import path from "node:path";
import { Block, ChainConfig, SignedTx } from "./types.js";
import { State, applyBlock } from "./state.js";
import { buildBlock } from "./block.js";
import { verifySignedTx } from "./tx.js";
import { TxValidator, RateLimiter } from "./validation.js";
import { LevelBlockchainDB, DBMigration, BlockchainDB } from "./database.js";


/**
 * The main class representing the blockchain with enhanced database support.
 */
export class Blockchain {
public chain: Block[] = [];
public mempool: SignedTx[] = [];
public state: State = new State();
private validator: TxValidator;
private rateLimiter: RateLimiter;
private db: BlockchainDB;
private isInitialized = false;

/**
 * Constructs a new Blockchain instance.
 * @param cfg The chain configuration.
 * @param keys The key pair for the node.
 */
constructor(private cfg: ChainConfig, private keys: { pub: string; priv: string; address: string }) {
  this.validator = new TxValidator(cfg, this.state);
  this.rateLimiter = new RateLimiter();
  this.db = new LevelBlockchainDB(cfg);
  
  // Initialize state validator
  this.state.setValidator(cfg);
}

/**
 * Initialize the blockchain with database and migration
 */
async init(): Promise<void> {
  if (this.isInitialized) return;
  
  try {
    // Initialize database
    await this.db.init();
    
    // Migrate from JSONL if needed
    const migration = new DBMigration(this.cfg.dataDir, this.db);
    await migration.migrateFromJSONL(this.cfg.chainId);
    
    // Load blockchain state from database
    await this.loadFromDatabase();
    
    this.isInitialized = true;
    console.log(`[blockchain] Initialized with ${this.chain.length} blocks`);
  } catch (error) {
    console.error('[blockchain] Initialization failed:', error);
    throw error;
  }
}

/**
 * Load blockchain state from database
 */
private async loadFromDatabase(): Promise<void> {
  // Load the latest block to determine chain height
  const latestBlock = await this.db.getLatestBlock();
  
  if (!latestBlock) {
    console.log('[blockchain] No blocks found in database, starting fresh');
    return;
  }
  
  // Load recent blocks into memory (last 100 blocks for quick access)
  const startHeight = Math.max(0, latestBlock.header.height - 99);
  this.chain = [];
  
  for (let height = startHeight; height <= latestBlock.header.height; height++) {
    const block = await this.db.getBlockByHeight(height);
    if (block) {
      this.chain.push(block);
    }
  }
  
  console.log(`[blockchain] Loaded ${this.chain.length} recent blocks into memory`);
}


/**
 * Gets the latest block in the chain.
 */
get head(): Block | undefined { return this.chain[this.chain.length - 1]; }


/**
 * Adds a signed transaction to the mempool after comprehensive validation.
 * @param stx The signed transaction to add.
 * @throws An error if the transaction is invalid.
 */
async addTx(stx: SignedTx): Promise<void> {
  try {
    // Basic signature verification
    if (!verifySignedTx(stx, this.cfg.chainId)) {
      throw new Error("Invalid transaction signature");
    }
    
    // Rate limiting check
    const rateLimitResult = this.rateLimiter.checkRateLimit(stx.tx.from);
    if (!rateLimitResult.valid) {
      throw new Error(rateLimitResult.error!);
    }
    
    // Enhanced transaction validation
    const currentBlockGasUsed = this.calculateMempoolGasUsage();
    const validationResult = await this.validator.validateTx(stx.tx, currentBlockGasUsed);
    
    if (!validationResult.valid) {
      throw new Error(validationResult.error!);
    }
    
    // Check for duplicate transactions
    const existingTx = this.mempool.find(tx => tx.hash === stx.hash);
    if (existingTx) {
      throw new Error("Transaction already in mempool");
    }
    
    // Add to mempool
    this.mempool.push(stx);
    
    console.log(`[mempool] Added tx ${stx.hash} from ${stx.tx.from} (pool size: ${this.mempool.length})`);
    
  } catch (error) {
    console.error(`[mempool] Rejected tx: ${(error as Error).message}`);
    throw error;
  }
}


/**
 * Calculates total gas usage of current mempool transactions
 */
private calculateMempoolGasUsage(): bigint {
  return this.mempool.reduce((total, stx) => {
    const gasCost = this.validator.calculateGasCost(stx.tx);
    return total + gasCost.total;
  }, 0n);
}

/**
 * Adds a block to the chain after performing comprehensive validation.
 * @param b The block to add.
 * @throws An error if validation fails.
 */
async addBlock(b: Block): Promise<void> {
  try {
    // Basic link check
    if (this.head && this.head.hash !== b.header.prevHash) {
      throw new Error("Previous hash mismatch");
    }
    
    // Validate block gas usage
    if (b.header.gasUsed > b.header.gasLimit) {
      throw new Error("Block gas usage exceeds limit");
    }
    
    // Verify all transaction signatures in block
    for (const tx of b.txs) {
      if (!verifySignedTx(tx, this.cfg.chainId)) {
        throw new Error(`Invalid transaction signature: ${tx.hash}`);
      }
    }
    
    // Apply block to state and track gas usage
    const gasUsed = await applyBlock(this.state, b);
    
    // Verify reported gas usage matches actual
    if (gasUsed !== b.header.gasUsed) {
      console.warn(`Gas usage mismatch: reported ${b.header.gasUsed}, actual ${gasUsed}`);
    }
    
    // Add to in-memory chain
    this.chain.push(b);
    
    // Persist to database
    await this.db.saveBlock(b);
    
    // Keep only recent blocks in memory (last 100)
    if (this.chain.length > 100) {
      this.chain = this.chain.slice(-100);
    }
    
    // Remove applied transactions from mempool
    const appliedHashes = new Set(b.txs.map(tx => tx.hash));
    this.mempool = this.mempool.filter(tx => !appliedHashes.has(tx.hash));
    
    console.log(`[blockchain] Added block #${b.header.height} (${b.txs.length} txs, ${gasUsed} gas)`);
    
    // Create snapshot every 1000 blocks
    if (b.header.height % 1000 === 0) {
      await this.createSnapshot(b.header.height);
    }
    
  } catch (error) {
    console.error(`[blockchain] Block validation failed: ${(error as Error).message}`);
    throw error;
  }
}


/**
 * Builds the next block from transactions in the mempool with gas optimization.
 * @returns The newly built block.
 */
buildNextBlock(): Block {
  // Sort mempool by gas price (highest first) for optimal fee collection
  const sortedTxs = [...this.mempool].sort((a, b) => {
    const gasCompare = Number(b.tx.gasPrice - a.tx.gasPrice);
    if (gasCompare !== 0) return gasCompare;
    // If gas prices equal, prioritize by nonce (lower first)
    return a.tx.nonce - b.tx.nonce;
  });
  
  const selectedTxs: SignedTx[] = [];
  let blockGasUsed = 0n;
  
  // Select transactions that fit within block gas limit
  for (const stx of sortedTxs) {
    const gasCost = this.validator.calculateGasCost(stx.tx);
    
    if (blockGasUsed + gasCost.total <= this.cfg.blockGasLimit) {
      selectedTxs.push(stx);
      blockGasUsed += gasCost.total;
      
      // Limit to reasonable number of transactions per block
      if (selectedTxs.length >= 500) break;
    }
  }
  
  const height = (this.head?.header.height ?? -1) + 1;
  const prev = this.head?.hash ?? "0x00";
  
  return buildBlock(
    height, 
    prev, 
    this.keys.address, 
    this.keys.priv, 
    selectedTxs,
    blockGasUsed,
    this.cfg.blockGasLimit,
    this.cfg.baseFeePerGas
  );
}


/**
 * Creates a state snapshot at the given height
 */
private async createSnapshot(height: number): Promise<void> {
  try {
    // Calculate state root (simplified for now)
    const stateRoot = this.calculateStateRoot();
    await this.db.saveSnapshot(height, stateRoot);
    console.log(`[blockchain] Created snapshot at height ${height}`);
  } catch (error) {
    console.error(`[blockchain] Failed to create snapshot: ${(error as Error).message}`);
  }
}

/**
 * Calculate a simple state root from current state
 */
private calculateStateRoot(): string {
  // Simplified state root calculation
  // In a real implementation, this would use a Merkle tree
  const accounts = Array.from(this.state.accounts.entries()).sort();
  const posts = Array.from(this.state.posts.entries()).sort();
  
  const stateData = JSON.stringify({ accounts, posts });
  return require('crypto').createHash('sha256').update(stateData).digest('hex');
}

/**
 * Prune old blocks from database
 */
async pruneBlocks(keepBlocks: number = 10000): Promise<void> {
  try {
    const latestBlock = this.head;
    if (!latestBlock || latestBlock.header.height < keepBlocks) {
      return; // Not enough blocks to prune
    }
    
    const pruneBeforeHeight = latestBlock.header.height - keepBlocks;
    const prunedCount = await this.db.pruneBlocks(pruneBeforeHeight);
    
    console.log(`[blockchain] Pruned ${prunedCount} blocks before height ${pruneBeforeHeight}`);
  } catch (error) {
    console.error(`[blockchain] Pruning failed: ${(error as Error).message}`);
  }
}

/**
 * Get database statistics
 */
async getStats() {
  return await this.db.getStats();
}

/**
 * Graceful shutdown
 */
async shutdown(): Promise<void> {
  try {
    console.log('[blockchain] Shutting down...');
    
    // Save current mempool
    const mempoolPath = path.join(this.cfg.dataDir, this.cfg.chainId, 'mempool.json');
    fs.writeFileSync(mempoolPath, JSON.stringify(this.mempool, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    
    // Close database
    await this.db.close();
    
    console.log('[blockchain] Shutdown complete');
  } catch (error) {
    console.error('[blockchain] Shutdown error:', error);
  }
}
}
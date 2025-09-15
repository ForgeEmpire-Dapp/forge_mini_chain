/**
 * @fileoverview This file defines the Blockchain class, which is the core of the blockchain implementation.
 * It manages the chain of blocks, the mempool of pending transactions, and the state of the blockchain.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { State, applyBlock } from "./state.js";
import { buildBlock } from "./block.js";
import { verifySignedTx } from "./tx.js";
import { TxValidator, RateLimiter } from "./validation.js";
import { LevelBlockchainDB, DBMigration } from "./database.js";
import logger from './logger.js';
import { mempoolSizeGauge, totalTransactionsCounter, totalBlocksCounter, transactionGasUsedHistogram } from "./metrics.js";
/**
 * The main class representing the blockchain with enhanced database support.
 */
export class Blockchain {
    cfg;
    keys;
    chain = [];
    mempool = [];
    state = new State();
    validator;
    rateLimiter;
    db;
    isInitialized = false;
    subscribers = {
        blocks: [],
        transactions: [],
        events: []
    };
    /**
     * Constructs a new Blockchain instance.
     * @param cfg The chain configuration.
     * @param keys The key pair for the node.
     */
    constructor(cfg, keys) {
        this.cfg = cfg;
        this.keys = keys;
        this.validator = new TxValidator(cfg, this.state);
        this.rateLimiter = new RateLimiter();
        this.db = new LevelBlockchainDB(cfg);
        // Initialize state validator
        this.state.setValidator(cfg);
    }
    /**
     * Initialize the blockchain with database and migration
     */
    async init() {
        if (this.isInitialized)
            return;
        try {
            // Initialize database
            await this.db.init();
            // Migrate from JSONL if needed
            const migration = new DBMigration(this.cfg.dataDir, this.db);
            await migration.migrateFromJSONL(this.cfg.chainId);
            // Load blockchain state from database
            await this.loadFromDatabase();
            this.isInitialized = true;
            logger.info('Blockchain initialized', {
                blockCount: this.chain.length,
                chainId: this.cfg.chainId
            });
        }
        catch (error) {
            logger.error('Blockchain initialization failed', { error });
            throw error;
        }
    }
    /**
     * Load blockchain state from database
     */
    async loadFromDatabase() {
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
    get head() { return this.chain[this.chain.length - 1]; }
    /**
     * Adds a signed transaction to the mempool after comprehensive validation.
     * @param stx The signed transaction to add.
     * @throws An error if the transaction is invalid.
     */
    async addTx(stx) {
        try {
            logger.debug('Adding transaction to mempool', {
                txHash: stx.hash,
                from: stx.tx.from,
                type: stx.tx.type
            });
            // Basic signature verification
            if (!verifySignedTx(stx, this.cfg.chainId)) {
                throw new Error("Invalid transaction signature");
            }
            // Rate limiting check
            const rateLimitResult = this.rateLimiter.checkRateLimit(stx.tx.from);
            if (!rateLimitResult.valid) {
                throw new Error(rateLimitResult.error);
            }
            // Enhanced transaction validation
            const currentBlockGasUsed = this.calculateMempoolGasUsage();
            const validationResult = await this.validator.validateTx(stx.tx, currentBlockGasUsed);
            if (!validationResult.valid) {
                throw new Error(validationResult.error);
            }
            // Check for duplicate transactions
            const existingTx = this.mempool.find(tx => tx.hash === stx.hash);
            if (existingTx) {
                throw new Error("Transaction already in mempool");
            }
            // Add to mempool
            this.mempool.push(stx);
            // Update metrics
            mempoolSizeGauge.set(this.mempool.length);
            // Notify subscribers
            this.notifyTransactionSubscribers(stx);
            logger.info('Transaction added to mempool', {
                txHash: stx.hash,
                from: stx.tx.from,
                poolSize: this.mempool.length
            });
        }
        catch (error) {
            logger.error('Rejected transaction', {
                txHash: stx?.hash,
                from: stx?.tx?.from,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Calculates total gas usage of current mempool transactions
     */
    calculateMempoolGasUsage() {
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
    async addBlock(b) {
        try {
            logger.info('Adding block to chain', {
                blockHeight: b.header.height,
                txCount: b.txs.length
            });
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
            const { totalGasUsed, txResults } = await applyBlock(this.state, b);
            // Verify reported gas usage matches actual
            if (totalGasUsed !== b.header.gasUsed) {
                logger.warn('Gas usage mismatch', {
                    reported: b.header.gasUsed,
                    actual: totalGasUsed
                });
            }
            // Add to in-memory chain
            this.chain.push(b);
            // Save transaction receipts
            const allEvents = [];
            for (const { txHash, result } of txResults) {
                // Update transaction metrics
                totalTransactionsCounter.inc();
                if (result.gasUsed) {
                    transactionGasUsedHistogram.observe(Number(result.gasUsed));
                }
                await this.db.saveReceipt(txHash, {
                    ...result,
                    blockHeight: b.header.height,
                    blockHash: b.hash
                });
                // Collect events for notification
                if (result.events) {
                    allEvents.push(...result.events);
                }
            }
            // Notify subscribers
            this.notifyBlockSubscribers(b);
            for (const tx of b.txs) {
                this.notifyTransactionSubscribers(tx);
            }
            if (allEvents.length > 0) {
                this.notifyEventSubscribers(allEvents);
            }
            // Persist to database
            await this.db.saveBlock(b);
            // Update metrics
            totalBlocksCounter.inc();
            // Keep only recent blocks in memory (last 100)
            if (this.chain.length > 100) {
                this.chain = this.chain.slice(-100);
            }
            // Remove applied transactions from mempool
            const appliedHashes = new Set(b.txs.map(tx => tx.hash));
            this.mempool = this.mempool.filter(tx => !appliedHashes.has(tx.hash));
            // Update mempool metrics
            mempoolSizeGauge.set(this.mempool.length);
            logger.info('Block added successfully', {
                blockHeight: b.header.height,
                txCount: b.txs.length,
                gasUsed: totalGasUsed,
                poolSize: this.mempool.length
            });
            // Create snapshot every 1000 blocks
            if (b.header.height % 1000 === 0) {
                await this.createSnapshot(b.header.height);
            }
        }
        catch (error) {
            logger.error('Block validation failed', {
                blockHeight: b?.header?.height,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
    /**
     * Builds the next block from transactions in the mempool with gas optimization.
     * @returns The newly built block.
     */
    buildNextBlock() {
        logger.debug('Building next block', {
            mempoolSize: this.mempool.length
        });
        // Sort mempool by gas price (highest first) for optimal fee collection
        const sortedTxs = [...this.mempool].sort((a, b) => {
            const gasCompare = Number(b.tx.gasPrice - a.tx.gasPrice);
            if (gasCompare !== 0)
                return gasCompare;
            // If gas prices equal, prioritize by nonce (lower first)
            return a.tx.nonce - b.tx.nonce;
        });
        const selectedTxs = [];
        let blockGasUsed = 0n;
        // Select transactions that fit within block gas limit
        for (const stx of sortedTxs) {
            const gasCost = this.validator.calculateGasCost(stx.tx);
            if (blockGasUsed + gasCost.total <= this.cfg.blockGasLimit) {
                selectedTxs.push(stx);
                blockGasUsed += gasCost.total;
                // Limit to reasonable number of transactions per block
                if (selectedTxs.length >= 500)
                    break;
            }
        }
        const height = (this.head?.header.height ?? -1) + 1;
        const prev = this.head?.hash ?? "0x00";
        logger.info('Block built', {
            blockHeight: height,
            txCount: selectedTxs.length,
            gasUsed: blockGasUsed
        });
        return buildBlock(height, prev, this.keys.address, this.keys.priv, selectedTxs, blockGasUsed, this.cfg.blockGasLimit, this.cfg.baseFeePerGas);
    }
    /**
     * Creates a state snapshot at the given height
     */
    async createSnapshot(height) {
        try {
            // Calculate state root (simplified for now)
            const stateRoot = this.calculateStateRoot();
            await this.db.saveSnapshot(height, stateRoot);
            logger.info('Created snapshot', { height });
        }
        catch (error) {
            logger.error('Failed to create snapshot', {
                height,
                error: error.message
            });
        }
    }
    /**
     * Calculate a simple state root from current state
     */
    calculateStateRoot() {
        // Simplified state root calculation
        // In a real implementation, this would use a Merkle tree
        const accounts = Array.from(this.state.accounts.entries()).sort();
        const posts = Array.from(this.state.posts.entries()).sort();
        const stateData = JSON.stringify({ accounts, posts });
        return crypto.createHash('sha256').update(stateData).digest('hex');
    }
    /**
     * Get EVM statistics
     */
    getEVMStats() {
        return this.state.getEVMStats();
    }
    /**
     * Get contract code by address
     */
    getContractCode(address) {
        return this.state.getContractCode(address);
    }
    /**
     * Get contract storage value by address and key
     */
    getContractStorage(address, key) {
        return this.state.getContractStorage(address, key);
    }
    /**
     * Get transaction receipt by hash
     */
    async getReceipt(txHash) {
        return await this.db.getReceipt(txHash);
    }
    /**
     * Prune old blocks from database
     */
    async pruneBlocks(keepBlocks = 10000) {
        try {
            const latestBlock = this.head;
            if (!latestBlock || latestBlock.header.height < keepBlocks) {
                return; // Not enough blocks to prune
            }
            const pruneBeforeHeight = latestBlock.header.height - keepBlocks;
            const prunedCount = await this.db.pruneBlocks(pruneBeforeHeight);
            console.log(`[blockchain] Pruned ${prunedCount} blocks before height ${pruneBeforeHeight}`);
        }
        catch (error) {
            console.error(`[blockchain] Pruning failed: ${error.message}`);
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
    async shutdown() {
        try {
            logger.info('Shutting down blockchain');
            // Save current mempool
            const mempoolPath = path.join(this.cfg.dataDir, this.cfg.chainId, 'mempool.json');
            fs.writeFileSync(mempoolPath, JSON.stringify(this.mempool, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2));
            // Close database
            await this.db.close();
            logger.info('Blockchain shutdown complete');
        }
        catch (error) {
            logger.error('Blockchain shutdown error', { error });
        }
    }
    /**
     * Subscribe to block events
     */
    subscribeToBlocks(callback) {
        this.subscribers.blocks.push(callback);
    }
    /**
     * Subscribe to transaction events
     */
    subscribeToTransactions(callback) {
        this.subscribers.transactions.push(callback);
    }
    /**
     * Subscribe to event logs
     */
    subscribeToEvents(callback) {
        this.subscribers.events.push(callback);
    }
    /**
     * Unsubscribe from block events
     */
    unsubscribeFromBlocks(callback) {
        this.subscribers.blocks = this.subscribers.blocks.filter(cb => cb !== callback);
    }
    /**
     * Unsubscribe from transaction events
     */
    unsubscribeFromTransactions(callback) {
        this.subscribers.transactions = this.subscribers.transactions.filter(cb => cb !== callback);
    }
    /**
     * Unsubscribe from event logs
     */
    unsubscribeFromEvents(callback) {
        this.subscribers.events = this.subscribers.events.filter(cb => cb !== callback);
    }
    /**
     * Notify subscribers about a new block
     */
    notifyBlockSubscribers(block) {
        for (const callback of this.subscribers.blocks) {
            try {
                callback(block);
            }
            catch (error) {
                console.error(`[blockchain] Error notifying block subscriber: ${error.message}`);
            }
        }
    }
    /**
     * Notify subscribers about a new transaction
     */
    notifyTransactionSubscribers(tx) {
        for (const callback of this.subscribers.transactions) {
            try {
                callback(tx);
            }
            catch (error) {
                console.error(`[blockchain] Error notifying transaction subscriber: ${error.message}`);
            }
        }
    }
    /**
     * Notify subscribers about new events
     */
    notifyEventSubscribers(events) {
        for (const event of events) {
            for (const callback of this.subscribers.events) {
                try {
                    callback(event);
                }
                catch (error) {
                    console.error(`[blockchain] Error notifying event subscriber: ${error.message}`);
                }
            }
        }
    }
}

/**
 * @fileoverview Database abstraction layer with LevelDB backend and state management
 */
import { Level } from 'level';
import type { AbstractSublevel } from 'abstract-level';
import { Block, Account, ChainConfig, Hex, TxExecutionResult } from './types.js';
import { ErrorHandler } from './errors.js';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Database interface for blockchain operations
 */
export interface BlockchainDB {
  // Initialization
  init(): Promise<void>;
  
  // Block operations
  saveBlock(block: Block): Promise<void>;
  getBlock(hash: string): Promise<Block | null>;
  getBlockByHeight(height: number): Promise<Block | null>;
  getLatestBlock(): Promise<Block | null>;
  
  // State operations
  saveAccount(address: string, account: Account): Promise<void>;
  getAccount(address: string): Promise<Account | null>;
  saveSnapshot(height: number, stateRoot: Hex): Promise<void>;
  getSnapshot(height: number): Promise<Hex | null>;
  
  // Transaction receipt operations
  saveReceipt(txHash: string, receipt: TxExecutionResult & { blockHeight: number, blockHash: string }): Promise<void>;
  getReceipt(txHash: string): Promise<(TxExecutionResult & { blockHeight: number, blockHash: string }) | null>;
  
  // Maintenance operations
  pruneBlocks(beforeHeight: number): Promise<number>;
  close(): Promise<void>;
  
  // Statistics
  getStats(): Promise<DBStats>;
}

/**
 * Database statistics
 */
export interface DBStats {
  blockCount: number;
  accountCount: number;
  snapshotCount: number;
  dbSize: number;
  lastSnapshot: number;
}

/**
 * State snapshot for efficient recovery
 */
export interface StateSnapshot {
  height: number;
  stateRoot: Hex;
  timestamp: number;
  accounts: Map<string, Account>;
  posts: Map<string, any>;
}

/**
 * LevelDB implementation of BlockchainDB
 */
export class LevelBlockchainDB implements BlockchainDB {
  private db: Level<string, any>;
  private errorHandler: ErrorHandler;
  
  // Sublevel databases for different data types
  private blocksDB: any;
  private accountsDB: any;
  private snapshotsDB: any;
  private metaDB: any;
  private receiptsDB: any;
  
  constructor(private config: ChainConfig) {
    this.errorHandler = ErrorHandler.getInstance();
    
    const dbPath = path.join(config.dataDir, config.chainId, 'leveldb');
    this.db = new Level(dbPath, { valueEncoding: 'json' });
    
    // Create sublevels for different data types
    this.blocksDB = this.db.sublevel('blocks', { valueEncoding: 'json' });
    this.accountsDB = this.db.sublevel('accounts', { valueEncoding: 'json' });
    this.snapshotsDB = this.db.sublevel('snapshots', { valueEncoding: 'utf8' });
    this.metaDB = this.db.sublevel('meta', { valueEncoding: 'json' });
    this.receiptsDB = this.db.sublevel('receipts', { valueEncoding: 'json' });
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    try {
      await this.db.open();
      
      // Initialize metadata if not exists
      try {
        await this.metaDB.get('initialized');
      } catch (error) {
        // First time initialization
        await this.metaDB.put('initialized', true);
        await this.metaDB.put('genesis_time', Date.now());
        await this.metaDB.put('block_count', 0);
        await this.metaDB.put('account_count', 0);
        console.log('[db] Database initialized');
      }
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Database Initialization');
      throw error;
    }
  }

  /**
   * Save a block to the database
   */
  async saveBlock(block: Block): Promise<void> {
    try {
      const batch = this.db.batch();
      
      // Save block by hash with BigInt serialization
      const serializedBlock = JSON.parse(JSON.stringify(block, (key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      ));
      batch.put(`blocks:hash:${block.hash}`, serializedBlock);
      
      // Save block by height for quick lookup
      batch.put(`blocks:height:${block.header.height}`, block.hash);
      
      // Update latest block pointer
      batch.put('meta:latest_block', block.hash);
      
      // Update block count
      const currentCount = await this.getBlockCount();
      batch.put('meta:block_count', currentCount + 1);
      
      await batch.write();
      
      console.log(`[db] Saved block #${block.header.height} (${block.hash})`);
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Block Save', { blockHeight: block.header.height });
      throw error;
    }
  }

  /**
   * Get a block by its hash
   */
  async getBlock(hash: string): Promise<Block | null> {
    try {
      const blockData = await this.blocksDB.get(`hash:${hash}`);
      if (!blockData) return null;
      
      // Convert string BigInt values back to BigInt
      const block = {
        ...blockData,
        header: {
          ...blockData.header,
          gasUsed: BigInt(blockData.header.gasUsed),
          gasLimit: BigInt(blockData.header.gasLimit),
          baseFeePerGas: BigInt(blockData.header.baseFeePerGas)
        },
        txs: blockData.txs.map((tx: any) => ({
          ...tx,
          tx: {
            ...tx.tx,
            gasLimit: BigInt(tx.tx.gasLimit),
            gasPrice: BigInt(tx.tx.gasPrice),
            ...(tx.tx.amount !== undefined && { amount: BigInt(tx.tx.amount) }),
            ...(tx.tx.value !== undefined && { value: BigInt(tx.tx.value) })
          }
        }))
      };
      
      return block;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Block Retrieval by Hash', { hash });
      throw error;
    }
  }

  /**
   * Get a block by its height
   */
  async getBlockByHeight(height: number): Promise<Block | null> {
    try {
      const hash = await this.blocksDB.get(`height:${height}`);
      if (!hash) return null;
      return await this.getBlock(hash);
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Block Retrieval by Height', { height });
      throw error;
    }
  }

  /**
   * Get the latest block
   */
  async getLatestBlock(): Promise<Block | null> {
    try {
      const latestHash = await this.metaDB.get('latest_block');
      if (!latestHash) return null;
      return await this.getBlock(latestHash);
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Latest Block Retrieval');
      throw error;
    }
  }

  /**
   * Save an account to the database
   */
  async saveAccount(address: string, account: Account): Promise<void> {
    try {
      // Convert BigInt to string for storage
      const serializable = {
        ...account,
        forgeBalance: account.forgeBalance.toString()
      };
      
      await this.accountsDB.put(address, serializable as any);
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Account Save', { address });
      throw error;
    }
  }

  /**
   * Get an account from the database
   */
  async getAccount(address: string): Promise<Account | null> {
    try {
      const account = await this.accountsDB.get(address);
      if (!account) return null;
      
      // Convert balance back to BigInt
      return {
        ...account,
        forgeBalance: BigInt(account.forgeBalance)
      };
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Account Retrieval', { address });
      throw error;
    }
  }

  /**
   * Save a state snapshot
   */
  async saveSnapshot(height: number, stateRoot: Hex): Promise<void> {
    try {
      const snapshot = {
        height,
        stateRoot,
        timestamp: Date.now()
      };
      
      await this.snapshotsDB.put(height.toString(), JSON.stringify(snapshot));
      await this.metaDB.put('last_snapshot', height);
      
      console.log(`[db] Saved state snapshot at height ${height}`);
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Snapshot Save', { height });
      throw error;
    }
  }

  /**
   * Get a state snapshot
   */
  async getSnapshot(height: number): Promise<Hex | null> {
    try {
      const snapshotData = await this.snapshotsDB.get(height.toString());
      if (!snapshotData) return null;
      
      const snapshot = JSON.parse(snapshotData);
      return snapshot.stateRoot;
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Snapshot Retrieval', { height });
      throw error;
    }
  }

  /**
   * Save a transaction receipt to the database
   */
  async saveReceipt(txHash: string, receipt: TxExecutionResult & { blockHeight: number, blockHash: string }): Promise<void> {
    try {
      // Convert BigInt to string for storage
      const serializable = {
        ...receipt,
        gasUsed: receipt.gasUsed.toString()
      };
      
      await this.receiptsDB.put(txHash, serializable);
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Receipt Save', { txHash });
      throw error;
    }
  }

  /**
   * Get a transaction receipt from the database
   */
  async getReceipt(txHash: string): Promise<(TxExecutionResult & { blockHeight: number, blockHash: string }) | null> {
    try {
      const receipt = await this.receiptsDB.get(txHash);
      if (!receipt) return null;
      
      // Convert gasUsed back to BigInt
      return {
        ...receipt,
        gasUsed: BigInt(receipt.gasUsed)
      };
    } catch (error) {
      if ((error as any).code === 'LEVEL_NOT_FOUND') {
        return null;
      }
      this.errorHandler.logError(error as Error, 'Receipt Retrieval', { txHash });
      throw error;
    }
  }

  /**
   * Prune old blocks before a certain height
   */
  async pruneBlocks(beforeHeight: number): Promise<number> {
    let prunedCount = 0;
    
    try {
      const batch = this.db.batch();
      
      // Iterate through blocks and delete old ones
      for await (const [key, value] of this.blocksDB.iterator()) {
        if (key.startsWith('height:')) {
          const height = parseInt(key.split(':')[1]);
          if (height < beforeHeight) {
            const hash = value;
            batch.del(`blocks:hash:${hash}`);
            batch.del(`blocks:height:${height}`);
            prunedCount++;
          }
        }
      }
      
      await batch.write();
      
      console.log(`[db] Pruned ${prunedCount} blocks before height ${beforeHeight}`);
      return prunedCount;
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Block Pruning', { beforeHeight });
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DBStats> {
    try {
      const blockCount = await this.getBlockCount();
      const accountCount = await this.getAccountCount();
      const snapshotCount = await this.getSnapshotCount();
      const lastSnapshot = await this.getLastSnapshot();
      
      return {
        blockCount,
        accountCount,
        snapshotCount,
        dbSize: await this.getDBSize(),
        lastSnapshot
      };
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Stats Retrieval');
      throw error;
    }
  }

  /**
   * Close the database
   */
  async close(): Promise<void> {
    try {
      await this.db.close();
      console.log('[db] Database closed');
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Database Close');
      throw error;
    }
  }

  // Helper methods
  private async getBlockCount(): Promise<number> {
    try {
      return await this.metaDB.get('block_count') || 0;
    } catch {
      return 0;
    }
  }

  private async getAccountCount(): Promise<number> {
    try {
      let count = 0;
      for await (const [key] of this.accountsDB.iterator()) {
        count++;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private async getSnapshotCount(): Promise<number> {
    try {
      let count = 0;
      for await (const [key] of this.snapshotsDB.iterator()) {
        count++;
      }
      return count;
    } catch {
      return 0;
    }
  }

  private async getLastSnapshot(): Promise<number> {
    try {
      return await this.metaDB.get('last_snapshot') || 0;
    } catch {
      return 0;
    }
  }

  private async getDBSize(): Promise<number> {
    try {
      const dbPath = path.join(this.config.dataDir, this.config.chainId, 'leveldb');
      const stats = fs.statSync(dbPath);
      return stats.size || 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Database migration utilities
 */
export class DBMigration {
  constructor(private oldDataDir: string, private newDB: BlockchainDB) {}

  /**
   * Migrate from JSONL format to LevelDB
   */
  async migrateFromJSONL(chainId: string): Promise<void> {
    console.log('[migration] Starting migration from JSONL to LevelDB...');
    
    const jsonlPath = path.join(this.oldDataDir, chainId, 'blocks.jsonl');
    
    if (!fs.existsSync(jsonlPath)) {
      console.log('[migration] No JSONL file found, skipping migration');
      return;
    }

    try {
      const content = fs.readFileSync(jsonlPath, 'utf8');
      const lines = content.trim().split('\n');
      
      let migratedCount = 0;
      for (const line of lines) {
        if (line.trim()) {
          const block = JSON.parse(line);
          
          // Convert string values back to appropriate types
          if (block.header.gasUsed) {
            block.header.gasUsed = BigInt(block.header.gasUsed);
          }
          if (block.header.gasLimit) {
            block.header.gasLimit = BigInt(block.header.gasLimit);
          }
          if (block.header.baseFeePerGas) {
            block.header.baseFeePerGas = BigInt(block.header.baseFeePerGas);
          }
          
          // Migrate transactions
          for (const tx of block.txs) {
            if (tx.tx.gasLimit) tx.tx.gasLimit = BigInt(tx.tx.gasLimit);
            if (tx.tx.gasPrice) tx.tx.gasPrice = BigInt(tx.tx.gasPrice);
            if (tx.tx.amount) tx.tx.amount = BigInt(tx.tx.amount);
          }
          
          await this.newDB.saveBlock(block);
          migratedCount++;
        }
      }
      
      console.log(`[migration] Successfully migrated ${migratedCount} blocks`);
      
      // Backup old file
      const backupPath = jsonlPath + '.backup';
      fs.renameSync(jsonlPath, backupPath);
      console.log(`[migration] Original JSONL backed up to ${backupPath}`);
      
    } catch (error) {
      console.error('[migration] Migration failed:', error);
      throw error;
    }
  }
}
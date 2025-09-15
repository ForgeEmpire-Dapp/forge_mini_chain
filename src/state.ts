/**
 * @fileoverview This file defines the State class, which manages the state of the blockchain.
 * It includes methods for creating and updating accounts, as well as applying transactions to the state.
 */
import { Account, AppState, SignedTx, Tx, TxExecutionResult, ChainConfig } from "./types.js";
import { TxValidator, GAS_COSTS } from "./validation.js";
import { EVMManager } from "./evm.js";


/**
 * The main state class for the application.
 * It holds all accounts and posts.
 */
export class State {
public accounts: Map<string, Account> = new Map();
public posts: Map<string, { owner: string; contentHash: string; pointer?: string; block: number }> = new Map();
private validator?: TxValidator;
private evmManager?: EVMManager;

/**
 * Initialize validator and EVM for gas-enabled validation and smart contracts
 */
setValidator(config: ChainConfig) {
  this.validator = new TxValidator(config, this);
  this.evmManager = new EVMManager(config, this);
}


/**
 * Retrieves an account by address, or creates a new one if it doesn't exist.
 * @param addr The address of the account to retrieve or create.
 * @returns The account object.
 */
getOrCreate(addr: string): Account {
const a = this.accounts.get(addr);
if (a) return a;
const fresh: Account = { balance: 0n, nonce: 0, rep: 0 };
this.accounts.set(addr, fresh);
return fresh;
}


/**
 * Applies a transaction to the state with gas mechanism
 * @param tx The transaction to apply.
 * @param height The block height at which the transaction is applied.
 * @param proposer The block proposer address for fee collection.
 * @returns Transaction execution result with gas usage.
 * @throws An error if the transaction is invalid.
 */
async applyTx(tx: Tx, height: number, proposer: string): Promise<TxExecutionResult> {
  let gasUsed = 0n;
  
  try {
    // Calculate gas cost
    const gasCost = this.validator?.calculateGasCost(tx) || {
      base: GAS_COSTS.TX_BASE,
      data: 0n,
      total: GAS_COSTS.TX_BASE
    };
    
    const from = this.getOrCreate(tx.from);
    const totalFee = gasCost.total * tx.gasPrice;
    
    // Validate nonce
    if (from.nonce + 1 !== tx.nonce) {
      throw new Error(`Bad nonce: expected ${from.nonce + 1}, got ${tx.nonce}`);
    }
    
    // Check gas limit
    if (tx.gasLimit < gasCost.total) {
      throw new Error(`Gas limit too low: required ${gasCost.total}, provided ${tx.gasLimit}`);
    }
    
    // Deduct gas fee first
    if (from.balance < totalFee) {
      throw new Error(`Insufficient balance for gas: required ${totalFee}, available ${from.balance}`);
    }
    
    from.balance -= totalFee;
    gasUsed = gasCost.total;
    
    // Credit gas fee to proposer
    const proposerAccount = this.getOrCreate(proposer);
    proposerAccount.balance += totalFee;
    
    // Execute transaction-specific logic
    if (tx.type === "transfer") {
      const transferTx = tx as any;
      const to = this.getOrCreate(transferTx.to);
      
      if (from.balance < transferTx.amount) {
        throw new Error(`Insufficient balance for transfer: required ${transferTx.amount}, available ${from.balance}`);
      }
      
      from.balance -= transferTx.amount;
      to.balance += transferTx.amount;
      from.nonce++;
      
      return {
        success: true,
        gasUsed,
        returnData: "0x"
      };
    }
    
    if (tx.type === "post") {
      const postTx = tx as any;
      
      // Check if post already exists
      if (this.posts.has(postTx.postId)) {
        throw new Error(`Post ID ${postTx.postId} already exists`);
      }
      
      this.posts.set(postTx.postId, {
        owner: postTx.from,
        contentHash: postTx.contentHash,
        pointer: postTx.pointer,
        block: height
      });
      
      from.nonce++;
      
      return {
        success: true,
        gasUsed,
        returnData: "0x",
        events: [{
          topics: ["0x" + "PostCreated".padEnd(64, "0")],
          data: "0x" + postTx.postId
        }]
      };
    }
    
    if (tx.type === "rep") {
      const repTx = tx as any;
      const target = this.getOrCreate(repTx.target);
      
      if (repTx.from === repTx.target) {
        throw new Error("Cannot change own reputation");
      }
      
      target.rep += repTx.delta;
      from.nonce++;
      
      return {
        success: true,
        gasUsed,
        returnData: "0x",
        events: [{
          topics: ["0x" + "ReputationChanged".padEnd(64, "0")],
          data: "0x" + repTx.target + repTx.delta.toString(16).padStart(64, "0")
        }]
      };
    }
    
    if (tx.type === "deploy") {
      if (!this.evmManager) {
        throw new Error("EVM not initialized");
      }
      
      const deployTx = tx as any;
      
      // EVM handles the deployment and gas calculation
      const result = await this.evmManager.deployContract(deployTx, { height, proposer });
      
      if (result.success) {
        from.nonce++;
      }
      
      return result;
    }
    
    if (tx.type === "call") {
      if (!this.evmManager) {
        throw new Error("EVM not initialized");
      }
      
      const callTx = tx as any;
      
      // Check if sender has enough balance for the call value
      if (from.balance < callTx.value) {
        throw new Error(`Insufficient balance for call: required ${callTx.value}, available ${from.balance}`);
      }
      
      // EVM handles the call and gas calculation
      const result = await this.evmManager.callContract(callTx, { height, proposer });
      
      if (result.success) {
        from.nonce++;
        
        // Transfer value to contract (if any)
        if (callTx.value > 0n) {
          from.balance -= callTx.value;
          const contractAccount = this.getOrCreate(callTx.to);
          contractAccount.balance += callTx.value;
        }
      }
      
      return result;
    }
    
    throw new Error(`Unknown transaction type: ${(tx as any).type}`);
    
  } catch (error) {
    // On error, still consume some gas but refund the rest
    const minGas = GAS_COSTS.TX_BASE;
    gasUsed = minGas;
    
    const from = this.getOrCreate(tx.from);
    const usedFee = minGas * tx.gasPrice;
    const refund = (tx.gasLimit - minGas) * tx.gasPrice;
    
    // Refund unused gas
    from.balance += refund;
    
    return {
      success: false,
      gasUsed,
      error: (error as Error).message
    };
  }
}


  /**
   * Get EVM statistics
   */
  getEVMStats() {
    if (!this.evmManager) {
      throw new Error("EVM not initialized");
    }
    return this.evmManager.getStats();
  }

  /**
   * Get contract code by address
   */
  getContractCode(address: string): string | null {
    if (!this.evmManager) {
      throw new Error("EVM not initialized");
    }
    return this.evmManager.getContractCode(address);
  }

  /**
   * Get contract storage value by address and key
   */
  getContractStorage(address: string, key: string): string | null {
    if (!this.evmManager) {
      throw new Error("EVM not initialized");
    }
    return this.evmManager.getContractStorage(address, key);
  }

}


/**
 * Applies all transactions in a block to the given state with gas tracking.
 * @param state The state to apply the block to.
 * @param block The block containing the transactions to apply.
 * @returns Total gas used by all transactions in the block and individual transaction results.
 */
export async function applyBlock(state: State, block: { txs: SignedTx[]; header: { height: number; proposer: string } }): Promise<{ totalGasUsed: bigint; txResults: Array<{ txHash: string; result: TxExecutionResult }> }> {
  let totalGasUsed = 0n;
  const txResults: Array<{ txHash: string; result: TxExecutionResult }> = [];
  
  for (const stx of block.txs) {
    const result = await state.applyTx(stx.tx, block.header.height, block.header.proposer);
    totalGasUsed += result.gasUsed;
    txResults.push({ txHash: stx.hash, result });
    
    // Log transaction result
    if (!result.success) {
      console.warn(`Transaction ${stx.hash} failed: ${result.error}`);
    }
  }
  
  return { totalGasUsed, txResults };
}

/**
 * @fileoverview Enhanced transaction validation with gas mechanism and comprehensive checks
 */
import { Tx, SignedTx, Account, ValidationResult, GasCost, ChainConfig } from "./types.js";
import { State } from "./state.js";
import { addressFromPub } from "./crypto.js";

/**
 * Gas costs for different transaction types and operations
 */
export const GAS_COSTS = {
  // Base transaction costs
  TX_BASE: 21000n, // Base cost for any transaction
  TX_DATA_ZERO: 4n, // Cost per zero byte in data
  TX_DATA_NON_ZERO: 16n, // Cost per non-zero byte in data
  
  // Transaction type specific costs
  TRANSFER: 0n, // No additional cost for transfers
  POST: 20000n, // Additional cost for post transactions
  REPUTATION: 15000n, // Additional cost for reputation transactions
  
  // Smart contract costs
  CONTRACT_CREATION: 32000n, // Base cost for contract creation
  CONTRACT_CALL: 25000n, // Base cost for contract calls
  CONTRACT_CODE_DEPOSIT: 200n, // Cost per byte of deployed code
  
  // Storage operations
  STORAGE_SET: 20000n, // Cost to set storage from zero to non-zero
  STORAGE_RESET: 5000n, // Cost to reset storage from non-zero to zero
  STORAGE_CLEAR_REFUND: 15000n, // Refund for clearing storage
} as const;

// Helper function to format token amounts
function formatForgeTokens(wei: bigint): string {
  const forge = Number(wei) / 1e18;
  return forge.toFixed(2) + " FORGE";
}

/**
 * Enhanced transaction validator with gas mechanism
 */
export class TxValidator {
  constructor(
    private config: ChainConfig,
    private state: State
  ) {}

  /**
   * Validates a transaction comprehensively
   */
  async validateTx(tx: Tx, currentBlockGasUsed: bigint = 0n): Promise<ValidationResult> {
    try {
      // 1. Basic structure validation
      const structureCheck = this.validateStructure(tx);
      if (!structureCheck.valid) return structureCheck;

      // 2. Account state validation
      const account = this.state.getOrCreate(tx.from);
      const accountCheck = this.validateAccount(tx, account);
      if (!accountCheck.valid) return accountCheck;

      // 3. Gas validation
      const gasCheck = this.validateGas(tx, currentBlockGasUsed);
      if (!gasCheck.valid) return gasCheck;

      // 4. Type-specific validation
      const typeCheck = this.validateTransactionType(tx);
      if (!typeCheck.valid) return typeCheck;

      // 5. Calculate total cost
      const gasCost = this.calculateGasCost(tx);
      const totalCost = gasCost.total * tx.gasPrice + this.getTransferAmount(tx);
      
      if (account.forgeBalance < totalCost) {
        return {
          valid: false,
          error: `Insufficient FORGE balance: required ${totalCost}, available ${account.forgeBalance}`
        };
      }

      return {
        valid: true,
        requiredGas: gasCost.total,
        fee: gasCost.total * tx.gasPrice,
        feeFormatted: formatForgeTokens(gasCost.total * tx.gasPrice)
      };

    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Validates basic transaction structure
   */
  private validateStructure(tx: Tx): ValidationResult {
    if (!tx.type || !tx.from || tx.nonce < 0) {
      return { valid: false, error: "Invalid transaction structure" };
    }

    if (!tx.gasLimit || tx.gasLimit <= 0n) {
      return { valid: false, error: "Invalid gas limit" };
    }

    if (!tx.gasPrice || tx.gasPrice < this.config.minGasPrice) {
      return { 
        valid: false, 
        error: `Gas price too low: minimum ${this.config.minGasPrice}, provided ${tx.gasPrice}` 
      };
    }

    // Check address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tx.from)) {
      return { valid: false, error: "Invalid from address format" };
    }

    return { valid: true };
  }

  /**
   * Validates account state and permissions
   */
  private validateAccount(tx: Tx, account: Account): ValidationResult {
    // Nonce validation
    if (account.nonce + 1 !== tx.nonce) {
      return { 
        valid: false, 
        error: `Invalid nonce: expected ${account.nonce + 1}, got ${tx.nonce}` 
      };
    }

    return { valid: true };
  }

  /**
   * Validates gas-related parameters
   */
  private validateGas(tx: Tx, currentBlockGasUsed: bigint): ValidationResult {
    const requiredGas = this.calculateGasCost(tx).total;
    
    if (tx.gasLimit < requiredGas) {
      return { 
        valid: false, 
        error: `Gas limit too low: required ${requiredGas}, provided ${tx.gasLimit}` 
      };
    }

    // Check if transaction would exceed block gas limit
    if (currentBlockGasUsed + tx.gasLimit > this.config.blockGasLimit) {
      return { 
        valid: false, 
        error: `Transaction would exceed block gas limit` 
      };
    }

    return { valid: true };
  }

  /**
   * Validates transaction type-specific rules
   */
  private validateTransactionType(tx: Tx): ValidationResult {
    switch (tx.type) {
      case "transfer":
        return this.validateTransferTx(tx as any);
      case "post":
        return this.validatePostTx(tx as any);
      case "rep":
        return this.validateRepTx(tx as any);
      case "deploy":
        return this.validateDeployTx(tx as any);
      case "call":
        return this.validateCallTx(tx as any);
      default:
        return { valid: false, error: `Unknown transaction type: ${(tx as any).type}` };
    }
  }

  private validateTransferTx(tx: any): ValidationResult {
    if (!tx.to || !/^0x[a-fA-F0-9]{40}$/.test(tx.to)) {
      return { valid: false, error: "Invalid recipient address" };
    }
    
    if (!tx.amount || tx.amount <= 0n) {
      return { valid: false, error: "Invalid transfer amount" };
    }

    if (tx.from === tx.to) {
      return { valid: false, error: "Cannot transfer to self" };
    }

    return { valid: true };
  }

  private validatePostTx(tx: any): ValidationResult {
    if (!tx.postId || typeof tx.postId !== "string") {
      return { valid: false, error: "Invalid post ID" };
    }
    
    if (!tx.contentHash || !/^0x[a-fA-F0-9]{64}$/.test(tx.contentHash)) {
      return { valid: false, error: "Invalid content hash" };
    }

    // Check if post ID already exists
    if (this.state.posts.has(tx.postId)) {
      return { valid: false, error: "Post ID already exists" };
    }

    return { valid: true };
  }

  private validateRepTx(tx: any): ValidationResult {
    if (!tx.target || !/^0x[a-fA-F0-9]{40}$/.test(tx.target)) {
      return { valid: false, error: "Invalid target address" };
    }
    
    if (typeof tx.delta !== "number" || tx.delta === 0) {
      return { valid: false, error: "Invalid reputation delta" };
    }

    if (tx.from === tx.target) {
      return { valid: false, error: "Cannot change own reputation" };
    }

    // Limit reputation delta to reasonable range
    if (Math.abs(tx.delta) > 100) {
      return { valid: false, error: "Reputation delta too large" };
    }

    return { valid: true };
  }

  private validateDeployTx(tx: any): ValidationResult {
    if (!tx.bytecode || typeof tx.bytecode !== "string" || !tx.bytecode.startsWith("0x")) {
      return { valid: false, error: "Invalid contract bytecode" };
    }

    // Check bytecode length (reasonable limits)
    const bytecodeLength = (tx.bytecode.length - 2) / 2; // Remove 0x and convert to bytes
    if (bytecodeLength === 0) {
      return { valid: false, error: "Empty contract bytecode" };
    }

    if (bytecodeLength > 24576) { // 24KB limit (EIP-170)
      return { valid: false, error: "Contract bytecode too large (max 24KB)" };
    }

    // Validate constructor arguments if provided
    if (tx.constructorArgs) {
      if (typeof tx.constructorArgs !== "string" || !tx.constructorArgs.startsWith("0x")) {
        return { valid: false, error: "Invalid constructor arguments format" };
      }
    }

    // Validate value if provided
    if (tx.value && tx.value < 0n) {
      return { valid: false, error: "Invalid value for contract deployment" };
    }

    return { valid: true };
  }

  private validateCallTx(tx: any): ValidationResult {
    if (!tx.to || !/^0x[a-fA-F0-9]{40}$/.test(tx.to)) {
      return { valid: false, error: "Invalid contract address" };
    }

    if (!tx.data || typeof tx.data !== "string" || !tx.data.startsWith("0x")) {
      return { valid: false, error: "Invalid call data" };
    }

    // Check if target is a contract (if we have state access)
    const targetAccount = this.state.accounts.get(tx.to);
    if (targetAccount && !targetAccount.isContract) {
      return { valid: false, error: "Target address is not a contract" };
    }

    // Validate call data length
    if (tx.data.length > 8192) { // 4KB limit for call data
      return { valid: false, error: "Call data too large (max 4KB)" };
    }

    // Validate value
    if (tx.value < 0n) {
      return { valid: false, error: "Invalid value for contract call" };
    }

    return { valid: true };
  }

  /**
   * Calculates gas cost for a transaction
   */
  calculateGasCost(tx: Tx): GasCost {
    let base = GAS_COSTS.TX_BASE;
    let data = 0n;

    // Add type-specific costs
    switch (tx.type) {
      case "transfer":
        base += GAS_COSTS.TRANSFER;
        break;
      case "post":
        base += GAS_COSTS.POST;
        break;
      case "rep":
        base += GAS_COSTS.REPUTATION;
        break;
      case "deploy":
        base += GAS_COSTS.CONTRACT_CREATION;
        // Add cost for contract code storage
        const deployTx = tx as any;
        if (deployTx.bytecode) {
          const codeSize = BigInt((deployTx.bytecode.length - 2) / 2); // Remove 0x prefix
          base += codeSize * GAS_COSTS.CONTRACT_CODE_DEPOSIT;
        }
        break;
      case "call":
        base += GAS_COSTS.CONTRACT_CALL;
        break;
    }

    // Calculate data costs if present
    if (tx.data) {
      const dataBytes = Buffer.from(tx.data.replace("0x", ""), "hex");
      for (const byte of dataBytes) {
        data += byte === 0 ? GAS_COSTS.TX_DATA_ZERO : GAS_COSTS.TX_DATA_NON_ZERO;
      }
    }

    // Special handling for deploy transactions with constructor args
    if (tx.type === "deploy") {
      const deployTx = tx as any;
      if (deployTx.constructorArgs) {
        const argsBytes = Buffer.from(deployTx.constructorArgs.replace("0x", ""), "hex");
        for (const byte of argsBytes) {
          data += byte === 0 ? GAS_COSTS.TX_DATA_ZERO : GAS_COSTS.TX_DATA_NON_ZERO;
        }
      }
    }

    const total = base + data;
    
    return { base, data, total };
  }

  /**
   * Gets the transfer amount for cost calculation
   */
  private getTransferAmount(tx: Tx): bigint {
    if (tx.type === "transfer") {
      return (tx as any).amount;
    }
    return 0n;
  }

  /**
   * Validates a signed transaction including signature verification
   */
  async validateSignedTx(stx: SignedTx, chainId: string): Promise<ValidationResult> {
    try {
      // First validate the transaction itself
      const txValidation = await this.validateTx(stx.tx);
      if (!txValidation.valid) return txValidation;

      // Verify the signature corresponds to the from address
      const recoveredAddress = addressFromPub(stx.pubkey);
      if (recoveredAddress !== stx.tx.from) {
        return { 
          valid: false, 
          error: "Signature does not match from address" 
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Signature validation error: ${(error as Error).message}`
      };
    }
  }
}

/**
 * Rate limiting for transaction validation
 */
export class RateLimiter {
  private txCounts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(
    private maxTxPerMinute: number = 60,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Checks if an address has exceeded rate limits
   */
  checkRateLimit(address: string): ValidationResult {
    const now = Date.now();
    const record = this.txCounts.get(address);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.txCounts.set(address, { count: 1, resetTime: now + this.windowMs });
      return { valid: true };
    }

    if (record.count >= this.maxTxPerMinute) {
      return { 
        valid: false, 
        error: `Rate limit exceeded: max ${this.maxTxPerMinute} transactions per minute` 
      };
    }

    record.count++;
    return { valid: true };
  }

  /**
   * Cleanup old rate limit records
   */
  cleanup(): void {
    const now = Date.now();
    for (const [address, record] of this.txCounts.entries()) {
      if (now > record.resetTime) {
        this.txCounts.delete(address);
      }
    }
  }
}
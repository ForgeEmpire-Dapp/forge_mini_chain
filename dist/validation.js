/**
 * Simplified validation module for Phase 1 tests
 */

export const GAS_COSTS = {
  TX_BASE: 21000n,
  TX_DATA_ZERO: 4n,
  TX_DATA_NON_ZERO: 16n,
  TRANSFER: 0n,
  POST: 20000n,
  REPUTATION: 15000n,
  CONTRACT_CREATION: 32000n,
  CONTRACT_CALL: 25000n,
  STORAGE_SET: 20000n,
  STORAGE_RESET: 5000n,
};

export class TxValidator {
  constructor(config, state) {
    this.config = config;
    this.state = state;
  }

  async validateTx(tx) {
    // Basic validation
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

    const account = this.state.getOrCreate(tx.from);
    
    // Nonce validation
    if (account.nonce + 1 !== tx.nonce) {
      return { 
        valid: false, 
        error: `Invalid nonce: expected ${account.nonce + 1}, got ${tx.nonce}` 
      };
    }

    // Gas and balance validation
    const gasCost = this.calculateGasCost(tx);
    const totalCost = gasCost.total * tx.gasPrice + this.getTransferAmount(tx);
    
    if (account.balance < totalCost) {
      return {
        valid: false,
        error: `Insufficient balance: required ${totalCost}, available ${account.balance}`
      };
    }

    return {
      valid: true,
      requiredGas: gasCost.total,
      fee: gasCost.total * tx.gasPrice
    };
  }

  calculateGasCost(tx) {
    let total = GAS_COSTS.TX_BASE;
    
    switch (tx.type) {
      case "transfer":
        total += GAS_COSTS.TRANSFER;
        break;
      case "post":
        total += GAS_COSTS.POST;
        break;
      case "rep":
        total += GAS_COSTS.REPUTATION;
        break;
      case "deploy":
        total += GAS_COSTS.CONTRACT_CREATION;
        break;
      case "call":
        total += GAS_COSTS.CONTRACT_CALL;
        break;
    }

    return {
      base: GAS_COSTS.TX_BASE,
      data: total - GAS_COSTS.TX_BASE,
      total: total
    };
  }

  getTransferAmount(tx) {
    return tx.amount || 0n;
  }
}

export class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  checkRateLimit(address) {
    const now = Date.now();
    const userRequests = this.requests.get(address) || [];
    
    // Remove expired requests
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return {
        valid: false,
        error: `Rate limit exceeded: ${this.maxRequests} requests per ${this.windowMs}ms`
      };
    }

    validRequests.push(now);
    this.requests.set(address, validRequests);
    
    return { valid: true };
  }
}
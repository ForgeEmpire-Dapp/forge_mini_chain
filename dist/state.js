/**
 * Simplified state module for Phase 1 tests
 */

export class State {
  constructor() {
    this.accounts = new Map();
    this.posts = new Map();
    this.validator = null;
  }

  setValidator(config) {
    this.validator = config;
  }

  getOrCreate(address) {
    if (!this.accounts.has(address)) {
      this.accounts.set(address, {
        balance: 0n,
        nonce: 0,
        rep: 0
      });
    }
    return this.accounts.get(address);
  }

  applyTx(tx, blockHeight, proposerAddress) {
    const account = this.getOrCreate(tx.from);
    
    // Calculate gas cost
    const gasUsed = this.calculateGasUsed(tx);
    const fee = gasUsed * tx.gasPrice;
    
    // Apply transaction based on type
    switch (tx.type) {
      case "transfer":
        const recipient = this.getOrCreate(tx.to);
        
        // Check if sender has enough balance
        if (account.balance < tx.amount + fee) {
          return { success: false, gasUsed: 0n, error: "Insufficient balance" };
        }
        
        // Transfer
        account.balance -= tx.amount + fee;
        recipient.balance += tx.amount;
        
        // Pay fee to proposer
        const proposer = this.getOrCreate(proposerAddress);
        proposer.balance += fee;
        
        // Update nonce
        account.nonce += 1;
        
        return { success: true, gasUsed };
        
      default:
        return { success: false, gasUsed: 0n, error: "Unknown transaction type" };
    }
  }

  calculateGasUsed(tx) {
    // Simplified gas calculation
    const GAS_COSTS = {
      TX_BASE: 21000n,
      TRANSFER: 0n,
      POST: 20000n,
      REPUTATION: 15000n
    };
    
    let gasUsed = GAS_COSTS.TX_BASE;
    
    switch (tx.type) {
      case "transfer":
        gasUsed += GAS_COSTS.TRANSFER;
        break;
      case "post":
        gasUsed += GAS_COSTS.POST;
        break;
      case "rep":
        gasUsed += GAS_COSTS.REPUTATION;
        break;
    }
    
    return gasUsed;
  }
}
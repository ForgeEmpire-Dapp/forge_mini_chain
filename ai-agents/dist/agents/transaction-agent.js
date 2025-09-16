"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionAgent = void 0;
const base_agent_1 = require("../core/base-agent");
class TransactionAgent extends base_agent_1.BaseAgent {
    constructor(config) {
        super(config);
        this.transferRules = config.transferRules || [];
    }
    async perceive() {
        // Get current blockchain state
        const head = await this.blockchainClient.getHead();
        const accounts = await Promise.all(this.transferRules.map(rule => this.blockchainClient.getAccount(rule.from)));
        return {
            blockHeight: head.header.height,
            accounts: accounts.reduce((acc, account, index) => {
                acc[this.transferRules[index].from] = account;
                return acc;
            }, {})
        };
    }
    async plan(perception) {
        const transactions = [];
        for (const rule of this.transferRules) {
            const account = perception.accounts[rule.from];
            // Simple condition: only transfer if balance is sufficient
            if (account && BigInt(account.balance) > BigInt(rule.amount)) {
                transactions.push({
                    from: rule.from,
                    to: rule.to,
                    amount: rule.amount
                });
            }
        }
        return { transactions };
    }
    async execute(plan) {
        const results = [];
        for (const tx of plan.transactions) {
            try {
                // In a real implementation, you would need to sign the transaction
                // This is a simplified example
                const transaction = {
                    tx: {
                        type: 'transfer',
                        from: tx.from,
                        to: tx.to,
                        amount: tx.amount,
                        nonce: 1, // This should be properly managed
                        gasLimit: '21000',
                        gasPrice: '1000000000'
                    },
                    signature: 'mock-signature',
                    hash: 'mock-hash'
                };
                const txHash = await this.blockchainClient.submitTransaction(transaction);
                results.push({ success: true, txHash });
            }
            catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        return results;
    }
}
exports.TransactionAgent = TransactionAgent;

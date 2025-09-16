import { TxValidator, GAS_COSTS } from "./validation.js";
import { EVMManager } from "./evm.js";
import { evmContractCounter } from "./metrics.js";
import logger from './logger.js';
/**
 * The main state class for the application.
 * It holds all accounts and posts.
 */
export class State {
    accounts = new Map();
    posts = new Map();
    validator;
    evmManager;
    /**
     * Initialize validator and EVM for gas-enabled validation and smart contracts
     */
    setValidator(config) {
        this.validator = new TxValidator(config, this);
        this.evmManager = new EVMManager(config, this);
    }
    /**
     * Retrieves an account by address, or creates a new one if it doesn't exist.
     * @param addr The address of the account to retrieve or create.
     * @returns The account object.
     */
    getOrCreate(addr) {
        const a = this.accounts.get(addr);
        if (a)
            return a;
        const fresh = {
            forgeBalance: 0n,
            nonce: 0,
            rep: 0
        };
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
    async applyTx(tx, height, proposer) {
        let gasUsed = 0n;
        try {
            logger.debug('Applying transaction', {
                txType: tx.type,
                from: tx.from,
                height
            });
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
            if (from.forgeBalance < totalFee) {
                throw new Error(`Insufficient FORGE balance for gas: required ${totalFee}, available ${from.forgeBalance}`);
            }
            from.forgeBalance -= totalFee;
            gasUsed = gasCost.total;
            // Credit gas fee to proposer
            const proposerAccount = this.getOrCreate(proposer);
            proposerAccount.forgeBalance += totalFee;
            // Execute transaction-specific logic
            if (tx.type === "transfer") {
                const transferTx = tx;
                const to = this.getOrCreate(transferTx.to);
                if (from.forgeBalance < transferTx.amount) {
                    throw new Error(`Insufficient FORGE balance for transfer: required ${transferTx.amount}, available ${from.forgeBalance}`);
                }
                from.forgeBalance -= transferTx.amount;
                to.forgeBalance += transferTx.amount;
                from.nonce++;
                logger.info('Transfer transaction applied', {
                    from: tx.from,
                    to: transferTx.to,
                    amount: transferTx.amount
                });
                return {
                    success: true,
                    gasUsed,
                    returnData: "0x"
                };
            }
            if (tx.type === "post") {
                const postTx = tx;
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
                logger.info('Post transaction applied', {
                    from: tx.from,
                    postId: postTx.postId
                });
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
                const repTx = tx;
                const target = this.getOrCreate(repTx.target);
                if (repTx.from === repTx.target) {
                    throw new Error("Cannot change own reputation");
                }
                target.rep += repTx.delta;
                from.nonce++;
                logger.info('Reputation transaction applied', {
                    from: tx.from,
                    target: repTx.target,
                    delta: repTx.delta
                });
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
                const deployTx = tx;
                // EVM handles the deployment and gas calculation
                const result = await this.evmManager.deployContract(deployTx, { height, proposer });
                if (result.success) {
                    from.nonce++;
                    // Update EVM contract counter
                    evmContractCounter.inc();
                    logger.info('Contract deployed', {
                        from: tx.from,
                        contractAddress: result.contractAddress
                    });
                }
                return result;
            }
            if (tx.type === "call") {
                if (!this.evmManager) {
                    throw new Error("EVM not initialized");
                }
                const callTx = tx;
                // Check if sender has enough balance for the call value
                if (from.forgeBalance < callTx.value) {
                    throw new Error(`Insufficient FORGE balance for call: required ${callTx.value}, available ${from.forgeBalance}`);
                }
                // EVM handles the call and gas calculation
                const result = await this.evmManager.callContract(callTx, { height, proposer });
                if (result.success) {
                    from.nonce++;
                    // Transfer value to contract (if any)
                    if (callTx.value > 0n) {
                        from.forgeBalance -= callTx.value;
                        const contractAccount = this.getOrCreate(callTx.to);
                        contractAccount.forgeBalance += callTx.value;
                    }
                    logger.info('Contract call executed', {
                        from: tx.from,
                        to: callTx.to,
                        gasUsed: result.gasUsed
                    });
                }
                return result;
            }
            throw new Error(`Unknown transaction type: ${tx.type}`);
        }
        catch (error) {
            // On error, still consume some gas but refund the rest
            const minGas = GAS_COSTS.TX_BASE;
            gasUsed = minGas;
            const from = this.getOrCreate(tx.from);
            const usedFee = minGas * tx.gasPrice;
            const refund = (tx.gasLimit - minGas) * tx.gasPrice;
            // Refund unused gas
            from.forgeBalance += refund;
            logger.error('Transaction execution failed', {
                txType: tx.type,
                from: tx.from,
                error: error.message
            });
            return {
                success: false,
                gasUsed,
                error: error.message
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
    getContractCode(address) {
        if (!this.evmManager) {
            throw new Error("EVM not initialized");
        }
        return this.evmManager.getContractCode(address);
    }
    /**
     * Get contract storage value by address and key
     */
    getContractStorage(address, key) {
        if (!this.evmManager) {
            throw new Error("EVM not initialized");
        }
        return this.evmManager.getContractStorage(address, key);
    }
    /**
     * Migrates existing accounts from old balance field to forgeBalance field
     * Temporary function for backward compatibility
     */
    migrateAccountBalances() {
        for (const [address, account] of this.accounts.entries()) {
            // If account has old balance field but no forgeBalance, migrate it
            if ('balance' in account && !('forgeBalance' in account)) {
                account.forgeBalance = account.balance;
                delete account.balance;
                console.log(`[migration] Migrated account balance for ${address}`);
            }
        }
    }
    /**
     * Distributes block rewards to the proposer
     * @param proposer The address of the block proposer
     * @param blockReward The amount of FORGE tokens to reward
     */
    distributeBlockReward(proposer, blockReward) {
        const proposerAccount = this.getOrCreate(proposer);
        proposerAccount.forgeBalance += blockReward;
        console.log(`[state] Block reward distributed to ${proposer}: ${blockReward} FORGE`);
    }
}
/**
 * Applies all transactions in a block to the given state with gas tracking.
 * @param state The state to apply the block to.
 * @param block The block containing the transactions to apply.
 * @param blockReward Optional block reward to distribute to the proposer.
 * @returns Total gas used by all transactions in the block and individual transaction results.
 */
export async function applyBlock(state, block, blockReward) {
    let totalGasUsed = 0n;
    const txResults = [];
    for (const stx of block.txs) {
        const result = await state.applyTx(stx.tx, block.header.height, block.header.proposer);
        totalGasUsed += result.gasUsed;
        txResults.push({ txHash: stx.hash, result });
        // Log transaction result
        if (!result.success) {
            console.warn(`Transaction ${stx.hash} failed: ${result.error}`);
        }
    }
    // Distribute block reward to proposer if specified
    if (blockReward) {
        state.distributeBlockReward(block.header.proposer, blockReward);
    }
    return { totalGasUsed, txResults };
}

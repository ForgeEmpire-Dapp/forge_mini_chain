/**
 * @fileoverview Forge Empire JavaScript/TypeScript SDK
 */
import axios from 'axios';
/**
 * Forge Empire SDK for interacting with the blockchain
 */
export class ForgeEmpireSDK {
    api;
    /**
     * Create a new SDK instance
     * @param baseURL The base URL of the blockchain API
     */
    constructor(baseURL) {
        this.api = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    /**
     * Check if the node is healthy
     * @returns True if healthy, false otherwise
     */
    async isHealthy() {
        try {
            const response = await this.api.get('/health');
            return response.data.ok === true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get the latest block
     * @returns The latest block or null if not available
     */
    async getHead() {
        try {
            const response = await this.api.get('/head');
            return this.deserializeBlock(response.data);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get account information
     * @param address The account address
     * @returns Account information or null if not found
     */
    async getAccount(address) {
        try {
            const response = await this.api.get(`/account/${address}`);
            return this.deserializeAccount(response.data);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get EVM statistics
     * @returns EVM statistics
     */
    async getEVMStats() {
        try {
            const response = await this.api.get('/evm/stats');
            return response.data;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get contract code
     * @param address The contract address
     * @returns Contract code or null if not found
     */
    async getContractCode(address) {
        try {
            const response = await this.api.get(`/contract/${address}/code`);
            return response.data.code;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get contract storage value
     * @param address The contract address
     * @param key The storage key
     * @returns Storage value or null if not found
     */
    async getContractStorage(address, key) {
        try {
            const response = await this.api.get(`/contract/${address}/storage/${key}`);
            return response.data.value;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Get transaction receipt
     * @param txHash The transaction hash
     * @returns Transaction receipt or null if not found
     */
    async getTransactionReceipt(txHash) {
        try {
            const response = await this.api.get(`/tx/${txHash}/receipt`);
            return this.deserializeReceipt(response.data);
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Submit a signed transaction
     * @param signedTx The signed transaction
     * @returns Transaction hash if successful
     */
    async submitTransaction(signedTx) {
        try {
            const response = await this.api.post('/tx', signedTx);
            return response.data.hash;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Create a transfer transaction
     * @param from Sender address
     * @param to Receiver address
     * @param amount Amount to transfer
     * @param nonce Sender nonce
     * @param gasLimit Gas limit
     * @param gasPrice Gas price
     * @returns Transfer transaction object
     */
    createTransferTx(from, to, amount, nonce, gasLimit, gasPrice) {
        return {
            type: 'transfer',
            from,
            to,
            amount,
            nonce,
            gasLimit,
            gasPrice
        };
    }
    /**
     * Create a post transaction
     * @param from Sender address
     * @param postId Unique post identifier
     * @param contentHash Hash of the post content
     * @param pointer Optional pointer to off-chain content
     * @param nonce Sender nonce
     * @param gasLimit Gas limit
     * @param gasPrice Gas price
     * @returns Post transaction object
     */
    createPostTx(from, postId, contentHash, pointer, nonce, gasLimit, gasPrice) {
        return {
            type: 'post',
            from,
            postId,
            contentHash,
            pointer,
            nonce,
            gasLimit,
            gasPrice
        };
    }
    /**
     * Create a reputation transaction
     * @param from Sender address
     * @param target Target address
     * @param delta Reputation change amount
     * @param reason Optional reason for reputation change
     * @param nonce Sender nonce
     * @param gasLimit Gas limit
     * @param gasPrice Gas price
     * @returns Reputation transaction object
     */
    createRepTx(from, target, delta, reason, nonce, gasLimit, gasPrice) {
        return {
            type: 'rep',
            from,
            target,
            delta,
            reason,
            nonce,
            gasLimit,
            gasPrice
        };
    }
    /**
     * Create a contract deployment transaction
     * @param from Sender address
     * @param bytecode Contract bytecode
     * @param value Optional ETH value to send to constructor
     * @param constructorArgs Optional constructor arguments
     * @param nonce Sender nonce
     * @param gasLimit Gas limit
     * @param gasPrice Gas price
     * @returns Deploy transaction object
     */
    createDeployTx(from, bytecode, value, constructorArgs, nonce, gasLimit, gasPrice) {
        return {
            type: 'deploy',
            from,
            bytecode,
            value,
            constructorArgs,
            nonce,
            gasLimit,
            gasPrice
        };
    }
    /**
     * Create a contract call transaction
     * @param from Sender address
     * @param to Contract address
     * @param data Function call data
     * @param value Optional ETH value to send with call
     * @param nonce Sender nonce
     * @param gasLimit Gas limit
     * @param gasPrice Gas price
     * @returns Call transaction object
     */
    createCallTx(from, to, data, value, nonce, gasLimit, gasPrice) {
        return {
            type: 'call',
            from,
            to,
            data,
            value,
            nonce,
            gasLimit,
            gasPrice
        };
    }
    /**
     * Wait for a transaction to be confirmed
     * @param txHash Transaction hash
     * @param timeout Maximum time to wait in milliseconds
     * @param pollInterval Polling interval in milliseconds
     * @returns Transaction receipt when confirmed
     */
    async waitForTransaction(txHash, timeout = 30000, pollInterval = 1000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            const receipt = await this.getTransactionReceipt(txHash);
            if (receipt) {
                return receipt;
            }
            // Wait before polling again
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        return null;
    }
    /**
     * Deploy a smart contract
     * @param from Sender address
     * @param bytecode Contract bytecode
     * @param signedTx Signed deployment transaction
     * @returns Contract address if successful
     */
    async deployContract(from, bytecode, signedTx) {
        const txHash = await this.submitTransaction(signedTx);
        if (!txHash) {
            return null;
        }
        const receipt = await this.waitForTransaction(txHash);
        if (!receipt || !receipt.success) {
            return null;
        }
        return receipt.contractAddress || null;
    }
    /**
     * Call a smart contract function
     * @param signedTx Signed call transaction
     * @returns Function call result
     */
    async callContract(signedTx) {
        const txHash = await this.submitTransaction(signedTx);
        if (!txHash) {
            return null;
        }
        const receipt = await this.waitForTransaction(txHash);
        if (!receipt || !receipt.success) {
            return null;
        }
        return receipt.returnData || null;
    }
    /**
     * Deserialize block data with BigInt values
     */
    deserializeBlock(data) {
        if (!data)
            return data;
        return {
            ...data,
            header: {
                ...data.header,
                gasUsed: BigInt(data.header.gasUsed),
                gasLimit: BigInt(data.header.gasLimit),
                baseFeePerGas: BigInt(data.header.baseFeePerGas)
            }
        };
    }
    /**
     * Deserialize account data with BigInt values
     */
    deserializeAccount(data) {
        if (!data)
            return data;
        return {
            ...data,
            balance: BigInt(data.balance)
        };
    }
    /**
     * Deserialize receipt data with BigInt values
     */
    deserializeReceipt(data) {
        if (!data)
            return data;
        return {
            ...data,
            gasUsed: BigInt(data.gasUsed)
        };
    }
}

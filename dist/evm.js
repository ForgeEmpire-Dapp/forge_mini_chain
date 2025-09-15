/**
 * @fileoverview EVM manager for smart contract execution and state management
 */
import { EVM } from '@ethereumjs/evm';
import { Common, Mainnet, Hardfork } from '@ethereumjs/common';
import { Address, bytesToHex, hexToBytes } from '@ethereumjs/util';
import { ErrorHandler } from './errors.js';
import { keccak256 } from './crypto.js';
/**
 * EVM Manager for smart contract operations
 */
export class EVMManager {
    config;
    state;
    evm;
    common;
    errorHandler;
    // Contract storage and code
    contractStorage = new Map();
    contractCode = new Map();
    constructor(config, state) {
        this.config = config;
        this.state = state;
        this.errorHandler = ErrorHandler.getInstance();
        // Initialize EthereumJS Common with mainnet configuration
        this.common = new Common({ chain: Mainnet, hardfork: Hardfork.London });
        // Initialize EVM
        this.evm = new EVM({
            common: this.common,
        });
    }
    /**
     * Deploy a smart contract
     */
    async deployContract(tx, blockContext) {
        try {
            console.log(`[evm] Deploying contract from ${tx.from}`);
            // Calculate contract address
            const deployerAccount = this.state.getOrCreate(tx.from);
            const contractAddress = this.calculateContractAddress(tx.from, deployerAccount.nonce);
            // Create deployer address
            const deployerAddress = new Address(hexToBytes(tx.from));
            // Prepare deployment data
            let deploymentData = tx.bytecode;
            if (tx.constructorArgs) {
                deploymentData = tx.bytecode + tx.constructorArgs.replace('0x', '');
            }
            // Execute deployment
            const result = await this.evm.runCall({
                caller: deployerAddress,
                to: undefined, // Contract deployment
                data: hexToBytes(deploymentData),
                value: tx.value || 0n,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                block: {
                    header: {
                        number: BigInt(blockContext.height),
                        coinbase: new Address(new Uint8Array(20)),
                        timestamp: BigInt(Math.floor(Date.now() / 1000)),
                        difficulty: 1n,
                        prevRandao: new Uint8Array(32),
                        gasLimit: this.config.blockGasLimit,
                        baseFeePerGas: this.config.baseFeePerGas,
                        getBlobGasPrice: () => undefined
                    }
                }
            });
            if (result.execResult.exceptionError) {
                return {
                    success: false,
                    gasUsed: result.execResult.executionGasUsed,
                    error: result.execResult.exceptionError?.error?.toString() || 'Execution failed',
                    returnData: '0x'
                };
            }
            // Store contract code and initialize storage
            const contractCode = bytesToHex(result.execResult.returnValue);
            this.contractCode.set(contractAddress, contractCode);
            this.contractStorage.set(contractAddress, {});
            // Create contract account in our state
            const contractAccount = {
                balance: tx.value || 0n,
                nonce: 0,
                rep: 0,
                codeHash: keccak256(Buffer.from(contractCode.replace('0x', ''), 'hex')),
                storageRoot: '0x' + '0'.repeat(64), // Empty storage root
                isContract: true,
                code: contractCode,
                storage: {}
            };
            this.state.accounts.set(contractAddress, contractAccount);
            console.log(`[evm] Contract deployed at ${contractAddress}`);
            return {
                success: true,
                gasUsed: result.execResult.executionGasUsed,
                returnData: contractCode,
                contractAddress,
                events: this.extractEvents(result.execResult.logs || [])
            };
        }
        catch (error) {
            this.errorHandler.logError(error, 'Contract Deployment', { from: tx.from });
            return {
                success: false,
                gasUsed: 21000n,
                error: error.message,
                returnData: '0x'
            };
        }
    }
    /**
     * Call a smart contract function
     */
    async callContract(tx, blockContext) {
        try {
            console.log(`[evm] Calling contract ${tx.to} from ${tx.from}`);
            // Check if target is a contract
            const contractAccount = this.state.accounts.get(tx.to);
            if (!contractAccount?.isContract) {
                throw new Error(`Address ${tx.to} is not a contract`);
            }
            // Execute contract call
            const result = await this.evm.runCall({
                caller: new Address(hexToBytes(tx.from)),
                to: new Address(hexToBytes(tx.to)),
                data: hexToBytes(tx.data),
                value: tx.value,
                gasLimit: tx.gasLimit,
                gasPrice: tx.gasPrice,
                block: {
                    header: {
                        number: BigInt(blockContext.height),
                        coinbase: new Address(new Uint8Array(20)),
                        timestamp: BigInt(Math.floor(Date.now() / 1000)),
                        difficulty: 1n,
                        prevRandao: new Uint8Array(32),
                        gasLimit: this.config.blockGasLimit,
                        baseFeePerGas: this.config.baseFeePerGas,
                        getBlobGasPrice: () => undefined
                    }
                }
            });
            if (result.execResult.exceptionError) {
                return {
                    success: false,
                    gasUsed: result.execResult.executionGasUsed,
                    error: result.execResult.exceptionError?.error?.toString() || 'Execution failed',
                    returnData: '0x'
                };
            }
            return {
                success: true,
                gasUsed: result.execResult.executionGasUsed,
                returnData: bytesToHex(result.execResult.returnValue),
                events: this.extractEvents(result.execResult.logs || [])
            };
        }
        catch (error) {
            this.errorHandler.logError(error, 'Contract Call', { from: tx.from, to: tx.to });
            return {
                success: false,
                gasUsed: 25000n,
                error: error.message,
                returnData: '0x'
            };
        }
    }
    /**
     * Get contract code
     */
    getContractCode(address) {
        return this.contractCode.get(address) || null;
    }
    /**
     * Get contract storage value
     */
    getContractStorage(address, key) {
        const storage = this.contractStorage.get(address);
        return storage?.[key] || null;
    }
    /**
     * Set contract storage value
     */
    setContractStorage(address, key, value) {
        if (!this.contractStorage.has(address)) {
            this.contractStorage.set(address, {});
        }
        this.contractStorage.get(address)[key] = value;
    }
    /**
     * Calculate contract address for deployment
     */
    calculateContractAddress(deployer, nonce) {
        // Ethereum-style contract address calculation
        const deployerBytes = Buffer.from(deployer.replace('0x', ''), 'hex');
        const nonceBytes = Buffer.from([nonce]); // Simplified nonce encoding
        const combined = Buffer.concat([deployerBytes, nonceBytes]);
        const hash = keccak256(combined);
        return '0x' + hash.slice(-40); // Last 20 bytes
    }
    /**
     * Extract events from EVM logs
     */
    extractEvents(logs) {
        return logs.map(log => ({
            topics: log.topics.map((topic) => bytesToHex(topic)),
            data: bytesToHex(log.data)
        }));
    }
    /**
     * Get EVM statistics
     */
    getStats() {
        return {
            contractCount: this.contractCode.size,
            storageEntries: Array.from(this.contractStorage.values())
                .reduce((total, storage) => total + Object.keys(storage).length, 0)
        };
    }
}

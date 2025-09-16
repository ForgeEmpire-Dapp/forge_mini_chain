import { EVM } from '@ethereumjs/evm';
import { Common, Hardfork } from '@ethereumjs/common';
import { Address, bytesToHex, hexToBytes } from '@ethereumjs/util';
import { ErrorHandler } from './errors.js';
import { keccak256 } from './crypto.js';
import { evmContractCounter } from './metrics.js';
import logger from './logger.js';
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
        this.common = Common.custom({
            chainId: 1,
            networkId: 1,
            name: 'mainnet',
            genesis: {
                gasLimit: 30000000,
                difficulty: 1,
                nonce: '0x0000000000000042',
                extraData: '0x3535353535353535353535353535353535353535353535353535353535353535',
                timestamp: '0x00',
                baseFeePerGas: '0x3b9aca00'
            },
            hardforks: [
                { name: 'chainstart', block: 0 },
                { name: 'homestead', block: 1150000 },
                { name: 'dao', block: 1920000 },
                { name: 'tangerineWhistle', block: 2463000 },
                { name: 'spuriousDragon', block: 2675000 },
                { name: 'byzantium', block: 4370000 },
                { name: 'constantinople', block: 7280000 },
                { name: 'petersburg', block: 7280000 },
                { name: 'istanbul', block: 9069000 },
                { name: 'muirGlacier', block: 9200000 },
                { name: 'berlin', block: 12244000 },
                { name: 'london', block: 12965000 },
                { name: 'arrowGlacier', block: 13773000 },
                { name: 'grayGlacier', block: 15050000 },
                { name: 'mergeForkIdTransition', block: 15537394 },
                { name: 'shanghai', block: 17034870 },
                { name: 'cancun', block: null }
            ],
            bootstrapNodes: [],
            consensus: {
                type: 'pow',
                algorithm: 'ethash',
                ethash: {}
            }
        }, { hardfork: Hardfork.London });
        // Initialize EVM using the async create method
        this.initializeEVM().catch(error => {
            logger.error('Failed to initialize EVM', { error: error.message });
        });
    }
    /**
     * Initialize EVM asynchronously
     */
    async initializeEVM() {
        this.evm = await EVM.create({
            common: this.common,
        });
    }
    /**
     * Deploy a smart contract
     */
    async deployContract(tx, blockContext) {
        try {
            // Wait for EVM to be initialized
            if (!this.evm) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!this.evm) {
                    throw new Error('EVM not initialized');
                }
            }
            logger.info('Deploying contract', { from: tx.from });
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
                        cliqueSigner: () => new Address(new Uint8Array(20)),
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
                logger.error('Contract deployment failed', {
                    from: tx.from,
                    error: result.execResult.exceptionError?.error?.toString()
                });
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
                forgeBalance: tx.value || 0n,
                nonce: 0,
                rep: 0,
                codeHash: keccak256(Buffer.from(contractCode.replace('0x', ''), 'hex')),
                storageRoot: '0x' + '0'.repeat(64), // Empty storage root
                isContract: true,
                code: contractCode,
                storage: {}
            };
            this.state.accounts.set(contractAddress, contractAccount);
            // Update metrics
            evmContractCounter.set(this.contractCode.size);
            logger.info('Contract deployed successfully', {
                from: tx.from,
                contractAddress,
                gasUsed: result.execResult.executionGasUsed
            });
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
            logger.error('Contract deployment error', {
                from: tx.from,
                error: error.message,
                stack: error.stack
            });
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
            // Wait for EVM to be initialized
            if (!this.evm) {
                await new Promise(resolve => setTimeout(resolve, 100));
                if (!this.evm) {
                    throw new Error('EVM not initialized');
                }
            }
            logger.info('Calling contract', { from: tx.from, to: tx.to });
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
                        cliqueSigner: () => new Address(new Uint8Array(20)),
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
                logger.error('Contract call failed', {
                    from: tx.from,
                    to: tx.to,
                    error: result.execResult.exceptionError?.error?.toString()
                });
                return {
                    success: false,
                    gasUsed: result.execResult.executionGasUsed,
                    error: result.execResult.exceptionError?.error?.toString() || 'Execution failed',
                    returnData: '0x'
                };
            }
            logger.info('Contract call executed successfully', {
                from: tx.from,
                to: tx.to,
                gasUsed: result.execResult.executionGasUsed
            });
            return {
                success: true,
                gasUsed: result.execResult.executionGasUsed,
                returnData: bytesToHex(result.execResult.returnValue),
                events: this.extractEvents(result.execResult.logs || [])
            };
        }
        catch (error) {
            this.errorHandler.logError(error, 'Contract Call', { from: tx.from, to: tx.to });
            logger.error('Contract call error', {
                from: tx.from,
                to: tx.to,
                error: error.message,
                stack: error.stack
            });
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

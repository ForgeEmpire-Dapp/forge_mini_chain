/**
 * @fileoverview EVM manager for smart contract execution and state management
 */
import { EVM } from '@ethereumjs/evm';
import { Common, Mainnet, Hardfork } from '@ethereumjs/common';
import { Account as EVMAccount, Address, bytesToHex, hexToBytes } from '@ethereumjs/util';

import { 
  DeployTx, 
  CallTx, 
  EVMResult, 
  ContractAccount, 
  Account, 
  Hex, 
  ChainConfig,
  TxExecutionResult,
  ContractStorage
} from './types.js';
import { State } from './state.js';
import { ErrorHandler } from './errors.js';
import { keccak256 } from './crypto.js';
import { evmContractCounter } from './metrics.js';
import logger from './logger.js';

/**
 * EVM Manager for smart contract operations
 */
export class EVMManager {
  private evm: EVM;
  private common: Common;
  private errorHandler: ErrorHandler;
  
  // Contract storage and code
  private contractStorage: Map<string, ContractStorage> = new Map();
  private contractCode: Map<string, Hex> = new Map();

  constructor(private config: ChainConfig, private state: State) {
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
  async deployContract(tx: DeployTx, blockContext: any): Promise<TxExecutionResult> {
    try {
      logger.info('Deploying contract', { from: tx.from });
      
      // Calculate contract address
      const deployerAccount = this.state.getOrCreate(tx.from);
      const contractAddress = this.calculateContractAddress(tx.from, deployerAccount.nonce);
      
      // Create deployer address
      const deployerAddress = new Address(hexToBytes(tx.from as `0x${string}`));
      
      // Prepare deployment data
      let deploymentData = tx.bytecode;
      if (tx.constructorArgs) {
        deploymentData = tx.bytecode + tx.constructorArgs.replace('0x', '');
      }

      // Execute deployment
      const result = await this.evm.runCall({
        caller: deployerAddress,
        to: undefined, // Contract deployment
        data: hexToBytes(deploymentData as `0x${string}`),
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
      const contractAccount: ContractAccount = {
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

    } catch (error) {
      this.errorHandler.logError(error as Error, 'Contract Deployment', { from: tx.from });
      logger.error('Contract deployment error', { 
        from: tx.from,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      return {
        success: false,
        gasUsed: 21000n,
        error: (error as Error).message,
        returnData: '0x'
      };
    }
  }

  /**
   * Call a smart contract function
   */
  async callContract(tx: CallTx, blockContext: any): Promise<TxExecutionResult> {
    try {
      logger.info('Calling contract', { from: tx.from, to: tx.to });
      
      // Check if target is a contract
      const contractAccount = this.state.accounts.get(tx.to);
      if (!contractAccount?.isContract) {
        throw new Error(`Address ${tx.to} is not a contract`);
      }

      // Execute contract call
      const result = await this.evm.runCall({
        caller: new Address(hexToBytes(tx.from as `0x${string}`)),
        to: new Address(hexToBytes(tx.to as `0x${string}`)),
        data: hexToBytes(tx.data as `0x${string}`),
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

    } catch (error) {
      this.errorHandler.logError(error as Error, 'Contract Call', { from: tx.from, to: tx.to });
      logger.error('Contract call error', { 
        from: tx.from,
        to: tx.to,
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      
      return {
        success: false,
        gasUsed: 25000n,
        error: (error as Error).message,
        returnData: '0x'
      };
    }
  }

  /**
   * Get contract code
   */
  getContractCode(address: string): Hex | null {
    return this.contractCode.get(address) || null;
  }

  /**
   * Get contract storage value
   */
  getContractStorage(address: string, key: Hex): Hex | null {
    const storage = this.contractStorage.get(address);
    return storage?.[key] || null;
  }

  /**
   * Set contract storage value
   */
  setContractStorage(address: string, key: Hex, value: Hex): void {
    if (!this.contractStorage.has(address)) {
      this.contractStorage.set(address, {});
    }
    this.contractStorage.get(address)![key] = value;
  }

  /**
   * Calculate contract address for deployment
   */
  private calculateContractAddress(deployer: string, nonce: number): string {
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
  private extractEvents(logs: any[]): Array<{ topics: Hex[]; data: Hex }> {
    return logs.map(log => ({
      topics: log.topics.map((topic: Uint8Array) => bytesToHex(topic)),
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
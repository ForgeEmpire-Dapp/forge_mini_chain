/**
 * @fileoverview Forge Empire JavaScript/TypeScript SDK
 */
/**
 * Account information
 */
export interface Account {
    balance: bigint;
    nonce: number;
    rep: number;
    codeHash?: string;
    storageRoot?: string;
    isContract?: boolean;
}
/**
 * Block header information
 */
export interface BlockHeader {
    height: number;
    prevHash: string;
    timestamp: number;
    txRoot: string;
    proposer: string;
    gasUsed: bigint;
    gasLimit: bigint;
    baseFeePerGas: bigint;
}
/**
 * Block information
 */
export interface Block {
    header: BlockHeader;
    txs: any[];
    signature: string;
    hash: string;
}
/**
 * Transaction receipt
 */
export interface TransactionReceipt {
    success: boolean;
    gasUsed: bigint;
    error?: string;
    returnData?: string;
    events?: Array<{
        topics: string[];
        data: string;
    }>;
    contractAddress?: string;
}
/**
 * Contract information
 */
export interface ContractInfo {
    code: string;
}
/**
 * Contract storage information
 */
export interface ContractStorage {
    value: string;
}
/**
 * EVM statistics
 */
export interface EVMStats {
    contractCount: number;
    storageEntries: number;
}
/**
 * Base transaction structure
 */
export interface BaseTx {
    type: string;
    nonce: number;
    from: string;
    gasLimit: bigint;
    gasPrice: bigint;
    data?: string;
}
/**
 * Transfer transaction
 */
export interface TransferTx extends BaseTx {
    type: 'transfer';
    to: string;
    amount: bigint;
}
/**
 * Post transaction
 */
export interface PostTx extends BaseTx {
    type: 'post';
    postId: string;
    contentHash: string;
    pointer?: string;
}
/**
 * Reputation transaction
 */
export interface RepTx extends BaseTx {
    type: 'rep';
    target: string;
    delta: number;
    reason?: string;
}
/**
 * Deploy contract transaction
 */
export interface DeployTx extends BaseTx {
    type: 'deploy';
    bytecode: string;
    value?: bigint;
    constructorArgs?: string;
}
/**
 * Call contract transaction
 */
export interface CallTx extends BaseTx {
    type: 'call';
    to: string;
    value: bigint;
    data: string;
}
/**
 * Any transaction type
 */
export type Tx = TransferTx | PostTx | RepTx | DeployTx | CallTx;
/**
 * Signed transaction
 */
export interface SignedTx {
    tx: Tx;
    signature: string;
    pubkey: string;
    hash: string;
}
/**
 * Forge Empire SDK for interacting with the blockchain
 */
export declare class ForgeEmpireSDK {
    private api;
    /**
     * Create a new SDK instance
     * @param baseURL The base URL of the blockchain API
     */
    constructor(baseURL: string);
    /**
     * Check if the node is healthy
     * @returns True if healthy, false otherwise
     */
    isHealthy(): Promise<boolean>;
    /**
     * Get the latest block
     * @returns The latest block or null if not available
     */
    getHead(): Promise<Block | null>;
    /**
     * Get account information
     * @param address The account address
     * @returns Account information or null if not found
     */
    getAccount(address: string): Promise<Account | null>;
    /**
     * Get EVM statistics
     * @returns EVM statistics
     */
    getEVMStats(): Promise<EVMStats | null>;
    /**
     * Get contract code
     * @param address The contract address
     * @returns Contract code or null if not found
     */
    getContractCode(address: string): Promise<string | null>;
    /**
     * Get contract storage value
     * @param address The contract address
     * @param key The storage key
     * @returns Storage value or null if not found
     */
    getContractStorage(address: string, key: string): Promise<string | null>;
    /**
     * Get transaction receipt
     * @param txHash The transaction hash
     * @returns Transaction receipt or null if not found
     */
    getTransactionReceipt(txHash: string): Promise<TransactionReceipt | null>;
    /**
     * Submit a signed transaction
     * @param signedTx The signed transaction
     * @returns Transaction hash if successful
     */
    submitTransaction(signedTx: SignedTx): Promise<string | null>;
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
    createTransferTx(from: string, to: string, amount: bigint, nonce: number, gasLimit: bigint, gasPrice: bigint): TransferTx;
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
    createPostTx(from: string, postId: string, contentHash: string, pointer: string | undefined, nonce: number, gasLimit: bigint, gasPrice: bigint): PostTx;
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
    createRepTx(from: string, target: string, delta: number, reason: string | undefined, nonce: number, gasLimit: bigint, gasPrice: bigint): RepTx;
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
    createDeployTx(from: string, bytecode: string, value: bigint | undefined, constructorArgs: string | undefined, nonce: number, gasLimit: bigint, gasPrice: bigint): DeployTx;
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
    createCallTx(from: string, to: string, data: string, value: bigint, nonce: number, gasLimit: bigint, gasPrice: bigint): CallTx;
    /**
     * Wait for a transaction to be confirmed
     * @param txHash Transaction hash
     * @param timeout Maximum time to wait in milliseconds
     * @param pollInterval Polling interval in milliseconds
     * @returns Transaction receipt when confirmed
     */
    waitForTransaction(txHash: string, timeout?: number, pollInterval?: number): Promise<TransactionReceipt | null>;
    /**
     * Deploy a smart contract
     * @param from Sender address
     * @param bytecode Contract bytecode
     * @param signedTx Signed deployment transaction
     * @returns Contract address if successful
     */
    deployContract(from: string, bytecode: string, signedTx: SignedTx): Promise<string | null>;
    /**
     * Call a smart contract function
     * @param signedTx Signed call transaction
     * @returns Function call result
     */
    callContract(signedTx: SignedTx): Promise<string | null>;
    /**
     * Deserialize block data with BigInt values
     */
    private deserializeBlock;
    /**
     * Deserialize account data with BigInt values
     */
    private deserializeAccount;
    /**
     * Deserialize receipt data with BigInt values
     */
    private deserializeReceipt;
}

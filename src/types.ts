/**
 * @fileoverview This file contains all the type definitions for the blockchain application.
 */
/**
 * A hexadecimal string, typically prefixed with "0x".
 */
export type Hex = string; // "0x..."

/**
 * Represents a key pair, including public and private keys and the corresponding address.
 */
export type KeyPair = {
    publicKey: Hex;
    privateKey: Hex;
    address: string; // 0x... ETH-style address
  };


/**
 * The base structure for all transaction types.
 */
export type TxBase = {
type: "transfer" | "post" | "rep" | "deploy" | "call";
nonce: number; // per-sender monotonic
from: string; // address (0x...)
gasLimit: bigint; // maximum gas willing to use
gasPrice: bigint; // price per gas unit in wei
data?: Hex; // for smart contracts and general data
};


/**
 * A transaction for transferring an amount from one account to another.
 */
export type TransferTx = TxBase & { type: "transfer"; to: string; amount: bigint };
/**
 * A transaction for creating a new post.
 */
export type PostTx = TxBase & { type: "post"; postId: string; // UUID or snowflake
contentHash: Hex; // sha256 of post JSON or media manifest
pointer?: string; // ipfs://... or https://...
};
/**
 * A transaction for adjusting the reputation of a target account.
 */
export type RepTx = TxBase & { type: "rep"; target: string; delta: number; reason?: string };

/**
 * A transaction for deploying a smart contract.
 */
export type DeployTx = TxBase & { 
  type: "deploy"; 
  bytecode: Hex; // contract bytecode
  value?: bigint; // ETH to send to contract constructor
  constructorArgs?: Hex; // ABI-encoded constructor arguments
};

/**
 * A transaction for calling a smart contract.
 */
export type CallTx = TxBase & { 
  type: "call"; 
  to: string; // contract address
  value: bigint; // ETH to send with call
  data: Hex; // function call data (method signature + parameters)
};


/**
 * A union type representing any possible transaction.
 */
export type Tx = TransferTx | PostTx | RepTx | DeployTx | CallTx;


/**
 * A transaction that has been signed.
 */
export type SignedTx = {
tx: Tx;
signature: Hex; // Ed25519 signature
pubkey: Hex; // needed for recoverless verification
hash: Hex; // sha256(tx bytes)
};


/**
 * Enhanced block header with gas tracking
 */
export type BlockHeader = {
height: number;
prevHash: Hex;
timestamp: number; // ms
txRoot: Hex;
proposer: string; // address of node that built the block
gasUsed: bigint; // total gas used in this block
gasLimit: bigint; // maximum gas allowed in this block
baseFeePerGas: bigint; // base fee for this block
};


/**
 * A block in the blockchain, containing a header and a list of transactions.
 */
export type Block = {
header: BlockHeader;
txs: SignedTx[];
signature: Hex; // leader signature over header hash
hash: Hex; // sha256(header + signature)
};


/**
 * Configuration for the blockchain network.
 */
export type ChainConfig = {
chainId: string;
blockTimeMs: number;
isLeader: boolean;
leaderWsURL?: string; // for followers
p2pPort: number; // ws port
apiPort: number; // http api
dataDir: string; // for persistence
keypairFile: string; // local key storage
// Gas mechanism
blockGasLimit: bigint; // maximum gas per block
minGasPrice: bigint; // minimum gas price
baseFeePerGas: bigint; // base fee for transactions
// Native token configuration
blockReward: bigint;      // FORGE tokens per block
initialSupply: bigint;    // Initial token supply in wei
supplyCap: bigint;        // Maximum token supply in wei
};


/**
 * Represents a user account or smart contract in the blockchain state.
 */
export type Account = {
forgeBalance: bigint;
nonce: number;
rep: number;
codeHash?: Hex; // for contract accounts - hash of the contract code
storageRoot?: Hex; // for contract storage - root of the storage trie
isContract?: boolean; // flag to identify contract accounts
};


/**
 * The overall state of the application, including all accounts and posts.
 */
export type AppState = {
accounts: Map<string, Account>;
posts: Map<string, { owner: string; contentHash: Hex; pointer?: string; block: number }>; // postId->data
};

/**
 * Result of transaction validation
 */
export type ValidationResult = {
valid: boolean;
error?: string;
requiredGas?: bigint;
fee?: bigint;
feeFormatted?: string;
};

/**
 * Gas calculation and management types
 */
export type GasCost = {
base: bigint; // base cost for transaction type
data: bigint; // cost for data bytes
total: bigint; // total gas required
};

/**
 * Transaction execution result
 */
export type TxExecutionResult = {
success: boolean;
gasUsed: bigint;
error?: string;
returnData?: Hex;
events?: Array<{ topics: Hex[]; data: Hex }>;
contractAddress?: string; // For contract deployment
createdAddresses?: string[]; // Addresses created during execution
destructedAddresses?: string[]; // Addresses destructed during execution
};

/**
 * EVM execution result with detailed information
 */
export type EVMResult = {
success: boolean;
returnValue: Hex;
gasUsed: bigint;
exceptionError?: Error;
runState?: {
  programCounter: number;
  opCode: Hex;
  gasLeft: bigint;
  stack: Hex[];
  memory: Hex;
  memoryWordCount: number;
};
logs: Array<{
  address: Hex;
  topics: Hex[];
  data: Hex;
}>;
contractAddress?: Hex;
};

/**
 * Smart contract storage state
 */
export type ContractStorage = {
  [key: string]: Hex; // storage slot -> value
};

/**
 * Contract account extended information
 */
export type ContractAccount = Account & {
  code: Hex; // Contract bytecode
  storage: ContractStorage; // Contract storage
  isContract: true;
};
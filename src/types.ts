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
type: "transfer" | "post" | "rep";
nonce: number; // per-sender monotonic
from: string; // address (0x...)
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
 * A union type representing any possible transaction.
 */
export type Tx = TransferTx | PostTx | RepTx;


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
 * The header of a block in the blockchain.
 */
export type BlockHeader = {
height: number;
prevHash: Hex;
timestamp: number; // ms
txRoot: Hex;
proposer: string; // address of node that built the block
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
};


/**
 * Represents a user account in the blockchain state.
 */
export type Account = {
balance: bigint;
nonce: number;
rep: number;
};


/**
 * The overall state of the application, including all accounts and posts.
 */
export type AppState = {
accounts: Map<string, Account>;
posts: Map<string, { owner: string; contentHash: Hex; pointer?: string; block: number }>; // postId->data
};
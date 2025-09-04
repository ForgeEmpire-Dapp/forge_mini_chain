/**
 * @fileoverview This file defines the Blockchain class, which is the core of the blockchain implementation.
 * It manages the chain of blocks, the mempool of pending transactions, and the state of the blockchain.
 */
import fs from "node:fs";
import path from "node:path";
import { Block, ChainConfig, SignedTx } from "./types.js";
import { State, applyBlock } from "./state.js";
import { buildBlock } from "./block.js";
import { verifySignedTx } from "./tx.js";


/**
 * The main class representing the blockchain.
 */
export class Blockchain {
public chain: Block[] = [];
public mempool: SignedTx[] = [];
public state: State = new State();


/**
 * Constructs a new Blockchain instance.
 * @param cfg The chain configuration.
 * @param keys The key pair for the node.
 */
constructor(private cfg: ChainConfig, private keys: { pub: string; priv: string; address: string }) {}


/**
 * Gets the latest block in the chain.
 */
get head(): Block | undefined { return this.chain[this.chain.length - 1]; }


/**
 * Adds a signed transaction to the mempool after verifying its signature.
 * @param stx The signed transaction to add.
 * @throws An error if the transaction signature is invalid.
 */
addTx(stx: SignedTx) {
if (!verifySignedTx(stx, this.cfg.chainId)) throw new Error("invalid tx signature");
this.mempool.push(stx);
}


/**
 * Adds a block to the chain after performing basic validation.
 * @param b The block to add.
 * @throws An error if the previous hash does not match or if a transaction signature is invalid.
 */
addBlock(b: Block) {
// basic link check
if (this.head && this.head.hash !== b.header.prevHash) throw new Error("prevHash mismatch");
for (const tx of b.txs) {
if (!verifySignedTx(tx, this.cfg.chainId)) throw new Error("invalid tx signature in block");
}
this.chain.push(b);
applyBlock(this.state, b);
this.persistBlock(b);
}


/**
 * Builds the next block from the transactions in the mempool.
 * @returns The newly built block.
 */
buildNextBlock(): Block {
const txs = this.mempool.splice(0, 500); // batch
const height = (this.head?.header.height ?? -1) + 1;
const prev = this.head?.hash ?? "0x00";
return buildBlock(height, prev, this.keys.address, this.keys.priv, txs);
}


// ─── Persistence (JSONL) ────────────────────────────────────────────────
/**
 * Persists a block to the filesystem in JSONL format.
 * @param b The block to persist.
 */
persistBlock(b: Block) {
const dir = path.join(this.cfg.dataDir, this.cfg.chainId);
fs.mkdirSync(dir, { recursive: true });
fs.appendFileSync(path.join(dir, "blocks.jsonl"), JSON.stringify(b) + "\n");
}
}
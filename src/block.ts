/**
 * @fileoverview This file contains functions for creating and verifying blocks, including Merkle root
 * calculation, block header hashing, and block signing.
 */
import { Block, BlockHeader, SignedTx } from "./types.js";
import { sha256, signEd25519, verifyEd25519 } from "./crypto.js";


/**
 * Calculates the Merkle root for a given array of transaction hashes.
 * @param txHashes An array of transaction hashes.
 * @returns The Merkle root as a hexadecimal string.
 */
export function merkleRoot(txHashes: string[]): string {
if (txHashes.length === 0) return sha256("");
let layer = txHashes.map((h) => h);
while (layer.length > 1) {
const next: string[] = [];
for (let i = 0; i < layer.length; i += 2) {
const a = layer[i];
const b = layer[i + 1] || layer[i];
next.push(sha256(Buffer.from(a + b)));
}
layer = next;
}
return layer[0];
}


/**
 * Computes the hash of a block header.
 * @param h The block header.
 * @returns The hash of the header as a hexadecimal string.
 */
export function headerHash(h: BlockHeader): string {
return sha256(Buffer.from(JSON.stringify(h)));
}


/**
 * Constructs a new block with gas tracking.
 * @param height The height of the block.
 * @param prevHash The hash of the previous block.
 * @param proposer The address of the block proposer.
 * @param proposerPriv The private key of the proposer.
 * @param txs An array of signed transactions to include in the block.
 * @param gasUsed Total gas used by all transactions.
 * @param gasLimit Maximum gas allowed in the block.
 * @param baseFeePerGas Base fee for this block.
 * @returns The newly created block.
 */
export function buildBlock(
height: number,
prevHash: string,
proposer: string,
proposerPriv: string,
txs: SignedTx[],
gasUsed: bigint = 0n,
gasLimit: bigint = 10000000n,
baseFeePerGas: bigint = 1000000000n
): Block {
const txRoot = merkleRoot(txs.map((t) => t.hash));
const header: BlockHeader = { 
  height, 
  prevHash, 
  timestamp: Date.now(), 
  txRoot, 
  proposer,
  gasUsed,
  gasLimit,
  baseFeePerGas
};
const sig = signEd25519(proposerPriv, Buffer.from(headerHash(header)));
const hash = sha256(Buffer.from(JSON.stringify({ header, signature: sig })));
return { header, txs, signature: sig, hash };
}


/**
 * Verifies the signature of a block.
 * @param b The block to verify.
 * @param proposerPub The public key of the proposer.
 * @returns True if the block signature is valid, false otherwise.
 */
export function verifyBlock(b: Block, proposerPub: string): boolean {
const ok = verifyEd25519(proposerPub, Buffer.from(headerHash(b.header)), b.signature);
return ok;
}
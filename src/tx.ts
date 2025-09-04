/**
 * @fileoverview This file contains functions for handling transactions, including serialization, hashing,
 * signing, and verification.
 */
import { Hex, SignedTx, Tx } from "./types.js";
import { sha256, signEd25519, verifyEd25519 } from "./crypto.js";


/**
 * Serializes a transaction object into a Buffer for signing or hashing.
 * @param tx The transaction object.
 * @param chainId The ID of the blockchain.
 * @returns The serialized transaction as a Buffer.
 */
export function serializeTx(tx: Tx, chainId: string): Buffer {
const obj = { tx, chainId };
return Buffer.from(JSON.stringify(obj));
}
/**
 * Computes the hash of a transaction.
 * @param tx The transaction object.
 * @param chainId The ID of the blockchain.
 * @returns The transaction hash as a hexadecimal string.
 */
export function txHash(tx: Tx, chainId: string): Hex {
return sha256(serializeTx(tx, chainId));
}


/**
 * Signs a transaction with the given private key.
 * @param tx The transaction to sign.
 * @param chainId The ID of the blockchain.
 * @param privKey The private key to sign with.
 * @param pubKey The corresponding public key.
 * @returns The signed transaction.
 */
export function signTx(tx: Tx, chainId: string, privKey: Hex, pubKey: Hex): SignedTx {
const bytes = serializeTx(tx, chainId);
const signature = signEd25519(privKey, bytes);
return { tx, signature, pubkey: pubKey, hash: txHash(tx, chainId) };
}


/**
 * Verifies the signature of a signed transaction.
 * @param stx The signed transaction to verify.
 * @param chainId The ID of the blockchain.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifySignedTx(stx: SignedTx, chainId: string): boolean {
const bytes = serializeTx(stx.tx, chainId);
if (txHash(stx.tx, chainId) !== stx.hash) return false;
return verifyEd25519(stx.pubkey, bytes, stx.signature);
}


/**
 * Converts a transaction object to a Buffer.
 * @param tx The transaction object.
 * @returns The transaction as a Buffer.
 */
export function txToBytes(tx: Tx): Buffer {
return Buffer.from(JSON.stringify(tx));
}


/**
 * Reconstructs a transaction object from a Buffer.
 * @param bytes The buffer to parse.
 * @returns The transaction object.
 */
export function txFromBytes(bytes: Buffer): Tx {
return JSON.parse(bytes.toString());
}
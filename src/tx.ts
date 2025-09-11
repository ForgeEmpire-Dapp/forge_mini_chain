/**
 * @fileoverview This file contains functions for handling transactions, including serialization, hashing,
 * signing, and verification with support for multiple signature algorithms.
 */
import { Hex, SignedTx, Tx } from "./types.js";
import { sha256, signEd25519, verifyEd25519, signMessage, verifySignature, SignatureAlgorithm, addressFromPub } from "./crypto.js";


/**
 * Serializes a transaction object into a Buffer for signing or hashing.
 * @param tx The transaction object.
 * @param chainId The ID of the blockchain.
 * @returns The serialized transaction as a Buffer.
 */
export function serializeTx(tx: Tx, chainId: string): Buffer {
const obj = { tx, chainId };
// Convert BigInt values to strings for JSON serialization
const serializable = JSON.parse(JSON.stringify(obj, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
));
return Buffer.from(JSON.stringify(serializable));
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
 * Signs a transaction with the given private key and algorithm
 * @param tx The transaction to sign.
 * @param chainId The ID of the blockchain.
 * @param privKey The private key to sign with.
 * @param pubKey The corresponding public key.
 * @param algorithm The signature algorithm to use (default: ED25519).
 * @returns The signed transaction.
 */
export function signTx(
  tx: Tx, 
  chainId: string, 
  privKey: Hex, 
  pubKey: Hex, 
  algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519
): SignedTx {
  const bytes = serializeTx(tx, chainId);
  const signature = signMessage(privKey, bytes, algorithm);
  return { tx, signature, pubkey: pubKey, hash: txHash(tx, chainId) };
}


/**
 * Verifies the signature of a signed transaction.
 * @param stx The signed transaction to verify.
 * @param chainId The ID of the blockchain.
 * @param algorithm The signature algorithm used (default: ED25519).
 * @returns True if the signature is valid, false otherwise.
 */
export function verifySignedTx(
  stx: SignedTx, 
  chainId: string, 
  algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519
): boolean {
  const bytes = serializeTx(stx.tx, chainId);
  if (txHash(stx.tx, chainId) !== stx.hash) return false;
  
  // Determine algorithm from public key or use provided algorithm
  const actualAlgorithm = determineSignatureAlgorithm(stx.pubkey, algorithm);
  return verifySignature(stx.pubkey, bytes, stx.signature, actualAlgorithm);
}


/**
 * Converts a transaction object to a Buffer.
 * @param tx The transaction object.
 * @returns The transaction as a Buffer.
 */
export function txToBytes(tx: Tx): Buffer {
return Buffer.from(JSON.stringify(tx, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
));
}


/**
 * Reconstructs a transaction object from a Buffer.
 * @param bytes The buffer to parse.
 * @returns The transaction object.
 */
export function txFromBytes(bytes: Buffer): Tx {
return JSON.parse(bytes.toString());
}

/**
 * Determines the signature algorithm based on public key format
 * @param pubKey The public key in hexadecimal format
 * @param defaultAlgorithm The default algorithm to use
 * @returns The determined signature algorithm
 */
function determineSignatureAlgorithm(pubKey: Hex, defaultAlgorithm: SignatureAlgorithm): SignatureAlgorithm {
  // secp256k1 uncompressed public keys are 65 bytes (130 hex chars + 0x prefix)
  // Ed25519 public keys in DER format are typically longer due to ASN.1 encoding
  
  if (pubKey.length === 132) { // 0x + 130 hex chars = 65 bytes
    return SignatureAlgorithm.SECP256K1;
  }
  
  // For DER-encoded Ed25519 keys or when uncertain, use the default
  return defaultAlgorithm;
}
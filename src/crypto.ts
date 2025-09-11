/**
 * @fileoverview Enhanced cryptographic utility functions with ECDSA support for Ethereum compatibility
 */
import crypto, { KeyObject } from "node:crypto";
import * as secp256k1 from "secp256k1";
import keccak from "keccak";
import { Hex, KeyPair } from "./types";

/**
 * Signature algorithms supported
 */
export enum SignatureAlgorithm {
  ED25519 = "ed25519",
  SECP256K1 = "secp256k1"
}

/**
 * Enhanced KeyPair with algorithm information
 */
export interface EnhancedKeyPair extends KeyPair {
  algorithm: SignatureAlgorithm;
}


/**
 * Converts a Buffer or Uint8Array to a hexadecimal string representation.
 * @param buf The input buffer.
 * @returns The hexadecimal string.
 */
export function toHex(buf: Buffer | Uint8Array): Hex {
return "0x" + Buffer.from(buf).toString("hex");
}
/**
 * Converts a hexadecimal string to a Buffer.
 * @param hex The hexadecimal string.
 * @returns The buffer.
 */
export function fromHex(hex: Hex): Buffer {
return Buffer.from(hex.replace(/^0x/, ""), "hex");
}
/**
 * Computes the SHA256 hash of the given data.
 * @param data The data to hash.
 * @returns The hexadecimal representation of the hash.
 */
export function sha256(data: Buffer | string): Hex {
return toHex(crypto.createHash("sha256").update(data).digest());
}


/**
 * Generates a new key pair with specified algorithm
 * @param algorithm The signature algorithm to use
 * @param seed An optional seed for deterministic key generation
 * @returns The generated key pair
 */
export function generateKeyPair(algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519, seed?: Buffer): EnhancedKeyPair {
  if (algorithm === SignatureAlgorithm.SECP256K1) {
    return generateSecp256k1KeyPair(seed);
  } else {
    return generateEd25519KeyPair(seed);
  }
}

/**
 * Generates a new Ed25519 key pair (existing implementation)
 * @param seed An optional seed for deterministic key generation
 * @returns The generated key pair
 */
export function generateEd25519KeyPair(seed?: Buffer): EnhancedKeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        seed: seed
    });
    const pub = publicKey.export({ format: "der", type: "spki" }) as Buffer;
    const priv = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
    const pubHex = toHex(pub);
    const privHex = toHex(priv);
    const address = addressFromPub(pubHex, SignatureAlgorithm.ED25519);
    return { publicKey: pubHex, privateKey: privHex, address, algorithm: SignatureAlgorithm.ED25519 };
}

/**
 * Generates a new secp256k1 key pair for Ethereum compatibility
 * @param seed An optional seed for deterministic key generation
 * @returns The generated key pair
 */
export function generateSecp256k1KeyPair(seed?: Buffer): EnhancedKeyPair {
    // Generate random 32 bytes for private key
    let privateKeyBytes: Buffer;
    
    if (seed) {
        // Use seed to derive private key
        const hash = sha256(seed);
        privateKeyBytes = fromHex(hash);
    } else {
        // Generate random private key
        do {
            privateKeyBytes = crypto.randomBytes(32);
        } while (!isValidPrivateKey(privateKeyBytes));
    }
    
    const publicKey = secp256k1.publicKeyCreate(privateKeyBytes, false); // uncompressed
    
    const pubHex = toHex(publicKey);
    const privHex = toHex(privateKeyBytes);
    const address = addressFromPub(pubHex, SignatureAlgorithm.SECP256K1);
    
    return { publicKey: pubHex, privateKey: privHex, address, algorithm: SignatureAlgorithm.SECP256K1 };
}

/**
 * Check if a private key is valid for secp256k1
 * @param privateKey The private key bytes
 * @returns True if valid
 */
function isValidPrivateKey(privateKey: Buffer): boolean {
    // Private key must be between 1 and the secp256k1 curve order minus 1
    const keyBN = BigInt('0x' + privateKey.toString('hex'));
    const CURVE_ORDER = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141');
    return keyBN > 0n && keyBN < CURVE_ORDER;
}


/**
 * Signs a message using the specified algorithm
 * @param privateKeyHex The private key in hexadecimal format
 * @param msg The message to sign
 * @param algorithm The signature algorithm to use
 * @returns The signature in hexadecimal format
 */
export function signMessage(privateKeyHex: Hex, msg: Buffer, algorithm: SignatureAlgorithm): Hex {
  if (algorithm === SignatureAlgorithm.SECP256K1) {
    return signSecp256k1(privateKeyHex, msg);
  } else {
    return signEd25519(privateKeyHex, msg);
  }
}

/**
 * Signs a message using an Ed25519 private key.
 * @param privateKeyHex The private key in hexadecimal format.
 * @param msg The message to sign.
 * @returns The signature in hexadecimal format.
 */
export function signEd25519(privateKeyHex: Hex, msg: Buffer): Hex {
const keyObj = crypto.createPrivateKey({ key: fromHex(privateKeyHex), format: "der", type: "pkcs8" });
const sig = crypto.sign(null, msg, keyObj); // ed25519 ignores hash algo
return toHex(sig);
}

/**
 * Signs a message using a secp256k1 private key
 * @param privateKeyHex The private key in hexadecimal format
 * @param msg The message to sign
 * @returns The signature in hexadecimal format
 */
export function signSecp256k1(privateKeyHex: Hex, msg: Buffer): Hex {
  const privateKeyBytes = fromHex(privateKeyHex);
  const msgHash = sha256(msg); // Hash the message
  const hashBytes = fromHex(msgHash);
  const signature = secp256k1.ecdsaSign(hashBytes, privateKeyBytes);
  return toHex(signature.signature);
}


/**
 * Verifies a signature using the specified algorithm
 * @param publicKeyHex The public key in hexadecimal format
 * @param msg The original message
 * @param sigHex The signature to verify
 * @param algorithm The signature algorithm used
 * @returns True if the signature is valid, false otherwise
 */
export function verifySignature(publicKeyHex: Hex, msg: Buffer, sigHex: Hex, algorithm: SignatureAlgorithm): boolean {
  if (algorithm === SignatureAlgorithm.SECP256K1) {
    return verifySecp256k1(publicKeyHex, msg, sigHex);
  } else {
    return verifyEd25519(publicKeyHex, msg, sigHex);
  }
}

/**
 * Verifies an Ed25519 signature.
 * @param publicKeyHex The public key in hexadecimal format.
 * @param msg The original message.
 * @param sigHex The signature to verify.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyEd25519(publicKeyHex: Hex, msg: Buffer, sigHex: Hex): boolean {
const keyObj = crypto.createPublicKey({ key: fromHex(publicKeyHex), format: "der", type: "spki" });
return crypto.verify(null, msg, keyObj, fromHex(sigHex));
}

/**
 * Verifies a secp256k1 signature
 * @param publicKeyHex The public key in hexadecimal format
 * @param msg The original message
 * @param sigHex The signature to verify
 * @returns True if the signature is valid, false otherwise
 */
export function verifySecp256k1(publicKeyHex: Hex, msg: Buffer, sigHex: Hex): boolean {
  try {
    const publicKeyBytes = fromHex(publicKeyHex);
    const msgHash = sha256(msg); // Hash the message
    const hashBytes = fromHex(msgHash);
    const signatureBytes = fromHex(sigHex);
    return secp256k1.ecdsaVerify(signatureBytes, hashBytes, publicKeyBytes);
  } catch {
    return false;
  }
}


/**
 * Derives an address from a public key using the appropriate algorithm
 * @param pubHex The public key in hexadecimal format
 * @param algorithm The signature algorithm used
 * @returns The derived address
 */
export function addressFromPub(pubHex: Hex, algorithm: SignatureAlgorithm = SignatureAlgorithm.ED25519): string {
  if (algorithm === SignatureAlgorithm.SECP256K1) {
    return addressFromSecp256k1Pub(pubHex);
  } else {
    return addressFromEd25519Pub(pubHex);
  }
}

/**
 * Derives an address from an Ed25519 public key (existing implementation)
 * @param pubHex The public key in hexadecimal format
 * @returns The derived address
 */
export function addressFromEd25519Pub(pubHex: Hex): string {
  const h = sha256(fromHex(pubHex));
  return "0x" + h.slice(2, 42); // first 20 bytes
}

/**
 * Derives an Ethereum-compatible address from a secp256k1 public key
 * @param pubHex The uncompressed public key in hexadecimal format
 * @returns The derived Ethereum address
 */
export function addressFromSecp256k1Pub(pubHex: Hex): string {
  // Remove the 0x04 prefix for uncompressed public key
  const pubKeyBytes = fromHex(pubHex);
  const pubKeyWithoutPrefix = pubKeyBytes.slice(1); // Remove first byte (0x04)
  
  // Keccak256 hash of the public key (without prefix)
  const hash = keccak256(pubKeyWithoutPrefix);
  
  // Take last 20 bytes as Ethereum address
  return "0x" + hash.slice(-40);
}

/**
 * Keccak256 hash function (for Ethereum compatibility)
 * @param data The data to hash
 * @returns The hexadecimal representation of the hash
 */
export function keccak256(data: Buffer | Uint8Array): string {
  return keccak('keccak256').update(Buffer.from(data)).digest('hex');
}
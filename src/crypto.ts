/**
 * @fileoverview This file contains cryptographic utility functions for handling hexadecimal conversions,
 * hashing, key pair generation, signing, and verification.
 */
import crypto, { KeyObject } from "node:crypto";
import { Hex, KeyPair } from "./types";


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
 * Generates a new Ed25519 key pair.
 * @param seed An optional seed for deterministic key generation.
 * @returns The generated key pair.
 */
export function generateKeyPair(seed?: Buffer): KeyPair {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        seed: seed
    });
    const pub = publicKey.export({ format: "der", type: "spki" }) as Buffer;
    const priv = privateKey.export({ format: "der", type: "pkcs8" }) as Buffer;
    const pubHex = toHex(pub);
    const privHex = toHex(priv);
    const address = addressFromPub(pubHex);
    return { publicKey: pubHex, privateKey: privHex, address };
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
 * Derives an address from a public key.
 * @param pubHex The public key in hexadecimal format.
 * @returns The derived address.
 */
export function addressFromPub(pubHex: Hex): string {
const h = sha256(fromHex(pubHex));
return "0x" + h.slice(2, 42); // first 20 bytes
}
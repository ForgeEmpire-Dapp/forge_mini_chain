/**
 * @fileoverview Enhanced cryptographic utility functions with ECDSA support for Ethereum compatibility
 */
import crypto from "node:crypto";
import fs from "node:fs";
import * as secp256k1 from "secp256k1";
import keccak from "keccak";
/**
 * Signature algorithms supported
 */
export var SignatureAlgorithm;
(function (SignatureAlgorithm) {
    SignatureAlgorithm["ED25519"] = "ed25519";
    SignatureAlgorithm["SECP256K1"] = "secp256k1";
})(SignatureAlgorithm || (SignatureAlgorithm = {}));
/**
 * Converts a Buffer or Uint8Array to a hexadecimal string representation.
 * @param buf The input buffer.
 * @returns The hexadecimal string.
 */
export function toHex(buf) {
    return "0x" + Buffer.from(buf).toString("hex");
}
/**
 * Converts a hexadecimal string to a Buffer.
 * @param hex The hexadecimal string.
 * @returns The buffer.
 */
export function fromHex(hex) {
    // Handle undefined or null values
    if (hex === undefined || hex === null) {
        throw new Error('fromHex: hex value is undefined or null');
    }
    // Ensure hex is a string
    if (typeof hex !== 'string') {
        throw new Error('fromHex: hex value must be a string');
    }
    return Buffer.from(hex.replace(/^0x/, ""), "hex");
}
/**
 * Computes the SHA256 hash of the given data.
 * @param data The data to hash.
 * @returns The hexadecimal representation of the hash.
 */
export function sha256(data) {
    return toHex(crypto.createHash("sha256").update(data).digest());
}
/**
 * Generates a new key pair with specified algorithm
 * @param algorithm The signature algorithm to use
 * @param seed An optional seed for deterministic key generation
 * @returns The generated key pair
 */
export function generateKeyPair(algorithm = SignatureAlgorithm.ED25519, seed) {
    if (algorithm === SignatureAlgorithm.SECP256K1) {
        return generateSecp256k1KeyPair(seed);
    }
    else {
        return generateEd25519KeyPair(seed);
    }
}
/**
 * Generates a new Ed25519 key pair (existing implementation)
 * @param seed An optional seed for deterministic key generation
 * @returns The generated key pair
 */
export function generateEd25519KeyPair(seed) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        seed: seed
    });
    const pub = publicKey.export({ format: "der", type: "spki" });
    const priv = privateKey.export({ format: "der", type: "pkcs8" });
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
export function generateSecp256k1KeyPair(seed) {
    // Generate random 32 bytes for private key
    let privateKeyBytes;
    if (seed) {
        // Use seed to derive private key
        const hash = sha256(seed);
        privateKeyBytes = fromHex(hash);
    }
    else {
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
function isValidPrivateKey(privateKey) {
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
export function signMessage(privateKeyHex, msg, algorithm) {
    if (algorithm === SignatureAlgorithm.SECP256K1) {
        return signSecp256k1(privateKeyHex, msg);
    }
    else {
        return signEd25519(privateKeyHex, msg);
    }
}
/**
 * Signs a message using an Ed25519 private key.
 * @param privateKeyHex The private key in hexadecimal format.
 * @param msg The message to sign.
 * @returns The signature in hexadecimal format.
 */
export function signEd25519(privateKeyHex, msg) {
    // Handle undefined or null private key
    if (privateKeyHex === undefined || privateKeyHex === null) {
        throw new Error('signEd25519: privateKeyHex is undefined or null');
    }
    // Ensure privateKeyHex is a string
    if (typeof privateKeyHex !== 'string') {
        throw new Error('signEd25519: privateKeyHex must be a string');
    }
    // Ensure it's not an empty string
    if (privateKeyHex === '') {
        throw new Error('signEd25519: privateKeyHex is empty');
    }
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
export function signSecp256k1(privateKeyHex, msg) {
    // Handle undefined or null private key
    if (privateKeyHex === undefined || privateKeyHex === null) {
        throw new Error('signSecp256k1: privateKeyHex is undefined or null');
    }
    // Ensure privateKeyHex is a string
    if (typeof privateKeyHex !== 'string') {
        throw new Error('signSecp256k1: privateKeyHex must be a string');
    }
    // Ensure it's not an empty string
    if (privateKeyHex === '') {
        throw new Error('signSecp256k1: privateKeyHex is empty');
    }
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
export function verifySignature(publicKeyHex, msg, sigHex, algorithm) {
    if (algorithm === SignatureAlgorithm.SECP256K1) {
        return verifySecp256k1(publicKeyHex, msg, sigHex);
    }
    else {
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
export function verifyEd25519(publicKeyHex, msg, sigHex) {
    // Handle undefined or null values
    if (publicKeyHex === undefined || publicKeyHex === null) {
        throw new Error('verifyEd25519: publicKeyHex is undefined or null');
    }
    if (sigHex === undefined || sigHex === null) {
        throw new Error('verifyEd25519: sigHex is undefined or null');
    }
    // Ensure values are strings
    if (typeof publicKeyHex !== 'string') {
        throw new Error('verifyEd25519: publicKeyHex must be a string');
    }
    if (typeof sigHex !== 'string') {
        throw new Error('verifyEd25519: sigHex must be a string');
    }
    // Ensure they're not empty strings
    if (publicKeyHex === '') {
        throw new Error('verifyEd25519: publicKeyHex is empty');
    }
    if (sigHex === '') {
        throw new Error('verifyEd25519: sigHex is empty');
    }
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
export function verifySecp256k1(publicKeyHex, msg, sigHex) {
    try {
        // Handle undefined or null values
        if (publicKeyHex === undefined || publicKeyHex === null) {
            throw new Error('verifySecp256k1: publicKeyHex is undefined or null');
        }
        if (sigHex === undefined || sigHex === null) {
            throw new Error('verifySecp256k1: sigHex is undefined or null');
        }
        // Ensure values are strings
        if (typeof publicKeyHex !== 'string') {
            throw new Error('verifySecp256k1: publicKeyHex must be a string');
        }
        if (typeof sigHex !== 'string') {
            throw new Error('verifySecp256k1: sigHex must be a string');
        }
        // Ensure they're not empty strings
        if (publicKeyHex === '') {
            throw new Error('verifySecp256k1: publicKeyHex is empty');
        }
        if (sigHex === '') {
            throw new Error('verifySecp256k1: sigHex is empty');
        }
        const publicKeyBytes = fromHex(publicKeyHex);
        const msgHash = sha256(msg); // Hash the message
        const hashBytes = fromHex(msgHash);
        const signatureBytes = fromHex(sigHex);
        return secp256k1.ecdsaVerify(signatureBytes, hashBytes, publicKeyBytes);
    }
    catch {
        return false;
    }
}
/**
 * Derives an address from a public key using the appropriate algorithm
 * @param pubHex The public key in hexadecimal format
 * @param algorithm The signature algorithm used
 * @returns The derived address
 */
export function addressFromPub(pubHex, algorithm = SignatureAlgorithm.ED25519) {
    if (algorithm === SignatureAlgorithm.SECP256K1) {
        return addressFromSecp256k1Pub(pubHex);
    }
    else {
        return addressFromEd25519Pub(pubHex);
    }
}
/**
 * Derives an address from an Ed25519 public key (existing implementation)
 * @param pubHex The public key in hexadecimal format
 * @returns The derived address
 */
export function addressFromEd25519Pub(pubHex) {
    const h = sha256(fromHex(pubHex));
    return "0x" + h.slice(2, 42); // first 20 bytes
}
/**
 * Derives an Ethereum-compatible address from a secp256k1 public key
 * @param pubHex The uncompressed public key in hexadecimal format
 * @returns The derived Ethereum address
 */
export function addressFromSecp256k1Pub(pubHex) {
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
export function keccak256(data) {
    return keccak('keccak256').update(Buffer.from(data)).digest('hex');
}
/**
 * Loads a key pair from a file.
 * @param filePath The path to the key pair file.
 * @returns The loaded key pair.
 */
export function loadKeyPair(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const keypair = JSON.parse(data);
    // Ensure all required fields are present
    if (!keypair.publicKey || !keypair.address) {
        throw new Error('Invalid keypair file: missing required fields');
    }
    // If privateKey is missing or empty, generate a new keypair
    if (!keypair.privateKey || keypair.privateKey === '') {
        console.warn('Private key missing or empty in keypair file, generating new keypair');
        return generateKeyPair();
    }
    return keypair;
}

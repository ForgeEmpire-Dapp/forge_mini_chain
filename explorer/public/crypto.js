/**
 * Browser-compatible cryptographic functions for wallet generation
 */

// SHA-256 hashing function using Web Crypto API
async function sha256(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', data instanceof Uint8Array ? data : encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert hex string to Uint8Array
function hexToBytes(hex) {
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Convert Uint8Array to hex string
function bytesToHex(bytes) {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random bytes
function randomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
}

// Simple address derivation (similar to the node implementation)
async function addressFromPub(pubHex) {
    const pubBytes = hexToBytes(pubHex);
    const hash = await sha256(pubBytes);
    return "0x" + hash.slice(2, 42); // first 20 bytes
}

// Mock key pair generation (in a real implementation, you would use a library like noble-secp256k1)
async function generateKeyPair(algorithm = 'ed25519') {
    // For demonstration purposes, we'll generate mock keys
    // In a production environment, you would use a proper cryptographic library
    
    if (algorithm === 'secp256k1') {
        // Generate Ethereum-compatible keys
        const privateKey = randomBytes(32);
        // In a real implementation, you would derive the public key from the private key
        const publicKey = randomBytes(64); // uncompressed public key is 64 bytes
        
        const privHex = bytesToHex(privateKey);
        const pubHex = '0x04' + bytesToHex(publicKey).slice(2); // Add 0x04 prefix for uncompressed
        const address = await addressFromPub(pubHex);
        
        return {
            publicKey: pubHex,
            privateKey: privHex,
            address: address,
            algorithm: 'secp256k1'
        };
    } else {
        // Generate Ed25519 keys
        const privateKey = randomBytes(32);
        const publicKey = randomBytes(32); // Ed25519 public key is 32 bytes
        
        const privHex = bytesToHex(privateKey);
        const pubHex = bytesToHex(publicKey);
        const address = await addressFromPub(pubHex);
        
        return {
            publicKey: pubHex,
            privateKey: privHex,
            address: address,
            algorithm: 'ed25519'
        };
    }
}

// Export functions
window.CryptoUtils = {
    generateKeyPair,
    sha256,
    hexToBytes,
    bytesToHex
};/**
 * Browser-compatible cryptographic functions for wallet generation
 */

// SHA-256 hashing function using Web Crypto API
async function sha256(data) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', data instanceof Uint8Array ? data : encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert hex string to Uint8Array
function hexToBytes(hex) {
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Convert Uint8Array to hex string
function bytesToHex(bytes) {
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate random bytes
function randomBytes(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array;
}

// Simple address derivation (similar to the node implementation)
async function addressFromPub(pubHex) {
    const pubBytes = hexToBytes(pubHex);
    const hash = await sha256(pubBytes);
    return "0x" + hash.slice(2, 42); // first 20 bytes
}

// Mock key pair generation (in a real implementation, you would use a library like noble-secp256k1)
async function generateKeyPair(algorithm = 'ed25519') {
    // For demonstration purposes, we'll generate mock keys
    // In a production environment, you would use a proper cryptographic library
    
    if (algorithm === 'secp256k1') {
        // Generate Ethereum-compatible keys
        const privateKey = randomBytes(32);
        // In a real implementation, you would derive the public key from the private key
        const publicKey = randomBytes(64); // uncompressed public key is 64 bytes
        
        const privHex = bytesToHex(privateKey);
        const pubHex = '0x04' + bytesToHex(publicKey).slice(2); // Add 0x04 prefix for uncompressed
        const address = await addressFromPub(pubHex);
        
        return {
            publicKey: pubHex,
            privateKey: privHex,
            address: address,
            algorithm: 'secp256k1'
        };
    } else {
        // Generate Ed25519 keys
        const privateKey = randomBytes(32);
        const publicKey = randomBytes(32); // Ed25519 public key is 32 bytes
        
        const privHex = bytesToHex(privateKey);
        const pubHex = bytesToHex(publicKey);
        const address = await addressFromPub(pubHex);
        
        return {
            publicKey: pubHex,
            privateKey: privHex,
            address: address,
            algorithm: 'ed25519'
        };
    }
}

// Export functions
window.CryptoUtils = {
    generateKeyPair,
    sha256,
    hexToBytes,
    bytesToHex
};
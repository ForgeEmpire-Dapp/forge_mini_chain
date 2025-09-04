import crypto from 'node:crypto';

// --- Crypto helpers (copied from src/crypto.ts) ---
function toHex(buf) {
    return "0x" + Buffer.from(buf).toString("hex");
}
function fromHex(hex) {
    return Buffer.from(hex.replace(/^0x/, ''), "hex");
}
function sha256(data) {
    return toHex(crypto.createHash("sha256").update(data).digest());
}
function generateKeyPair(seed) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
        seed: seed
    });
    const pub = publicKey.export({ format: "der", type: "spki" });
    const priv = privateKey.export({ format: "der", type: "pkcs8" });
    const pubHex = toHex(pub);
    const privHex = toHex(priv);
    const address = addressFromPub(pubHex);
    return { publicKey: pubHex, privateKey: privHex, address };
}
function signEd25519(privateKeyHex, msg) {
    const keyObj = crypto.createPrivateKey({ key: fromHex(privateKeyHex), format: "der", type: "pkcs8" });
    const sig = crypto.sign(null, msg, keyObj);
    return toHex(sig);
}
function addressFromPub(pubHex) {
    const h = sha256(fromHex(pubHex));
    return "0x" + h.slice(2, 42);
}

// --- Transaction signing (with chainId) ---
function serializeTx(tx, chainId) {
    const obj = { tx, chainId };
    return Buffer.from(JSON.stringify(obj));
}

function txHash(tx, chainId) {
    return sha256(serializeTx(tx, chainId));
}

function signTx(tx, chainId, privKey, pubKey) {
    const hash = txHash(tx, chainId);
    const signature = signEd25519(privKey, serializeTx(tx, chainId));
    return { tx, signature, pubkey: pubKey, hash };
}

// --- Example ---

// 1. Generate a key pair for the sender
const senderKeys = generateKeyPair();
console.log("Sender Address:", senderKeys.address);

// 2. Define the transaction
const tx = {
    type: 'transfer',
    from: senderKeys.address,
    to: '0x...recipient...', 
    amount: '100',
    nonce: 1
};

// 3. Define the chainId (must match the one on the node)
const chainId = 'forge-mini';

// 4. Sign the transaction
const signedTx = signTx(tx, chainId, senderKeys.privateKey, senderKeys.publicKey);

console.log("\nSigned Transaction:");
console.log(JSON.stringify(signedTx, null, 2));

console.log("\nThis signed transaction can be sent to the /tx endpoint of the node.");

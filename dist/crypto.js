import crypto from "node:crypto";
export function toHex(buf) {
    return "0x" + Buffer.from(buf).toString("hex");
}
export function fromHex(hex) {
    return Buffer.from(hex.replace(/^0x/, ""), "hex");
}
export function sha256(data) {
    return toHex(crypto.createHash("sha256").update(data).digest());
}
// Minimal Ed25519 helpers using Node's crypto
export function generateKeyPair(seed) {
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
export function signEd25519(privateKeyHex, msg) {
    const keyObj = crypto.createPrivateKey({ key: fromHex(privateKeyHex), format: "der", type: "pkcs8" });
    const sig = crypto.sign(null, msg, keyObj); // ed25519 ignores hash algo
    return toHex(sig);
}
export function verifyEd25519(publicKeyHex, msg, sigHex) {
    const keyObj = crypto.createPublicKey({ key: fromHex(publicKeyHex), format: "der", type: "spki" });
    return crypto.verify(null, msg, keyObj, fromHex(sigHex));
}
export function addressFromPub(pubHex) {
    const h = sha256(fromHex(pubHex));
    return "0x" + h.slice(2, 42); // first 20 bytes
}

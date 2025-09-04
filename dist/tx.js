import { sha256, signEd25519, verifyEd25519 } from "./crypto.js";
export function serializeTx(tx) {
    return Buffer.from(JSON.stringify(tx));
}
export function txHash(tx) {
    return sha256(serializeTx(tx));
}
export function signTx(tx, privKey, pubKey) {
    const bytes = serializeTx(tx);
    const signature = signEd25519(privKey, bytes);
    return { tx, signature, pubkey: pubKey, hash: txHash(tx) };
}
export function verifySignedTx(stx) {
    const bytes = serializeTx(stx.tx);
    if (txHash(stx.tx) !== stx.hash)
        return false;
    return verifyEd25519(stx.pubkey, bytes, stx.signature);
}

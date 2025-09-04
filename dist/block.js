import { sha256, signEd25519, verifyEd25519 } from "./crypto.js";
export function merkleRoot(txHashes) {
    if (txHashes.length === 0)
        return sha256("");
    let layer = txHashes.map((h) => h);
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const a = layer[i];
            const b = layer[i + 1] || layer[i];
            next.push(sha256(Buffer.from(a + b)));
        }
        layer = next;
    }
    return layer[0];
}
export function headerHash(h) {
    return sha256(Buffer.from(JSON.stringify(h)));
}
export function buildBlock(height, prevHash, proposer, proposerPriv, txs) {
    const txRoot = merkleRoot(txs.map((t) => t.hash));
    const header = { height, prevHash, timestamp: Date.now(), txRoot, proposer };
    const sig = signEd25519(proposerPriv, Buffer.from(headerHash(header)));
    const hash = sha256(Buffer.from(JSON.stringify({ header, signature: sig })));
    return { header, txs, signature: sig, hash };
}
export function verifyBlock(b, proposerPub) {
    const ok = verifyEd25519(proposerPub, Buffer.from(headerHash(b.header)), b.signature);
    return ok;
}

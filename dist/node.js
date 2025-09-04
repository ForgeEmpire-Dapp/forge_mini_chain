import fs from "node:fs";
import path from "node:path";
import { Blockchain } from "./blockchain.js";
import { P2P } from "./p2p.js";
import { startApi } from "./api.js";
import { generateKeyPair } from "./crypto.js";
const cfg = {
    chainId: process.env.CHAIN_ID || "forge-mini",
    blockTimeMs: parseInt(process.env.BLOCK_MS || "500"),
    isLeader: process.env.LEADER === "1",
    leaderWsURL: process.env.LEADER_WS || "ws://localhost:7071",
    p2pPort: parseInt(process.env.P2P_PORT || (process.env.LEADER === "1" ? "7071" : "0")),
    apiPort: parseInt(process.env.API_PORT || (process.env.LEADER === "1" ? "8080" : "8081")),
    dataDir: process.env.DATA_DIR || ".data",
    keypairFile: process.env.KEY_FILE || ".keys/ed25519.json"
};
fs.mkdirSync(path.dirname(cfg.keypairFile), { recursive: true });
let kp;
if (fs.existsSync(cfg.keypairFile)) {
    kp = JSON.parse(fs.readFileSync(cfg.keypairFile, "utf8"));
}
else {
    kp = generateKeyPair();
    fs.writeFileSync(cfg.keypairFile, JSON.stringify(kp, null, 2));
}
console.log(`[keys] address ${kp.address}`);
const chain = new Blockchain(cfg, { pub: kp.publicKey, priv: kp.privateKey, address: kp.address });
const p2p = new P2P((tx) => chain.addTx(tx), (b) => {
    try {
        chain.addBlock(b);
        console.log(`[block] imported #${b.header.height} (${b.txs.length} tx)`);
    }
    catch (e) {
        console.error(`[block] reject:`, e.message);
    }
});
if (cfg.isLeader) {
    p2p.listen(cfg.p2pPort);
    setInterval(() => {
        const block = chain.buildNextBlock();
        chain.addBlock(block);
        p2p.broadcast({ kind: "block", data: block });
    }, cfg.blockTimeMs);
}
else {
    // follower: connect to leader
    if (cfg.leaderWsURL)
        p2p.connect(cfg.leaderWsURL);
}
startApi(cfg.apiPort, {
    submitTx: (stx) => {
        chain.addTx(stx);
    },
    getState: () => {
        const out = {};
        for (const [addr, acc] of chain.state.accounts.entries())
            out[addr] = acc;
        return out;
    },
    getHead: () => chain.head || null
});

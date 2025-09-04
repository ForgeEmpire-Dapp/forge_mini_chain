import fs from "node:fs";
import path from "node:path";
import { State, applyBlock } from "./state.js";
import { buildBlock } from "./block.js";
export class Blockchain {
    cfg;
    keys;
    chain = [];
    mempool = [];
    state = new State();
    constructor(cfg, keys) {
        this.cfg = cfg;
        this.keys = keys;
    }
    get head() { return this.chain[this.chain.length - 1]; }
    addTx(stx) { this.mempool.push(stx); }
    addBlock(b) {
        // basic link check
        if (this.head && this.head.hash !== b.header.prevHash)
            throw new Error("prevHash mismatch");
        this.chain.push(b);
        applyBlock(this.state, b);
        this.persistBlock(b);
    }
    buildNextBlock() {
        const txs = this.mempool.splice(0, 500); // batch
        const height = (this.head?.header.height ?? -1) + 1;
        const prev = this.head?.hash ?? "0x00";
        return buildBlock(height, prev, this.keys.address, this.keys.priv, txs);
    }
    // ─── Persistence (JSONL) ────────────────────────────────────────────────
    persistBlock(b) {
        const dir = path.join(this.cfg.dataDir, this.cfg.chainId);
        fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(path.join(dir, "blocks.jsonl"), JSON.stringify(b) + "\n");
    }
}

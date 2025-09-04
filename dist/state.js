export class State {
    accounts = new Map();
    posts = new Map();
    getOrCreate(addr) {
        const a = this.accounts.get(addr);
        if (a)
            return a;
        const fresh = { balance: 0n, nonce: 0, rep: 0 };
        this.accounts.set(addr, fresh);
        return fresh;
    }
    applyTx(tx, height) {
        if (tx.type === "transfer") {
            const from = this.getOrCreate(tx.from);
            const to = this.getOrCreate(tx.to);
            if (from.nonce + 1 !== tx.nonce)
                throw new Error("bad nonce");
            if (from.balance < tx.amount)
                throw new Error("insufficient");
            from.balance -= tx.amount;
            to.balance += tx.amount;
            from.nonce++;
            return;
        }
        if (tx.type === "post") {
            const acc = this.getOrCreate(tx.from);
            if (acc.nonce + 1 !== tx.nonce)
                throw new Error("bad nonce");
            this.posts.set(tx.postId, { owner: tx.from, contentHash: tx.contentHash, pointer: tx.pointer, block: height });
            acc.nonce++;
            return;
        }
        if (tx.type === "rep") {
            const acc = this.getOrCreate(tx.from);
            if (acc.nonce + 1 !== tx.nonce)
                throw new Error("bad nonce");
            const target = this.getOrCreate(tx.target);
            target.rep += tx.delta;
            acc.nonce++;
            return;
        }
        throw new Error("unknown tx type");
    }
}
export function applyBlock(state, block) {
    for (const stx of block.txs) {
        state.applyTx(stx.tx, block.header.height);
    }
}

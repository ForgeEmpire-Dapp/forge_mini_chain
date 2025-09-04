/**
 * @fileoverview This file defines the State class, which manages the state of the blockchain.
 * It includes methods for creating and updating accounts, as well as applying transactions to the state.
 */
import { Account, AppState, SignedTx, Tx } from "./types.js";


/**
 * The main state class for the application.
 * It holds all accounts and posts.
 */
export class State {
public accounts: Map<string, Account> = new Map();
public posts: Map<string, { owner: string; contentHash: string; pointer?: string; block: number }> = new Map();


/**
 * Retrieves an account by address, or creates a new one if it doesn't exist.
 * @param addr The address of the account to retrieve or create.
 * @returns The account object.
 */
getOrCreate(addr: string): Account {
const a = this.accounts.get(addr);
if (a) return a;
const fresh: Account = { balance: 0n, nonce: 0, rep: 0 };
this.accounts.set(addr, fresh);
return fresh;
}


/**
 * Applies a transaction to the state, updating account balances, nonces, and posts.
 * @param tx The transaction to apply.
 * @param height The block height at which the transaction is applied.
 * @throws An error if the transaction is invalid (e.g., bad nonce, insufficient funds).
 */
applyTx(tx: Tx, height: number): void {
if (tx.type === "transfer") {
const from = this.getOrCreate(tx.from);
const to = this.getOrCreate(tx.to);
if (from.nonce + 1 !== tx.nonce) throw new Error("bad nonce");
if (from.balance < tx.amount) throw new Error("insufficient");
from.balance -= tx.amount;
to.balance += tx.amount;
from.nonce++;
return;
}
if (tx.type === "post") {
const acc = this.getOrCreate(tx.from);
if (acc.nonce + 1 !== tx.nonce) throw new Error("bad nonce");
this.posts.set(tx.postId, { owner: tx.from, contentHash: tx.contentHash, pointer: tx.pointer, block: height });
acc.nonce++;
return;
}
if (tx.type === "rep") {
const acc = this.getOrCreate(tx.from);
if (acc.nonce + 1 !== tx.nonce) throw new Error("bad nonce");
const target = this.getOrCreate(tx.target);
target.rep += tx.delta;
acc.nonce++;
return;
}
throw new Error("unknown tx type");
}
}


/**
 * Applies all transactions in a block to the given state.
 * @param state The state to apply the block to.
 * @param block The block containing the transactions to apply.
 */
export function applyBlock(state: State, block: { txs: SignedTx[]; header: { height: number } }): void {
for (const stx of block.txs) {
state.applyTx(stx.tx, block.header.height);
}
}
/**
 * @fileoverview This file is the main entry point for a node in the blockchain network.
 * It initializes the configuration, sets up the keypair, creates a new blockchain instance,
 * establishes the P2P network, and starts the API server.
 */
import fs from "node:fs";
import path from "node:path";
import { Blockchain } from "./blockchain.js";
import { P2P } from "./p2p.js";
import { startApi } from "./api.js";
import { ChainConfig } from "./types.js";
import { generateKeyPair } from "./crypto.js";


try {
// Configuration for the blockchain node
const cfg: ChainConfig = {
chainId: process.env.CHAIN_ID || "forge-mini",
blockTimeMs: parseInt(process.env.BLOCK_MS || "500"),
isLeader: process.env.LEADER === "1",
leaderWsURL: process.env.LEADER_WS || "ws://localhost:7071",
p2pPort: parseInt(process.env.P2P_PORT || (process.env.LEADER === "1" ? "7071" : "0")),
apiPort: parseInt(process.env.API_PORT || (process.env.LEADER === "1" ? "8080" : "8081")),
dataDir: process.env.DATA_DIR || ".data",
keypairFile: process.env.KEY_FILE || ".keys/ed25519.json"
};


// Create directory for keypair if it doesn't exist
fs.mkdirSync(path.dirname(cfg.keypairFile), { recursive: true });
let kp;
// Load or generate a new keypair
if (fs.existsSync(cfg.keypairFile)) {
kp = JSON.parse(fs.readFileSync(cfg.keypairFile, "utf8"));
} else {
kp = generateKeyPair();
fs.writeFileSync(cfg.keypairFile, JSON.stringify(kp, null, 2));
}
console.log(`[keys] address ${kp.address}`);


// Initialize the blockchain with the configuration and keypair
const chain = new Blockchain(cfg, { pub: kp.publicKey, priv: kp.privateKey, address: kp.address });


// Initialize the P2P network
const p2p = new P2P(
(tx) => chain.addTx(tx),
(b) => {
try { chain.addBlock(b); console.log(`[block] imported #${b.header.height} (${b.txs.length} tx)`); }
catch (e) { console.error(`[block] reject:`, (e as Error).message); }
}
);


// Start the P2P network and block production if the node is a leader
if (cfg.isLeader) {
p2p.listen(cfg.p2pPort);
setInterval(() => {
const block = chain.buildNextBlock();
chain.addBlock(block);
p2p.broadcast({ kind: "block", data: block });
}, cfg.blockTimeMs);
} else {
// Follower node connects to the leader
if (cfg.leaderWsURL) p2p.connect(cfg.leaderWsURL);
}


// Start the API server
startApi(cfg.apiPort, {
submitTx: (stx) => {
chain.addTx(stx);
},
getAccount: (addr: string) => chain.state.accounts.get(addr),
getHead: () => chain.head || null
});
} catch (err) {
  console.error('Caught unhandled error:');
  console.error('Error type:', typeof err);
  if (err instanceof Error) {
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    try {
      console.error('Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    } catch (e) {
      console.error('Could not stringify error object:', e);
    }
  } else {
    console.error('Error value:', err);
  }
  process.exit(1);
}
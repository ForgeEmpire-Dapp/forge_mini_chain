/**
 * @fileoverview This file defines the P2P class, which handles peer-to-peer communication between nodes
 * in the blockchain network using WebSockets.
 */
import { WebSocketServer, WebSocket } from "ws";
import { Block, SignedTx } from "./types.js";


/**
 * Defines the structure of messages exchanged between peers.
 */
type Msg =
| { kind: "hello"; role: "leader" | "follower" }
| { kind: "tx"; data: SignedTx }
| { kind: "block"; data: Block };


/**
 * The P2P class manages WebSocket connections to other peers in the network.
 */
export class P2P {
private peers: Set<WebSocket> = new Set();


/**
 * Constructs a new P2P instance.
 * @param onTx A callback function to handle incoming transactions.
 * @param onBlock A callback function to handle incoming blocks.
 */
constructor(private onTx: (tx: SignedTx) => void, private onBlock: (b: Block) => void) {}


/**
 * Starts a WebSocket server to listen for incoming connections.
 * @param port The port to listen on.
 */
listen(port: number) {
const wss = new WebSocketServer({ port });
wss.on("connection", (ws) => this.register(ws));
console.log(`[p2p] listening ws://localhost:${port}`);
}


/**
 * Connects to a peer at the specified URL.
 * @param url The URL of the peer to connect to.
 */
connect(url: string) {
const ws = new WebSocket(url);
ws.on("open", () => this.register(ws));
}


/**
 * Registers a new peer and sets up event listeners for messages and disconnection.
 * @param ws The WebSocket connection to the peer.
 */
private register(ws: WebSocket) {
this.peers.add(ws);
ws.on("message", (raw) => {
try {
const msg = JSON.parse(raw.toString()) as Msg;
if (msg.kind === "tx") this.onTx(msg.data);
if (msg.kind === "block") this.onBlock(msg.data);
} catch {}
});
ws.on("close", () => this.peers.delete(ws));
}


/**
 * Broadcasts a message to all connected peers.
 * @param msg The message to broadcast.
 */
broadcast(msg: Msg) {
const raw = JSON.stringify(msg);
for (const p of this.peers) {
if (p.readyState === p.OPEN) p.send(raw);
}
}
}
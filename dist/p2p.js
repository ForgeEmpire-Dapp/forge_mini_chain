/**
 * @fileoverview This file defines the P2P class, which handles peer-to-peer communication between nodes
 * in the blockchain network using WebSockets.
 */
import { WebSocketServer, WebSocket } from "ws";
/**
 * The P2P class manages WebSocket connections to other peers in the network.
 */
export class P2P {
    onTx;
    onBlock;
    peers = new Set();
    /**
     * Constructs a new P2P instance.
     * @param onTx A callback function to handle incoming transactions (async).
     * @param onBlock A callback function to handle incoming blocks.
     */
    constructor(onTx, onBlock) {
        this.onTx = onTx;
        this.onBlock = onBlock;
    }
    /**
     * Starts a WebSocket server to listen for incoming connections.
     * @param port The port to listen on.
     */
    listen(port) {
        const wss = new WebSocketServer({ port });
        wss.on("connection", (ws) => this.register(ws));
        console.log(`[p2p] listening ws://localhost:${port}`);
    }
    /**
     * Connects to a peer at the specified URL.
     * @param url The URL of the peer to connect to.
     */
    connect(url) {
        const ws = new WebSocket(url);
        ws.on("open", () => this.register(ws));
    }
    /**
     * Registers a new peer and sets up event listeners for messages and disconnection.
     * @param ws The WebSocket connection to the peer.
     */
    register(ws) {
        this.peers.add(ws);
        ws.on("message", async (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.kind === "tx") {
                    // Deserialize BigInt values in transaction
                    const tx = this.deserializeTx(msg.data);
                    await this.onTx(tx);
                }
                if (msg.kind === "block") {
                    // Deserialize BigInt values in block
                    const block = this.deserializeBlock(msg.data);
                    this.onBlock(block);
                }
            }
            catch (error) {
                console.error(`[p2p] Message processing error: ${error.message}`);
            }
        });
        ws.on("close", () => this.peers.delete(ws));
    }
    /**
     * Deserialize BigInt values in transaction
     */
    deserializeTx(txData) {
        return {
            ...txData,
            tx: {
                ...txData.tx,
                gasLimit: BigInt(txData.tx.gasLimit),
                gasPrice: BigInt(txData.tx.gasPrice),
                ...(txData.tx.amount !== undefined && { amount: BigInt(txData.tx.amount) }),
                ...(txData.tx.value !== undefined && { value: BigInt(txData.tx.value) })
            }
        };
    }
    /**
     * Deserialize BigInt values in block
     */
    deserializeBlock(blockData) {
        return {
            ...blockData,
            header: {
                ...blockData.header,
                gasUsed: BigInt(blockData.header.gasUsed),
                gasLimit: BigInt(blockData.header.gasLimit),
                baseFeePerGas: BigInt(blockData.header.baseFeePerGas)
            },
            txs: blockData.txs.map((tx) => this.deserializeTx(tx))
        };
    }
    /**
     * Broadcasts a message to all connected peers.
     * @param msg The message to broadcast.
     */
    broadcast(msg) {
        const raw = JSON.stringify(msg, (key, value) => typeof value === 'bigint' ? value.toString() : value);
        for (const p of this.peers) {
            if (p.readyState === p.OPEN)
                p.send(raw);
        }
    }
}

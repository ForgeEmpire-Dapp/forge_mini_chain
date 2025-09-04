import { WebSocketServer, WebSocket } from "ws";
export class P2P {
    onTx;
    onBlock;
    peers = new Set();
    constructor(onTx, onBlock) {
        this.onTx = onTx;
        this.onBlock = onBlock;
    }
    listen(port) {
        const wss = new WebSocketServer({ port });
        wss.on("connection", (ws) => this.register(ws));
        console.log(`[p2p] listening ws://localhost:${port}`);
    }
    connect(url) {
        const ws = new WebSocket(url);
        ws.on("open", () => this.register(ws));
    }
    register(ws) {
        this.peers.add(ws);
        ws.on("message", (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.kind === "tx")
                    this.onTx(msg.data);
                if (msg.kind === "block")
                    this.onBlock(msg.data);
            }
            catch { }
        });
        ws.on("close", () => this.peers.delete(ws));
    }
    broadcast(msg) {
        const raw = JSON.stringify(msg);
        for (const p of this.peers) {
            if (p.readyState === p.OPEN)
                p.send(raw);
        }
    }
}

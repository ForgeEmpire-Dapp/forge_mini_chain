/**
 * @fileoverview This file defines the API for interacting with the blockchain, including endpoints for
 * checking health, retrieving block and account information, and submitting transactions.
 */
import express from "express";
import http from "http";
import bodyParser from "body-parser";
import { WebSocketServer } from "ws";
/**
 * Starts the API server with enhanced transaction handling.
 * @param port The port to listen on.
 * @param handlers An object containing the handler functions for the API endpoints.
 */
export function startApi(port, handlers) {
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    // Store active WebSocket subscriptions
    const subscriptions = {
        blocks: [],
        transactions: [],
        events: []
    };
    app.use(bodyParser.json());
    app.get("/health", (_req, res) => res.json({ ok: true }));
    app.get("/head", (_req, res) => {
        const head = handlers.getHead();
        res.json(JSON.parse(JSON.stringify(head, (key, value) => typeof value === 'bigint' ? value.toString() : value)));
    });
    app.get("/account/:addr", (req, res) => {
        const account = handlers.getAccount(req.params.addr) || null;
        res.json(JSON.parse(JSON.stringify(account, (key, value) => typeof value === 'bigint' ? value.toString() : value)));
    });
    // EVM stats endpoint
    app.get("/evm/stats", (_req, res) => {
        if (!handlers.getEVMStats) {
            return res.status(404).json({ error: "EVM not available" });
        }
        try {
            const stats = handlers.getEVMStats();
            res.json(JSON.parse(JSON.stringify(stats, (key, value) => typeof value === 'bigint' ? value.toString() : value)));
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[api] EVM stats retrieval failed: ${errorMessage}`);
            res.status(500).json({ error: errorMessage });
        }
    });
    // Contract endpoints
    app.get("/contract/:address/code", (req, res) => {
        if (!handlers.getContractCode) {
            return res.status(404).json({ error: "EVM not available" });
        }
        try {
            const code = handlers.getContractCode(req.params.address);
            if (code === null) {
                return res.status(404).json({ error: "Contract not found" });
            }
            res.json({ code });
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[api] Contract code retrieval failed: ${errorMessage}`);
            res.status(500).json({ error: errorMessage });
        }
    });
    app.get("/contract/:address/storage/:key", (req, res) => {
        if (!handlers.getContractStorage) {
            return res.status(404).json({ error: "EVM not available" });
        }
        try {
            const value = handlers.getContractStorage(req.params.address, req.params.key);
            if (value === null) {
                return res.status(404).json({ error: "Storage key not found" });
            }
            res.json({ value });
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[api] Contract storage retrieval failed: ${errorMessage}`);
            res.status(500).json({ error: errorMessage });
        }
    });
    // Transaction receipt endpoint
    app.get("/tx/:hash/receipt", async (req, res) => {
        if (!handlers.getReceipt) {
            return res.status(404).json({ error: "Receipts not available" });
        }
        try {
            const receipt = await handlers.getReceipt(req.params.hash);
            if (receipt === null) {
                return res.status(404).json({ error: "Receipt not found" });
            }
            res.json(JSON.parse(JSON.stringify(receipt, (key, value) => typeof value === 'bigint' ? value.toString() : value)));
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[api] Receipt retrieval failed: ${errorMessage}`);
            res.status(500).json({ error: errorMessage });
        }
    });
    app.post("/tx", async (req, res) => {
        try {
            const stx = req.body;
            if (!stx?.tx?.type) {
                return res.status(400).json({ error: "Invalid transaction format" });
            }
            await handlers.submitTx(stx);
            res.json({ ok: true, hash: stx.hash });
        }
        catch (error) {
            const errorMessage = error.message;
            console.error(`[api] Transaction submission failed: ${errorMessage}`);
            res.status(400).json({ error: errorMessage });
        }
    });
    // WebSocket subscription endpoint
    wss.on("connection", (ws, req) => {
        // Parse the subscription type from the URL
        const url = new URL(req.url || "/", `http://localhost:${port}`);
        const subscriptionType = url.pathname.split("/")[2]; // /subscribe/:type
        // Helper function to send data to WebSocket with BigInt serialization
        const send = (data) => {
            try {
                ws.send(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));
            }
            catch (error) {
                console.error(`[api] Error sending WebSocket message: ${error.message}`);
            }
        };
        switch (subscriptionType) {
            case "blocks":
                // Add to blocks subscriptions
                subscriptions.blocks.push({ ws, send });
                // Set up cleanup on disconnect
                ws.on("close", () => {
                    subscriptions.blocks = subscriptions.blocks.filter(sub => sub.ws !== ws);
                });
                // Acknowledge the connection
                send({ type: "subscription", subscription: "blocks", status: "active" });
                // If blockchain handler is available, subscribe to blocks
                if (handlers.subscribeToBlocks) {
                    const callback = (block) => {
                        send({ type: "block", data: block });
                    };
                    handlers.subscribeToBlocks(callback);
                    // Store callback for cleanup
                    ws._blockCallback = callback;
                    // Clean up subscription on disconnect
                    ws.on("close", () => {
                        if (handlers.unsubscribeFromBlocks && ws._blockCallback) {
                            handlers.unsubscribeFromBlocks(ws._blockCallback);
                        }
                    });
                }
                break;
            case "transactions":
                // Add to transactions subscriptions
                subscriptions.transactions.push({ ws, send });
                // Set up cleanup on disconnect
                ws.on("close", () => {
                    subscriptions.transactions = subscriptions.transactions.filter(sub => sub.ws !== ws);
                });
                // Acknowledge the connection
                send({ type: "subscription", subscription: "transactions", status: "active" });
                // If blockchain handler is available, subscribe to transactions
                if (handlers.subscribeToTransactions) {
                    const callback = (tx) => {
                        send({ type: "transaction", data: tx });
                    };
                    handlers.subscribeToTransactions(callback);
                    // Store callback for cleanup
                    ws._txCallback = callback;
                    // Clean up subscription on disconnect
                    ws.on("close", () => {
                        if (handlers.unsubscribeFromTransactions && ws._txCallback) {
                            handlers.unsubscribeFromTransactions(ws._txCallback);
                        }
                    });
                }
                break;
            case "events":
                // Add to events subscriptions
                subscriptions.events.push({ ws, send });
                // Set up cleanup on disconnect
                ws.on("close", () => {
                    subscriptions.events = subscriptions.events.filter(sub => sub.ws !== ws);
                });
                // Acknowledge the connection
                send({ type: "subscription", subscription: "events", status: "active" });
                // If blockchain handler is available, subscribe to events
                if (handlers.subscribeToEvents) {
                    const callback = (event) => {
                        send({ type: "event", data: event });
                    };
                    handlers.subscribeToEvents(callback);
                    // Store callback for cleanup
                    ws._eventCallback = callback;
                    // Clean up subscription on disconnect
                    ws.on("close", () => {
                        if (handlers.unsubscribeFromEvents && ws._eventCallback) {
                            handlers.unsubscribeFromEvents(ws._eventCallback);
                        }
                    });
                }
                break;
            default:
                send({ type: "error", message: "Unknown subscription type" });
                ws.close();
        }
    });
    server.listen(port, () => console.log(`[api] http://localhost:${port}`));
}

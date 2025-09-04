/**
 * @fileoverview This file defines the API for interacting with the blockchain, including endpoints for
 * checking health, retrieving block and account information, and submitting transactions.
 */
import express from "express";
import bodyParser from "body-parser";
import { SignedTx, Tx } from "./types.js";


/**
 * Starts the API server.
 * @param port The port to listen on.
 * @param handlers An object containing the handler functions for the API endpoints.
 */
export function startApi(port: number, handlers: {
submitTx: (stx: SignedTx) => void;
getAccount: (addr: string) => any;
getHead: () => any;
}) {
const app = express();
app.use(bodyParser.json());


app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/head", (_req, res) => res.json(handlers.getHead()));
app.get("/account/:addr", (req, res) => res.json(handlers.getAccount(req.params.addr) || null));


app.post("/tx", (req, res) => {
const stx = req.body as SignedTx;
if (!stx?.tx?.type) return res.status(400).json({ error: "bad tx" });
handlers.submitTx(stx);
res.json({ ok: true, hash: stx.hash });
});


app.listen(port, () => console.log(`[api] http://localhost:${port}`));
}
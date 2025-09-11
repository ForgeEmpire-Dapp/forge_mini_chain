/**
 * @fileoverview This file defines the API for interacting with the blockchain, including endpoints for
 * checking health, retrieving block and account information, and submitting transactions.
 */
import express from "express";
import bodyParser from "body-parser";
import { SignedTx, Tx } from "./types.js";


/**
 * Starts the API server with enhanced transaction handling.
 * @param port The port to listen on.
 * @param handlers An object containing the handler functions for the API endpoints.
 */
export function startApi(port: number, handlers: {
submitTx: (stx: SignedTx) => Promise<void>;
getAccount: (addr: string) => any;
getHead: () => any;
}) {
const app = express();
app.use(bodyParser.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/head", (_req, res) => {
  const head = handlers.getHead();
  res.json(JSON.parse(JSON.stringify(head, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  )));
});
app.get("/account/:addr", (req, res) => {
  const account = handlers.getAccount(req.params.addr) || null;
  res.json(JSON.parse(JSON.stringify(account, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  )));
});

app.post("/tx", async (req, res) => {
  try {
    const stx = req.body as SignedTx;
    if (!stx?.tx?.type) {
      return res.status(400).json({ error: "Invalid transaction format" });
    }
    
    await handlers.submitTx(stx);
    res.json({ ok: true, hash: stx.hash });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(`[api] Transaction submission failed: ${errorMessage}`);
    res.status(400).json({ error: errorMessage });
  }
});

app.listen(port, () => console.log(`[api] http://localhost:${port}`));
}
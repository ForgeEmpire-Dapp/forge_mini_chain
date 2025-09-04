# Forge Empire — Mini Blockchain (MVP)

A blazing-fast, centralized-leader mini blockchain for:
- Post provenance (content hashes + IPFS pointers)
- Reputation scoring
- Simple token transfers (tips/rewards)

## Features

- **Fast, Centralized Consensus:** A single leader node produces blocks, ensuring high throughput.
- **Pluggable State Machine:** Easily extendable for new transaction types.
- **WebSocket P2P:** Simple and efficient peer-to-peer communication.
- **JSON-based:** Easy to debug and inspect.
- **File-based Persistence:** The blockchain is stored in a local JSONL file.

## Quick Start

1.  **Install Dependencies:**

    ```bash
    npm install
    ```

2.  **Start the Leader Node:**

    The leader node is responsible for creating blocks. By default, it starts an API server on port 8080 and a P2P server on port 7071.

    **On Windows (PowerShell):**

    ```powershell
    $env:LEADER="1"; npm run dev
    ```

    **On Linux/macOS:**

    ```bash
    LEADER=1 npm run dev
    ```

3.  **Start a Follower Node (Optional):**

    Follower nodes connect to the leader to receive new blocks and transactions. You can run multiple followers on different ports.

    **On Windows (PowerShell):**

    ```powershell
    $env:API_PORT="8081"; $env:P2P_PORT="0"; $env:LEADER_WS="ws://localhost:7071"; npm run dev
    ```

    **On Linux/macOS:**

    ```bash
    API_PORT=8081 P2P_PORT=0 LEADER_WS=ws://localhost:7071 npm run dev
    ```

## API Reference

The blockchain node exposes the following HTTP API endpoints:

-   `GET /health`: Returns the health status of the node.
-   `GET /head`: Returns the latest block.
-   `GET /block/:height`: Returns a block by its height.
-   `GET /account/:addr`: Returns the state of an account (balance, nonce, reputation).
-   `POST /tx`: Submits a new transaction to the mempool.

## Block Explorer

A simple web-based block explorer is available in the `explorer` directory.

1.  **Install Dependencies:**

    ```bash
    cd explorer
    npm install
    ```

2.  **Start the Explorer:**

    ```bash
    npm start
    ```

    The explorer will be available at `http://localhost:3000`.

## Client-Side Signing Example

The `client-example` directory contains a script that demonstrates how to sign transactions correctly, including the `chainId` to prevent replay attacks.

1.  **Navigate to the directory:**

    ```bash
    cd client-example
    ```

2.  **Run the script:**

    ```bash
    node sign-tx.js
    ```

    The script will output a signed transaction object that you can use to submit to the `/tx` endpoint.

## Submit Transactions

To submit a transaction, `POST` a signed transaction object to the `/tx` endpoint of a running node.

**Example `curl` command:**

```bash
curl -X POST -H "Content-Type: application/json" -d @signed-tx.json http://localhost:8080/tx
```

Where `signed-tx.json` is a file containing the output of the `sign-tx.js` script.

### Transaction Types

-   **Transfer:** `{"type":"transfer","from":"0x...","to":"0x...","amount":"100","nonce":1}`
-   **Post:** `{"type":"post","from":"0x...","postId":"...","contentHash":"0x...","pointer":"...","nonce":1}`
-   **Reputation:** `{"type":"rep","from":"0x...","target":"0x...","delta":1,"reason":"...","nonce":1}`

## Integration Notes (Forge Empire)

-   Keep media off-chain (IPFS/S3). Store only hashes/pointers via PostTx.
-   Use the mini-chain as the trust/ownership layer. Your app server can mirror state into a query-friendly DB for feeds and search.
-   Later: add validator set (round-robin), stake-weighted reputation, and slashing.

## Next Steps / Upgrades

-   Validator set + block signature verification per-known pubkeys.
-   Snapshots for fast bootstrap; prune old mempool.
-   Auth: only accept tx where stx.pubkey maps to stx.tx.from address.
-   Rewards module: mint tokens for posts/likes via scheduled blocks.
-   gRPC or libp2p networking; Tendermint-style ABCI adapter if needed.

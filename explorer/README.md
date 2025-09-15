# Mini Chain Explorer

A simple web-based explorer for the Mini Chain blockchain.

## Getting Started

1. Make sure you have Node.js installed
2. Install dependencies: `npm install`
3. Start the explorer: `npm start`
4. Open your browser to http://localhost:3000

## Prerequisites

The explorer connects to the Mini Chain API server which runs on port 8080 by default. Make sure a Mini Chain node is running before using the explorer.

You can start a node in leader mode with:
```bash
CHAIN_ID=test CHAIN_DATA_DIR=.data DATA_DIR=.data KEY_FILE=.keys/ed25519.json BLOCK_MS=500 LEADER=1 P2P_PORT=7071 API_PORT=8080 npm run dev
```

Or you can start both the node and explorer together with:
```bash
npm run explorer
```

## Features

- View the head block information
- View transactions in the head block
- Search for account information by address

## Troubleshooting

If you see CSP (Content Security Policy) errors or connection errors:

1. Make sure the Mini Chain node is running on port 8080
2. Check that there are no firewall rules blocking the connection
3. Verify that the API endpoints are accessible by visiting http://localhost:8080/health in your browser

## API Endpoints Used

- `/head` - Get the current head block
- `/account/:addr` - Get account information by address

## Development

The explorer is a simple Express.js application with a static frontend. The frontend code is in the `public` directory.

- `index.html` - Main HTML file
- `app.js` - JavaScript frontend code
- `server.js` - Express.js server
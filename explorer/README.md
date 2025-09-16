# Forge Mini Chain Explorer

A blockchain explorer for the Forge Mini Chain with integrated wallet creation and smart contract deployment capabilities.

## Features

1. **Block Explorer** - View the latest blocks and transactions on the blockchain
2. **Account Lookup** - Search for account details by address
3. **Wallet Creation** - Generate new wallets with Ed25519 or Secp256k1 cryptography
4. **Smart Contract Deployment** - Deploy smart contracts to the blockchain through a web interface
5. **Real-time Updates** - WebSocket integration for live block and transaction monitoring
6. **EVM Statistics** - View EVM execution statistics and contract counts

## Quick Start

To run the explorer:

```bash
npm install
npm start
```

The explorer will be available at http://localhost:3000

## Wallet Creation

The wallet creation feature allows you to generate new key pairs locally in your browser:

1. Navigate to the "Wallet" tab in the explorer
2. Select your preferred cryptographic algorithm:
   - Ed25519 (Default) - Fast signature scheme
   - Secp256k1 (Ethereum Compatible) - Compatible with Ethereum tools
3. Click "Generate New Wallet"
4. Your new wallet details will be displayed:
   - Address (public, can be shared)
   - Public Key (public, can be shared)
   - Private Key (private, keep secret!)
5. Download your key pair for safe storage

**Important**: Never share your private key with anyone. Anyone with access to your private key can control your wallet.

**Security Note**: All cryptographic operations are performed locally in your browser. Private keys are never transmitted over the network.

## Smart Contract Deployment

Deploy smart contracts to the Forge Mini Chain through the web interface:

1. Navigate to the "Deploy Contract" tab
2. Enter the deployer's address and private key
3. Paste the contract bytecode (compiled smart contract)
4. Optionally provide constructor arguments in hex format
5. Set gas limit and gas price for the deployment
6. Click "Deploy Contract"
7. View the deployment result showing:
   - Transaction hash
   - Contract address
   - Deployment status

## Tabbed Interface

The explorer features a tabbed interface for easy navigation between features:

### Blocks Tab
- Displays the latest block information
- Shows block details including timestamp, gas usage, and transactions
- Lists all transactions in the latest block with details

### Wallet Tab
- Generate new wallets with cryptographic key pairs
- Choose between Ed25519 and Secp256k1 algorithms
- Download wallet key pairs for secure storage

### Deploy Contract Tab
- User-friendly form for smart contract deployment
- All required fields for contract deployment
- Real-time deployment results and status

## Account Details

Search for account information by entering an address in the search box:

- Account balance
- Nonce (transaction count)
- Reputation score
- Contract code (if applicable)

## Real-time Monitoring

The explorer connects to the blockchain node via WebSocket for real-time updates:

- New blocks appear automatically
- Transaction updates in real-time
- EVM statistics updates

## API Integration

The explorer uses the following API endpoints from the blockchain node:

- `GET /health` - Node status and health information
- `GET /head` - Latest block information
- `GET /account/:addr` - Account details
- `GET /evm/stats` - EVM statistics
- `POST /tx` - Submit transactions

## Security Notes

- All cryptographic operations are performed locally in your browser
- Private keys are never transmitted over the network
- Always verify you're on the correct website before entering private keys
- Use secure connections (HTTPS) in production environments

## Development

### Project Structure

```
explorer/
├── public/
│   ├── index.html     # Main HTML file
│   ├── app.js         # Frontend JavaScript logic
│   ├── crypto.js      # Cryptographic functions
│   └── styles.css     # Additional CSS styles
├── server.js          # Express server
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

### Customization

To customize the explorer:

1. Modify `public/index.html` for layout changes
2. Update `public/app.js` for functionality changes
3. Adjust `public/styles.css` for styling
4. Modify `server.js` for server-side changes

### Adding New Features

To add new features to the explorer:

1. Add new tabs in `public/index.html`
2. Implement functionality in `public/app.js`
3. Add necessary styling in `public/styles.css`
4. Ensure proper API integration with the blockchain node

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Stop existing processes using port 3000
   - Change the port in `server.js`

2. **Connection refused**:
   - Ensure the blockchain node is running
   - Check that the API is accessible at http://localhost:8080

3. **Features not working**:
   - Verify browser compatibility (modern browsers recommended)
   - Check browser console for JavaScript errors

### Browser Compatibility

The explorer works best with modern browsers that support:
- ES6 JavaScript features
- Web Crypto API
- Fetch API
- WebSocket API

Recommended browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Integration with Forge Mini Chain

The explorer is designed to work seamlessly with the Forge Mini Chain:

- Connects to the node's REST API
- Uses WebSocket for real-time updates
- Supports all transaction types
- Displays EVM-compatible contract information

For more information about the Forge Mini Chain, see the main project documentation.
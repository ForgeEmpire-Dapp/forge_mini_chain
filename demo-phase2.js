#!/usr/bin/env node

/**
 * @fileoverview Demo script for Phase 2 EVM functionality - Smart Contract Support
 */

import { generateKeyPair, SignatureAlgorithm } from "./dist/crypto.js";
import { signTx } from "./dist/tx.js";

console.log("🚀 Phase 2 EVM-Enabled Mini Blockchain Demo\n");
console.log("🔗 Smart Contract Deployment and Interaction\n");

// Create demo accounts
console.log("1. Creating demo accounts...");
const deployer = generateKeyPair(SignatureAlgorithm.SECP256K1); // Use secp256k1 for Ethereum compatibility
const user = generateKeyPair(SignatureAlgorithm.SECP256K1);

console.log(`   Deployer: ${deployer.address} (${deployer.algorithm})`);
console.log(`   User: ${user.address} (${user.algorithm})\n`);

// Simple ERC20-like contract bytecode (simplified for demo)
const erc20Bytecode = "0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506000600181905550600254600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506101f2806100b06000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c806318160ddd1461005c57806370a0823114610078578063a9059cbb146100a8578063dd62ed3e146100c4578063095ea7b3146100f4575b600080fd5b610062610110565b60405161006f9190610186565b60405180910390f35b610092600480360381019061008d919061013b565b610119565b60405161009f9190610186565b60405180910390f35b6100c260048036038101906100bd9190610168565b610131565b005b6100de60048036038101906100d99190610195565b6101a7565b6040516100eb9190610186565b60405180910390f35b61010e600480360381019061010991906101d5565b6101cc565b005b60006001549050919050565b60006020528060005260406000206000915090505481565b8060008060003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546101819190610215565b92505081905550806000808473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546101d69190610249565b9250508190555050565b600060405180910390fd5b600080fd5b6000819050919050565b6101ff816101ec565b811461020a57600080fd5b50565b60008135905061021c816101f6565b92915050565b60008060408385031215610239576102386101e7565b5b60006102478582860161020d565b92505060206102588582860161020d565b9150509250929050565b6000610283610278846101ec565b6101ec565b90508281526020810184848401111561029f5761029e6101e2565b5b6102aa848285610222565b509392505050565b6000806000606084860312156102cb576102ca6101e7565b5b60006102d98682870161020d565b93505060206102ea8682870161020d565b92505060406102fb8682870161020d565b9150509250925092565b61030e816101ec565b82525050565b60006020820190506103296000830184610305565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061035a8261032f565b9050919050565b61036a8161034f565b811461037557600080fd5b50565b60008135905061038781610361565b92915050565b600080604083850312156103a4576103a36101e7565b5b60006103b285828601610378565b92505060206103c38582860161020d565b9150509250929050565b6000602082840312156103e3576103e26101e7565b5b60006103f184828501610378565b91505092915050565b6000819050919050565b610415610410826101ec565b6103fa565b82525050565b6000604082019050610430600083018561040a565b61043d602083018461040a565b9392505050565b600060408201905061045960008301856103fa565b610466602083018461040a565b9392505050565b600060408201905061048260008301856103fa565b61048f602083018461040a565b939250505056fea2646970667358221220f8e2c1b4d5a8e7f6c3d2a9b8c7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7f6c5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7f6c5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7f64736f6c63430008120033";

// Constructor arguments for ERC20 (name, symbol, supply)
const constructorArgs = "0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000003d0900000000000000000000000000000000000000000000000000000000000000000a4d696e69546f6b656e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044d544b4e00000000000000000000000000000000000000000000000000000000";

console.log("2. Creating smart contract deployment transaction...");
const deployTx = {
  type: "deploy",
  from: deployer.address,
  bytecode: erc20Bytecode,
  value: 0n,
  constructorArgs: constructorArgs,
  nonce: 1,
  gasLimit: 2000000n, // 2M gas for deployment
  gasPrice: 20000000000n, // 20 Gwei
  data: "0x"
};

console.log("   Contract Deployment Details:");
console.log(`   - Deployer: ${deployTx.from}`);
console.log(`   - Bytecode Size: ${(deployTx.bytecode.length - 2) / 2} bytes`);
console.log(`   - Gas Limit: ${deployTx.gasLimit}`);
console.log(`   - Gas Price: ${deployTx.gasPrice} wei (20 Gwei)`);
console.log(`   - Estimated Fee: ${deployTx.gasLimit * deployTx.gasPrice} wei\n`);

// Sign the deployment transaction
console.log("3. Signing deployment transaction...");
const chainId = "forge-mini";
const signedDeployTx = signTx(deployTx, chainId, deployer.privateKey, deployer.publicKey, deployer.algorithm);

console.log(`   Signed deployment transaction hash: ${signedDeployTx.hash}\n`);

// Create contract call transaction (transfer function)
console.log("4. Creating smart contract call transaction...");

// Assume contract deployed at address (this would be calculated during deployment)
const contractAddress = "0x742c3f0f6e8a14b9c7d5e2a3b8f6c4d8e9a1c7b5";

// ERC20 transfer function call data: transfer(address to, uint256 amount)
// Function signature: transfer(address,uint256) -> 0xa9059cbb
// Encoded parameters: recipient address + amount (100 tokens with 18 decimals)
const transferCallData = "0xa9059cbb" + 
  user.address.slice(2).padStart(64, '0') + 
  "0000000000000000000000000000000000000000000000056bc75e2d630eb000"; // 100 * 10^18

const callTx = {
  type: "call",
  from: deployer.address,
  to: contractAddress,
  value: 0n, // No ETH transfer, just function call
  data: transferCallData,
  nonce: 2,
  gasLimit: 100000n, // 100k gas for transfer
  gasPrice: 20000000000n, // 20 Gwei
};

console.log("   Contract Call Details:");
console.log(`   - Caller: ${callTx.from}`);
console.log(`   - Contract: ${callTx.to}`);
console.log(`   - Function: transfer(address,uint256)`);
console.log(`   - Recipient: ${user.address}`);
console.log(`   - Amount: 100 tokens`);
console.log(`   - Gas Limit: ${callTx.gasLimit}`);
console.log(`   - Call Data: ${callTx.data}\n`);

// Sign the contract call transaction
console.log("5. Signing contract call transaction...");
const signedCallTx = signTx(callTx, chainId, deployer.privateKey, deployer.publicKey, deployer.algorithm);

console.log(`   Signed call transaction hash: ${signedCallTx.hash}\n`);

// Create submission commands
console.log("6. API submission commands:");
console.log("   Deploy contract:");
console.log(`   curl -X POST -H "Content-Type: application/json" \\`);

// Convert BigInt to string for JSON serialization
const serializableDeployTx = JSON.parse(JSON.stringify(signedDeployTx, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
));

console.log(`        -d '${JSON.stringify(serializableDeployTx, null, 2)}' \\`);
console.log(`        http://localhost:8080/tx\n`);

console.log("   Call contract function:");
console.log(`   curl -X POST -H "Content-Type: application/json" \\`);

const serializableCallTx = JSON.parse(JSON.stringify(signedCallTx, (key, value) => 
  typeof value === 'bigint' ? value.toString() : value
));

console.log(`        -d '${JSON.stringify(serializableCallTx, null, 2)}' \\`);
console.log(`        http://localhost:8080/tx\n`);

console.log("7. Start the EVM-enabled blockchain node:");
console.log("   For Leader Node:");
console.log(`   $env:LEADER="1"; npm run dev\n`);

console.log("🎯 Phase 2 EVM Enhancements Include:");
console.log("   ✅ Smart contract deployment (deploy tx type)");
console.log("   ✅ Smart contract interaction (call tx type)");
console.log("   ✅ EthereumJS EVM integration");
console.log("   ✅ Contract address calculation");
console.log("   ✅ Contract storage management");
console.log("   ✅ Event/log extraction");
console.log("   ✅ Gas calculation for contracts");
console.log("   ✅ ECDSA (secp256k1) signature support");
console.log("   ✅ Ethereum-compatible address derivation\n");

console.log("📋 New Transaction Types:");
console.log("   deploy: Deploy smart contracts");
console.log("   call: Interact with deployed contracts\n");

console.log("🔍 Enhanced Monitoring:");
console.log("   GET /health                 # Node health");
console.log("   GET /head                   # Latest block with contract txs");
console.log("   GET /account/<address>      # Account state (EOA or contract)");
console.log("   POST /tx                    # Submit any transaction type\n");

console.log("💡 Smart Contract Features:");
console.log("   - Full EVM bytecode execution");
console.log("   - Contract storage persistence");
console.log("   - Event emission and logging"); 
console.log("   - Inter-contract calls");
console.log("   - Value transfers to contracts");
console.log("   - Gas-based execution limits\n");

console.log("🌟 Ethereum Compatibility:");
console.log("   - secp256k1 signatures");
console.log("   - Keccak256 hashing");
console.log("   - Ethereum address format");
console.log("   - EVM bytecode execution");
console.log("   - Solidity contract support\n");

console.log("Ready to deploy and interact with smart contracts! 🎉");
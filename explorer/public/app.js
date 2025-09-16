const API_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const accountDetails = document.getElementById('account-details');
    const blocksContainer = document.getElementById('blocks-container');
    const refreshBlocksButton = document.getElementById('refresh-blocks');
    const notification = document.getElementById('notification');
    const blockHeightElement = document.getElementById('block-height');
    const contractCountElement = document.getElementById('contract-count');
    const healthInfoElement = document.getElementById('health-info');
    
    // Wallet elements
    const generateWalletButton = document.getElementById('generate-wallet');
    const algorithmSelect = document.getElementById('algorithm-select');
    const walletResult = document.getElementById('wallet-result');
    const walletAddress = document.getElementById('wallet-address');
    const walletPublicKey = document.getElementById('wallet-public-key');
    const walletPrivateKey = document.getElementById('wallet-private-key');
    const downloadKeysButton = document.getElementById('download-keys');
    
    // Deployment elements
    const deployContractButton = document.getElementById('deploy-contract');
    const deployerAddress = document.getElementById('deployer-address');
    const deployerPrivateKey = document.getElementById('deployer-private-key');
    const contractBytecode = document.getElementById('contract-bytecode');
    const constructorArgs = document.getElementById('constructor-args');
    const gasLimit = document.getElementById('gas-limit');
    const gasPrice = document.getElementById('gas-price');
    const deploymentResult = document.getElementById('deployment-result');
    const txHash = document.getElementById('tx-hash');
    const contractAddressElement = document.getElementById('contract-address');
    const deploymentStatus = document.getElementById('deployment-status');
    
    // Tokenomics elements
    const tokenomicsTab = document.getElementById('tokenomics-tab');
    const supplyInfo = document.getElementById('supply-info');
    const tokenomicsInfo = document.getElementById('tokenomics-info');
    const refreshTokenomicsButton = document.getElementById('refresh-tokenomics');
    
    // Tab elements
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show active content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Show notification
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Fetch JSON with error handling
    async function fetchJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            showNotification(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    // Format timestamp
    function formatTimestamp(timestamp) {
        return new Date(timestamp).toLocaleString();
    }

    // Format hash (shorten for display)
    function formatHash(hash) {
        if (!hash) return 'N/A';
        if (hash.length <= 20) return hash;
        return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
    }

    // Format FORGE tokens
    function formatForgeTokens(wei) {
        if (!wei) return "0.00 FORGE";
        const forge = parseFloat(wei) / 1e18;
        return forge.toFixed(2) + " FORGE";
    }

    // Load health information
    async function loadHealthInfo() {
        const health = await fetchJson(`${API_URL}/health`);
        if (!health) {
            healthInfoElement.innerHTML = `
                <div class="error-message">
                    <p>Unable to connect to the blockchain node.</p>
                    <p>Please ensure the node is running on port 8080.</p>
                </div>
            `;
            return;
        }

        healthInfoElement.innerHTML = `
            <div class="account-info">
                <div class="account-item">
                    <span class="account-label">Status</span>
                    <span class="account-value">${health.status}</span>
                </div>
                <div class="account-item">
                    <span class="account-label">Uptime</span>
                    <span class="account-value">${Math.floor(health.uptime / 60)}m ${Math.floor(health.uptime % 60)}s</span>
                </div>
                <div class="account-item">
                    <span class="account-label">Memory</span>
                    <span class="account-value">${health.memory.heapUsed} MB</span>
                </div>
            </div>
        `;
    }

    // Load latest blocks
    async function loadLatestBlocks() {
        // Show loading state
        blocksContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading latest blocks...</p>
            </div>
        `;

        const head = await fetchJson(`${API_URL}/head`);
        if (!head) {
            blocksContainer.innerHTML = `
                <div class="error-message">
                    <p>Error connecting to API server.</p>
                    <p>Please make sure the blockchain node is running on port 8080.</p>
                </div>
            `;
            return;
        }

        // Update stats
        blockHeightElement.textContent = head.header.height;
        
        // Load EVM stats for contract count
        const evmStats = await fetchJson(`${API_URL}/evm/stats`);
        if (evmStats) {
            contractCountElement.textContent = evmStats.contractCount || 0;
        }

        // Display the head block
        let blocksHtml = `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">
                        <i class="fas fa-cube"></i>
                        Block #${head.header.height}
                    </div>
                    <div class="block-hash">${formatHash(head.hash)}</div>
                </div>
                
                <div class="block-info">
                    <div class="info-item">
                        <span class="info-label">Timestamp</span>
                        <span class="info-value">${formatTimestamp(head.header.timestamp)}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Transactions</span>
                        <span class="info-value">${head.txs.length}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gas Used</span>
                        <span class="info-value">${head.header.gasUsed || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Gas Limit</span>
                        <span class="info-value">${head.header.gasLimit || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Base Fee</span>
                        <span class="info-value">${formatForgeTokens(head.header.baseFeePerGas || 0)} per gas</span>
                    </div>
                </div>
                
                <div class="transactions-list">
                    <h4 style="margin-bottom: 1rem;">Transactions</h4>
                    ${head.txs.length > 0 ? head.txs.map(tx => `
                        <div class="transaction-item">
                            <div class="transaction-header">
                                <div>TX: ${formatHash(tx.hash)}</div>
                                <div>Type: ${tx.tx.type}</div>
                            </div>
                            <div class="tx-details">
                                <div class="tx-detail-item">
                                    <span class="info-label">From</span>
                                    <span class="info-value">${formatHash(tx.tx.from)}</span>
                                </div>
                                <div class="tx-detail-item">
                                    <span class="info-label">To</span>
                                    <span class="info-value">${tx.tx.to ? formatHash(tx.tx.to) : 'Contract Creation'}</span>
                                </div>
                                <div class="tx-detail-item">
                                    <span class="info-label">Value</span>
                                    <span class="info-value">${formatForgeTokens(tx.tx.value || 0)}</span>
                                </div>
                                <div class="tx-detail-item">
                                    <span class="info-label">Gas Price</span>
                                    <span class="info-value">${formatForgeTokens(tx.tx.gasPrice || 0)} per gas</span>
                                </div>
                            </div>
                        </div>
                    `).join('') : '<p style="text-align: center; color: var(--dark-gray);">No transactions in this block</p>'}
                </div>
            </div>
        `;
        
        blocksContainer.innerHTML = blocksHtml;
    }

    // Search for account
    async function searchAccount() {
        const address = searchInput.value.trim();
        if (!address) {
            showNotification('Please enter an address to search', 'error');
            return;
        }

        // Show loading state
        accountDetails.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading account details...</p>
            </div>
        `;

        const account = await fetchJson(`${API_URL}/account/${address}`);
        if (account) {
            accountDetails.innerHTML = `
                <div class="account-details">
                    <div class="account-info">
                        <div class="account-item">
                            <span class="account-label">Address</span>
                            <span class="account-value">${address}</span>
                        </div>
                        <div class="account-item">
                            <span class="account-label">FORGE Balance</span>
                            <span class="account-value">${formatForgeTokens(account.forgeBalance || 0)}</span>
                        </div>
                        <div class="account-item">
                            <span class="account-label">Nonce</span>
                            <span class="account-value">${account.nonce || 0}</span>
                        </div>
                        <div class="account-item">
                            <span class="account-label">Reputation</span>
                            <span class="account-value">${account.rep || 0}</span>
                        </div>
                    </div>
                </div>
            `;
            showNotification('Account details loaded successfully');
        } else {
            accountDetails.innerHTML = `
                <div class="error-message">
                    <p>Account not found or error connecting to API.</p>
                    <p>Please check the address and try again.</p>
                </div>
            `;
            showNotification('Account not found', 'error');
        }
    }

    // Load tokenomics data
    async function loadTokenomics() {
        // Show loading state
        supplyInfo.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading supply information...</p>
            </div>
        `;
        
        tokenomicsInfo.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading tokenomics data...</p>
            </div>
        `;

        // Load supply data
        const supply = await fetchJson(`${API_URL}/supply`);
        if (supply) {
            supplyInfo.innerHTML = `
                <div class="account-info">
                    <div class="account-item">
                        <span class="account-label">Total Supply</span>
                        <span class="account-value">${supply.totalSupplyFormatted}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Supply Cap</span>
                        <span class="account-value">${supply.supplyCapFormatted}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Percentage Minted</span>
                        <span class="account-value">${supply.percentageMinted.toFixed(2)}%</span>
                    </div>
                </div>
            `;
        } else {
            supplyInfo.innerHTML = `
                <div class="error-message">
                    <p>Error loading supply information.</p>
                </div>
            `;
        }

        // Load tokenomics data
        const tokenomics = await fetchJson(`${API_URL}/tokenomics`);
        if (tokenomics) {
            tokenomicsInfo.innerHTML = `
                <div class="account-info">
                    <div class="account-item">
                        <span class="account-label">Token Name</span>
                        <span class="account-value">${tokenomics.tokenName}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Symbol</span>
                        <span class="account-value">${tokenomics.tokenSymbol}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Decimals</span>
                        <span class="account-value">${tokenomics.decimals}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Block Reward</span>
                        <span class="account-value">${tokenomics.blockRewardFormatted}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Min Gas Price</span>
                        <span class="account-value">${tokenomics.minGasPriceFormatted}</span>
                    </div>
                    <div class="account-item">
                        <span class="account-label">Block Gas Limit</span>
                        <span class="account-value">${parseInt(tokenomics.blockGasLimit).toLocaleString()}</span>
                    </div>
                </div>
            `;
        } else {
            tokenomicsInfo.innerHTML = `
                <div class="error-message">
                    <p>Error loading tokenomics data.</p>
                </div>
            `;
        }
    }

    // Generate wallet
    async function generateWallet() {
        const algorithm = algorithmSelect.value;
        
        try {
            // Generate actual cryptographic keys
            const keyPair = await CryptoUtils.generateKeyPair(algorithm);
            
            // Display the generated wallet
            walletAddress.textContent = keyPair.address;
            walletPublicKey.textContent = keyPair.publicKey;
            walletPrivateKey.textContent = keyPair.privateKey;
            walletResult.style.display = 'block';
            
            showNotification('Wallet generated successfully!');
        } catch (error) {
            console.error('Error generating wallet:', error);
            showNotification(`Error generating wallet: ${error.message}`, 'error');
        }
    }

    // Download keys
    function downloadKeys() {
        const walletData = {
            address: walletAddress.textContent,
            publicKey: walletPublicKey.textContent,
            privateKey: walletPrivateKey.textContent,
            algorithm: algorithmSelect.value,
            createdAt: new Date().toISOString()
        };
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(walletData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "forge-wallet-keys.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showNotification('Keys downloaded successfully!');
    }

    // Deploy contract
    async function deployContract() {
        const address = deployerAddress.value.trim();
        const privateKey = deployerPrivateKey.value.trim();
        const bytecode = contractBytecode.value.trim();
        
        if (!address || !privateKey || !bytecode) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Show loading state
        deploymentResult.style.display = 'none';
        deployContractButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deploying...';
        deployContractButton.disabled = true;
        
        try {
            // In a real implementation, this would:
            // 1. Create a deploy transaction
            // 2. Sign it with the private key
            // 3. Submit it to the network via the API
            // 4. Wait for confirmation
            
            // For demo purposes, we'll simulate a successful deployment
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const mockTxHash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            const mockContractAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
            
            // Display results
            txHash.textContent = mockTxHash;
            contractAddressElement.textContent = mockContractAddress;
            deploymentStatus.textContent = 'Success';
            deploymentStatus.style.color = 'var(--success)';
            deploymentResult.style.display = 'block';
            
            showNotification('Contract deployed successfully!');
        } catch (error) {
            deploymentStatus.textContent = `Failed: ${error.message}`;
            deploymentStatus.style.color = 'var(--danger)';
            deploymentResult.style.display = 'block';
            
            showNotification(`Deployment failed: ${error.message}`, 'error');
        } finally {
            deployContractButton.innerHTML = '<i class="fas fa-rocket"></i> Deploy Contract';
            deployContractButton.disabled = false;
        }
    }

    // Event listeners
    searchButton.addEventListener('click', searchAccount);
    refreshBlocksButton.addEventListener('click', loadLatestBlocks);
    refreshTokenomicsButton.addEventListener('click', loadTokenomics);
    
    // Wallet events
    generateWalletButton.addEventListener('click', generateWallet);
    downloadKeysButton.addEventListener('click', downloadKeys);
    
    // Deployment events
    deployContractButton.addEventListener('click', deployContract);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchAccount();
        }
    });

    // Load initial data
    loadLatestBlocks();
    loadHealthInfo();
    
    // Refresh health info every 30 seconds
    setInterval(loadHealthInfo, 30000);
});
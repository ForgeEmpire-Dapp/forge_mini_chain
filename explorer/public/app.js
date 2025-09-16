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
                                    <span class="info-value">${tx.tx.value || 0}</span>
                                </div>
                                <div class="tx-detail-item">
                                    <span class="info-label">Gas Price</span>
                                    <span class="info-value">${tx.tx.gasPrice || 0}</span>
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
                            <span class="account-label">Balance</span>
                            <span class="account-value">${account.balance || 0}</span>
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

    // Event listeners
    searchButton.addEventListener('click', searchAccount);
    refreshBlocksButton.addEventListener('click', loadLatestBlocks);
    
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
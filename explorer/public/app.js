const API_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const accountDetails = document.getElementById('account-details');
    const blocksContainer = document.getElementById('blocks');

    async function fetchJson(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('Fetch error:', error);
            // Display error to user
            return null;
        }
    }

    async function loadLatestBlocks() {
        const head = await fetchJson(`${API_URL}/head`);
        if (!head) {
            blocksContainer.innerHTML = `<p>Error connecting to API server. Please make sure the blockchain node is running on port 8080.</p>
                <p>Available endpoints: /health, /head, /account/:addr, /evm/stats, /contract/:address/code, /contract/:address/storage/:key, /tx/:hash/receipt</p>`;
            return;
        }

        // Display only the head block since we don't have a way to get other blocks
        let blocksHtml = '';
        blocksHtml += `
            <div class="block">
                <h3>Head Block #${head.header.height}</h3>
                <p>Hash: ${head.hash}</p>
                <p>Timestamp: ${new Date(head.header.timestamp).toLocaleString()}</p>
                <h4>Transactions (${head.txs.length})</h4>
                <div class="tx-list">
                    ${head.txs.map(tx => `<div class="tx">
                        <p>From: ${tx.tx.from}</p>
                        <p>To: ${tx.tx.to || 'Contract Creation'}</p>
                        <p>Value: ${tx.tx.value}</p>
                        <p>Type: ${tx.tx.type}</p>
                    </div>`).join('') || 'No transactions'}
                </div>
            </div>
        `;
        blocksContainer.innerHTML = blocksHtml;
    }

    async function searchAccount() {
        const address = searchInput.value;
        if (!address) return;

        const account = await fetchJson(`${API_URL}/account/${address}`);
        if (account) {
            accountDetails.innerHTML = `
                <h4>Account Details</h4>
                <p>Address: ${address}</p>
                <p>Balance: ${account.balance}</p>
                <p>Nonce: ${account.nonce}</p>
                <p>Reputation: ${account.rep}</p>
            `;
        } else {
            accountDetails.innerHTML = `<p>Account not found or error connecting to API.</p>`;
        }
    }

    searchButton.addEventListener('click', searchAccount);
    loadLatestBlocks();
    
    // Add a refresh button to try loading blocks again
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Blocks';
    refreshButton.addEventListener('click', loadLatestBlocks);
    document.querySelector('h2').after(refreshButton);
});
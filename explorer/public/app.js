const API_URL = 'http://localhost:8080';

document.addEventListener('DOMContentLoaded', () => {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    const accountDetails = document.getElementById('account-details');
    const blocksContainer = document.getElementById('blocks');

    async function fetchJson(url) {
        const response = await fetch(url);
        return response.json();
    }

    async function loadLatestBlocks() {
        const head = await fetchJson(`${API_URL}/head`);
        if (!head) return;

        let blocksHtml = '';
        for (let i = head.header.height; i >= 0 && i > head.header.height - 10; i--) {
            const block = await fetchJson(`${API_URL}/block/${i}`);
            if (!block) continue;

            blocksHtml += `
                <div class="block">
                    <h3>Block #${block.header.height}</h3>
                    <p>Hash: ${block.hash}</p>
                    <p>Timestamp: ${new Date(block.header.timestamp).toLocaleString()}</p>
                    <h4>Transactions</h4>
                    <div class="tx-list">
                        ${block.txs.map(tx => `<div class="tx">...</div>`).join('') || 'No transactions'}
                    </div>
                </div>
            `;
        }
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
            accountDetails.innerHTML = `<p>Account not found.</p>`;
        }
    }

    searchButton.addEventListener('click', searchAccount);
    loadLatestBlocks();
});

import logger from './logger.js';
/**
 * Initializes the blockchain state with genesis configuration
 * @param state The blockchain state to initialize
 * @param genesisConfig The genesis configuration with initial allocations
 */
export async function initializeGenesis(state, genesisConfig) {
    logger.info('Initializing genesis state', {
        chainId: genesisConfig.chainId,
        accountCount: Object.keys(genesisConfig.alloc).length
    });
    // Allocate initial balances
    for (const [address, account] of Object.entries(genesisConfig.alloc)) {
        const genesisAccount = state.getOrCreate(address);
        genesisAccount.forgeBalance = BigInt(account.forgeBalance);
    }
    logger.info('Genesis state initialized', {
        totalSupply: genesisConfig.initialSupply
    });
}

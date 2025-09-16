/**
 * @fileoverview Genesis block configuration and initialization
 */
import { State } from "./state.js";
import logger from './logger.js';

export type GenesisAccount = {
  forgeBalance: string;
};

export type GenesisConfig = {
  alloc: {
    [address: string]: GenesisAccount;
  };
  blockReward: string;
  chainId: string;
  initialSupply: string;
};

/**
 * Initializes the blockchain state with genesis configuration
 * @param state The blockchain state to initialize
 * @param genesisConfig The genesis configuration with initial allocations
 */
export async function initializeGenesis(state: State, genesisConfig: GenesisConfig): Promise<void> {
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
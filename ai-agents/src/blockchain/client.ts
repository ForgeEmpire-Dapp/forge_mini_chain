import axios from 'axios';
import { WebSocket } from 'ws';

export class BlockchainClient {
  private apiEndpoint: string;
  private wsEndpoint: string;
  private httpClient: any;

  constructor(config: { apiEndpoint: string; wsEndpoint: string }) {
    this.apiEndpoint = config.apiEndpoint;
    this.wsEndpoint = config.wsEndpoint;
    this.httpClient = axios.create({
      baseURL: this.apiEndpoint,
      timeout: 5000
    });
  }

  async getAccount(address: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/account/${address}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account: ${error}`);
    }
  }

  async getHead(): Promise<any> {
    try {
      const response = await this.httpClient.get('/head');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get head block: ${error}`);
    }
  }

  async submitTransaction(transaction: any): Promise<string> {
    try {
      const response = await this.httpClient.post('/tx', transaction);
      return response.data.hash;
    } catch (error) {
      throw new Error(`Failed to submit transaction: ${error}`);
    }
  }

  subscribeToBlocks(callback: (block: any) => void): void {
    const ws = new WebSocket(`${this.wsEndpoint}/subscribe/blocks`);
    
    ws.on('open', () => {
      console.log('Connected to block subscription');
    });

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'block') {
          callback(message.data);
        }
      } catch (error) {
        console.error('Error parsing block message:', error);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
}
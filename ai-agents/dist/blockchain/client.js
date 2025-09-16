"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainClient = void 0;
const axios_1 = __importDefault(require("axios"));
const ws_1 = require("ws");
class BlockchainClient {
    constructor(config) {
        this.apiEndpoint = config.apiEndpoint;
        this.wsEndpoint = config.wsEndpoint;
        this.httpClient = axios_1.default.create({
            baseURL: this.apiEndpoint,
            timeout: 5000
        });
    }
    async getAccount(address) {
        try {
            const response = await this.httpClient.get(`/account/${address}`);
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get account: ${error}`);
        }
    }
    async getHead() {
        try {
            const response = await this.httpClient.get('/head');
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get head block: ${error}`);
        }
    }
    async submitTransaction(transaction) {
        try {
            const response = await this.httpClient.post('/tx', transaction);
            return response.data.hash;
        }
        catch (error) {
            throw new Error(`Failed to submit transaction: ${error}`);
        }
    }
    subscribeToBlocks(callback) {
        const ws = new ws_1.WebSocket(`${this.wsEndpoint}/subscribe/blocks`);
        ws.on('open', () => {
            console.log('Connected to block subscription');
        });
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                if (message.type === 'block') {
                    callback(message.data);
                }
            }
            catch (error) {
                console.error('Error parsing block message:', error);
            }
        });
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    }
}
exports.BlockchainClient = BlockchainClient;

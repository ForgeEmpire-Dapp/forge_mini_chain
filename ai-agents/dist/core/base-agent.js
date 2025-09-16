"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const client_1 = require("../blockchain/client");
class BaseAgent extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.running = false;
        this.config = config;
        this.logger = new logger_1.Logger(`Agent:${config.id}`);
        this.blockchainClient = new client_1.BlockchainClient(config.blockchain);
    }
    async run() {
        if (!this.config.enabled) {
            this.logger.warn('Agent is disabled, skipping execution');
            return;
        }
        try {
            this.logger.info('Starting agent cycle');
            const perception = await this.perceive();
            const plan = await this.plan(perception);
            const result = await this.execute(plan);
            this.logger.info('Agent cycle completed', { result });
            this.emit('cycleComplete', result);
        }
        catch (error) {
            this.logger.error('Agent cycle failed', { error });
            this.emit('cycleError', error);
        }
    }
    async start() {
        this.running = true;
        this.logger.info('Agent started');
        this.emit('started');
    }
    async stop() {
        this.running = false;
        this.logger.info('Agent stopped');
        this.emit('stopped');
    }
    getConfig() {
        return this.config;
    }
    getStatus() {
        return {
            running: this.running,
            enabled: this.config.enabled
        };
    }
}
exports.BaseAgent = BaseAgent;

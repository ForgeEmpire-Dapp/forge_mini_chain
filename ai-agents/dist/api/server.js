"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentApiServer = void 0;
const express_1 = __importDefault(require("express"));
const logger_1 = require("../utils/logger");
class AgentApiServer {
    constructor(agentManager, port = 3001) {
        this.app = (0, express_1.default)();
        this.agentManager = agentManager;
        this.logger = new logger_1.Logger('AgentApiServer');
        this.port = port;
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
            next();
        });
    }
    setupRoutes() {
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        // List all agents
        this.app.get('/api/v1/agents', (req, res) => {
            try {
                const agents = this.agentManager.listAgents();
                res.json(agents);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Get agent by ID
        this.app.get('/api/v1/agents/:agentId', (req, res) => {
            try {
                const agent = this.agentManager.getAgent(req.params.agentId);
                if (agent) {
                    res.json({
                        id: agent.getConfig().id,
                        name: agent.getConfig().name,
                        type: agent.getConfig().type,
                        status: agent.getStatus()
                    });
                }
                else {
                    res.status(404).json({ error: 'Agent not found' });
                }
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Create/register new agent
        this.app.post('/api/v1/agents', (req, res) => {
            try {
                // In a real implementation, you would create and register the agent
                // based on the request body
                res.status(201).json({ message: 'Agent created', agentId: req.body.id });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Start agent
        this.app.post('/api/v1/agents/:agentId/start', (req, res) => {
            try {
                this.agentManager.startAgent(req.params.agentId);
                res.json({ message: 'Agent started' });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Stop agent
        this.app.post('/api/v1/agents/:agentId/stop', (req, res) => {
            try {
                this.agentManager.stopAgent(req.params.agentId);
                res.json({ message: 'Agent stopped' });
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
        // Run agent immediately
        this.app.post('/api/v1/agents/:agentId/run', async (req, res) => {
            try {
                const agent = this.agentManager.getAgent(req.params.agentId);
                if (agent) {
                    await agent.run();
                    res.json({ message: 'Agent run completed' });
                }
                else {
                    res.status(404).json({ error: 'Agent not found' });
                }
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }
    start() {
        this.app.listen(this.port, () => {
            this.logger.info(`Agent API server started on port ${this.port}`);
        });
    }
}
exports.AgentApiServer = AgentApiServer;

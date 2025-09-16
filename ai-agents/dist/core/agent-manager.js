"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentManager = void 0;
const logger_1 = require("../utils/logger");
class AgentManager {
    constructor() {
        this.agents = new Map();
        this.timers = new Map();
        this.logger = new logger_1.Logger('AgentManager');
    }
    registerAgent(agent) {
        this.agents.set(agent.getConfig().id, agent);
        this.logger.info(`Agent registered: ${agent.getConfig().id}`);
    }
    unregisterAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            agent.stop();
            this.agents.delete(agentId);
            this.clearSchedule(agentId);
            this.logger.info(`Agent unregistered: ${agentId}`);
        }
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    listAgents() {
        return Array.from(this.agents.entries()).map(([id, agent]) => ({
            id,
            name: agent.getConfig().name,
            type: agent.getConfig().type,
            status: agent.getStatus()
        }));
    }
    async startAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            await agent.start();
        }
    }
    async stopAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (agent) {
            await agent.stop();
        }
    }
    scheduleAgent(agentId, interval) {
        const agent = this.agents.get(agentId);
        if (agent) {
            // Clear existing schedule if any
            this.clearSchedule(agentId);
            // Set up new schedule
            const timer = setInterval(async () => {
                try {
                    await agent.run();
                }
                catch (error) {
                    this.logger.error(`Scheduled run failed for agent ${agentId}`, { error });
                }
            }, interval);
            this.timers.set(agentId, timer);
            this.logger.info(`Agent scheduled: ${agentId} every ${interval}ms`);
        }
    }
    clearSchedule(agentId) {
        const timer = this.timers.get(agentId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(agentId);
        }
    }
    async startAll() {
        for (const [id, agent] of this.agents) {
            if (agent.getConfig().enabled) {
                await agent.start();
            }
        }
    }
    async stopAll() {
        for (const [id, agent] of this.agents) {
            await agent.stop();
        }
        // Clear all schedules
        for (const [agentId, timer] of this.timers) {
            clearInterval(timer);
        }
        this.timers.clear();
    }
}
exports.AgentManager = AgentManager;

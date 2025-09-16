import { BaseAgent } from './base-agent';
import { Logger } from '../utils/logger';

export class AgentManager {
  private agents: Map<string, BaseAgent> = new Map();
  private logger: Logger;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.logger = new Logger('AgentManager');
  }

  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.getConfig().id, agent);
    this.logger.info(`Agent registered: ${agent.getConfig().id}`);
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.stop();
      this.agents.delete(agentId);
      this.clearSchedule(agentId);
      this.logger.info(`Agent unregistered: ${agentId}`);
    }
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  listAgents(): Array<{ id: string; name: string; type: string; status: any }> {
    return Array.from(this.agents.entries()).map(([id, agent]) => ({
      id,
      name: agent.getConfig().name,
      type: agent.getConfig().type,
      status: agent.getStatus()
    }));
  }

  async startAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.start();
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      await agent.stop();
    }
  }

  scheduleAgent(agentId: string, interval: number): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      // Clear existing schedule if any
      this.clearSchedule(agentId);
      
      // Set up new schedule
      const timer = setInterval(async () => {
        try {
          await agent.run();
        } catch (error) {
          this.logger.error(`Scheduled run failed for agent ${agentId}`, { error });
        }
      }, interval);
      
      this.timers.set(agentId, timer);
      this.logger.info(`Agent scheduled: ${agentId} every ${interval}ms`);
    }
  }

  private clearSchedule(agentId: string): void {
    const timer = this.timers.get(agentId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(agentId);
    }
  }

  async startAll(): Promise<void> {
    for (const [id, agent] of this.agents) {
      if (agent.getConfig().enabled) {
        await agent.start();
      }
    }
  }

  async stopAll(): Promise<void> {
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
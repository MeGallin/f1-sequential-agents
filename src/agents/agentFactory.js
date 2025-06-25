import CircuitAnalysisAgent from './circuitAgent.js';
import DriverPerformanceAgent from './driverAgent.js';
import ConstructorAnalysisAgent from './constructorAgent.js';
import RaceResultsAgent from './raceResultsAgent.js';
import ChampionshipAgent from './championshipAgent.js';
import HistoricalDataAgent from './historicalAgent.js';

class AgentFactory {
  constructor() {
    this.agents = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🏎️  Initializing F1 Specialized Agents...');

      // Initialize all agents
      this.agents.set('circuit', new CircuitAnalysisAgent());
      this.agents.set('driver', new DriverPerformanceAgent());
      this.agents.set('constructor', new ConstructorAnalysisAgent());
      this.agents.set('raceResults', new RaceResultsAgent());
      this.agents.set('championship', new ChampionshipAgent());
      this.agents.set('historical', new HistoricalDataAgent());

      console.log(`✅ Initialized ${this.agents.size} F1 agents successfully`);
      
      // Run health checks
      await this.performHealthChecks();
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ Agent initialization failed:', error);
      throw error;
    }
  }

  async performHealthChecks() {
    console.log('🔍 Performing agent health checks...');
    
    const healthPromises = Array.from(this.agents.entries()).map(async ([agentId, agent]) => {
      try {
        const health = await agent.healthCheck();
        console.log(`${health.status === 'healthy' ? '✅' : '❌'} ${agentId}: ${health.status}`);
        return { agentId, ...health };
      } catch (error) {
        console.log(`❌ ${agentId}: health check failed - ${error.message}`);
        return { agentId, status: 'unhealthy', error: error.message };
      }
    });

    const healthResults = await Promise.all(healthPromises);
    const healthyAgents = healthResults.filter(result => result.status === 'healthy');
    
    console.log(`🏁 Health check complete: ${healthyAgents.length}/${this.agents.size} agents healthy`);
    
    return healthResults;
  }

  getAgent(agentId) {
    if (!this.initialized) {
      throw new Error('Agent factory not initialized. Call initialize() first.');
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found. Available agents: ${this.getAvailableAgents().join(', ')}`);
    }

    return agent;
  }

  getAvailableAgents() {
    return Array.from(this.agents.keys());
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  getAgentInfo(agentId) {
    const agent = this.getAgent(agentId);
    return agent.getAgentInfo();
  }

  getAllAgentInfo() {
    return Array.from(this.agents.entries()).map(([agentId, agent]) => ({
      id: agentId,
      ...agent.getAgentInfo()
    }));
  }

  async routeQuery(query) {
    if (!this.initialized) {
      await this.initialize();
    }

    const routingScore = this.calculateRoutingScores(query);
    const bestAgent = routingScore[0];

    console.log(`🎯 Query routed to: ${bestAgent.agentId} (confidence: ${bestAgent.confidence})`);
    
    return {
      selectedAgent: bestAgent.agentId,
      confidence: bestAgent.confidence,
      alternatives: routingScore.slice(1, 3),
      agent: this.getAgent(bestAgent.agentId)
    };
  }

  calculateRoutingScores(query) {
    const queryLower = query.toLowerCase();
    const scores = [];

    this.agents.forEach((agent, agentId) => {
      let score = 0;
      const config = agent.config;

      // Check keyword matches
      config.keywords.forEach(keyword => {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      // Check specialization relevance
      config.specialization.forEach(spec => {
        const specWords = spec.toLowerCase().split(' ');
        const matches = specWords.filter(word => 
          queryLower.includes(word) && word.length > 3
        );
        score += matches.length * 0.5;
      });

      // Boost for direct agent name mentions
      if (queryLower.includes(agentId)) score += 3;
      if (queryLower.includes(config.name.toLowerCase())) score += 2;

      scores.push({
        agentId,
        score,
        confidence: Math.min(score / 5, 1) // Normalize to 0-1
      });
    });

    // Sort by score descending
    return scores.sort((a, b) => b.score - a.score);
  }

  async processQuery(agentId, query, context = {}) {
    try {
      const agent = this.getAgent(agentId);
      return await agent.processQuery(query, context);
    } catch (error) {
      console.error(`Error processing query with ${agentId}:`, error);
      throw error;
    }
  }

  async processQueryWithRouting(query, context = {}) {
    try {
      const routing = await this.routeQuery(query);
      const result = await this.processQuery(routing.selectedAgent, query, context);
      
      return {
        ...result,
        routing: {
          selectedAgent: routing.selectedAgent,
          confidence: routing.confidence,
          alternatives: routing.alternatives
        }
      };
    } catch (error) {
      console.error('Error processing query with routing:', error);
      throw error;
    }
  }

  async processMultiAgentQuery(query, agentIds, context = {}) {
    try {
      console.log(`🔄 Processing multi-agent query with: ${agentIds.join(', ')}`);
      
      const results = await Promise.all(
        agentIds.map(agentId => this.processQuery(agentId, query, context))
      );

      return {
        query,
        multiAgent: true,
        results: results.map((result, index) => ({
          agentId: agentIds[index],
          ...result
        })),
        synthesis: this.synthesizeMultiAgentResults(results)
      };
    } catch (error) {
      console.error('Error processing multi-agent query:', error);
      throw error;
    }
  }

  synthesizeMultiAgentResults(results) {
    const successfulResults = results.filter(r => r.success);
    
    return {
      totalAgents: results.length,
      successfulAgents: successfulResults.length,
      averageConfidence: successfulResults.length > 0 
        ? (successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length).toFixed(2)
        : 0,
      combinedInsights: 'Multi-agent synthesis would combine insights from all successful agent responses',
      recommendations: 'Synthesized recommendations based on multiple agent perspectives'
    };
  }

  getAgentCapabilities() {
    return {
      totalAgents: this.agents.size,
      capabilities: Array.from(this.agents.entries()).map(([agentId, agent]) => ({
        id: agentId,
        name: agent.config.name,
        specializations: agent.config.specialization,
        keywords: agent.config.keywords.slice(0, 5), // First 5 keywords
        tools: agent.tools.length
      }))
    };
  }

  getSystemStatus() {
    return {
      initialized: this.initialized,
      totalAgents: this.agents.size,
      availableAgents: this.getAvailableAgents(),
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    console.log('🛑 Shutting down agent factory...');
    
    // Perform cleanup if needed
    this.agents.clear();
    this.initialized = false;
    
    console.log('✅ Agent factory shutdown complete');
  }
}

// Export singleton instance
export const agentFactory = new AgentFactory();

// For testing and alternative usage
export { AgentFactory };
export default agentFactory;
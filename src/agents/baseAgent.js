import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from '@langchain/core/messages';
import { modelConfig } from '../config/modelConfig.js';
import { agentConfig } from '../config/agentConfig.js';

export class BaseF1Agent {
  constructor(agentId, tools = []) {
    this.agentId = agentId;
    this.config = agentConfig[agentId];
    this.tools = tools;
    this._model = null; // Lazy initialization

    if (!this.config) {
      throw new Error(`Agent configuration not found for: ${agentId}`);
    }

    console.log(`🤖 Initialized ${this.config.name}`);
  }

  // Get system prompt for the agent
  getSystemPrompt() {
    return `You are the ${
      this.config.name
    }, a specialized AI assistant for Formula 1 analysis.

ROLE: ${this.config.description}

SPECIALIZATIONS:
${this.config.specialization.map((spec) => `• ${spec}`).join('\n')}

GUIDELINES:
1. Focus on F1-specific analysis and insights
2. Use precise F1 terminology and technical language
3. Provide data-driven analysis when possible
4. Reference specific races, seasons, drivers, and constructors
5. Include relevant statistics and historical context
6. Format responses with clear structure and bullet points
7. Always cite data sources when making claims

RESPONSE FORMAT:
• Start with a brief summary
• Provide detailed analysis with supporting data
• Include relevant context and comparisons
• End with key insights or conclusions

Remember: You are an expert in ${
      this.agentId
    } analysis. Leverage your specialized knowledge to provide authoritative F1 insights.`;
  }

  // Lazy initialization of model to ensure environment variables are loaded
  get model() {
    if (!this._model) {
      this._model = modelConfig.getModelInstance({
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });
    }
    return this._model;
  }

  // Process a query with the agent - Updated to follow TFL pattern
  async processQuery(query, context = {}) {
    try {
      const startTime = Date.now();
      console.log(`🏁 ${this.config.name} processing: "${query}"`);

      // Prepare messages
      const systemPrompt = await this.getSystemPrompt();
      const messages = [
        new SystemMessage(systemPrompt),
      ];

      // Add conversation history if available (TFL pattern)
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        // Add recent conversation history
        const recentHistory = context.conversationHistory.slice(-3);
        recentHistory.forEach((entry) => {
          if (entry.role === 'user') {
            messages.push(new HumanMessage(entry.content));
          } else if (entry.role === 'assistant') {
            messages.push(new AIMessage(entry.content));
          }
        });
      }

      // Handle year clarification context (Monaco -> "this year" flow)
      if (context.needsYearClarification) {
        const clarification = context.needsYearClarification;
        
        if (clarification.context === 'year_clarification') {
          // User is responding to a year clarification request
          const contextMessage = `CONTEXT: The user previously asked "${clarification.originalQuery}" and you asked for year clarification. They responded with "${clarification.yearResponse}". 

INSTRUCTIONS:
1. Interpret their year response (e.g., "this year" = 2024, "current season" = 2024, "last year" = 2023)
2. Answer their original question using that interpreted year
3. If they said "this year" or "current season", use 2024
4. If they said "last year", use 2023
5. If they specified a specific year like "2023", use that year

Answer the original question: "${clarification.originalQuery}" for the year you determined from "${clarification.yearResponse}".`;
          
          messages.push(new HumanMessage(contextMessage));
        } else {
          // User query needs year clarification
          const contextMessage = `INSTRUCTION: The user asked about "${query}" but didn't specify a year. Ask them which year they're referring to. Current year is 2024. Be helpful and direct.`;
          messages.push(new HumanMessage(contextMessage));
        }
      }

      // Add F1 data context if available
      if (context.f1Data && Object.keys(context.f1Data).length > 0) {
        const dataContext = this.formatF1DataContext(context.f1Data);
        messages.push(new HumanMessage(`Context data: ${dataContext}`));
      }

      // Add the current user query
      messages.push(new HumanMessage(query));

      // Invoke the model
      const response = await this.model.invoke(messages);
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ ${this.config.name} completed in ${processingTime}s`);

      return {
        success: true,
        response: response.content,
        agentId: this.agentId,
        agentName: this.config.name,
        processingTime: `${processingTime}s`,
        confidence: this.calculateConfidence(query, response.content),
        metadata: {
          timestamp: new Date().toISOString(),
          model: this.config.model,
          temperature: this.config.temperature,
        },
      };
    } catch (error) {
      console.error(`❌ ${this.config.name} error:`, error.message);

      return {
        success: false,
        error: error.message,
        agentId: this.agentId,
        agentName: this.config.name,
        response: this.getFallbackResponse(query, error),
        confidence: 0.1,
      };
    }
  }

  // Format F1 data for context
  formatF1DataContext(f1Data) {
    const contextParts = [];

    if (f1Data.drivers) {
      contextParts.push(`Drivers: ${f1Data.drivers.length} entries`);
    }

    if (f1Data.constructors) {
      contextParts.push(`Constructors: ${f1Data.constructors.length} entries`);
    }

    if (f1Data.races) {
      contextParts.push(`Races: ${f1Data.races.length} entries`);
    }

    if (f1Data.standings) {
      contextParts.push(`Standings data available`);
    }

    if (f1Data.results) {
      contextParts.push(`Race results data available`);
    }

    // Handle race analysis data
    if (f1Data.race && f1Data.analysis) {
      const race = f1Data.race;
      const analysis = f1Data.analysis;
      
      contextParts.push(`\n\nRACE DATA AVAILABLE:\n`);
      
      if (race.raceName) {
        contextParts.push(`Race: ${race.raceName} (${race.season} Round ${race.round})`);
      }
      
      if (race.Circuit) {
        contextParts.push(`Circuit: ${race.Circuit.circuitName}`);
      }
      
      if (race.Results && race.Results.length > 0) {
        contextParts.push(`\nRACE RESULTS - TOP 10:`);
        race.Results.slice(0, 10).forEach(result => {
          const driver = `${result.Driver?.givenName} ${result.Driver?.familyName}`;
          const team = result.Constructor?.name;
          const time = result.Time?.time || result.status;
          contextParts.push(`${result.position}. ${driver} (${team}) - ${time}`);
        });
      }

      if (analysis.raceOutcome && analysis.raceOutcome.podium) {
        contextParts.push(`\nPODIUM:`);
        analysis.raceOutcome.podium.forEach(podium => {
          contextParts.push(`${podium.position}. ${podium.driver} (${podium.constructor}) - ${podium.points} points`);
        });
      }

      if (analysis.raceOutcome && analysis.raceOutcome.fastestLap) {
        contextParts.push(`\nFastest Lap: ${analysis.raceOutcome.fastestLap.driver} - ${analysis.raceOutcome.fastestLap.time}`);
      }
    }

    return contextParts.join('\n') || 'No specific F1 data context';
  }

  // Calculate confidence based on query and response
  calculateConfidence(query, response) {
    let confidence = 0.7; // Base confidence

    // Check if query matches agent's keywords
    const queryLower = query.toLowerCase();
    const keywordMatches = this.config.keywords.filter((keyword) =>
      queryLower.includes(keyword.toLowerCase()),
    ).length;

    if (keywordMatches > 0) {
      confidence += Math.min(keywordMatches * 0.1, 0.2);
    }

    // Check response quality indicators
    if (response.length > 200) confidence += 0.05;
    if (response.includes('•') || response.includes('-')) confidence += 0.05;
    if (response.match(/\d{4}/)) confidence += 0.05; // Contains years
    if (response.match(/\d+\.\d+/)) confidence += 0.05; // Contains times/stats

    return Math.min(confidence, 0.95);
  }

  // Get fallback response for errors
  getFallbackResponse(query, error) {
    return `I apologize, but I encountered an issue processing your ${
      this.agentId
    } query: "${query}". 

As the ${this.config.name}, I specialize in:
${this.config.specialization.map((spec) => `• ${spec}`).join('\n')}

Please try rephrasing your question or ask about specific F1 topics within my expertise. 

Error details: ${error.message}`;
  }

  // Agent health check
  async healthCheck() {
    try {
      const testQuery = `What is your role as the ${this.config.name}?`;
      const result = await this.processQuery(testQuery);
      return {
        agentId: this.agentId,
        status: result.success ? 'healthy' : 'unhealthy',
        responseTime: result.processingTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        agentId: this.agentId,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  // Get agent info
  getAgentInfo() {
    return {
      id: this.agentId,
      name: this.config.name,
      description: this.config.description,
      specializations: this.config.specialization,
      keywords: this.config.keywords,
      model: this.config.model,
      temperature: this.config.temperature,
      tools: this.tools.length,
    };
  }
}

export default BaseF1Agent;

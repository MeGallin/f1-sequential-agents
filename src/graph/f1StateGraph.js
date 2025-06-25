import { StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { F1GraphState, stateHelpers } from './f1GraphState.js';
import { agentFactory } from '../agents/agentFactory.js';
import { modelConfig } from '../config/modelConfig.js';
import { ConversationMemory } from '../memory/conversationMemory.js';
import { ConfirmationWorkflow } from '../humanLoop/confirmationWorkflow.js';
import { QueryValidator } from '../humanLoop/queryValidator.js';

class F1StateGraphOrchestrator {
  constructor() {
    this.graph = null;
    this.agentFactory = agentFactory;
    this.initialized = false;
    
    // Initialize human-in-the-loop and memory systems
    this.conversationMemory = new ConversationMemory({
      maxMessages: 100,
      summarizerModel: 'gpt-4o-mini'
    });
    
    this.confirmationWorkflow = new ConfirmationWorkflow({
      confirmationTimeout: 300000, // 5 minutes
      autoConfirmThreshold: 0.95,
      complexQueryThreshold: 0.7
    });
    
    this.queryValidator = new QueryValidator();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      console.log('🏎️  Initializing F1 StateGraph orchestrator...');
      
      // Initialize agent factory
      await this.agentFactory.initialize();
      
      // Create the StateGraph
      this.graph = new StateGraph(F1GraphState)
        // Entry point - analyze the incoming query
        .addNode('analyzeQuery', this.analyzeQuery.bind(this))
        
        // Routing nodes
        .addNode('routeToAgent', this.routeToAgent.bind(this))
        .addNode('checkMultiAgent', this.checkMultiAgent.bind(this))
        
        // Agent execution nodes
        .addNode('executeAgent', this.executeAgent.bind(this))
        .addNode('executeMultiAgent', this.executeMultiAgent.bind(this))
        
        // Post-processing nodes
        .addNode('synthesizeResults', this.synthesizeResults.bind(this))
        .addNode('generateResponse', this.generateResponse.bind(this))
        
        // Error handling and human intervention
        .addNode('handleError', this.handleError.bind(this))
        .addNode('requestHumanInput', this.requestHumanInput.bind(this))
        
        // Define the flow
        .addEdge(START, 'analyzeQuery')
        .addEdge('analyzeQuery', 'routeToAgent')
        .addEdge('routeToAgent', 'checkMultiAgent')
        
        // Conditional routing based on multi-agent needs
        .addConditionalEdges(
          'checkMultiAgent',
          this.shouldUseMultiAgent.bind(this),
          {
            'single': 'executeAgent',
            'multi': 'executeMultiAgent',
            'error': 'handleError'
          }
        )
        
        .addEdge('executeAgent', 'generateResponse')
        .addEdge('executeMultiAgent', 'synthesizeResults')
        .addEdge('synthesizeResults', 'generateResponse')
        
        // Conditional routing from response generation
        .addConditionalEdges(
          'generateResponse',
          this.shouldEnd.bind(this),
          {
            'end': END,
            'human': 'requestHumanInput',
            'error': 'handleError'
          }
        )
        
        .addEdge('requestHumanInput', END)
        .addEdge('handleError', END);

      // Compile the graph
      this.compiledGraph = this.graph.compile();
      
      console.log('✅ F1 StateGraph orchestrator initialized successfully');
      this.initialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize F1 StateGraph orchestrator:', error);
      throw error;
    }
  }

  // Node implementations
  async analyzeQuery(state) {
    console.log('🔍 Analyzing query...');
    
    const startTime = Date.now();
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content;
    const sessionId = state.sessionId || 'default_session';
    const userId = state.userId;

    try {
      // Initialize conversation memory for this session
      this.conversationMemory.initializeSession(sessionId, userId);
      
      // Get conversation context for better analysis
      const conversationContext = this.conversationMemory.getRelevantContext(sessionId, query);
      
      // Validate query with context
      const validation = this.queryValidator.validateQuery(query, conversationContext);
      
      // Enhanced query analysis
      const queryAnalysis = {
        originalQuery: query,
        queryLength: query.length,
        queryType: validation.queryType || this.classifyQuery(query),
        extractedEntities: this.extractEntities(query),
        complexity: validation.complexity || this.assessComplexity(query),
        language: 'en',
        timestamp: new Date().toISOString(),
        validation: {
          isValid: validation.isValid,
          confidence: validation.confidence,
          refinementNeeded: validation.refinementNeeded,
          suggestions: validation.suggestions,
          warnings: validation.warnings,
          errors: validation.errors
        },
        conversationContext
      };

      // Add human message to conversation memory
      this.conversationMemory.addMessage(sessionId, new HumanMessage(query), {
        queryAnalysis: queryAnalysis,
        timestamp: new Date().toISOString()
      });

      // Update state with enhanced analysis
      const updatedState = {
        ...state,
        queryAnalysis,
        sessionId,
        userId,
        validationResult: validation,
        metadata: {
          ...state.metadata,
          analysisTime: Date.now() - startTime,
          hasConversationContext: !!conversationContext,
          memoryInitialized: true
        }
      };

      // Check if query needs refinement
      if (validation.refinementNeeded && !validation.isValid) {
        console.log(`⚠️  Query validation failed: ${validation.errors.join(', ')}`);
        return stateHelpers.setError(updatedState, {
          type: 'validation_error',
          message: 'Query validation failed',
          validation
        });
      }

      console.log(`✅ Query analyzed: ${queryAnalysis.queryType} (${queryAnalysis.complexity.level || queryAnalysis.complexity}) - Confidence: ${validation.confidence}`);
      return updatedState;

    } catch (error) {
      console.error('❌ Query analysis failed:', error);
      return stateHelpers.setError(state, error);
    }
  }

  async routeToAgent(state) {
    console.log('🎯 Routing to appropriate agent...');

    try {
      const query = state.queryAnalysis.originalQuery;
      const routing = await this.agentFactory.routeQuery(query);
      
      const updatedState = stateHelpers.addRouting(
        state,
        routing.selectedAgent,
        routing.confidence,
        routing.alternatives
      );

      console.log(`✅ Routed to ${routing.selectedAgent} (confidence: ${routing.confidence})`);
      return updatedState;

    } catch (error) {
      console.error('❌ Agent routing failed:', error);
      return stateHelpers.setError(state, error);
    }
  }

  async checkMultiAgent(state) {
    console.log('🔄 Checking multi-agent requirements...');

    const query = state.queryAnalysis.originalQuery;
    const complexity = state.queryAnalysis.complexity;
    const confidence = state.agentConfidence;

    // Determine if multi-agent approach is needed
    const isMultiAgent = this.shouldUseMultiAgentApproach(query, complexity, confidence);
    
    return {
      ...state,
      isMultiAgent
    };
  }

  async executeAgent(state) {
    console.log(`🚀 Executing single agent: ${state.selectedAgent}`);

    const startTime = Date.now();
    
    try {
      const query = state.queryAnalysis.originalQuery;
      const context = {
        f1Data: state.f1Data,
        conversationContext: state.conversationContext,
        queryAnalysis: state.queryAnalysis
      };

      const result = await this.agentFactory.processQuery(
        state.selectedAgent,
        query,
        context
      );

      const updatedState = {
        ...state,
        multiAgentResults: [result],
        f1Data: {
          ...state.f1Data,
          ...(result.f1Data || {})
        },
        metadata: {
          ...state.metadata,
          executionTime: Date.now() - startTime
        }
      };

      console.log(`✅ Agent execution completed: ${state.selectedAgent}`);
      return updatedState;

    } catch (error) {
      console.error(`❌ Agent execution failed: ${state.selectedAgent}`, error);
      return stateHelpers.setError(state, error);
    }
  }

  async executeMultiAgent(state) {
    console.log('🔄 Executing multi-agent workflow...');

    const startTime = Date.now();
    
    try {
      const query = state.queryAnalysis.originalQuery;
      const selectedAgents = this.selectMultipleAgents(state);
      
      const context = {
        f1Data: state.f1Data,
        conversationContext: state.conversationContext,
        queryAnalysis: state.queryAnalysis
      };

      const result = await this.agentFactory.processMultiAgentQuery(
        query,
        selectedAgents,
        context
      );

      const updatedState = {
        ...state,
        multiAgentResults: result.results,
        f1Data: {
          ...state.f1Data,
          ...(result.synthesis || {})
        },
        metadata: {
          ...state.metadata,
          executionTime: Date.now() - startTime,
          agentsUsed: selectedAgents
        }
      };

      console.log(`✅ Multi-agent execution completed: ${selectedAgents.join(', ')}`);
      return updatedState;

    } catch (error) {
      console.error('❌ Multi-agent execution failed:', error);
      return stateHelpers.setError(state, error);
    }
  }

  async synthesizeResults(state) {
    console.log('🧠 Synthesizing multi-agent results...');

    try {
      const results = state.multiAgentResults;
      
      if (!results || results.length === 0) {
        throw new Error('No results to synthesize');
      }

      // Create synthesis prompt
      const synthesisPrompt = this.createSynthesisPrompt(results, state.queryAnalysis);
      
      // Use primary LLM for synthesis
      const llm = modelConfig.getAnalysisModel();
      const synthesisResponse = await llm.invoke(synthesisPrompt);

      const synthesis = {
        combinedInsights: synthesisResponse.content,
        agentContributions: results.map(r => ({
          agent: r.agentId,
          confidence: r.confidence,
          keyInsights: r.analysis?.slice(0, 100) || 'No analysis available'
        })),
        overallConfidence: this.calculateOverallConfidence(results),
        timestamp: new Date().toISOString()
      };

      console.log('✅ Results synthesis completed');
      return {
        ...state,
        synthesis
      };

    } catch (error) {
      console.error('❌ Results synthesis failed:', error);
      return stateHelpers.setError(state, error);
    }
  }

  async generateResponse(state) {
    console.log('📝 Generating final response...');

    try {
      const results = state.multiAgentResults;
      const isMultiAgent = state.isMultiAgent;
      const sessionId = state.sessionId;
      
      let finalResponse;
      let agentResponse;
      
      if (isMultiAgent && state.synthesis) {
        // Multi-agent response with synthesis
        finalResponse = this.formatMultiAgentResponse(state.synthesis, results);
        agentResponse = {
          response: finalResponse,
          confidence: state.synthesis.overallConfidence,
          agentUsed: 'multi-agent',
          multiAgent: true,
          agents: results.map(r => r.agentId)
        };
      } else if (results && results.length > 0) {
        // Single agent response
        finalResponse = this.formatSingleAgentResponse(results[0]);
        agentResponse = {
          response: finalResponse,
          confidence: results[0].confidence,
          agentUsed: results[0].agentId,
          multiAgent: false
        };
      } else {
        throw new Error('No results available for response generation');
      }

      // Check if human confirmation is needed
      const needsConfirmation = this.confirmationWorkflow.shouldRequestConfirmation(
        state.queryAnalysis,
        agentResponse
      );

      if (needsConfirmation) {
        console.log('⚠️  Response requires human confirmation');
        
        // Create confirmation request
        const confirmationRequest = this.confirmationWorkflow.createConfirmationRequest(
          sessionId,
          state.queryAnalysis,
          agentResponse,
          state.userId
        );

        // Store pending response in state for later retrieval
        const updatedState = {
          ...state,
          pendingResponse: agentResponse,
          confirmationRequest,
          awaitingConfirmation: true,
          requiresHumanInput: true,
          metadata: {
            ...state.metadata,
            processingTime: Date.now() - new Date(state.metadata.timestamp).getTime(),
            confirmationRequested: true
          }
        };

        return updatedState;
      }

      // No confirmation needed - proceed with response
      const aiMessage = new AIMessage(finalResponse);
      
      // Add AI response to conversation memory
      this.conversationMemory.addMessage(sessionId, aiMessage, {
        agentUsed: agentResponse.agentUsed,
        confidence: agentResponse.confidence,
        processingTime: Date.now() - new Date(state.metadata.timestamp).getTime(),
        multiAgent: agentResponse.multiAgent
      });
      
      const updatedState = {
        ...state,
        messages: [...state.messages, aiMessage],
        finalAgentResponse: agentResponse,
        metadata: {
          ...state.metadata,
          processingTime: Date.now() - new Date(state.metadata.timestamp).getTime(),
          responseGenerated: true,
          memoryUpdated: true
        }
      };

      console.log('✅ Response generation completed');
      return updatedState;

    } catch (error) {
      console.error('❌ Response generation failed:', error);
      return stateHelpers.setError(state, error);
    }
  }

  async handleError(state) {
    console.log('❌ Handling error state...');

    const error = state.errorState;
    const errorMessage = new AIMessage(
      `I apologize, but I encountered an error while processing your F1 query: ${error?.message || 'Unknown error'}. Please try rephrasing your question or ask something else about Formula 1.`
    );

    return {
      ...state,
      messages: [...state.messages, errorMessage],
      metadata: {
        ...state.metadata,
        errorHandled: true
      }
    };
  }

  async requestHumanInput(state) {
    console.log('👤 Requesting human input...');

    let humanMessage;
    
    if (state.awaitingConfirmation && state.confirmationRequest) {
      // Format confirmation request for user
      const confirmationMessage = `${state.confirmationRequest.message}\n\n` +
        `**Query:** ${state.confirmationRequest.query}\n\n` +
        `**Preview:** ${state.confirmationRequest.agentResponse.preview}\n\n` +
        `**Confidence:** ${Math.round(state.confirmationRequest.agentResponse.confidence * 100)}%\n\n` +
        `**Options:**\n` +
        state.confirmationRequest.options.map(opt => 
          `• **${opt.label}** - ${opt.description}`
        ).join('\n') + 
        `\n\n*Confirmation ID: ${state.confirmationRequest.confirmationId}*`;
        
      humanMessage = new AIMessage(confirmationMessage);
    } else if (state.validationResult && !state.validationResult.isValid) {
      // Handle validation errors with suggestions
      const validationMessage = `I found some issues with your query:\n\n` +
        `**Issues:**\n${state.validationResult.errors.join('\n• ')}\n\n` +
        (state.validationResult.warnings.length > 0 ? 
          `**Warnings:**\n${state.validationResult.warnings.join('\n• ')}\n\n` : '') +
        (state.validationResult.suggestions.length > 0 ? 
          `**Suggestions:**\n${state.validationResult.suggestions.join('\n• ')}\n\n` : '') +
        `Please try rephrasing your question or provide more specific details about what you'd like to know about Formula 1.`;
        
      humanMessage = new AIMessage(validationMessage);
    } else {
      // General request for more information
      humanMessage = new AIMessage(
        'I need additional information to better answer your Formula 1 question. Could you please provide more details or clarify what specific aspect you\'d like me to focus on?'
      );
    }

    return {
      ...state,
      messages: [...state.messages, humanMessage],
      requiresHumanInput: true
    };
  }

  // Conditional routing functions
  shouldUseMultiAgent(state) {
    if (state.errorState) return 'error';
    return state.isMultiAgent ? 'multi' : 'single';
  }

  shouldEnd(state) {
    if (state.errorState) return 'error';
    if (state.requiresHumanInput) return 'human';
    return 'end';
  }

  // Helper methods
  classifyQuery(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      return 'comparison';
    }
    if (queryLower.includes('predict') || queryLower.includes('forecast') || queryLower.includes('will')) {
      return 'prediction';
    }
    if (queryLower.includes('history') || queryLower.includes('all time') || queryLower.includes('evolution')) {
      return 'historical';
    }
    if (queryLower.includes('strategy') || queryLower.includes('tire') || queryLower.includes('pit')) {
      return 'strategy';
    }
    if (queryLower.includes('circuit') || queryLower.includes('track') || queryLower.includes('lap')) {
      return 'circuit';
    }
    if (queryLower.includes('championship') || queryLower.includes('standings') || queryLower.includes('points')) {
      return 'championship';
    }
    
    return 'general';
  }

  extractEntities(query) {
    const entities = {
      drivers: [],
      constructors: [],
      circuits: [],
      seasons: [],
      races: []
    };

    // Extract years/seasons
    const yearMatches = query.match(/\b(19|20)\d{2}\b/g);
    if (yearMatches) {
      entities.seasons = yearMatches.map(year => parseInt(year));
    }

    // Extract common F1 entities (simplified)
    const driverNames = ['hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 'piastri', 'alonso', 'stroll', 'ocon'];
    const constructorNames = ['mercedes', 'red bull', 'ferrari', 'mclaren', 'alpine', 'aston martin', 'williams', 'haas', 'alfa romeo', 'alphatauri'];
    
    const queryLower = query.toLowerCase();
    
    entities.drivers = driverNames.filter(name => queryLower.includes(name));
    entities.constructors = constructorNames.filter(name => queryLower.includes(name));

    return entities;
  }

  assessComplexity(query) {
    const queryLower = query.toLowerCase();
    let complexity = 0;
    
    // Word count factor
    const wordCount = query.split(/\s+/).length;
    complexity += Math.min(wordCount / 10, 3);
    
    // Complexity indicators
    const complexityIndicators = [
      'compare', 'analyze', 'predict', 'correlation', 'impact', 'evolution',
      'across', 'throughout', 'historical', 'comprehensive', 'detailed'
    ];
    
    complexity += complexityIndicators.filter(indicator => 
      queryLower.includes(indicator)
    ).length;
    
    // Multiple entities increase complexity
    const entities = this.extractEntities(query);
    const totalEntities = Object.values(entities).reduce((sum, arr) => sum + arr.length, 0);
    complexity += totalEntities * 0.5;
    
    if (complexity <= 2) return 'simple';
    if (complexity <= 4) return 'moderate';
    return 'complex';
  }

  shouldUseMultiAgentApproach(query, complexity, confidence) {
    // Multi-agent if complexity is high or confidence is low
    if (complexity === 'complex') return true;
    if (confidence < 0.7) return true;
    
    // Multi-agent for comparison queries
    if (query.toLowerCase().includes('compare') || query.toLowerCase().includes('vs')) {
      return true;
    }
    
    return false;
  }

  selectMultipleAgents(state) {
    const query = state.queryAnalysis.originalQuery;
    const primaryAgent = state.selectedAgent;
    const alternatives = state.routingHistory[state.routingHistory.length - 1]?.alternatives || [];
    
    // Always include primary agent
    const agents = [primaryAgent];
    
    // Add top alternatives if confidence is reasonable
    alternatives.forEach(alt => {
      if (alt.confidence > 0.3 && agents.length < 3) {
        agents.push(alt.agentId);
      }
    });
    
    return agents;
  }

  createSynthesisPrompt(results, queryAnalysis) {
    return `You are synthesizing insights from multiple F1 expert agents. 

Original Query: ${queryAnalysis.originalQuery}

Agent Results:
${results.map(result => `
Agent: ${result.agentId}
Confidence: ${result.confidence}
Analysis: ${result.analysis || 'No analysis provided'}
`).join('\n')}

Please provide a comprehensive, coherent response that combines the best insights from all agents. Focus on:
1. Direct answer to the user's question
2. Key insights from each agent
3. Any conflicting information and how to resolve it
4. Additional context that enhances understanding

Keep the response engaging and informative while maintaining technical accuracy.`;
  }

  calculateOverallConfidence(results) {
    if (!results || results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0);
    return totalConfidence / results.length;
  }

  formatSingleAgentResponse(result) {
    return `${result.analysis || result.response || 'Analysis completed successfully.'}

*Analyzed by: ${result.agentId} (Confidence: ${(result.confidence * 100).toFixed(0)}%)*`;
  }

  formatMultiAgentResponse(synthesis, results) {
    return `${synthesis.combinedInsights}

---
*Multi-agent analysis completed by: ${results.map(r => r.agentId).join(', ')}*
*Overall confidence: ${(synthesis.overallConfidence * 100).toFixed(0)}%*`;
  }

  // Human-in-the-Loop Methods
  async processConfirmation(confirmationId, userAction, additionalData = {}) {
    try {
      const result = await this.confirmationWorkflow.processConfirmation(
        confirmationId, 
        userAction, 
        additionalData
      );
      
      if (result.success && result.action === 'confirmed') {
        // User confirmed - deliver the response
        const sessionId = this.getSessionFromConfirmation(confirmationId);
        if (sessionId) {
          // Add confirmed response to memory
          const aiMessage = new AIMessage(result.response);
          this.conversationMemory.addMessage(sessionId, aiMessage, {
            agentUsed: result.agentUsed,
            confidence: result.confidence,
            confirmed: true
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Confirmation processing error:', error);
      return { success: false, error: error.message };
    }
  }

  async getConversationHistory(sessionId, limit = 20) {
    return this.conversationMemory.getConversationHistory(sessionId, limit);
  }

  async getUserPreferences(userId) {
    return this.conversationMemory.getUserPreferences(userId);
  }

  async setUserPreferences(userId, preferences) {
    return this.conversationMemory.setUserPreference(userId, preferences);
  }

  getPendingConfirmations(sessionId) {
    return this.confirmationWorkflow.getPendingConfirmations(sessionId);
  }

  getSessionFromConfirmation(confirmationId) {
    // Helper method to get session ID from confirmation ID
    const confirmation = this.confirmationWorkflow.pendingConfirmations.get(confirmationId);
    return confirmation?.sessionId || null;
  }

  // Public methods
  async processQuery(query, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const userMessage = new HumanMessage(query);
    const initialState = stateHelpers.createInitialState(userMessage, context);

    try {
      const result = await this.compiledGraph.invoke(initialState);
      return result;
    } catch (error) {
      console.error('StateGraph execution error:', error);
      throw error;
    }
  }

  async processStream(query, context = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const userMessage = new HumanMessage(query);
    const initialState = stateHelpers.createInitialState(userMessage, context);

    try {
      const stream = await this.compiledGraph.stream(initialState);
      return stream;
    } catch (error) {
      console.error('StateGraph streaming error:', error);
      throw error;
    }
  }

  getGraphStructure() {
    return {
      nodes: [
        'analyzeQuery', 'routeToAgent', 'checkMultiAgent',
        'executeAgent', 'executeMultiAgent', 'synthesizeResults',
        'generateResponse', 'handleError', 'requestHumanInput'
      ],
      edges: 'Complex conditional routing based on query analysis and agent confidence',
      initialized: this.initialized
    };
  }
}

// Export singleton instance
export const f1StateGraph = new F1StateGraphOrchestrator();
export { F1StateGraphOrchestrator };
export default f1StateGraph;
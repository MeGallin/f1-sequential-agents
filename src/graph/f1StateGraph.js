import { StateGraph, START, END } from '@langchain/langgraph';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { F1GraphState, stateHelpers } from './f1GraphState.js';
import { agentFactory } from '../agents/agentFactory.js';
import { modelConfig } from '../config/modelConfig.js';

class F1StateGraphOrchestrator {
  constructor() {
    this.graph = null;
    this.agentFactory = agentFactory;
    this.initialized = false;
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

    try {
      // Basic query analysis
      const queryAnalysis = {
        originalQuery: query,
        queryLength: query.length,
        queryType: this.classifyQuery(query),
        extractedEntities: this.extractEntities(query),
        complexity: this.assessComplexity(query),
        language: 'en', // Could be detected
        timestamp: new Date().toISOString()
      };

      // Update state with analysis
      const updatedState = {
        ...state,
        queryAnalysis,
        metadata: {
          ...state.metadata,
          analysisTime: Date.now() - startTime
        }
      };

      console.log(`✅ Query analyzed: ${queryAnalysis.queryType} (${queryAnalysis.complexity})`);
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
      
      let finalResponse;
      
      if (isMultiAgent && state.synthesis) {
        // Multi-agent response with synthesis
        finalResponse = this.formatMultiAgentResponse(state.synthesis, results);
      } else if (results && results.length > 0) {
        // Single agent response
        finalResponse = this.formatSingleAgentResponse(results[0]);
      } else {
        throw new Error('No results available for response generation');
      }

      const aiMessage = new AIMessage(finalResponse);
      
      const updatedState = {
        ...state,
        messages: [...state.messages, aiMessage],
        metadata: {
          ...state.metadata,
          processingTime: Date.now() - new Date(state.metadata.timestamp).getTime(),
          responseGenerated: true
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

    const humanMessage = new AIMessage(
      'I need additional information to better answer your Formula 1 question. Could you please provide more details or clarify what specific aspect you\'d like me to focus on?'
    );

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
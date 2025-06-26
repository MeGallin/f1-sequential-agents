import { StateGraph, START, END } from '@langchain/langgraph';
import { F1RouterAgent } from '../agents/f1RouterAgent.js';

/**
 * F1 Workflow - Simplified following TFL pattern
 * Clean linear flow with conversation context handled by memory
 */
class F1Workflow {
  constructor(agents, memory, sharedLLM) {
    this.agents = agents;
    this.memory = memory;
    this.sharedLLM = sharedLLM;
    this.router = new F1RouterAgent();
    
    // Create the workflow
    this.workflow = this.createWorkflow();
  }

  createWorkflow() {
    const workflow = new StateGraph({
      channels: {
        query: null,
        threadId: null,
        userContext: null,
        selectedAgent: null,
        agentResponse: null,
        confidence: null,
        f1Data: null,
        conversationHistory: null,
        error: null,
        metadata: null,
        requiresConfirmation: null,
        userConfirmation: null,
        fallbackRequired: null,
        streamingEnabled: null
      }
    });

    // Add nodes - clean linear flow like TFL
    workflow.addNode('input_validation', this.validateInput.bind(this));
    workflow.addNode('route_query', this.routeQuery.bind(this));
    workflow.addNode('process_agent', this.processAgent.bind(this));
    workflow.addNode('save_memory', this.saveMemory.bind(this));
    workflow.addNode('finalize_response', this.finalizeResponse.bind(this));
    workflow.addNode('fallback_handler', this.handleFallback.bind(this));

    // Add edges - simplified flow
    workflow.addEdge(START, 'input_validation');
    
    // Conditional routing based on validation
    workflow.addConditionalEdges(
      'input_validation',
      this.shouldRoute.bind(this),
      {
        'route': 'route_query',
        'error': 'fallback_handler'
      }
    );

    // Route to appropriate agent
    workflow.addEdge('route_query', 'process_agent');

    // Process agent response
    workflow.addConditionalEdges(
      'process_agent',
      this.shouldProceed.bind(this),
      {
        'proceed': 'save_memory',
        'fallback': 'fallback_handler'
      }
    );

    // Save and finalize
    workflow.addEdge('fallback_handler', 'save_memory');
    workflow.addEdge('save_memory', 'finalize_response');
    workflow.addEdge('finalize_response', END);

    return workflow.compile();
  }

  // Node implementations
  async validateInput(state) {
    console.log('[F1Workflow] Validating input...');
    
    if (!state.query || state.query.trim().length === 0) {
      return {
        ...state,
        error: {
          message: 'Please provide a valid F1 query',
          type: 'validation_error'
        }
      };
    }

    // Initialize metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      processingTime: 0,
      apiCalls: 0,
      workflowPath: ['input_validation']
    };

    return {
      ...state,
      query: state.query.trim(),
      threadId: state.threadId || `f1_thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      metadata
    };
  }

  async routeQuery(state) {
    console.log('[F1Workflow] Routing query...');
    
    try {
      // Get conversation context from memory
      const conversationContext = this.memory.getRelevantContext(state.threadId, state.query);
      
      const routerResult = await this.router.processQuery(
        state.query,
        this.sharedLLM,
        { ...state.userContext, conversationContext }
      );

      // Handle off-topic or inappropriate queries
      if (routerResult.selectedAgent === 'off_topic' || routerResult.selectedAgent === 'inappropriate') {
        return {
          ...state,
          agentResponse: routerResult.message,
          selectedAgent: 'filter',
          confidence: 1.0,
          metadata: {
            ...state.metadata,
            workflowPath: [...state.metadata.workflowPath, 'route_query_filtered']
          }
        };
      }

      return {
        ...state,
        selectedAgent: routerResult.selectedAgent,
        confidence: routerResult.confidence,
        conversationHistory: conversationContext,
        metadata: {
          ...state.metadata,
          workflowPath: [...state.metadata.workflowPath, 'route_query'],
          routerConfidence: routerResult.confidence
        }
      };
    } catch (error) {
      console.error('[F1Workflow] Routing error:', error);
      return {
        ...state,
        error: {
          message: error.message,
          type: 'routing_error'
        },
        fallbackRequired: true
      };
    }
  }

  async processAgent(state) {
    console.log(`[F1Workflow] Processing with ${state.selectedAgent} agent...`);
    
    try {
      // Map agent names to actual agents
      const agentMapping = {
        'race_results': 'raceResults',
        'circuit': 'circuit', 
        'driver': 'driver',
        'constructor': 'constructor',
        'championship': 'championship',
        'historical': 'historical'
      };

      const actualAgentId = agentMapping[state.selectedAgent] || 'raceResults';
      
      if (!this.agents[actualAgentId]) {
        throw new Error(`Agent "${actualAgentId}" not found`);
      }

      // Prepare context with conversation history
      const context = {
        ...state.userContext,
        routerConfidence: state.confidence,
        conversationHistory: state.conversationHistory?.recentMessages || [],
        conversationContext: state.conversationHistory,
        f1Data: state.f1Data
      };

      // Handle year clarification context
      if (state.conversationHistory?.needsYearClarification) {
        context.needsYearClarification = state.conversationHistory.needsYearClarification;
      }

      const agentResponse = await this.agents[actualAgentId].processQuery(
        state.query,
        context
      );

      return {
        ...state,
        agentResponse: agentResponse.response || agentResponse.analysis,
        f1Data: agentResponse.f1Data || state.f1Data,
        metadata: {
          ...state.metadata,
          workflowPath: [...state.metadata.workflowPath, 'process_agent'],
          agentUsed: actualAgentId,
          agentConfidence: agentResponse.confidence
        }
      };
    } catch (error) {
      console.error('[F1Workflow] Agent processing error:', error);
      return {
        ...state,
        error: {
          message: error.message,
          type: 'agent_error'
        },
        fallbackRequired: true
      };
    }
  }

  async handleFallback(state) {
    console.log('[F1Workflow] Handling fallback...');
    
    const fallbackMessage = state.error ? 
      `I apologize, but I encountered an issue: ${state.error.message}. Please try rephrasing your F1 question or ask me something else about Formula 1.` :
      "I'm having trouble processing your F1 request at the moment. Please try again or ask me something else about Formula 1 races, drivers, or championships.";

    return {
      ...state,
      agentResponse: fallbackMessage,
      selectedAgent: 'fallback',
      confidence: 0.1,
      metadata: {
        ...state.metadata,
        workflowPath: [...state.metadata.workflowPath, 'fallback_handler'],
        fallbackReason: state.error?.type || 'unknown'
      }
    };
  }

  async saveMemory(state) {
    console.log('[F1Workflow] Saving to memory...');
    
    try {
      if (state.threadId && this.memory) {
        // Save user message
        await this.memory.saveMessage(state.threadId, 'user', state.query, {
          userContext: state.userContext,
          timestamp: state.metadata.timestamp
        });

        // Save assistant response
        await this.memory.saveMessage(state.threadId, 'assistant', state.agentResponse, {
          agent: state.selectedAgent,
          confidence: state.confidence,
          f1Data: state.f1Data,
          workflowPath: state.metadata.workflowPath,
          processingTime: Date.now() - new Date(state.metadata.timestamp).getTime()
        });
      }

      return {
        ...state,
        metadata: {
          ...state.metadata,
          workflowPath: [...state.metadata.workflowPath, 'save_memory'],
          memorySaved: true
        }
      };
    } catch (error) {
      console.error('[F1Workflow] Memory save error:', error);
      // Don't fail the entire workflow for memory errors
      return {
        ...state,
        metadata: {
          ...state.metadata,
          workflowPath: [...state.metadata.workflowPath, 'save_memory_failed'],
          memoryError: error.message
        }
      };
    }
  }

  async finalizeResponse(state) {
    console.log('[F1Workflow] Finalizing response...');
    
    const processingTime = Date.now() - new Date(state.metadata.timestamp).getTime();
    
    return {
      ...state,
      metadata: {
        ...state.metadata,
        workflowPath: [...state.metadata.workflowPath, 'finalize_response'],
        processingTime,
        completed: true
      }
    };
  }

  // Condition functions
  shouldRoute(state) {
    return state.error ? 'error' : 'route';
  }

  shouldProceed(state) {
    if (state.error || state.fallbackRequired) {
      return 'fallback';
    }
    return 'proceed';
  }

  // Main execution method
  async execute(initialState) {
    console.log('[F1Workflow] Starting workflow execution...');
    
    try {
      const result = await this.workflow.invoke(initialState);
      console.log('[F1Workflow] Workflow completed successfully');
      return result;
    } catch (error) {
      console.error('[F1Workflow] Workflow execution error:', error);
      throw error;
    }
  }

  // Stream execution for real-time updates
  async *stream(initialState) {
    console.log('[F1Workflow] Starting streaming workflow execution...');
    
    try {
      // For now, fall back to regular execution since StateGraph.stream() is not available
      const result = await this.workflow.invoke(initialState);
      
      // Simulate streaming by yielding the final result
      yield {
        finalize_response: result
      };
    } catch (error) {
      console.error('[F1Workflow] Streaming workflow error:', error);
      throw error;
    }
  }

  // Get workflow visualization
  getWorkflowVisualization() {
    return {
      nodes: [
        'input_validation', 'route_query', 'process_agent',
        'save_memory', 'finalize_response', 'fallback_handler'
      ],
      flow: 'input_validation → route_query → process_agent → save_memory → finalize_response',
      description: 'Simplified linear workflow following TFL pattern'
    };
  }
}

export { F1Workflow };
export default F1Workflow;
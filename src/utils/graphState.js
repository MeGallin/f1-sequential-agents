import { MessagesAnnotation } from '@langchain/langgraph';

// Define the F1 Graph State extending MessagesAnnotation
export const F1GraphState = MessagesAnnotation.extend({
  // User query and routing
  query: {
    value: (x, y) => y ?? x ?? '',
    default: () => ''
  },
  
  selectedAgent: {
    value: (x, y) => y ?? x ?? null,
    default: () => null
  },
  
  // F1 data and analysis
  f1Data: {
    value: (x, y) => y ?? x ?? {},
    default: () => ({})
  },
  
  analysisResult: {
    value: (x, y) => y ?? x ?? {},
    default: () => ({})
  },
  
  // Confidence and validation
  confidence: {
    value: (x, y) => y ?? x ?? 0,
    default: () => 0
  },
  
  requiresConfirmation: {
    value: (x, y) => y ?? x ?? false,
    default: () => false
  },
  
  // Session and memory
  threadId: {
    value: (x, y) => y ?? x ?? null,
    default: () => null
  },
  
  conversationHistory: {
    value: (x, y) => y ?? x ?? [],
    default: () => []
  },
  
  // Error handling
  error: {
    value: (x, y) => y ?? x ?? null,
    default: () => null
  },
  
  // Processing metadata
  processingTime: {
    value: (x, y) => y ?? x ?? 0,
    default: () => 0
  },
  
  agentUsed: {
    value: (x, y) => y ?? x ?? null,
    default: () => null
  },
  
  // Multi-agent coordination
  agentRouting: {
    value: (x, y) => y ?? x ?? {},
    default: () => ({})
  },
  
  collaborationRequired: {
    value: (x, y) => y ?? x ?? false,
    default: () => false
  },
  
  // User preferences and settings
  userPreferences: {
    value: (x, y) => y ?? x ?? {},
    default: () => ({})
  }
});

// Helper functions for state management
export class StateManager {
  static createInitialState(query, threadId = null) {
    return {
      query,
      threadId: threadId || `thread_${Date.now()}`,
      selectedAgent: null,
      f1Data: {},
      analysisResult: {},
      confidence: 0,
      requiresConfirmation: false,
      conversationHistory: [],
      error: null,
      processingTime: 0,
      agentUsed: null,
      agentRouting: {},
      collaborationRequired: false,
      userPreferences: {}
    };
  }

  static updateState(currentState, updates) {
    return {
      ...currentState,
      ...updates,
      messages: currentState.messages || []
    };
  }

  static addMessage(state, message) {
    return {
      ...state,
      messages: [...(state.messages || []), message]
    };
  }

  static setError(state, error) {
    return {
      ...state,
      error: error instanceof Error ? error.message : error,
      confidence: 0
    };
  }

  static clearError(state) {
    return {
      ...state,
      error: null
    };
  }

  static setAgent(state, agentId, confidence = 0.8) {
    return {
      ...state,
      selectedAgent: agentId,
      agentUsed: agentId,
      confidence
    };
  }

  static setF1Data(state, data) {
    return {
      ...state,
      f1Data: {
        ...state.f1Data,
        ...data
      }
    };
  }

  static setAnalysis(state, analysis, confidence = 0.8) {
    return {
      ...state,
      analysisResult: analysis,
      confidence,
      requiresConfirmation: confidence < 0.7
    };
  }

  static requireConfirmation(state, required = true) {
    return {
      ...state,
      requiresConfirmation: required
    };
  }

  static setCollaborationRequired(state, required = true, routingInfo = {}) {
    return {
      ...state,
      collaborationRequired: required,
      agentRouting: {
        ...state.agentRouting,
        ...routingInfo
      }
    };
  }

  static updateProcessingTime(state, startTime) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    return {
      ...state,
      processingTime: `${processingTime}s`
    };
  }

  static addToHistory(state, entry) {
    return {
      ...state,
      conversationHistory: [...state.conversationHistory, entry]
    };
  }

  static validateState(state) {
    const required = ['query', 'threadId'];
    const missing = required.filter(field => !state[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required state fields: ${missing.join(', ')}`);
    }
    
    return true;
  }

  static logState(state, context = '') {
    console.log(`[StateManager] ${context}:`, {
      query: state.query,
      selectedAgent: state.selectedAgent,
      confidence: state.confidence,
      error: state.error,
      requiresConfirmation: state.requiresConfirmation,
      collaborationRequired: state.collaborationRequired,
      threadId: state.threadId
    });
  }
}

export default F1GraphState;
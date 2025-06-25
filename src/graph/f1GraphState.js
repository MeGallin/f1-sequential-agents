import { MessagesAnnotation } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';

// F1-specific state extensions
const F1StateAnnotation = Annotation.Root({
  // Inherit all message handling from MessagesAnnotation
  ...MessagesAnnotation.spec,
  
  // F1-specific state fields
  selectedAgent: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),
  
  agentConfidence: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => 0
  }),
  
  queryAnalysis: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => ({})
  }),
  
  f1Data: Annotation({
    reducer: (current, update) => ({
      ...current,
      ...(update || {})
    }),
    default: () => ({})
  }),
  
  multiAgentResults: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => []
  }),
  
  isMultiAgent: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => false
  }),
  
  routingHistory: Annotation({
    reducer: (current, update) => [
      ...(current || []),
      ...(Array.isArray(update) ? update : [update])
    ],
    default: () => []
  }),
  
  requiresHumanInput: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => false
  }),
  
  conversationContext: Annotation({
    reducer: (current, update) => ({
      ...current,
      ...(update || {})
    }),
    default: () => ({
      sessionId: null,
      userId: null,
      preferences: {},
      history: []
    })
  }),
  
  errorState: Annotation({
    reducer: (current, update) => update ?? current,
    default: () => null
  }),
  
  metadata: Annotation({
    reducer: (current, update) => ({
      ...current,
      ...(update || {})
    }),
    default: () => ({
      timestamp: new Date().toISOString(),
      processingTime: null,
      tokensUsed: null,
      version: '1.0.0'
    })
  })
});

// Export as F1GraphState for consistency
export const F1GraphState = F1StateAnnotation;

// Helper functions for state management
export const stateHelpers = {
  // Initialize a new state with default values
  createInitialState: (userMessage, context = {}) => ({
    messages: [userMessage],
    selectedAgent: null,
    agentConfidence: 0,
    queryAnalysis: {},
    f1Data: {},
    multiAgentResults: [],
    isMultiAgent: false,
    routingHistory: [],
    requiresHumanInput: false,
    conversationContext: {
      sessionId: context.sessionId || null,
      userId: context.userId || null,
      preferences: context.preferences || {},
      history: context.history || []
    },
    errorState: null,
    metadata: {
      timestamp: new Date().toISOString(),
      processingTime: null,
      tokensUsed: null,
      version: '1.0.0'
    }
  }),

  // Add routing information to state
  addRouting: (state, agentId, confidence, alternatives = []) => ({
    ...state,
    selectedAgent: agentId,
    agentConfidence: confidence,
    routingHistory: [
      ...state.routingHistory,
      {
        timestamp: new Date().toISOString(),
        selectedAgent: agentId,
        confidence,
        alternatives
      }
    ]
  }),

  // Add F1 data to state
  addF1Data: (state, data) => ({
    ...state,
    f1Data: {
      ...state.f1Data,
      ...data
    }
  }),

  // Set error state
  setError: (state, error) => ({
    ...state,
    errorState: {
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }
  }),

  // Update metadata
  updateMetadata: (state, updates) => ({
    ...state,
    metadata: {
      ...state.metadata,
      ...updates
    }
  }),

  // Check if state requires human input
  needsHumanInput: (state) => state.requiresHumanInput,

  // Get current agent
  getCurrentAgent: (state) => state.selectedAgent,

  // Get F1 data
  getF1Data: (state) => state.f1Data,

  // Get routing history
  getRoutingHistory: (state) => state.routingHistory,

  // Get conversation context
  getContext: (state) => state.conversationContext
};

export default F1GraphState;
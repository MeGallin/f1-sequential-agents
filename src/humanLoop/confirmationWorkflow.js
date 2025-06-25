// Human-in-the-Loop Confirmation Workflow for F1 Sequential Agents
import { v4 as uuidv4 } from 'uuid';

export class ConfirmationWorkflow {
  constructor(options = {}) {
    this.pendingConfirmations = new Map(); // confirmationId -> confirmation data
    this.confirmationTimeout = options.confirmationTimeout || 300000; // 5 minutes
    this.autoConfirmThreshold = options.autoConfirmThreshold || 0.95;
    this.complexQueryThreshold = options.complexQueryThreshold || 0.7;
  }

  /**
   * Determine if query needs human confirmation
   */
  shouldRequestConfirmation(queryAnalysis, agentResponse) {
    const needsConfirmation = 
      // Low confidence responses
      agentResponse.confidence < this.complexQueryThreshold ||
      
      // Complex multi-agent queries
      queryAnalysis.complexity === 'complex' ||
      queryAnalysis.multiAgent ||
      
      // Sensitive predictions or financial implications
      this.containsSensitiveContent(queryAnalysis.query) ||
      
      // User explicitly requested validation
      queryAnalysis.query.toLowerCase().includes('confirm') ||
      queryAnalysis.query.toLowerCase().includes('verify') ||
      
      // Historical comparisons spanning multiple eras
      this.isHistoricalComparison(queryAnalysis);

    return needsConfirmation && agentResponse.confidence < this.autoConfirmThreshold;
  }

  /**
   * Create confirmation request
   */
  createConfirmationRequest(sessionId, queryAnalysis, agentResponse, userId = null) {
    const confirmationId = uuidv4();
    const expiresAt = new Date(Date.now() + this.confirmationTimeout);

    const confirmationData = {
      confirmationId,
      sessionId,
      userId,
      query: queryAnalysis.query,
      agentResponse,
      queryAnalysis,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      confirmationType: this.determineConfirmationType(queryAnalysis, agentResponse)
    };

    this.pendingConfirmations.set(confirmationId, confirmationData);

    // Set timeout for auto-rejection
    setTimeout(() => {
      this.timeoutConfirmation(confirmationId);
    }, this.confirmationTimeout);

    return this.formatConfirmationRequest(confirmationData);
  }

  /**
   * Determine type of confirmation needed
   */
  determineConfirmationType(queryAnalysis, agentResponse) {
    if (agentResponse.confidence < 0.5) return 'low_confidence';
    if (queryAnalysis.complexity === 'complex') return 'complex_query';
    if (queryAnalysis.multiAgent) return 'multi_agent';
    if (this.containsSensitiveContent(queryAnalysis.query)) return 'sensitive_content';
    if (this.isHistoricalComparison(queryAnalysis)) return 'historical_comparison';
    return 'general_validation';
  }

  /**
   * Format confirmation request for user
   */
  formatConfirmationRequest(confirmationData) {
    const { confirmationId, query, agentResponse, confirmationType } = confirmationData;
    
    const messages = {
      low_confidence: `I have lower confidence in this response. Would you like me to proceed or try a different approach?`,
      complex_query: `This is a complex query that may require multiple data sources. Should I proceed with the current analysis?`,
      multi_agent: `This query involves coordination between multiple AI agents. Confirm if you'd like to proceed with the multi-agent analysis?`,
      sensitive_content: `This query involves predictions or sensitive F1 information. Please confirm you want me to proceed.`,
      historical_comparison: `This involves comparing different F1 eras which may have different contexts. Proceed with comparison?`,
      general_validation: `Please confirm if you'd like me to proceed with this analysis.`
    };

    return {
      confirmationId,
      message: messages[confirmationType] || messages.general_validation,
      query,
      agentResponse: {
        preview: agentResponse.response.substring(0, 200) + '...',
        confidence: agentResponse.confidence,
        agentUsed: agentResponse.agentUsed
      },
      options: [
        { action: 'confirm', label: 'Yes, proceed', description: 'Continue with the current response' },
        { action: 'refine', label: 'Refine query', description: 'Let me ask a more specific question' },
        { action: 'alternative', label: 'Try different approach', description: 'Use a different analysis method' },
        { action: 'cancel', label: 'Cancel', description: 'Cancel this query' }
      ],
      expiresAt: confirmationData.expiresAt,
      confirmationType
    };
  }

  /**
   * Process user confirmation response
   */
  async processConfirmation(confirmationId, userAction, additionalData = {}) {
    const confirmation = this.pendingConfirmations.get(confirmationId);
    
    if (!confirmation) {
      return { success: false, error: 'Confirmation not found or expired' };
    }

    if (confirmation.status !== 'pending') {
      return { success: false, error: 'Confirmation already processed' };
    }

    // Check if expired
    if (new Date() > new Date(confirmation.expiresAt)) {
      return { success: false, error: 'Confirmation has expired' };
    }

    confirmation.status = 'processed';
    confirmation.userAction = userAction;
    confirmation.processedAt = new Date().toISOString();
    confirmation.additionalData = additionalData;

    let result;
    switch (userAction) {
      case 'confirm':
        result = await this.handleConfirmAction(confirmation);
        break;
      case 'refine':
        result = await this.handleRefineAction(confirmation, additionalData);
        break;
      case 'alternative':
        result = await this.handleAlternativeAction(confirmation, additionalData);
        break;
      case 'cancel':
        result = await this.handleCancelAction(confirmation);
        break;
      default:
        result = { success: false, error: 'Invalid action' };
    }

    // Clean up processed confirmation
    this.pendingConfirmations.delete(confirmationId);
    
    return result;
  }

  /**
   * Handle confirm action
   */
  async handleConfirmAction(confirmation) {
    return {
      success: true,
      action: 'confirmed',
      response: confirmation.agentResponse.response,
      agentUsed: confirmation.agentResponse.agentUsed,
      confidence: confirmation.agentResponse.confidence,
      message: 'Response confirmed and delivered'
    };
  }

  /**
   * Handle refine action
   */
  async handleRefineAction(confirmation, additionalData) {
    const refinedQuery = additionalData.refinedQuery || confirmation.query;
    
    return {
      success: true,
      action: 'refine',
      refinedQuery,
      message: 'Query refined. Please resubmit the refined query.',
      suggestions: this.generateRefinementSuggestions(confirmation.queryAnalysis)
    };
  }

  /**
   * Handle alternative action
   */
  async handleAlternativeAction(confirmation, additionalData) {
    const alternativeAgent = additionalData.alternativeAgent || this.suggestAlternativeAgent(confirmation);
    
    return {
      success: true,
      action: 'alternative',
      alternativeAgent,
      message: `Trying alternative approach with ${alternativeAgent} agent`,
      originalResponse: confirmation.agentResponse
    };
  }

  /**
   * Handle cancel action
   */
  async handleCancelAction(confirmation) {
    return {
      success: true,
      action: 'cancelled',
      message: 'Query cancelled by user request'
    };
  }

  /**
   * Generate refinement suggestions
   */
  generateRefinementSuggestions(queryAnalysis) {
    const suggestions = [];
    
    if (queryAnalysis.entities.drivers.length > 2) {
      suggestions.push('Consider focusing on 1-2 specific drivers for more detailed analysis');
    }
    
    if (queryAnalysis.entities.years.length > 3) {
      suggestions.push('Try narrowing down to a specific season or timeframe');
    }
    
    if (queryAnalysis.complexity === 'complex') {
      suggestions.push('Break down your question into smaller, more specific parts');
    }

    if (queryAnalysis.queryType === 'prediction') {
      suggestions.push('Add specific criteria or timeframe for more accurate predictions');
    }

    return suggestions.length > 0 ? suggestions : [
      'Try being more specific about what aspect interests you most',
      'Add context about what you\'re trying to understand or achieve'
    ];
  }

  /**
   * Suggest alternative agent
   */
  suggestAlternativeAgent(confirmation) {
    const currentAgent = confirmation.agentResponse.agentUsed;
    const queryType = confirmation.queryAnalysis.queryType;
    
    const alternatives = {
      circuit: ['driver', 'raceResults'],
      driver: ['historical', 'championship'],
      constructor: ['driver', 'raceResults'],
      raceResults: ['driver', 'circuit'],
      championship: ['historical', 'driver'],
      historical: ['driver', 'championship']
    };

    const possibleAlternatives = alternatives[currentAgent] || ['driver'];
    return possibleAlternatives[0];
  }

  /**
   * Timeout confirmation (auto-reject)
   */
  timeoutConfirmation(confirmationId) {
    const confirmation = this.pendingConfirmations.get(confirmationId);
    
    if (confirmation && confirmation.status === 'pending') {
      confirmation.status = 'timeout';
      confirmation.processedAt = new Date().toISOString();
      // Keep expired confirmation for short period for potential late responses
      setTimeout(() => {
        this.pendingConfirmations.delete(confirmationId);
      }, 60000); // 1 minute grace period
    }
  }

  /**
   * Get pending confirmations for a session
   */
  getPendingConfirmations(sessionId) {
    const pending = [];
    
    for (const confirmation of this.pendingConfirmations.values()) {
      if (confirmation.sessionId === sessionId && confirmation.status === 'pending') {
        pending.push(this.formatConfirmationRequest(confirmation));
      }
    }
    
    return pending;
  }

  /**
   * Check for sensitive content
   */
  containsSensitiveContent(query) {
    const sensitiveTerms = [
      'bet', 'gambling', 'odds', 'prediction', 'forecast', 'invest',
      'financial', 'money', 'profit', 'loss', 'risk'
    ];
    
    const queryLower = query.toLowerCase();
    return sensitiveTerms.some(term => queryLower.includes(term));
  }

  /**
   * Check if query is historical comparison
   */
  isHistoricalComparison(queryAnalysis) {
    const hasMultipleEras = queryAnalysis.entities.years.length > 1;
    const yearSpan = queryAnalysis.entities.years.length > 1 
      ? Math.max(...queryAnalysis.entities.years) - Math.min(...queryAnalysis.entities.years)
      : 0;
    
    return hasMultipleEras && yearSpan > 10;
  }

  /**
   * Get confirmation statistics
   */
  getStats() {
    const total = this.pendingConfirmations.size;
    let pending = 0;
    let processed = 0;
    let timeout = 0;

    for (const confirmation of this.pendingConfirmations.values()) {
      switch (confirmation.status) {
        case 'pending': pending++; break;
        case 'processed': processed++; break;
        case 'timeout': timeout++; break;
      }
    }

    return { total, pending, processed, timeout };
  }

  /**
   * Clean up expired confirmations
   */
  cleanup() {
    const now = new Date();
    for (const [id, confirmation] of this.pendingConfirmations.entries()) {
      if (new Date(confirmation.expiresAt) < now) {
        this.pendingConfirmations.delete(id);
      }
    }
  }
}

export default ConfirmationWorkflow;
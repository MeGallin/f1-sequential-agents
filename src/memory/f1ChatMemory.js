/**
 * F1 Chat Memory System - Following TFL Pattern
 * Handles conversation context for F1 queries
 */
class F1ChatMemory {
  constructor() {
    this.conversations = new Map(); // threadId -> conversation data
    this.maxMessages = 50;
  }

  /**
   * Initialize conversation for a session
   */
  initializeSession(threadId, userId = null) {
    if (!this.conversations.has(threadId)) {
      this.conversations.set(threadId, {
        threadId,
        userId,
        messages: [],
        context: {
          activeTopics: [],
          mentionedDrivers: new Set(),
          mentionedCircuits: new Set(),
          mentionedSeasons: new Set(),
          lastAgent: null,
          queryHistory: []
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
    }
    return this.conversations.get(threadId);
  }

  /**
   * Add message to conversation
   */
  addMessage(threadId, role, content, metadata = {}) {
    const conversation = this.initializeSession(threadId);
    
    const messageEntry = {
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        agent: metadata.agent,
        confidence: metadata.confidence,
        processingTime: metadata.processingTime,
        ...metadata
      }
    };

    conversation.messages.push(messageEntry);
    conversation.lastActivity = new Date().toISOString();

    // Update conversation context
    this.updateConversationContext(conversation, role, content, metadata);

    // Manage memory size
    if (conversation.messages.length > this.maxMessages) {
      this.truncateConversation(conversation);
    }

    return messageEntry;
  }

  /**
   * Update conversation context with F1 entities and topics
   */
  updateConversationContext(conversation, role, content, metadata) {
    if (content && typeof content === 'string') {
      const contentLower = content.toLowerCase();

      // Extract F1 drivers
      const drivers = [
        'hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 
        'piastri', 'alonso', 'stroll', 'ocon', 'gasly', 'tsunoda',
        'perez', 'bottas', 'zhou', 'magnussen', 'hulkenberg', 'albon',
        'sargeant', 'de vries', 'lawson'
      ];

      // Extract F1 circuits
      const circuits = [
        'monaco', 'silverstone', 'monza', 'spa', 'suzuka', 'interlagos', 
        'austin', 'imola', 'bahrain', 'saudi arabia', 'australia', 'baku',
        'miami', 'canada', 'spain', 'hungary', 'belgium', 'netherlands',
        'singapore', 'japan', 'qatar', 'mexico', 'brazil', 'las vegas', 'abu dhabi'
      ];

      // Extract F1 topics
      const topics = [
        'championship', 'qualifying', 'race', 'strategy', 'performance', 
        'standings', 'prediction', 'circuit', 'constructor', 'driver'
      ];

      drivers.forEach(driver => {
        if (contentLower.includes(driver)) {
          conversation.context.mentionedDrivers.add(driver);
        }
      });

      circuits.forEach(circuit => {
        if (contentLower.includes(circuit)) {
          conversation.context.mentionedCircuits.add(circuit);
        }
      });

      // Extract years/seasons
      const yearMatches = content.match(/\b(19|20)\d{2}\b/g);
      if (yearMatches) {
        yearMatches.forEach(year => conversation.context.mentionedSeasons.add(year));
      }

      // Extract active topics
      topics.forEach(topic => {
        if (contentLower.includes(topic) && !conversation.context.activeTopics.includes(topic)) {
          conversation.context.activeTopics.push(topic);
        }
      });

      // Keep only recent topics (last 5)
      if (conversation.context.activeTopics.length > 5) {
        conversation.context.activeTopics = conversation.context.activeTopics.slice(-5);
      }

      // Track query history for context
      if (role === 'user') {
        conversation.context.queryHistory.push({
          query: content,
          timestamp: new Date().toISOString()
        });
        
        // Keep last 10 queries
        if (conversation.context.queryHistory.length > 10) {
          conversation.context.queryHistory = conversation.context.queryHistory.slice(-10);
        }
      }

      // Track last agent used
      if (role === 'assistant' && metadata.agent) {
        conversation.context.lastAgent = metadata.agent;
      }
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(threadId, limit = null) {
    const conversation = this.conversations.get(threadId);
    if (!conversation) return null;

    const messages = limit ? conversation.messages.slice(-limit) : conversation.messages;
    
    return {
      ...conversation,
      messages,
      context: {
        ...conversation.context,
        mentionedDrivers: Array.from(conversation.context.mentionedDrivers),
        mentionedCircuits: Array.from(conversation.context.mentionedCircuits),
        mentionedSeasons: Array.from(conversation.context.mentionedSeasons)
      }
    };
  }

  /**
   * Get conversation context for agent decision making
   */
  getRelevantContext(threadId, currentQuery) {
    const conversation = this.conversations.get(threadId);
    if (!conversation) return null;

    const recentMessages = conversation.messages.slice(-10);
    const currentQueryLower = currentQuery.toLowerCase();

    // Find relevant historical context
    const relevantMessages = recentMessages.filter(msg => {
      if (!msg.content) return false;
      const content = msg.content.toLowerCase();
      
      // Check for entity overlap
      const hasDriverOverlap = Array.from(conversation.context.mentionedDrivers)
        .some(driver => currentQueryLower.includes(driver) || content.includes(driver));
      
      const hasCircuitOverlap = Array.from(conversation.context.mentionedCircuits)
        .some(circuit => currentQueryLower.includes(circuit) || content.includes(circuit));

      const hasTopicOverlap = conversation.context.activeTopics
        .some(topic => currentQueryLower.includes(topic) || content.includes(topic));

      return hasDriverOverlap || hasCircuitOverlap || hasTopicOverlap;
    });

    // Check for year clarification context
    const needsYearClarification = this.detectYearClarificationNeed(
      conversation, 
      currentQuery
    );

    return {
      threadId,
      recentMessages: recentMessages.slice(-5),
      relevantMessages,
      context: {
        ...conversation.context,
        mentionedDrivers: Array.from(conversation.context.mentionedDrivers),
        mentionedCircuits: Array.from(conversation.context.mentionedCircuits),
        mentionedSeasons: Array.from(conversation.context.mentionedSeasons)
      },
      needsYearClarification
    };
  }

  /**
   * Detect if current query needs year clarification based on conversation
   */
  detectYearClarificationNeed(conversation, currentQuery) {
    const queryLower = currentQuery.toLowerCase();
    
    // Check if current query is a year clarification response
    const isYearResponse = /\b(this year|last year|current year|current season|this current season|this season|\d{4})\b/i.test(currentQuery);
    
    if (!isYearResponse) return null;

    // Check if previous message was asking for year clarification
    const recentMessages = conversation.messages.slice(-3);
    const lastAssistantMessage = recentMessages
      .reverse()
      .find(msg => msg.role === 'assistant');

    if (lastAssistantMessage && lastAssistantMessage.content) {
      const askingForYear = /which year|what year|specify.*year/i.test(lastAssistantMessage.content);
      
      if (askingForYear) {
        // Find the original query that needed clarification
        const userMessages = conversation.messages
          .filter(msg => msg.role === 'user')
          .slice(-3, -1); // Exclude current message
          
        const originalQuery = userMessages[userMessages.length - 1];
        
        if (originalQuery) {
          return {
            originalQuery: originalQuery.content,
            yearResponse: currentQuery,
            context: 'year_clarification'
          };
        }
      }
    }

    return null;
  }

  /**
   * Truncate conversation when it gets too long
   */
  truncateConversation(conversation) {
    // Keep the most recent messages
    const recentMessages = conversation.messages.slice(-20);
    conversation.messages = recentMessages;
  }

  /**
   * Save message (simplified version for in-memory storage)
   */
  async saveMessage(threadId, role, content, metadata = {}) {
    return this.addMessage(threadId, role, content, metadata);
  }

  /**
   * Create conversation
   */
  async createConversation(threadId) {
    return this.initializeSession(threadId);
  }

  /**
   * Delete conversation
   */
  async deleteConversation(threadId) {
    const existed = this.conversations.has(threadId);
    this.conversations.delete(threadId);
    return existed;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return true;
  }

  /**
   * Get stats
   */
  getStats() {
    const totalConversations = this.conversations.size;
    const totalMessages = Array.from(this.conversations.values())
      .reduce((sum, conv) => sum + conv.messages.length, 0);
    
    return {
      totalConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? 
        Math.round(totalMessages / totalConversations) : 0
    };
  }
}

export { F1ChatMemory };
export default F1ChatMemory;
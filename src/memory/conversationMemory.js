// Conversation Memory Management System for F1 Sequential Agents
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';

export class ConversationMemory {
  constructor(options = {}) {
    this.maxMessages = options.maxMessages || 50;
    this.summarizerModel = options.summarizerModel || 'gpt-4o-mini';
    this.conversations = new Map(); // sessionId -> conversation data
    this.userPreferences = new Map(); // userId -> preferences
  }

  /**
   * Initialize conversation for a session
   */
  initializeSession(sessionId, userId = null) {
    if (!this.conversations.has(sessionId)) {
      this.conversations.set(sessionId, {
        sessionId,
        userId,
        messages: [],
        summary: '',
        context: {
          activeTopics: [],
          mentionedDrivers: new Set(),
          mentionedCircuits: new Set(),
          mentionedSeasons: new Set(),
          queryHistory: []
        },
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      });
    }
    return this.conversations.get(sessionId);
  }

  /**
   * Add message to conversation
   */
  addMessage(sessionId, message, metadata = {}) {
    const conversation = this.initializeSession(sessionId);
    
    const messageEntry = {
      ...message,
      timestamp: new Date().toISOString(),
      metadata: {
        agentUsed: metadata.agentUsed,
        confidence: metadata.confidence,
        processingTime: metadata.processingTime,
        ...metadata
      }
    };

    conversation.messages.push(messageEntry);
    conversation.lastActivity = new Date().toISOString();

    // Update conversation context
    this.updateConversationContext(conversation, message);

    // Manage memory size
    if (conversation.messages.length > this.maxMessages) {
      this.summarizeAndTruncate(conversation);
    }

    return messageEntry;
  }

  /**
   * Update conversation context with entities and topics
   */
  updateConversationContext(conversation, message) {
    if (message.content && typeof message.content === 'string') {
      const content = message.content.toLowerCase();

      // Extract F1 entities
      const drivers = ['hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 'alonso', 'ocon', 'gasly', 'tsunoda'];
      const circuits = ['monaco', 'silverstone', 'monza', 'spa', 'suzuka', 'interlagos', 'austin', 'imola', 'bahrain'];
      const topics = ['championship', 'qualifying', 'race', 'strategy', 'performance', 'standings', 'prediction'];

      drivers.forEach(driver => {
        if (content.includes(driver)) {
          conversation.context.mentionedDrivers.add(driver);
        }
      });

      circuits.forEach(circuit => {
        if (content.includes(circuit)) {
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
        if (content.includes(topic) && !conversation.context.activeTopics.includes(topic)) {
          conversation.context.activeTopics.push(topic);
        }
      });

      // Keep only recent topics (last 5)
      if (conversation.context.activeTopics.length > 5) {
        conversation.context.activeTopics = conversation.context.activeTopics.slice(-5);
      }
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId, limit = null) {
    const conversation = this.conversations.get(sessionId);
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
  getRelevantContext(sessionId, currentQuery) {
    const conversation = this.conversations.get(sessionId);
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

    return {
      sessionId,
      summary: conversation.summary,
      recentMessages: recentMessages.slice(-5),
      relevantMessages,
      context: {
        ...conversation.context,
        mentionedDrivers: Array.from(conversation.context.mentionedDrivers),
        mentionedCircuits: Array.from(conversation.context.mentionedCircuits),
        mentionedSeasons: Array.from(conversation.context.mentionedSeasons)
      }
    };
  }

  /**
   * Summarize and truncate conversation when it gets too long
   */
  async summarizeAndTruncate(conversation) {
    try {
      // Keep the most recent messages
      const recentMessages = conversation.messages.slice(-10);
      const messagesToSummarize = conversation.messages.slice(0, -10);

      if (messagesToSummarize.length > 0) {
        const summaryText = this.createConversationSummary(messagesToSummarize);
        
        // Update conversation with summary and truncated messages
        conversation.summary = conversation.summary 
          ? `${conversation.summary}\n\n${summaryText}`
          : summaryText;
        
        conversation.messages = recentMessages;
      }
    } catch (error) {
      console.error('Error summarizing conversation:', error);
      // Fallback: just truncate without summarizing
      conversation.messages = conversation.messages.slice(-20);
    }
  }

  /**
   * Create conversation summary from messages
   */
  createConversationSummary(messages) {
    const topics = new Set();
    const entities = new Set();
    
    messages.forEach(msg => {
      if (msg.metadata?.agentUsed) {
        topics.add(msg.metadata.agentUsed);
      }
      
      // Extract key entities from content
      if (msg.content && typeof msg.content === 'string') {
        const content = msg.content.toLowerCase();
        if (content.includes('hamilton')) entities.add('Hamilton');
        if (content.includes('verstappen')) entities.add('Verstappen');
        if (content.includes('monaco')) entities.add('Monaco');
        if (content.includes('championship')) entities.add('Championship');
      }
    });

    const topicsList = Array.from(topics).join(', ');
    const entitiesList = Array.from(entities).join(', ');
    const messageCount = messages.length;

    return `Previous conversation (${messageCount} messages) covered: ${topicsList}. Key entities discussed: ${entitiesList}. Conversation period: ${messages[0]?.timestamp} to ${messages[messages.length-1]?.timestamp}.`;
  }

  /**
   * User Preferences Management
   */
  setUserPreference(userId, preferences) {
    const currentPrefs = this.userPreferences.get(userId) || {};
    this.userPreferences.set(userId, {
      ...currentPrefs,
      ...preferences,
      updatedAt: new Date().toISOString()
    });
  }

  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {
      preferredDrivers: [],
      preferredTeams: [],
      analysisDetail: 'medium', // low, medium, high
      responseFormat: 'conversational', // conversational, technical, summary
      timezone: 'UTC'
    };
  }

  /**
   * Clear old conversations (cleanup)
   */
  cleanupOldConversations(maxAgeHours = 24) {
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    for (const [sessionId, conversation] of this.conversations.entries()) {
      const lastActivity = new Date(conversation.lastActivity);
      if (lastActivity < cutoffTime) {
        this.conversations.delete(sessionId);
      }
    }
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    const totalConversations = this.conversations.size;
    const totalMessages = Array.from(this.conversations.values())
      .reduce((sum, conv) => sum + conv.messages.length, 0);
    
    const activeConversations = Array.from(this.conversations.values())
      .filter(conv => {
        const lastActivity = new Date(conv.lastActivity);
        const oneHourAgo = new Date(Date.now() - (60 * 60 * 1000));
        return lastActivity > oneHourAgo;
      }).length;

    return {
      totalConversations,
      activeConversations,
      totalMessages,
      averageMessagesPerConversation: totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0
    };
  }
}

export default ConversationMemory;
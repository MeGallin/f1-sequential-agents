import { agentFactory } from '../agents/agentFactory.js';

class QueryRouter {
  constructor() {
    this.agentFactory = agentFactory;
    this.routingRules = this.initializeRoutingRules();
    this.keywordWeights = this.initializeKeywordWeights();
  }

  initializeRoutingRules() {
    return {
      // Circuit-specific routing
      circuit: {
        primaryKeywords: ['circuit', 'track', 'lap', 'sector', 'corner', 'drs', 'elevation'],
        secondaryKeywords: ['monaco', 'silverstone', 'monza', 'spa', 'suzuka', 'interlagos', 'austin'],
        boost: 2.0,
        minimumConfidence: 0.6
      },

      // Driver-specific routing
      driver: {
        primaryKeywords: ['driver', 'pilot', 'racer', 'championship', 'career', 'statistics'],
        secondaryKeywords: ['hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 'alonso'],
        boost: 1.8,
        minimumConfidence: 0.7
      },

      // Constructor-specific routing
      constructor: {
        primaryKeywords: ['team', 'constructor', 'car', 'technical', 'development', 'regulation'],
        secondaryKeywords: ['mercedes', 'ferrari', 'red bull', 'mclaren', 'alpine', 'aston martin'],
        boost: 1.6,
        minimumConfidence: 0.6
      },

      // Race results routing
      raceResults: {
        primaryKeywords: ['race', 'result', 'qualifying', 'grid', 'finish', 'podium', 'dnf'],
        secondaryKeywords: ['winner', 'fastest lap', 'pole position', 'overtake', 'safety car'],
        boost: 1.5,
        minimumConfidence: 0.7
      },

      // Championship routing
      championship: {
        primaryKeywords: ['championship', 'standings', 'points', 'title', 'leader', 'gap'],
        secondaryKeywords: ['predict', 'forecast', 'scenario', 'mathematical', 'clinch'],
        boost: 1.7,
        minimumConfidence: 0.8
      },

      // Historical routing
      historical: {
        primaryKeywords: ['history', 'historical', 'evolution', 'era', 'all time', 'legacy'],
        secondaryKeywords: ['compare', 'decade', 'regulation', 'turbo', 'ground effect', 'hybrid'],
        boost: 1.4,
        minimumConfidence: 0.5
      }
    };
  }

  initializeKeywordWeights() {
    return {
      // Query type indicators
      comparison: ['compare', 'vs', 'versus', 'difference', 'better', 'worse'],
      prediction: ['predict', 'forecast', 'will', 'future', 'likely', 'probability'],
      analysis: ['analyze', 'analysis', 'explain', 'why', 'how', 'what'],
      statistics: ['stats', 'statistics', 'numbers', 'data', 'record', 'performance'],
      
      // Complexity indicators
      complex: ['comprehensive', 'detailed', 'in-depth', 'thorough', 'complete'],
      simple: ['quick', 'simple', 'brief', 'summary', 'overview']
    };
  }

  async routeQuery(query, context = {}) {
    try {
      console.log('🎯 Advanced query routing initiated...');

      // Step 1: Preprocess query
      const processedQuery = this.preprocessQuery(query);
      
      // Step 2: Extract routing features
      const features = this.extractRoutingFeatures(processedQuery, context);
      
      // Step 3: Calculate agent scores
      const agentScores = await this.calculateAgentScores(processedQuery, features);
      
      // Step 4: Apply routing rules and boosts
      const boostedScores = this.applyRoutingBoosts(agentScores, features);
      
      // Step 5: Select primary and alternative agents
      const routing = this.selectAgents(boostedScores, features);
      
      console.log(`✅ Query routed to: ${routing.primaryAgent} (confidence: ${routing.confidence.toFixed(2)})`);
      
      return routing;

    } catch (error) {
      console.error('❌ Query routing failed:', error);
      
      // Fallback to basic routing
      return await this.fallbackRouting(query);
    }
  }

  preprocessQuery(query) {
    return {
      original: query,
      normalized: query.toLowerCase().trim(),
      words: query.toLowerCase().split(/\s+/),
      length: query.length,
      wordCount: query.split(/\s+/).length
    };
  }

  extractRoutingFeatures(processedQuery, context) {
    const features = {
      // Basic query features
      queryType: this.classifyQueryType(processedQuery.normalized),
      complexity: this.assessQueryComplexity(processedQuery),
      entities: this.extractEntities(processedQuery.normalized),
      
      // Temporal features
      temporal: this.extractTemporal(processedQuery.normalized),
      
      // Context features
      hasContext: Object.keys(context).length > 0,
      previousAgent: context.previousAgent || null,
      conversationHistory: context.conversationHistory || [],
      
      // Intent features
      intent: this.extractIntent(processedQuery.normalized),
      urgency: this.assessUrgency(processedQuery.normalized)
    };

    return features;
  }

  classifyQueryType(query) {
    const types = [];
    
    // Check for comparison queries
    if (/\b(compare|vs|versus|better|worse|difference)\b/.test(query)) {
      types.push('comparison');
    }
    
    // Check for prediction queries
    if (/\b(predict|forecast|will|future|likely|probability|who will win)\b/.test(query)) {
      types.push('prediction');
    }
    
    // Check for historical queries
    if (/\b(history|historical|evolution|era|all time|legacy|past)\b/.test(query)) {
      types.push('historical');
    }
    
    // Check for analytical queries
    if (/\b(analyze|analysis|explain|why|how|impact|reason)\b/.test(query)) {
      types.push('analytical');
    }
    
    // Check for statistical queries
    if (/\b(stats|statistics|numbers|data|record|performance|fastest|slowest)\b/.test(query)) {
      types.push('statistical');
    }
    
    return types.length > 0 ? types : ['general'];
  }

  assessQueryComplexity(processedQuery) {
    let complexity = 0;
    
    // Word count factor
    complexity += Math.min(processedQuery.wordCount / 15, 2);
    
    // Complex query indicators
    const complexityIndicators = [
      'comprehensive', 'detailed', 'in-depth', 'thorough', 'analyze',
      'correlation', 'impact', 'throughout', 'across', 'multiple'
    ];
    
    complexity += complexityIndicators.filter(indicator =>
      processedQuery.normalized.includes(indicator)
    ).length * 0.5;
    
    // Entity complexity
    const entityCount = this.countEntities(processedQuery.normalized);
    complexity += entityCount * 0.3;
    
    // Multi-part queries
    if (processedQuery.normalized.includes(' and ') || processedQuery.normalized.includes(' or ')) {
      complexity += 1;
    }
    
    if (complexity <= 1.5) return 'simple';
    if (complexity <= 3) return 'moderate';
    return 'complex';
  }

  extractEntities(query) {
    const entities = {
      drivers: this.extractDrivers(query),
      constructors: this.extractConstructors(query),
      circuits: this.extractCircuits(query),
      seasons: this.extractSeasons(query),
      races: this.extractRaces(query)
    };

    return entities;
  }

  extractDrivers(query) {
    const drivers = [
      'hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 'piastri',
      'alonso', 'stroll', 'ocon', 'gasly', 'tsunoda', 'bottas', 'zhou',
      'albon', 'sargeant', 'hulkenberg', 'magnussen', 'schumacher', 'vettel'
    ];
    
    return drivers.filter(driver => query.includes(driver));
  }

  extractConstructors(query) {
    const constructors = [
      'mercedes', 'ferrari', 'red bull', 'redbull', 'mclaren', 'alpine',
      'aston martin', 'williams', 'haas', 'alfa romeo', 'alphatauri',
      'renault', 'racing point', 'force india'
    ];
    
    return constructors.filter(constructor => query.includes(constructor));
  }

  extractCircuits(query) {
    const circuits = [
      'monaco', 'silverstone', 'monza', 'spa', 'suzuka', 'interlagos',
      'austin', 'abu dhabi', 'bahrain', 'melbourne', 'imola', 'barcelona',
      'hungaroring', 'zandvoort', 'singapore', 'baku', 'miami'
    ];
    
    return circuits.filter(circuit => query.includes(circuit));
  }

  extractSeasons(query) {
    const yearMatches = query.match(/\b(19|20)\d{2}\b/g);
    return yearMatches ? yearMatches.map(year => parseInt(year)) : [];
  }

  extractRaces(query) {
    const racePatterns = [
      /round\s*(\d+)/i,
      /race\s*(\d+)/i,
      /r(\d+)\b/i
    ];
    
    for (const pattern of racePatterns) {
      const match = query.match(pattern);
      if (match) {
        return [parseInt(match[1])];
      }
    }
    
    return [];
  }

  extractTemporal(query) {
    return {
      isCurrent: /\b(current|now|this season|today|latest)\b/.test(query),
      isHistorical: /\b(history|past|previous|last season|years ago)\b/.test(query),
      isFuture: /\b(next|future|upcoming|will|predict)\b/.test(query),
      hasSpecificYear: /\b(19|20)\d{2}\b/.test(query)
    };
  }

  extractIntent(query) {
    const intents = [];
    
    if (/\b(help|explain|understand|learn)\b/.test(query)) {
      intents.push('educational');
    }
    
    if (/\b(find|search|lookup|get)\b/.test(query)) {
      intents.push('informational');
    }
    
    if (/\b(compare|choose|decide|better)\b/.test(query)) {
      intents.push('comparative');
    }
    
    if (/\b(predict|forecast|guess|think)\b/.test(query)) {
      intents.push('predictive');
    }
    
    return intents;
  }

  assessUrgency(query) {
    const urgentIndicators = ['urgent', 'quickly', 'asap', 'now', 'immediate'];
    const hasUrgentKeywords = urgentIndicators.some(indicator =>
      query.includes(indicator)
    );
    
    return hasUrgentKeywords ? 'high' : 'normal';
  }

  countEntities(query) {
    const drivers = this.extractDrivers(query).length;
    const constructors = this.extractConstructors(query).length;
    const circuits = this.extractCircuits(query).length;
    const seasons = this.extractSeasons(query).length;
    
    return drivers + constructors + circuits + seasons;
  }

  async calculateAgentScores(processedQuery, features) {
    // Get base scores from agent factory
    const baseScores = this.agentFactory.calculateRoutingScores(processedQuery.original);
    
    // Convert to enhanced scoring format
    const enhancedScores = {};
    
    baseScores.forEach(score => {
      enhancedScores[score.agentId] = {
        baseScore: score.score,
        confidence: score.confidence,
        keywordMatches: 0,
        contextBoost: 0,
        intentAlignment: 0
      };
    });
    
    return enhancedScores;
  }

  applyRoutingBoosts(agentScores, features) {
    const boostedScores = { ...agentScores };
    
    // Apply routing rule boosts
    Object.keys(this.routingRules).forEach(agentType => {
      if (boostedScores[agentType]) {
        const rule = this.routingRules[agentType];
        let boost = 0;
        
        // Primary keyword boost
        rule.primaryKeywords.forEach(keyword => {
          if (features.entities.drivers.includes(keyword) ||
              features.entities.constructors.includes(keyword) ||
              features.entities.circuits.includes(keyword)) {
            boost += rule.boost;
          }
        });
        
        // Apply boost
        boostedScores[agentType].contextBoost = boost;
        boostedScores[agentType].confidence = Math.min(
          boostedScores[agentType].confidence + (boost * 0.1),
          1.0
        );
      }
    });
    
    // Apply complexity-based adjustments
    if (features.complexity === 'complex') {
      // Boost historical and championship agents for complex queries
      if (boostedScores.historical) {
        boostedScores.historical.confidence += 0.1;
      }
      if (boostedScores.championship) {
        boostedScores.championship.confidence += 0.1;
      }
    }
    
    // Apply query type boosts
    features.queryType.forEach(type => {
      switch (type) {
        case 'comparison':
          if (boostedScores.historical) boostedScores.historical.confidence += 0.15;
          break;
        case 'prediction':
          if (boostedScores.championship) boostedScores.championship.confidence += 0.2;
          break;
        case 'historical':
          if (boostedScores.historical) boostedScores.historical.confidence += 0.25;
          break;
        case 'statistical':
          if (boostedScores.driver) boostedScores.driver.confidence += 0.1;
          if (boostedScores.constructor) boostedScores.constructor.confidence += 0.1;
          break;
      }
    });
    
    return boostedScores;
  }

  selectAgents(boostedScores, features) {
    // Convert to array and sort by confidence
    const sortedAgents = Object.entries(boostedScores)
      .map(([agentId, scores]) => ({
        agentId,
        confidence: scores.confidence,
        totalScore: scores.baseScore + scores.contextBoost
      }))
      .sort((a, b) => b.confidence - a.confidence);
    
    const primaryAgent = sortedAgents[0];
    const alternatives = sortedAgents.slice(1, 4);
    
    // Determine if multi-agent approach is recommended
    const shouldUseMultiAgent = this.shouldRecommendMultiAgent(features, sortedAgents);
    
    return {
      primaryAgent: primaryAgent.agentId,
      confidence: primaryAgent.confidence,
      alternatives: alternatives.map(alt => ({
        agentId: alt.agentId,
        confidence: alt.confidence
      })),
      multiAgentRecommended: shouldUseMultiAgent,
      features,
      routing: {
        strategy: shouldUseMultiAgent ? 'multi-agent' : 'single-agent',
        complexity: features.complexity,
        queryTypes: features.queryType
      }
    };
  }

  shouldRecommendMultiAgent(features, sortedAgents) {
    // Multi-agent for complex queries
    if (features.complexity === 'complex') return true;
    
    // Multi-agent if top agents have similar confidence
    if (sortedAgents.length >= 2) {
      const confidenceDiff = sortedAgents[0].confidence - sortedAgents[1].confidence;
      if (confidenceDiff < 0.2) return true;
    }
    
    // Multi-agent for comparison queries
    if (features.queryType.includes('comparison')) return true;
    
    // Multi-agent for multiple entity queries
    const totalEntities = Object.values(features.entities)
      .reduce((sum, arr) => sum + arr.length, 0);
    if (totalEntities >= 3) return true;
    
    return false;
  }

  async fallbackRouting(query) {
    console.log('🔄 Using fallback routing...');
    
    try {
      const baseRouting = await this.agentFactory.routeQuery(query);
      return {
        primaryAgent: baseRouting.selectedAgent,
        confidence: baseRouting.confidence,
        alternatives: baseRouting.alternatives,
        multiAgentRecommended: false,
        fallback: true
      };
    } catch (error) {
      console.error('❌ Fallback routing also failed:', error);
      
      // Ultimate fallback
      return {
        primaryAgent: 'driver', // Default to driver agent
        confidence: 0.3,
        alternatives: [],
        multiAgentRecommended: false,
        error: true
      };
    }
  }

  // Debugging and analytics methods
  getRoutingAnalytics() {
    return {
      routingRules: Object.keys(this.routingRules),
      totalKeywords: Object.values(this.routingRules)
        .reduce((sum, rule) => sum + rule.primaryKeywords.length + rule.secondaryKeywords.length, 0),
      keywordCategories: Object.keys(this.keywordWeights)
    };
  }

  analyzeQuery(query) {
    const processedQuery = this.preprocessQuery(query);
    const features = this.extractRoutingFeatures(processedQuery, {});
    
    return {
      processedQuery,
      features,
      analytics: this.getRoutingAnalytics()
    };
  }
}

// Export singleton instance
export const queryRouter = new QueryRouter();
export { QueryRouter };
export default queryRouter;
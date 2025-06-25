// Query Validation and Refinement System for F1 Sequential Agents
export class QueryValidator {
  constructor() {
    this.validationRules = {
      minLength: 3,
      maxLength: 500,
      supportedLanguages: ['en'], // Currently only English
      bannedTerms: ['hack', 'exploit', 'illegal', 'cheat'],
      f1RequiredContext: true
    };

    this.refinementSuggestions = {
      tooVague: [
        'Try being more specific about which driver, team, or season you\'re interested in',
        'Add timeframe details (e.g., "in 2023" or "since 2020")',
        'Specify what aspect you want to know about (performance, statistics, strategy, etc.)'
      ],
      tooComplex: [
        'Consider breaking your question into smaller parts',
        'Focus on one main topic at a time',
        'Try asking about specific races or seasons rather than broad comparisons'
      ],
      missingContext: [
        'Add more context about what you\'re trying to understand',
        'Specify the time period you\'re interested in',
        'Mention which aspect of F1 is most relevant to your question'
      ],
      notF1Related: [
        'This seems to be about a different sport - I specialize in Formula 1',
        'Try rephrasing your question to focus on F1 racing',
        'I can help with F1 drivers, teams, races, circuits, and statistics'
      ]
    };
  }

  /**
   * Validate query and provide detailed feedback
   */
  validateQuery(query, sessionContext = null) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      confidence: 1.0,
      refinementNeeded: false,
      queryType: 'unknown'
    };

    // Basic validation checks
    this.checkBasicRequirements(query, validation);
    this.checkContentPolicy(query, validation);
    this.checkF1Relevance(query, validation);
    this.assessQueryClarity(query, validation, sessionContext);
    this.checkQueryComplexity(query, validation);

    // Determine if refinement is needed
    validation.refinementNeeded = validation.errors.length > 0 || 
                                  validation.warnings.length > 0 || 
                                  validation.confidence < 0.7;

    return validation;
  }

  /**
   * Check basic query requirements
   */
  checkBasicRequirements(query, validation) {
    if (!query || typeof query !== 'string') {
      validation.isValid = false;
      validation.errors.push('Query must be a non-empty string');
      return;
    }

    const trimmedQuery = query.trim();
    
    if (trimmedQuery.length < this.validationRules.minLength) {
      validation.isValid = false;
      validation.errors.push(`Query too short (minimum ${this.validationRules.minLength} characters)`);
      validation.suggestions.push('Please provide more details about what you\'d like to know');
    }

    if (trimmedQuery.length > this.validationRules.maxLength) {
      validation.isValid = false;
      validation.errors.push(`Query too long (maximum ${this.validationRules.maxLength} characters)`);
      validation.suggestions.push('Try breaking your question into smaller, more focused parts');
    }

    // Check for just whitespace or special characters
    if (!/[a-zA-Z]/.test(trimmedQuery)) {
      validation.isValid = false;
      validation.errors.push('Query must contain readable text');
    }
  }

  /**
   * Check content policy compliance
   */
  checkContentPolicy(query, validation) {
    const queryLower = query.toLowerCase();
    
    // Check for banned terms
    const foundBannedTerms = this.validationRules.bannedTerms.filter(term => 
      queryLower.includes(term)
    );

    if (foundBannedTerms.length > 0) {
      validation.isValid = false;
      validation.errors.push(`Query contains inappropriate content: ${foundBannedTerms.join(', ')}`);
      validation.suggestions.push('Please rephrase your question using appropriate language');
    }

    // Check for potential harmful content
    const harmfulPatterns = [
      /personal.*(information|data|details)/i,
      /private.*(info|data)/i,
      /(hack|crack|exploit)/i
    ];

    if (harmfulPatterns.some(pattern => pattern.test(query))) {
      validation.warnings.push('Query may contain inappropriate requests');
      validation.suggestions.push('I can only help with publicly available F1 information');
    }
  }

  /**
   * Check F1 relevance
   */
  checkF1Relevance(query, validation) {
    const queryLower = query.toLowerCase();
    
    const f1Terms = [
      // General F1 terms
      'f1', 'formula 1', 'formula one', 'grand prix', 'gp',
      
      // Drivers (current and recent)
      'hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris', 
      'alonso', 'ocon', 'gasly', 'tsunoda', 'vettel', 'ricciardo',
      
      // Teams/Constructors
      'mercedes', 'ferrari', 'red bull', 'mclaren', 'alpine', 'aston martin',
      'haas', 'alfa romeo', 'alphatauri', 'williams',
      
      // Circuits
      'monaco', 'silverstone', 'monza', 'spa', 'suzuka', 'interlagos',
      'austin', 'imola', 'bahrain', 'hungary', 'netherlands',
      
      // F1 specific terms
      'qualifying', 'race', 'championship', 'standings', 'podium',
      'fastest lap', 'pole position', 'drs', 'kers', 'pit stop',
      'circuit', 'track', 'constructor', 'season'
    ];

    const hasF1Content = f1Terms.some(term => queryLower.includes(term));
    
    if (!hasF1Content) {
      // Check for generic sports terms that might be F1 related
      const genericSports = ['driver', 'team', 'race', 'championship', 'season', 'performance'];
      const hasGenericSports = genericSports.some(term => queryLower.includes(term));
      
      if (hasGenericSports) {
        validation.warnings.push('Query may not be F1-specific');
        validation.suggestions.push('Add "F1" or "Formula 1" to clarify you\'re asking about Formula 1 racing');
        validation.confidence *= 0.7;
      } else {
        validation.warnings.push('Query doesn\'t appear to be F1-related');
        validation.suggestions.push(...this.refinementSuggestions.notF1Related);
        validation.confidence *= 0.3;
      }
    }

    validation.queryType = this.determineQueryType(queryLower);
  }

  /**
   * Assess query clarity and specificity
   */
  assessQueryClarity(query, validation, sessionContext) {
    const queryLower = query.toLowerCase();
    const wordCount = query.trim().split(/\s+/).length;

    // Too vague
    const vaguePatterns = [
      /^(what|who|how|when|where|why)\s*(about|is)?$/i,
      /^(tell me|show me|info|information)$/i,
      /^(good|bad|best|worst)$/i
    ];

    if (vaguePatterns.some(pattern => pattern.test(query.trim())) || wordCount < 3) {
      validation.warnings.push('Query is too vague');
      validation.suggestions.push(...this.refinementSuggestions.tooVague);
      validation.confidence *= 0.5;
    }

    // Ambiguous pronouns without context
    const pronouns = ['he', 'she', 'they', 'it', 'his', 'her', 'their'];
    const hasPronouns = pronouns.some(pronoun => 
      new RegExp(`\\b${pronoun}\\b`, 'i').test(queryLower)
    );

    if (hasPronouns && (!sessionContext || !sessionContext.recentMessages.length)) {
      validation.warnings.push('Query contains ambiguous pronouns without context');
      validation.suggestions.push('Use specific names instead of pronouns (he/she/they)');
      validation.confidence *= 0.8;
    }

    // Missing critical details
    if (this.isMissingCriticalContext(queryLower)) {
      validation.warnings.push('Query may be missing important context');
      validation.suggestions.push(...this.refinementSuggestions.missingContext);
      validation.confidence *= 0.7;
    }
  }

  /**
   * Check query complexity
   */
  checkQueryComplexity(query, validation) {
    const complexity = this.assessComplexity(query);
    
    if (complexity.level === 'very_complex') {
      validation.warnings.push('Query is very complex and may need refinement');
      validation.suggestions.push(...this.refinementSuggestions.tooComplex);
      validation.confidence *= 0.6;
    } else if (complexity.level === 'complex') {
      validation.warnings.push('Complex query detected - may require multiple agents');
      validation.confidence *= 0.8;
    }

    validation.complexity = complexity;
  }

  /**
   * Determine query type from content
   */
  determineQueryType(queryLower) {
    const patterns = {
      comparison: /\b(vs|versus|compare|compared?|between|difference|better|worse)\b/,
      prediction: /\b(predict|forecast|will|gonna|future|next|upcoming|expect)\b/,
      historical: /\b(history|historical|past|before|since|ever|all.?time|career)\b/,
      statistics: /\b(stats?|statistics|numbers?|data|results?|record)\b/,
      performance: /\b(performance|speed|fast|slow|lap.?time|qualifying)\b/,
      standings: /\b(standings?|championship|points?|leader|position)\b/,
      circuit: /\b(circuit|track|course|layout|characteristics)\b/,
      strategy: /\b(strategy|tactics|pit.?stop|tire|tyre|fuel)\b/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(queryLower)) {
        return type;
      }
    }

    return 'general';
  }

  /**
   * Assess query complexity
   */
  assessComplexity(query) {
    const factors = {
      wordCount: query.trim().split(/\s+/).length,
      questionMarks: (query.match(/\?/g) || []).length,
      andOr: (query.match(/\b(and|or|but|however|also)\b/gi) || []).length,
      entities: this.countEntities(query),
      timeReferences: (query.match(/\b(20\d{2}|19\d{2}|season|year|month)\b/gi) || []).length
    };

    let complexity = 0;
    
    // Word count scoring
    if (factors.wordCount > 30) complexity += 3;
    else if (factors.wordCount > 15) complexity += 2;
    else if (factors.wordCount > 8) complexity += 1;

    // Multiple questions
    if (factors.questionMarks > 1) complexity += 2;

    // Logical connectors
    if (factors.andOr > 2) complexity += 2;
    else if (factors.andOr > 0) complexity += 1;

    // Entity density
    if (factors.entities > 4) complexity += 2;
    else if (factors.entities > 2) complexity += 1;

    // Time complexity
    if (factors.timeReferences > 2) complexity += 1;

    const level = complexity > 6 ? 'very_complex' : 
                  complexity > 3 ? 'complex' : 
                  complexity > 1 ? 'moderate' : 'simple';

    return {
      level,
      score: complexity,
      factors
    };
  }

  /**
   * Count F1 entities in query
   */
  countEntities(query) {
    const queryLower = query.toLowerCase();
    const entities = {
      drivers: ['hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris'],
      teams: ['mercedes', 'ferrari', 'red bull', 'mclaren', 'alpine'],
      circuits: ['monaco', 'silverstone', 'monza', 'spa', 'suzuka']
    };

    let count = 0;
    Object.values(entities).flat().forEach(entity => {
      if (queryLower.includes(entity)) count++;
    });

    return count;
  }

  /**
   * Check if query is missing critical context
   */
  isMissingCriticalContext(queryLower) {
    const needsContextPatterns = [
      /\bcompare\b(?!.*\bwith\b|\bto\b|\bvs\b)/,
      /\bbetter\b(?!.*\bthan\b)/,
      /\bperformance\b(?!.*\bat\b|\bin\b|\bof\b)/,
      /\bwins?\b(?!.*\bin\b|\bat\b)/
    ];

    return needsContextPatterns.some(pattern => pattern.test(queryLower));
  }

  /**
   * Generate query refinement suggestions
   */
  generateRefinementSuggestions(query, validation) {
    const suggestions = [...validation.suggestions];
    
    // Add specific suggestions based on query content
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('best') || queryLower.includes('greatest')) {
      suggestions.push('Consider specifying criteria for "best" (fastest, most wins, most championships, etc.)');
    }

    if (queryLower.includes('compare') && validation.complexity.factors.entities < 2) {
      suggestions.push('Specify what you want to compare (e.g., "Compare Hamilton vs Verstappen lap times at Monaco")');
    }

    if (queryLower.includes('predict') || queryLower.includes('will')) {
      suggestions.push('Add context about timeframe and specific aspects for more accurate predictions');
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Create validation summary
   */
  createValidationSummary(validation) {
    return {
      status: validation.isValid ? 'valid' : 'invalid',
      confidence: validation.confidence,
      refinementNeeded: validation.refinementNeeded,
      issues: {
        errors: validation.errors,
        warnings: validation.warnings
      },
      suggestions: validation.suggestions,
      queryType: validation.queryType,
      complexity: validation.complexity
    };
  }
}

export default QueryValidator;
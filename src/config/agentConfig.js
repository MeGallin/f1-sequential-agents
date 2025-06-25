export const agentConfig = {
  circuit: {
    name: 'Circuit Analysis Agent',
    description: 'Analyzes F1 circuits and track characteristics, lap records, and circuit-specific performance',
    tools: ['circuitTools', 'lapTools', 'raceTools'],
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    specialization: [
      'Circuit layout and technical specifications',
      'Historical lap records and sector times',
      'Track-specific performance patterns',
      'Weather impact analysis',
      'Circuit evolution over seasons'
    ],
    keywords: [
      'circuit', 'track', 'lap time', 'sector', 'corner', 'straight', 'drs',
      'elevation', 'surface', 'grip', 'layout', 'configuration', 'pit lane'
    ]
  },
  
  driver: {
    name: 'Driver Performance Agent',
    description: 'Analyzes driver performance, statistics, career progression, and head-to-head comparisons',
    tools: ['driverTools', 'standingsTools', 'resultTools'],
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    specialization: [
      'Career statistics and performance trends',
      'Head-to-head driver comparisons',
      'Qualifying vs race performance',
      'Circuit-specific driver strengths',
      'Rookie vs veteran analysis'
    ],
    keywords: [
      'driver', 'pilot', 'performance', 'statistics', 'comparison', 'career',
      'qualifying', 'pole position', 'fastest lap', 'podium', 'win', 'points'
    ]
  },
  
  constructor: {
    name: 'Constructor Analysis Agent',
    description: 'Analyzes team performance, technical regulations, constructor championships, and team strategies',
    tools: ['constructorTools', 'standingsTools', 'pitstopTools'],
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    specialization: [
      'Constructor championship analysis',
      'Technical regulation impact assessment',
      'Team strategy and pit stop analysis',
      'Constructor development trends',
      'Power unit performance comparisons'
    ],
    keywords: [
      'constructor', 'team', 'chassis', 'engine', 'power unit', 'aerodynamics',
      'strategy', 'pit stop', 'regulation', 'technical', 'development'
    ]
  },
  
  raceResults: {
    name: 'Race Results Agent',
    description: 'Analyzes race outcomes, qualifying sessions, grid positions, and race weekend performance',
    tools: ['raceTools', 'qualifyingTools', 'sprintTools'],
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2000,
    specialization: [
      'Race result analysis and trends',
      'Qualifying session breakdowns',
      'Grid position impact on results',
      'DNF analysis and reliability',
      'Sprint race vs Grand Prix comparison'
    ],
    keywords: [
      'race', 'result', 'qualifying', 'grid', 'position', 'finish', 'dnf',
      'retirement', 'safety car', 'sprint', 'formation lap', 'starting'
    ]
  },
  
  championship: {
    name: 'Championship Agent',
    description: 'Analyzes championship standings, predictions, points systems, and title fight scenarios',
    tools: ['standingsTools', 'seasonTools', 'historicalTools'],
    model: 'gpt-4o',
    temperature: 0.2, // Slightly more creative for predictions
    maxTokens: 2000,
    specialization: [
      'Driver and constructor championship analysis',
      'Points system impact assessment',
      'Championship prediction modeling',
      'Historical championship comparisons',
      'Season progression analysis'
    ],
    keywords: [
      'championship', 'standings', 'points', 'title', 'leader', 'gap',
      'prediction', 'scenario', 'mathematical', 'clinch', 'fight'
    ]
  },
  
  historical: {
    name: 'Historical Data Agent',
    description: 'Provides multi-season analysis, cross-era comparisons, and historical trend identification',
    tools: ['historicalTools', 'seasonTools', 'allTools'],
    model: 'gpt-4o',
    temperature: 0.1,
    maxTokens: 2500, // More tokens for detailed historical analysis
    specialization: [
      'Cross-era performance comparisons',
      'Regulation change impact analysis',
      'Historical trend identification',
      'Statistical pattern recognition',
      'Legacy performance assessment'
    ],
    keywords: [
      'historical', 'history', 'era', 'decade', 'evolution', 'comparison',
      'trend', 'pattern', 'legacy', 'record', 'milestone', 'achievement'
    ]
  }
};

// Agent routing configuration
export const routingConfig = {
  // Confidence thresholds for agent selection
  highConfidence: 0.8,
  mediumConfidence: 0.6,
  lowConfidence: 0.4,
  
  // Multi-agent collaboration triggers
  collaborationTriggers: {
    // When multiple agents might be needed
    complex: ['compare', 'analyze across', 'comprehensive', 'detailed analysis'],
    historical: ['over time', 'historically', 'evolution', 'trend'],
    prediction: ['predict', 'forecast', 'scenario', 'what if'],
    performance: ['performance', 'statistics', 'metrics', 'data']
  },
  
  // Default routing patterns
  defaultRoutes: {
    circuit: ['monaco', 'silverstone', 'spa', 'monza', 'interlagos', 'suzuka'],
    driver: ['hamilton', 'verstappen', 'leclerc', 'russell', 'norris', 'sainz'],
    constructor: ['mercedes', 'red bull', 'ferrari', 'mclaren', 'alpine', 'aston martin'],
    championship: ['standings', 'points', 'championship', 'title fight'],
    historical: ['1950', '1960', '1970', '1980', '1990', '2000', '2010']
  }
};

// Performance and timeout settings
export const performanceConfig = {
  // Agent-specific timeouts (in milliseconds)
  timeouts: {
    circuit: 30000,     // 30 seconds
    driver: 35000,      // 35 seconds  
    constructor: 30000, // 30 seconds
    raceResults: 25000, // 25 seconds
    championship: 40000, // 40 seconds (more complex calculations)
    historical: 45000   // 45 seconds (most data-intensive)
  },
  
  // Cache settings
  cache: {
    ttl: 300, // 5 minutes default
    maxSize: 1000,
    agentSpecific: {
      historical: 3600, // 1 hour for historical data
      championship: 600, // 10 minutes for standings
      circuit: 1800     // 30 minutes for circuit data
    }
  },
  
  // Rate limiting
  rateLimits: {
    requestsPerMinute: 60,
    burstLimit: 10,
    agentSpecific: {
      historical: 20, // Lower limit for data-heavy agent
      championship: 30
    }
  }
};

// Agent capabilities matrix
export const agentCapabilities = {
  circuit: {
    dataTypes: ['circuits', 'lap_times', 'sector_times', 'track_records'],
    analysisTypes: ['performance', 'comparison', 'historical', 'technical'],
    outputFormats: ['summary', 'detailed', 'statistical', 'comparative']
  },
  
  driver: {
    dataTypes: ['drivers', 'results', 'standings', 'qualifying', 'career_stats'],
    analysisTypes: ['performance', 'comparison', 'career', 'head_to_head'],
    outputFormats: ['profile', 'comparison', 'statistics', 'career_summary']
  },
  
  constructor: {
    dataTypes: ['constructors', 'team_results', 'standings', 'technical_regs'],
    analysisTypes: ['team_performance', 'technical', 'strategy', 'development'],
    outputFormats: ['team_profile', 'technical_analysis', 'strategy_review']
  },
  
  raceResults: {
    dataTypes: ['race_results', 'qualifying', 'grid_positions', 'sprint_results'],
    analysisTypes: ['race_analysis', 'weekend_review', 'grid_impact', 'reliability'],
    outputFormats: ['race_report', 'weekend_summary', 'result_analysis']
  },
  
  championship: {
    dataTypes: ['standings', 'points', 'championship_scenarios', 'predictions'],
    analysisTypes: ['standings_analysis', 'prediction', 'scenario_modeling', 'progression'],
    outputFormats: ['standings_report', 'prediction_model', 'scenario_analysis']
  },
  
  historical: {
    dataTypes: ['all_data_types', 'multi_season', 'era_comparisons', 'trends'],
    analysisTypes: ['historical_comparison', 'trend_analysis', 'era_study', 'evolution'],
    outputFormats: ['historical_report', 'trend_analysis', 'era_comparison', 'evolution_study']
  }
};

// Export helper functions
export function getAgentByKeyword(keyword) {
  const lowerKeyword = keyword.toLowerCase();
  
  for (const [agentId, config] of Object.entries(agentConfig)) {
    if (config.keywords.some(kw => lowerKeyword.includes(kw))) {
      return agentId;
    }
  }
  
  return null;
}

export function getAgentsByCapability(dataType, analysisType) {
  const matchingAgents = [];
  
  for (const [agentId, capabilities] of Object.entries(agentCapabilities)) {
    const hasDataType = capabilities.dataTypes.includes(dataType) || capabilities.dataTypes.includes('all_data_types');
    const hasAnalysisType = capabilities.analysisTypes.includes(analysisType);
    
    if (hasDataType && hasAnalysisType) {
      matchingAgents.push(agentId);
    }
  }
  
  return matchingAgents;
}

export function requiresCollaboration(query) {
  const lowerQuery = query.toLowerCase();
  
  for (const [type, triggers] of Object.entries(routingConfig.collaborationTriggers)) {
    if (triggers.some(trigger => lowerQuery.includes(trigger))) {
      return { required: true, type };
    }
  }
  
  return { required: false, type: null };
}

export default agentConfig;
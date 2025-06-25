export const apiConfig = {
  // F1 API Configuration
  f1Api: {
    baseUrl: process.env.F1_API_BASE_URL || 'http://api.jolpi.ca/ergast/f1',
    timeout: 10000,
    retries: 3,
    retryDelay: 1000,
    cacheTTL: parseInt(process.env.F1_API_CACHE_TTL) || 300,
    rateLimit: {
      requestsPerSecond: 10,
      burstLimit: 20
    }
  },

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://f1-client-ui.onrender.com'] 
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'sqlite:./f1_agent_memory.db',
    options: {
      pool: {
        min: 0,
        max: 7
      },
      logging: process.env.NODE_ENV === 'development'
    }
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      primary: process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o',
      secondary: process.env.OPENAI_MODEL_SECONDARY || 'gpt-4o-mini',
      fallback: 'gpt-3.5-turbo'
    },
    defaultSettings: {
      temperature: 0.1,
      maxTokens: 2000,
      timeout: 60000
    },
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 200000
    }
  },

  // LangSmith Configuration (Optional)
  langsmith: {
    enabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
    endpoint: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
    apiKey: process.env.LANGCHAIN_API_KEY,
    project: process.env.LANGCHAIN_PROJECT || 'f1-sequential-agents'
  },

  // Caching Configuration
  cache: {
    enabled: true,
    type: 'memory', // Could be 'redis' in production
    defaultTTL: 300, // 5 minutes
    maxSize: 1000,
    categories: {
      f1Data: 1800,      // 30 minutes for F1 API data
      analysis: 600,     // 10 minutes for analysis results
      routing: 60,       // 1 minute for routing decisions
      models: 3600       // 1 hour for model responses
    }
  },

  // Monitoring and Logging
  monitoring: {
    enabled: true,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    format: 'json',
    destinations: ['console'],
    metrics: {
      enabled: true,
      interval: 60000, // 1 minute
      include: ['requests', 'response_times', 'errors', 'agent_usage']
    }
  },

  // Performance Settings
  performance: {
    requestTimeout: 120000, // 2 minutes max for any request
    agentTimeouts: {
      circuit: 30000,
      driver: 35000,
      constructor: 30000,
      raceResults: 25000,
      championship: 40000,
      historical: 45000
    },
    concurrency: {
      maxConcurrentRequests: 10,
      queueLimit: 50
    },
    memory: {
      maxConversationHistory: 50,
      maxCacheSize: '100MB'
    }
  },

  // Security Settings
  security: {
    rateLimit: {
      windowMs: 60000, // 1 minute
      max: 100, // requests per window
      message: 'Too many requests from this IP'
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: false // Disabled for API
    },
    validation: {
      maxQueryLength: 1000,
      maxThreadIdLength: 100,
      allowedAgentIds: ['circuit', 'driver', 'constructor', 'raceResults', 'championship', 'historical']
    }
  },

  // Feature Flags
  features: {
    humanInTheLoop: true,
    multiAgentCollaboration: true,
    conversationMemory: true,
    streaming: false, // To be implemented later
    analytics: true,
    caching: true,
    fallbackModels: true
  },

  // API Endpoints
  endpoints: {
    health: '/health',
    agents: '/api/agents',
    query: '/api/query',
    status: '/api/status',
    metrics: '/api/metrics',
    history: '/api/history'
  },

  // External Services
  external: {
    jolpicaApi: {
      baseUrl: 'http://api.jolpi.ca/ergast/f1',
      timeout: 10000,
      retries: 3
    }
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  // Production overrides
  apiConfig.monitoring.level = 'warn';
  apiConfig.cache.defaultTTL = 600; // 10 minutes in production
  apiConfig.performance.agentTimeouts = {
    circuit: 20000,    // Shorter timeouts in production
    driver: 25000,
    constructor: 20000,
    raceResults: 15000,
    championship: 30000,
    historical: 35000
  };
} else if (process.env.NODE_ENV === 'test') {
  // Test overrides
  apiConfig.monitoring.enabled = false;
  apiConfig.cache.enabled = false;
  apiConfig.openai.defaultSettings.timeout = 5000;
}

// Validation
function validateConfig() {
  const required = ['OPENAI_API_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Required environment variables missing: ${missing.join(', ')}`);
    }
  }
}

// Helper functions
export function getApiUrl(endpoint) {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://f1-sequential-agents.onrender.com`
    : `http://localhost:${apiConfig.server.port}`;
  
  return `${baseUrl}${endpoint}`;
}

export function isFeatureEnabled(feature) {
  return apiConfig.features[feature] === true;
}

export function getTimeout(agentId) {
  return apiConfig.performance.agentTimeouts[agentId] || apiConfig.performance.requestTimeout;
}

export function getCacheTTL(category = 'default') {
  return apiConfig.cache.categories[category] || apiConfig.cache.defaultTTL;
}

// Initialize validation
validateConfig();

export default apiConfig;
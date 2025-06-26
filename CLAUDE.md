# F1 Sequential Agents - Complete Service Documentation

## Service Overview
**F1 Sequential Agents** is a production-ready, multi-agent AI system that provides intelligent Formula 1 data analysis through coordinated specialized agents. This service uses LangGraph workflow orchestration with OpenAI GPT-4o to deliver comprehensive F1 insights through sequential agent workflows.

## Current System Architecture
- **Framework**: LangGraph (@langchain/langgraph ^0.2.74) with OpenAI GPT integration
- **Runtime**: Node.js 18+ with ES modules (type: "module")
- **Server**: Express 5.1.0 with CORS and monitoring middleware
- **Data Source**: Direct Jolpica F1 API integration (http://api.jolpi.ca/ergast/f1)
- **Memory**: SQLite-based conversation persistence
- **Port**: 8000 (configurable via PORT environment variable)

## Production Status
✅ **PRODUCTION READY** - Service includes:
- Comprehensive monitoring and observability
- Health checks and metrics endpoints
- Error tracking and structured logging
- Docker containerization
- Environment-based configuration
- CORS protection and rate limiting
- Graceful shutdown handling

## Core Service Structure

### Main Application (`src/app.js`)
- **F1App Class**: Main application orchestrator
- **Initialization**: Agent factory, shared LLM, workflow setup
- **Middleware**: CORS, JSON parsing, monitoring, error handling
- **Server Management**: Start/stop lifecycle with graceful shutdown

### Entry Point (`src/server.js`)
- **Process Management**: Uncaught exception handlers
- **Environment Loading**: dotenv configuration
- **Graceful Shutdown**: SIGINT/SIGTERM signal handling
- **Error Recovery**: Startup failure handling

## Specialized Agent System (`src/agents/`)

### Agent Architecture
All agents extend **BaseAgent** class with standardized interface:

1. **BaseAgent** (`baseAgent.js`) - Foundation class with tool binding and execution
2. **F1RouterAgent** (`f1RouterAgent.js`) - Query routing and agent selection
3. **RaceResultsAgent** (`raceResultsAgent.js`) - Race outcome analysis
4. **CircuitAgent** (`circuitAgent.js`) - Circuit-specific analysis and track insights
5. **DriverAgent** (`driverAgent.js`) - Individual driver performance and statistics
6. **ConstructorAgent** (`constructorAgent.js`) - Team/constructor performance analysis
7. **ChampionshipAgent** (`championshipAgent.js`) - Championship standings and predictions
8. **HistoricalAgent** (`historicalAgent.js`) - Historical data analysis and comparisons

### Agent Factory (`agentFactory.js`)
- **Centralized Management**: Single point for agent initialization
- **Health Checks**: Agent availability verification
- **Capability Registry**: Agent feature mapping
- **Lazy Loading**: On-demand agent instantiation

## F1 Data Integration (`src/tools/`)

### Direct API Integration
All F1 data accessed through specialized tool modules:

- **f1ApiClient.js** - Core API client with Jolpica F1 API integration
- **circuitTools.js** - Circuit-specific data operations
- **constructorTools.js** - Team/constructor data access
- **driverTools.js** - Driver information and statistics
- **raceTools.js** - Race data and results
- **seasonTools.js** - Season-wide analysis tools
- **standingsTools.js** - Championship standings data
- **langGraphTools.js** - Agent orchestration utilities

### API Configuration
- **Base URL**: http://api.jolpi.ca/ergast/f1
- **Format**: JSON responses
- **Timeout**: 10 seconds
- **Retry Logic**: 3 attempts with exponential backoff
- **Caching**: TTL-based response caching

## Workflow Orchestration (`src/workflows/`)

### F1Workflow (`f1Workflow.js`)
- **Query Processing**: Input validation and routing
- **Agent Coordination**: Sequential agent execution
- **State Management**: Conversation context preservation  
- **Response Synthesis**: Result formatting and metadata

### Graph State Management (`src/graph/`)
- **f1GraphState.js** - State schema definitions
- **f1StateGraph.js** - Agent workflow orchestration logic

## Memory and Persistence (`src/memory/`)

### Conversation Management
- **f1ChatMemory.js** - F1-specific conversation context and history
- **conversationMemory.js** - Base conversation persistence with SQLite
- **Thread Management**: Multi-user conversation tracking
- **Context Awareness**: Previous query context for follow-up questions

## Prompt Management (`src/prompts/`)

### Centralized Prompt System
```
prompts/
├── agents/                     # Agent-specific prompts
│   ├── championship-predictor/ # Championship analysis prompts
│   │   └── system.js          # System prompt for championship agent
│   ├── circuit-analysis/       # Circuit-specific prompts
│   │   └── system.js          # System prompt for circuit agent
│   ├── constructor-analysis/   # Constructor team prompts
│   │   └── system.js          # System prompt for constructor agent
│   ├── driver-performance/     # Driver analysis prompts
│   │   └── system.js          # System prompt for driver agent
│   ├── historical-comparison/  # Historical data prompts
│   │   └── system.js          # System prompt for historical agent
│   └── race-results/          # Race outcome prompts
│       └── system.js          # System prompt for race results agent
├── index.js                   # Main prompt exports
└── prompt-loader.js          # Centralized prompt loading utility
```

## Monitoring and Observability (`src/middleware/`)

### MonitoringMiddleware (`monitoring.js`)
- **Request Tracking**: Count, timing, error rates
- **Health Metrics**: Memory usage, CPU, uptime
- **Error Logging**: Structured error capture with context
- **Prometheus Metrics**: `/metrics` endpoint with standard format

### Available Endpoints
- **GET /health** - Enhanced health check with system metrics
- **GET /metrics** - Prometheus-compatible metrics
- **GET /agents** - Available agents and capabilities
- **POST /query** - Main query processing endpoint
- **POST /agents/analyze** - F1 Client compatibility endpoint
- **GET /conversation/:threadId** - Conversation history retrieval
- **DELETE /conversation/:threadId** - Conversation cleanup
- **POST /test/monaco-flow** - Test endpoint for conversation flows

## Human-in-the-Loop (`src/humanLoop/`)
- **confirmationWorkflow.js** - User confirmation patterns
- **queryValidator.js** - Input validation and sanitization

## Configuration (`src/config/`)

### Environment-Based Configuration
- **agentConfig.js** - Agent-specific settings
- **apiConfig.js** - External API configuration
- **modelConfig.js** - LLM model settings and initialization

### Required Environment Variables
```bash
# OpenAI Configuration (Required)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_PRIMARY=gpt-4o
OPENAI_MODEL_SECONDARY=gpt-4o-mini

# F1 API Configuration
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1
F1_API_TIMEOUT=10000
F1_API_RETRY_ATTEMPTS=3

# Server Configuration
PORT=8000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://f1-client-ui.onrender.com

# Cache Configuration
CACHE_TTL_DEFAULT=300
CACHE_TTL_STANDINGS=180
CACHE_TTL_RACES=600

# Optional LangSmith Tracing
LANGCHAIN_TRACING_V2=false
LANGCHAIN_API_KEY=your_langsmith_key
```

## API Specification

### Query Processing
**POST /query**
```json
{
  "query": "Who won the Monaco Grand Prix this year?",
  "threadId": "optional-thread-id",
  "userContext": {}
}
```

**Response Format**
```json
{
  "response": "Max Verstappen won the 2024 Monaco Grand Prix...",
  "threadId": "f1_1234567890_abc123",
  "agent": "raceResults",
  "confidence": 0.95,
  "metadata": {
    "processingTime": 2500,
    "toolCalls": 1,
    "queryType": "race_results"
  }
}
```

### F1 Client Compatibility
**POST /agents/analyze** - Maintains compatibility with F1 Client UI
```json
{
  "query": "Compare Hamilton vs Verstappen",
  "agentId": "driver",
  "threadId": "optional"
}
```

## Performance Characteristics
- **Simple Queries**: 1-3 seconds (single agent)
- **Complex Analysis**: 3-8 seconds (multi-agent coordination)
- **Memory Retrieval**: <100ms (SQLite operations)
- **Concurrent Users**: 50+ simultaneous queries
- **Memory Usage**: ~100-200MB runtime
- **Agent Initialization**: 30-60 seconds cold start

## Package Dependencies

### Runtime Dependencies
```json
{
  "@langchain/community": "^0.3.45",
  "@langchain/core": "^0.3.61", 
  "@langchain/langgraph": "^0.2.74",
  "@langchain/openai": "^0.5.11",
  "axios": "^1.10.0",
  "cors": "^2.8.5",
  "dotenv": "^16.5.0",
  "express": "^5.1.0",
  "langchain": "^0.3.27",
  "langsmith": "^0.3.33",
  "node-fetch": "^2.7.0",
  "sqlite3": "^5.1.7",
  "uuid": "^11.1.0",
  "zod": "^3.25.67"
}
```

### Development Dependencies
```json
{
  "eslint": "^8.57.0",
  "jest": "^29.7.0", 
  "nodemon": "^3.0.2"
}
```

## Available Scripts

### Development
```bash
npm run dev                # Start with nodemon auto-reload
npm run dev:watch         # Start with node --watch
npm run validate          # Test all imports and environment
npm run lint              # ESLint code quality check
npm run lint:fix          # Auto-fix linting issues
```

### Production
```bash
npm start                 # Production server (runs prestart validation)
npm run start:prod        # Explicit production mode
npm run health-check      # Verify service health
```

### Testing
```bash
npm test                  # Run Jest tests
npm run test:ci          # CI mode with coverage
```

## Production Deployment

### Docker Support
- **Dockerfile**: Multi-stage Node.js 18 Alpine build
- **Health Checks**: Built-in container health monitoring
- **Security**: Non-root user execution
- **Environment**: Production environment variable support

### Platform Configurations
- **render.yaml** - Render.com deployment configuration
- **Docker Compose** - Local and production container orchestration
- **GitHub Actions** - CI/CD pipeline with testing and deployment

### Monitoring Integration
- **Prometheus Metrics**: `/metrics` endpoint for scraping
- **Health Checks**: `/health` endpoint for load balancer probes
- **Structured Logging**: JSON-formatted logs with timestamps
- **Error Tracking**: Comprehensive error context capture

## Known Limitations
- **Cold Start**: 30-60 second initialization on Render.com free tier
- **OpenAI API**: Requires valid API key and sufficient quota
- **Memory**: SQLite-based memory limited to single instance
- **Rate Limiting**: 100 requests per minute default configuration

## Security Features
- **CORS Protection**: Configurable origin allowlist
- **Input Validation**: Request sanitization and validation
- **Error Sanitization**: Production error message filtering
- **Environment Security**: No secrets in codebase
- **Rate Limiting**: Request throttling protection

## Integration Points

### Upstream Dependencies
- **Jolpica F1 API** - Primary data source for F1 information
- **OpenAI API** - LLM inference for agent intelligence
- **LangSmith** - Optional tracing and observability

### Downstream Consumers  
- **F1 Client UI** - React-based web interface
- **External APIs** - RESTful integration capabilities

## File Structure Summary
```
src/
├── agents/              # 8 specialized F1 agents + factory
├── app.js              # Main Express application class
├── server.js           # Entry point with process management
├── config/             # Environment and model configuration
├── graph/              # LangGraph state management
├── humanLoop/          # User interaction workflows
├── memory/             # Conversation persistence
├── middleware/         # Monitoring and request handling
├── prompts/            # Centralized prompt management
├── services/           # Query routing services
├── tools/              # F1 API integration tools
├── utils/              # Utility functions
└── workflows/          # Agent orchestration workflows
```

## Current Service Status
✅ **OPERATIONAL** - All systems functional
✅ **MONITORING** - Health checks and metrics active
✅ **PRODUCTION READY** - Docker, environment configs complete
✅ **AGENT SYSTEM** - 6 specialized agents operational
✅ **DATA INTEGRATION** - Jolpica F1 API connected
✅ **MEMORY SYSTEM** - SQLite conversation persistence active
✅ **ERROR HANDLING** - Comprehensive error tracking implemented

## Development Workflow
1. **Environment Setup**: Copy `.env.production` to `.env` and configure
2. **Validation**: Run `npm run validate` to verify setup
3. **Development**: Use `npm run dev` for auto-reload development
4. **Testing**: Run `npm test` for unit tests
5. **Quality**: Use `npm run lint` for code quality checks
6. **Production**: Deploy using Docker or platform-specific configs

## Critical Files for Operation
- **src/server.js** - Application entry point
- **src/app.js** - Main application orchestrator  
- **src/agents/agentFactory.js** - Agent management
- **src/workflows/f1Workflow.js** - Core workflow logic
- **src/tools/f1ApiClient.js** - F1 data integration
- **src/middleware/monitoring.js** - Observability
- **.env** - Environment configuration
- **package.json** - Dependencies and scripts

This service is fully production-ready with comprehensive monitoring, error handling, and deployment configurations.
# F1 Sequential Agents - Service Documentation

## Service Overview
**F1 Sequential Agents** is a specialized multi-agent system that provides intelligent Formula 1 data analysis through coordinated AI agents. This service orchestrates multiple specialized agents to deliver comprehensive F1 insights using sequential workflows.

## Architecture
- **Framework**: Multi-agent orchestration with OpenAI GPT integration
- **Agent Pattern**: Sequential workflow coordination
- **Data Integration**: Direct F1 API endpoint integration for real-time data access
- **State Management**: Persistent conversation memory and graph state

## Core Components

### Specialized Agents (`src/agents/`)
1. **Base Agent** (`baseAgent.js`) - Foundation class for all F1 agents
2. **Championship Agent** (`championshipAgent.js`) - Championship standings and predictions
3. **Circuit Agent** (`circuitAgent.js`) - Circuit analysis and track insights
4. **Constructor Agent** (`constructorAgent.js`) - Team/constructor performance analysis
5. **Driver Agent** (`driverAgent.js`) - Individual driver performance and statistics
6. **F1 Router Agent** (`f1RouterAgent.js`) - Query routing and agent coordination
7. **Historical Agent** (`historicalAgent.js`) - Historical data analysis and comparisons
8. **Race Results Agent** (`raceResultsAgent.js`) - Race outcome analysis and insights

### Graph State Management (`src/graph/`)
- **F1 Graph State** (`f1GraphState.js`) - State schema definitions
- **F1 State Graph** (`f1StateGraph.js`) - Agent workflow orchestration

### Human-in-the-Loop (`src/humanLoop/`)
- **Confirmation Workflow** (`confirmationWorkflow.js`) - User confirmation patterns
- **Query Validator** (`queryValidator.js`) - Input validation and sanitization

### Memory System (`src/memory/`)
- **Conversation Memory** (`conversationMemory.js`) - Chat history persistence
- **F1 Chat Memory** (`f1ChatMemory.js`) - F1-specific conversation context

### Prompt Management (`src/prompts/`)
```
prompts/
├── agents/                     # Agent-specific prompts
│   ├── championship-predictor/ # Championship analysis prompts
│   ├── circuit-analysis/       # Circuit-specific prompts
│   ├── constructor-analysis/   # Constructor team prompts
│   ├── driver-performance/     # Driver analysis prompts
│   ├── historical-comparison/  # Historical data prompts
│   └── race-results/          # Race outcome prompts
├── index.js                   # Prompt exports
└── prompt-loader.js          # Centralized prompt loading utility
```

### F1 Data Tools (`src/tools/`)
- **Circuit Tools** (`circuitTools.js`) - Circuit-specific data operations
- **Constructor Tools** (`constructorTools.js`) - Team/constructor data access
- **Driver Tools** (`driverTools.js`) - Driver information and statistics
- **F1 API Client** (`f1ApiClient.js`) - External F1 API integration
- **Agent Tools** (`langGraphTools.js`) - Agent orchestration utilities
- **Race Tools** (`raceTools.js`) - Race data and results
- **Season Tools** (`seasonTools.js`) - Season-wide analysis tools
- **Standings Tools** (`standingsTools.js`) - Championship standings data

### Configuration (`src/config/`)
- **Agent Config** (`agentConfig.js`) - Agent-specific configuration
- **API Config** (`apiConfig.js`) - External API configuration
- **Model Config** (`modelConfig.js`) - LLM model settings

## Key Features

### Sequential Agent Workflows
- **Multi-Agent Coordination**: Orchestrated agent collaboration
- **State Persistence**: Maintains context across agent interactions
- **Human-in-the-Loop**: User confirmation and validation workflows
- **Query Routing**: Intelligent routing to appropriate specialist agents

### F1 Domain Expertise
- **Championship Analysis**: Standings, predictions, and scenarios
- **Driver Performance**: Career statistics and comparisons
- **Constructor Insights**: Team performance and strategy analysis
- **Circuit Analysis**: Track-specific data and historical performance
- **Race Results**: Detailed race outcome analysis
- **Historical Comparisons**: Cross-era and cross-season analysis

### Technical Capabilities
- **Real-time Data**: Current season information and live updates
- **Historical Data**: 70+ years of F1 history (1950-present)
- **Predictive Analytics**: Championship and race outcome predictions
- **Memory Persistence**: SQLite-based conversation history
- **Error Handling**: Robust failure recovery and graceful degradation

## API Integration

### Direct F1 API Integration
```javascript
// All agents access F1 data through direct API endpoints
const f1Data = await this.f1ApiClient.getDrivers({ season: 2024 });
```

### Available Data Sources
- **Seasons**: Historical and current season data
- **Races**: Race schedules, results, and details
- **Drivers**: Driver rosters, statistics, and standings
- **Constructors**: Team information and championship standings
- **Qualifying**: Qualifying session results and grid positions

## Environment Configuration

### Required Environment Variables
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# F1 API Configuration
F1_API_BASE_URL=https://api.jolpi.ca/ergast/f1
F1_API_KEY=your_f1_api_key

# Service Configuration
PORT=3000
NODE_ENV=production

# LangSmith (Optional - for tracing)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
```

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## API Endpoints

### Main Server (`src/server.js`)
- **POST /query** - Submit F1 queries for agent analysis
- **GET /health** - Service health check
- **GET /agents** - List available agents and capabilities
- **POST /memory** - Access conversation history

### Query Format
```json
{
  "query": "Compare Lewis Hamilton and Max Verstappen's 2024 performance",
  "sessionId": "user-session-123",
  "agentType": "driver-performance"
}
```

### Response Format
```json
{
  "result": "Detailed F1 analysis...",
  "agentPath": ["router", "driver-agent"],
  "metadata": {
    "processingTime": 2.5,
    "dataPoints": 150,
    "confidence": 0.95
  }
}
```

## Performance Characteristics
- **Simple Queries**: 1-2 seconds (single agent)
- **Complex Analysis**: 3-5 seconds (multi-agent coordination)
- **Memory Retrieval**: <100ms (SQLite)
- **Concurrent Users**: 50+ simultaneous queries

## Monitoring and Debugging

### Health Checks
```bash
curl http://localhost:3000/health
```

### Logging
- **Winston Logger**: Structured logging throughout the application
- **LangSmith Integration**: Request tracing and debugging
- **Error Tracking**: Comprehensive error capture and reporting

### Development Tools
- **ESLint**: Code quality and style enforcement
- **Jest**: Unit and integration testing
- **Nodemon**: Development auto-reload

## Integration Points

### Upstream Dependencies
- **F1 API Endpoints**: Direct integration with Formula 1 data providers
- **OpenAI API**: LLM inference for agent intelligence
- **LangSmith**: Optional tracing and observability

### Downstream Consumers
- **Web Interface**: Frontend applications for user interactions
- **API Consumers**: External applications using the query API

## Deployment

### Production Configuration
- **Platform**: Render.com
- **Runtime**: Node.js 18+
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: 3000

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Testing Strategy

### Test Coverage
- **Unit Tests**: Individual agent functionality
- **Integration Tests**: Multi-agent workflows
- **API Tests**: Endpoint validation
- **Memory Tests**: Persistence validation

### Test Commands
```bash
npm test                    # Run all tests
npm test -- --watch       # Watch mode
npm test -- --coverage    # Coverage report
```

## Common Commands

### Development
```bash
npm run dev                # Start with auto-reload
npm run lint              # Check code quality
npm run lint -- --fix    # Auto-fix linting issues
```

### Production
```bash
npm start                 # Start production server
npm run build            # No build step required
```

### Debugging
```bash
# Debug with Node.js inspector
node --inspect src/server.js

# Verbose logging
DEBUG=* npm start
```

## Service Dependencies

### Runtime Dependencies
- **@langchain/langgraph**: ^0.2.74 - Core agent orchestration
- **@langchain/openai**: ^0.5.11 - OpenAI integration
- **express**: ^5.1.0 - Web server framework
- **sqlite3**: ^5.1.7 - Local database for memory
- **axios**: ^1.10.0 - HTTP client for external APIs

### Development Dependencies
- **eslint**: ^8.57.0 - Code linting
- **jest**: ^29.7.0 - Testing framework
- **nodemon**: ^3.0.2 - Development auto-reload

## Troubleshooting

### Common Issues
1. **Agent Timeout**: Increase timeout in agent configuration
2. **Memory Persistence**: Check SQLite database permissions
3. **API Rate Limits**: Implement exponential backoff
4. **F1 API Connection**: Verify F1_API_BASE_URL and authentication

### Debug Steps
1. Check environment variables
2. Verify F1 API endpoint connectivity
3. Review agent logs for specific errors
4. Test individual agent endpoints
5. Validate input query format

## Contributing

### Code Style
- Follow ESLint configuration
- Use consistent naming conventions
- Add JSDoc comments for complex functions
- Write tests for new functionality

### Agent Development
1. Extend `BaseAgent` class
2. Implement required methods
3. Add agent-specific prompts to `src/prompts/agents/`
4. Register agent in `agentFactory.js`
5. Add comprehensive tests
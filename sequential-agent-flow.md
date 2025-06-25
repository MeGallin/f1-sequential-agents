# F1 Agentic LangGraph Application - Complete Specification

## Project Overview
**F1 Agentic LangGraph** is a sophisticated multi-agent conversational AI system for Formula 1 data analysis. The system uses **LangGraph.js** with StateGraph workflow orchestration to route user queries to specialized F1 domain agents, consuming data from the Jolpica F1 API (Ergast successor).

## System Architecture

### Repository Structure
```
F1-AGENTIC-FLOW/
├── api/                          # Node.js backend with LangGraph workflows
│   ├── src/
│   │   ├── agents/              # 6 specialized F1 agents
│   │   │   ├── circuitAgent.js         # Track analysis & characteristics
│   │   │   ├── driverAgent.js          # Driver performance & stats
│   │   │   ├── constructorAgent.js     # Team analysis & regulations
│   │   │   ├── raceResultsAgent.js     # Results & qualifying analysis
│   │   │   ├── championshipAgent.js    # Standings & predictions
│   │   │   └── historicalAgent.js      # Multi-season comparisons
│   │   ├── tools/               # F1 API integration + LangGraph tools
│   │   │   ├── f1ApiClient.js          # Jolpica API integration
│   │   │   ├── circuitTools.js         # Circuit data tools
│   │   │   ├── driverTools.js          # Driver data tools
│   │   │   ├── constructorTools.js     # Constructor data tools
│   │   │   ├── raceTools.js            # Race & results tools
│   │   │   ├── standingsTools.js       # Championship standings
│   │   │   └── langGraphTools.js       # LangGraph tool wrappers
│   │   ├── prompts/             # System prompts for each agent
│   │   │   ├── circuitPrompt.js        # Circuit analysis prompts
│   │   │   ├── driverPrompt.js         # Driver performance prompts
│   │   │   ├── constructorPrompt.js    # Constructor analysis prompts
│   │   │   ├── raceResultsPrompt.js    # Race results prompts
│   │   │   ├── championshipPrompt.js   # Championship analysis prompts
│   │   │   └── historicalPrompt.js     # Historical comparison prompts
│   │   ├── workflows/           # StateGraph workflow definitions
│   │   │   ├── routerWorkflow.js       # Main query routing workflow
│   │   │   ├── agentWorkflow.js        # Individual agent workflows
│   │   │   └── multiAgentWorkflow.js   # Multi-agent coordination
│   │   ├── memory/              # AI-powered conversation memory
│   │   │   ├── memoryManager.js        # Conversation context
│   │   │   └── summaryAgent.js         # GPT-4o-mini summarization
│   │   ├── config/              # Central configuration management
│   │   │   ├── modelConfig.js          # OpenAI model switching
│   │   │   ├── agentConfig.js          # Agent configurations
│   │   │   └── apiConfig.js            # API endpoints & settings
│   │   └── utils/               # Shared utilities
│   │       ├── graphState.js           # StateGraph utilities
│   │       ├── startNode.js            # Workflow start nodes
│   │       ├── responseFormatter.js    # Response formatting
│   │       └── errorHandler.js         # Error handling & recovery
│   ├── docs/                    # Technical specifications
│   ├── package.json             # Dependencies & scripts
│   └── server.js               # Express server entry point
└── f1-client/                  # Existing React frontend (Production Ready)
    ├── src/
    │   ├── components/          # React UI components
    │   │   ├── F1AgentChat.jsx         # AI chat interface modal
    │   │   ├── F1DataDisplayJotai.jsx  # Main dashboard component
    │   │   ├── Navigation.jsx          # App navigation
    │   │   ├── F1NewsTicker.jsx        # News ticker component
    │   │   ├── HeroSection.jsx         # Landing hero section
    │   │   ├── AgentTestButton.jsx     # Agent interaction button
    │   │   ├── ChampionshipTables.jsx  # Championship standings
    │   │   ├── ConstructorsTable.jsx   # Constructor data table
    │   │   ├── DriversTable.jsx        # Driver data table
    │   │   ├── LatestRaceInfo.jsx      # Race information
    │   │   ├── LoadingIndicator.jsx    # Loading states
    │   │   ├── ErrorBoundary.jsx       # Error handling
    │   │   └── [20+ other components]
    │   ├── state/               # Jotai state management
    │   │   ├── atoms/          # Atomic state definitions
    │   │   │   ├── configAtoms.js      # Configuration atoms
    │   │   │   ├── dataAtoms.js        # F1 data atoms
    │   │   │   ├── uiAtoms.js          # UI state atoms
    │   │   │   └── derivedAtoms.js     # Computed atoms
    │   │   ├── actions/        # State actions
    │   │   │   ├── driverActions.js    # Driver data actions
    │   │   │   ├── raceActions.js      # Race data actions
    │   │   │   ├── standingsActions.js # Standings actions
    │   │   │   └── [other actions]
    │   │   └── hooks/          # State hooks
    │   │       ├── useDrivers.js       # Driver data hook
    │   │       ├── useRaces.js         # Race data hook
    │   │       ├── useStandings.js     # Standings hook
    │   │       └── [other hooks]
    │   ├── services/           # API communication
    │   │   ├── agentApi.js             # F1 LangGraph Agents API
    │   │   ├── api.js                  # F1 MCP Server API
    │   │   ├── logger.js               # Logging service
    │   │   └── rssService.js           # RSS feed service
    │   ├── config/             # Configuration management
    │   │   └── index.js                # Centralized config
    │   ├── router/             # React Router setup
    │   │   └── index.jsx               # Router configuration
    │   ├── pages/              # Page components
    │   │   ├── Home.jsx                # Home dashboard
    │   │   ├── History.jsx             # Historical data
    │   │   └── MotorsportNews.jsx      # News page
    │   ├── hooks/              # Custom React hooks
    │   │   ├── useF1News.js            # F1 news hook
    │   │   ├── useLatestRaceResults.js # Race results hook
    │   │   └── useRouting.js           # Router hook
    │   └── styles/             # CSS styling
    │       ├── custom.css              # Custom F1 styling
    │       └── critical.css            # Critical CSS
    ├── package.json            # Dependencies (React 18, Jotai, Bootstrap 5)
    ├── vite.config.js          # Vite configuration
    └── index.html              # Entry HTML
```

## Core Architecture Patterns

### StateGraph Workflow Pattern
The system implements **LangGraph StateGraph** with these workflow nodes:
- `START` → `input_validation` → `route_query` → `process_agent` → `check_confirmation` → `save_memory` → `finalize_response`
- Human-in-the-loop confirmation for complex F1 analysis
- Multi-agent collaboration for comprehensive insights
- Real-time streaming with Server-Sent Events

### Agent Coordination Patterns
1. **Supervisor Pattern**: Router agent coordinates specialized F1 agents
2. **Collaborative Pattern**: Agents share context for complex queries
3. **Hierarchical Teams**: Multi-level agent orchestration

## Specialized F1 Agents

### 1. Circuit Analysis Agent 🏁
**Purpose**: Track characteristics, lap records, circuit-specific analysis
**Capabilities**:
- Circuit layout and technical specifications
- Historical lap records and sector times
- Track-specific performance patterns
- Weather impact analysis
- Circuit evolution over seasons

**Data Sources**: Circuits, Laps, Results endpoints
**Tools**: `get_circuits`, `get_circuit_results`, `get_lap_times`

### 2. Driver Performance Agent 👨‍🏎️
**Purpose**: Individual driver analysis and comparisons
**Capabilities**:
- Career statistics and performance trends
- Head-to-head driver comparisons
- Qualifying vs race performance
- Circuit-specific driver strengths
- Rookie vs veteran analysis

**Data Sources**: Drivers, Results, Qualifying, Standings endpoints
**Tools**: `get_drivers`, `get_driver_results`, `get_driver_standings`

### 3. Constructor Analysis Agent 🏎️
**Purpose**: Team performance and technical regulation impact
**Capabilities**:
- Constructor championship analysis
- Technical regulation impact assessment
- Team strategy and pit stop analysis
- Constructor development trends
- Power unit performance comparisons

**Data Sources**: Constructors, Constructor Standings, Pitstops endpoints
**Tools**: `get_constructors`, `get_constructor_standings`, `get_pitstops`

### 4. Race Results Agent 📊
**Purpose**: Race outcome analysis and qualifying performance
**Capabilities**:
- Race result analysis and trends
- Qualifying session breakdowns
- Grid position impact on results
- DNF analysis and reliability
- Sprint race vs Grand Prix comparison

**Data Sources**: Results, Qualifying, Sprint, Status endpoints
**Tools**: `get_results`, `get_qualifying`, `get_sprint_results`, `get_status`

### 5. Championship Agent 🏆
**Purpose**: Championship standings and prediction analysis
**Capabilities**:
- Driver and constructor championship analysis
- Points system impact assessment
- Championship prediction modeling
- Historical championship comparisons
- Season progression analysis

**Data Sources**: Driver Standings, Constructor Standings, Results endpoints
**Tools**: `get_driver_standings`, `get_constructor_standings`, `calculate_points`

### 6. Historical Data Agent 📈
**Purpose**: Multi-season analysis and historical comparisons
**Capabilities**:
- Cross-era performance comparisons
- Regulation change impact analysis
- Historical trend identification
- Statistical pattern recognition
- Legacy performance assessment

**Data Sources**: All endpoints with season filtering
**Tools**: `get_historical_data`, `compare_seasons`, `analyze_trends`

## StateGraph Implementation

### Core State Structure
```javascript
// GraphState definition using MessagesAnnotation
import { MessagesAnnotation } from "@langchain/langgraph";

const F1GraphState = MessagesAnnotation.extend({
  query: String,
  selectedAgent: String,
  f1Data: Object,
  analysisResult: Object,
  confidence: Number,
  requiresConfirmation: Boolean,
  conversationHistory: Array
});
```

### Workflow Nodes

#### START Node
```javascript
const startNode = (state) => {
  return {
    ...state,
    query: state.messages[state.messages.length - 1].content,
    selectedAgent: null,
    analysisResult: null,
    requiresConfirmation: false
  };
};
```

#### Input Validation Node
```javascript
const inputValidationNode = async (state) => {
  const { query } = state;
  
  // Validate F1-related query
  const isF1Query = await validateF1Query(query);
  if (!isF1Query) {
    return {
      ...state,
      error: "Query must be related to Formula 1"
    };
  }
  
  return state;
};
```

#### Route Query Node
```javascript
const routeQueryNode = async (state) => {
  const { query } = state;
  
  // Use OpenAI to determine appropriate agent
  const routingResult = await routingAgent.invoke(query);
  
  return {
    ...state,
    selectedAgent: routingResult.agent,
    confidence: routingResult.confidence
  };
};
```

#### Process Agent Node
```javascript
const processAgentNode = async (state) => {
  const { selectedAgent, query, f1Data } = state;
  
  // Get appropriate agent
  const agent = getAgent(selectedAgent);
  
  // Process query with agent
  const result = await agent.invoke({
    query,
    data: f1Data,
    context: state.conversationHistory
  });
  
  return {
    ...state,
    analysisResult: result,
    requiresConfirmation: result.complexity > 0.7
  };
};
```

### Conditional Routing
```javascript
const conditionalRouter = (state) => {
  if (state.error) return "error_handler";
  if (state.requiresConfirmation) return "confirmation_node";
  return "finalize_response";
};
```

## F1 API Integration (Jolpica Endpoints)

### Core API Client
```javascript
class F1ApiClient {
  constructor() {
    this.baseUrl = 'http://api.jolpi.ca/ergast/f1';
    this.cache = new Map();
  }
  
  async fetchWithCache(endpoint, params = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}.json`, {
      method: 'GET',
      params
    });
    
    const data = await response.json();
    this.cache.set(cacheKey, data);
    
    return data;
  }
}
```

### 13 Core F1 Data Tools

#### 1. Circuits Tools
```javascript
const circuitTools = {
  getAllCircuits: () => f1Client.fetchWithCache('/circuits/'),
  getCircuitById: (id) => f1Client.fetchWithCache(`/circuits/${id}/`),
  getCircuitsBySession: (season) => f1Client.fetchWithCache(`/${season}/circuits/`),
  getCircuitResults: (circuitId) => f1Client.fetchWithCache(`/circuits/${circuitId}/results/`)
};
```

#### 2. Driver Tools
```javascript
const driverTools = {
  getAllDrivers: () => f1Client.fetchWithCache('/drivers/'),
  getDriverById: (id) => f1Client.fetchWithCache(`/drivers/${id}/`),
  getDriversBySession: (season) => f1Client.fetchWithCache(`/${season}/drivers/`),
  getDriverResults: (driverId) => f1Client.fetchWithCache(`/drivers/${driverId}/results/`)
};
```

#### 3. Constructor Tools
```javascript
const constructorTools = {
  getAllConstructors: () => f1Client.fetchWithCache('/constructors/'),
  getConstructorById: (id) => f1Client.fetchWithCache(`/constructors/${id}/`),
  getConstructorsBySession: (season) => f1Client.fetchWithCache(`/${season}/constructors/`),
  getConstructorResults: (constructorId) => f1Client.fetchWithCache(`/constructors/${constructorId}/results/`)
};
```

#### 4. Race Tools
```javascript
const raceTools = {
  getAllRaces: () => f1Client.fetchWithCache('/races/'),
  getRacesBySession: (season) => f1Client.fetchWithCache(`/${season}/races/`),
  getRaceResults: (season, round) => f1Client.fetchWithCache(`/${season}/${round}/results/`),
  getQualifyingResults: (season, round) => f1Client.fetchWithCache(`/${season}/${round}/qualifying/`)
};
```

#### 5. Standings Tools
```javascript
const standingsTools = {
  getDriverStandings: (season) => f1Client.fetchWithCache(`/${season}/driverStandings/`),
  getConstructorStandings: (season) => f1Client.fetchWithCache(`/${season}/constructorStandings/`),
  getCurrentStandings: () => f1Client.fetchWithCache('/current/driverStandings/')
};
```

#### 6. Lap Times Tools
```javascript
const lapTools = {
  getLapTimes: (season, round) => f1Client.fetchWithCache(`/${season}/${round}/laps/`),
  getDriverLaps: (season, round, driver) => f1Client.fetchWithCache(`/${season}/${round}/drivers/${driver}/laps/`)
};
```

#### 7. Pitstop Tools
```javascript
const pitstopTools = {
  getPitstops: (season, round) => f1Client.fetchWithCache(`/${season}/${round}/pitstops/`),
  getDriverPitstops: (season, round, driver) => f1Client.fetchWithCache(`/${season}/${round}/drivers/${driver}/pitstops/`)
};
```

#### 8. Sprint Race Tools
```javascript
const sprintTools = {
  getSprintResults: (season, round) => f1Client.fetchWithCache(`/${season}/${round}/sprint/`),
  getAllSprintResults: () => f1Client.fetchWithCache('/sprint/')
};
```

#### 9. Season Tools
```javascript
const seasonTools = {
  getAllSeasons: () => f1Client.fetchWithCache('/seasons/'),
  getCurrentSeason: () => f1Client.fetchWithCache('/current/')
};
```

#### 10. Status Tools
```javascript
const statusTools = {
  getAllStatuses: () => f1Client.fetchWithCache('/status/'),
  getResultsByStatus: (statusId) => f1Client.fetchWithCache(`/status/${statusId}/results/`)
};
```

#### 11. Fastest Lap Tools
```javascript
const fastestLapTools = {
  getFastestLaps: (season, position) => f1Client.fetchWithCache(`/${season}/fastest/${position}/results/`)
};
```

#### 12. Grid Position Tools
```javascript
const gridTools = {
  getGridResults: (season, position) => f1Client.fetchWithCache(`/${season}/grid/${position}/results/`)
};
```

#### 13. Historical Data Tools
```javascript
const historicalTools = {
  getSeasonComparison: (seasons) => Promise.all(seasons.map(season => 
    f1Client.fetchWithCache(`/${season}/driverStandings/`)
  )),
  getEraAnalysis: (startYear, endYear) => f1Client.fetchWithCache(`/seasons/`, {
    start: startYear,
    end: endYear
  })
};
```

## Central Configuration System

### Model Configuration
```javascript
// config/modelConfig.js
class ModelConfig {
  constructor() {
    this.models = {
      primary: 'gpt-4o',
      secondary: 'gpt-4o-mini',
      fallback: 'gpt-3.5-turbo'
    };
    this.currentModel = this.models.primary;
  }
  
  switchModel(modelType) {
    if (this.models[modelType]) {
      this.currentModel = this.models[modelType];
      return true;
    }
    return false;
  }
  
  getModelInstance() {
    return new ChatOpenAI({
      model: this.currentModel,
      temperature: 0.1,
      maxTokens: 2000
    });
  }
}

export const modelConfig = new ModelConfig();
```

### Agent Configuration
```javascript
// config/agentConfig.js
export const agentConfig = {
  circuit: {
    name: 'Circuit Analysis Agent',
    description: 'Analyzes F1 circuits and track characteristics',
    tools: ['circuitTools', 'lapTools', 'raceTools'],
    model: 'gpt-4o',
    temperature: 0.1
  },
  driver: {
    name: 'Driver Performance Agent',
    description: 'Analyzes driver performance and statistics',
    tools: ['driverTools', 'standingsTools', 'resultTools'],
    model: 'gpt-4o',
    temperature: 0.1
  },
  constructor: {
    name: 'Constructor Analysis Agent',
    description: 'Analyzes team performance and technical aspects',
    tools: ['constructorTools', 'standingsTools', 'pitstopTools'],
    model: 'gpt-4o',
    temperature: 0.1
  },
  raceResults: {
    name: 'Race Results Agent',
    description: 'Analyzes race outcomes and qualifying',
    tools: ['raceTools', 'qualifyingTools', 'sprintTools'],
    model: 'gpt-4o',
    temperature: 0.1
  },
  championship: {
    name: 'Championship Agent',
    description: 'Analyzes championship standings and predictions',
    tools: ['standingsTools', 'seasonTools', 'historicalTools'],
    model: 'gpt-4o',
    temperature: 0.2
  },
  historical: {
    name: 'Historical Data Agent',
    description: 'Provides historical analysis and comparisons',
    tools: ['historicalTools', 'seasonTools', 'allTools'],
    model: 'gpt-4o',
    temperature: 0.1
  }
};
```

## Frontend Architecture (Existing f1-client)

### F1 Agent Chat Integration
The existing f1-client includes a comprehensive F1AgentChat component that integrates with the LangGraph agents:

```javascript
// F1AgentChat.jsx - Modal-based AI chat interface
const F1AgentChat = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('multiAgent');
  const [availableAgents, setAvailableAgents] = useState([]);
  
  // Integration with agentApi service
  const handleSendMessage = async () => {
    const result = await f1AgentApi.queryAgent(selectedAgent, userMessage.content);
    // Handle streaming responses and agent coordination
  };
  
  return (
    <div className="modal show d-block f1-agent-chat-modal">
      {/* ReactMarkdown for formatted responses */}
      {/* Agent status indicators */}
      {/* Real-time typing indicators */}
    </div>
  );
};
```

### Jotai State Management Architecture
The f1-client uses Jotai for efficient atomic state management:

```javascript
// atoms/dataAtoms.js - F1 data state
export const seasonsAtom = atom([]);
export const driversAtom = atom([]);
export const constructorsAtom = atom([]);
export const racesAtom = atom([]);
export const standingsAtom = atom([]);

// atoms/uiAtoms.js - UI state
export const loadingStateAtom = atom(false);
export const selectedSeasonAtom = atom(2024);
export const agentChatOpenAtom = atom(false);

// atoms/derivedAtoms.js - Computed state
export const currentRaceAtom = atom((get) => {
  const races = get(racesAtom);
  return races.find(race => race.isNext) || races[0];
});
```

### Service Integration Layer
Real API services connecting to backend systems:

```javascript
// services/agentApi.js - LangGraph Agents Integration
class F1AgentApiService {
  constructor() {
    this.baseURL = EXTERNAL_CONFIG.langgraphAgentsUrl;
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 60000
    });
  }
  
  async queryAgent(agentId, query, options = {}) {
    const response = await this.apiClient.post('/query', {
      query,
      threadId: options.threadId || `thread_${Date.now()}`,
      agentId
    });
    
    return {
      success: true,
      data: {
        response: response.data?.response,
        agentUsed: response.data?.agentUsed,
        processingTime: response.data?.processingTime
      }
    };
  }
  
  getFallbackAgents() {
    return [
      { id: 'multiAgent', name: 'Multi-Agent Orchestrator', icon: '🎯' },
      { id: 'seasonAnalysis', name: 'Season Analysis Agent', icon: '🏎️' },
      { id: 'driverPerformance', name: 'Driver Performance Agent', icon: '👨‍🏎️' },
      { id: 'raceStrategy', name: 'Race Strategy Agent', icon: '🏁' },
      { id: 'championshipPredictor', name: 'Championship Predictor Agent', icon: '🏆' },
      { id: 'historicalComparison', name: 'Historical Comparison Agent', icon: '📊' }
    ];
  }
}
```

### Configuration System
Centralized configuration supporting multiple environments:

```javascript
// config/index.js - Environment-based configuration
export const EXTERNAL_CONFIG = {
  mcpServerUrl: import.meta.env.VITE_F1_MCP_SERVER_URL || 'http://localhost:3001',
  langgraphAgentsUrl: import.meta.env.VITE_F1_LANGGRAPH_AGENTS_URL || 'http://localhost:3000'
};

export const API_CONFIG = {
  baseURL: import.meta.env.VITE_F1_API_BASE_URL || 'https://api.jolpi.ca/ergast/f1',
  timeout: 30000,
  retries: 3
};

export const FEATURE_FLAGS = {
  enableRaceResults: true,
  enableQualifyingResults: true,
  enableCircuits: true,
  enableHistoricalData: true
};
```

### React Router Integration
Modern routing with lazy loading and error boundaries:

```javascript
// router/index.jsx - Route configuration
const HomePage = React.lazy(() => import('../pages/Home'));
const HistoryPage = React.lazy(() => import('../pages/History'));
const MotorsportNewsPage = React.lazy(() => import('../pages/MotorsportNews'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/:season', element: <HistoryPage /> },
      { path: 'motorsport-news', element: <MotorsportNewsPage /> }
    ]
  }
]);
```

### Key Frontend Components

#### F1DataDisplayJotai - Main Dashboard
```javascript
// Main dashboard component using Jotai state
const F1DataDisplayJotai = () => {
  const [drivers] = useAtom(driversAtom);
  const [constructors] = useAtom(constructorsAtom);
  const [races] = useAtom(racesAtom);
  
  return (
    <div className="f1-dashboard">
      <HeroSection />
      <QuickActions />
      <StatsCards />
      <ChampionshipTables />
      <LatestRaceInfo />
    </div>
  );
};
```

#### Agent Test Button
```javascript
// Button to trigger F1 agent chat
const AgentTestButton = () => {
  const [chatOpen, setChatOpen] = useAtom(agentChatOpenAtom);
  
  return (
    <button onClick={() => setChatOpen(true)} className="btn btn-primary">
      <i className="fas fa-robot me-2"></i>
      Ask F1 AI Agent
    </button>
  );
};
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Project Setup**
   - Initialize directory structure
   - Install dependencies (`@langchain/langgraph`, `@langchain/openai`, `express`)
   - Configure development environment

2. **Core Infrastructure**
   - F1 API client implementation
   - Basic StateGraph setup
   - Model configuration system

### Phase 2: Agent Development (Week 2-3)
1. **Agent Classes**
   - Implement 6 specialized F1 agents
   - Create agent-specific tool integrations
   - Develop system prompts for each domain

2. **StateGraph Workflows**
   - Main routing workflow
   - Individual agent workflows
   - Multi-agent coordination patterns

### Phase 3: Advanced Features (Week 4)
1. **Human-in-the-Loop**
   - Conversation confirmation workflows
   - Complex query validation
   - Interactive result refinement

2. **Memory System**
   - Conversation context management
   - AI-powered summarization
   - Persistent user preferences

### Phase 4: Frontend Integration (Week 5)
1. **f1-client Integration**
   - Connect existing F1AgentChat component to new LangGraph agents
   - Update agentApi.js service to use new backend endpoints
   - Configure environment variables for new agent server

2. **Enhanced Agent Features**
   - Implement streaming responses for real-time feedback
   - Add agent collaboration visualization
   - Update UI with new agent capabilities and status indicators

### Phase 5: Production Deployment (Week 6)
1. **Optimization**
   - Performance tuning
   - Caching strategies
   - Error handling refinement

2. **Deployment**
   - Production configuration
   - Monitoring and logging
   - Health checks and status endpoints

## Technical Specifications

### Backend Dependencies (API Server)
```json
{
  "dependencies": {
    "@langchain/community": "^0.3.45",
    "@langchain/langgraph": "^0.2.74", 
    "@langchain/openai": "^0.5.11",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "express": "^5.1.0",
    "langchain": "^0.3.27",
    "langsmith": "^0.3.33",
    "node-fetch": "^2.7.0",
    "sqlite3": "^5.1.7",
    "uuid": "^11.1.0"
  }
}
```

### Frontend Dependencies (f1-client)
```json
{
  "dependencies": {
    "axios": "^1.9.0",
    "bootstrap": "^5.3.2", 
    "jotai": "^2.12.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-fast-marquee": "^1.6.5",
    "react-markdown": "^10.1.0",
    "react-router-dom": "^7.6.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "terser": "^5.42.0",
    "vite": "^6.3.5",
    "vitest": "^3.2.3"
  }
}
```

### Environment Variables

#### Backend (API Server)
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL_PRIMARY=gpt-4o
OPENAI_MODEL_SECONDARY=gpt-4o-mini

# F1 API Configuration  
F1_API_BASE_URL=http://api.jolpi.ca/ergast/f1
F1_API_CACHE_TTL=300

# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=sqlite:./f1_agent_memory.db
```

#### Frontend (f1-client)
```bash
# F1 API Configuration
VITE_F1_API_BASE_URL=https://api.jolpi.ca/ergast/f1
VITE_F1_API_TIMEOUT=30000
VITE_F1_API_RETRIES=3

# External Services
VITE_F1_MCP_SERVER_URL=http://localhost:3001
VITE_F1_LANGGRAPH_AGENTS_URL=http://localhost:3000

# Application Configuration
VITE_F1_APP_NAME=F1 Data Explorer
VITE_F1_DEFAULT_SEASON=2024
VITE_F1_DEBUG_MODE=false

# Feature Flags
VITE_F1_ENABLE_RACE_RESULTS=true
VITE_F1_ENABLE_QUALIFYING_RESULTS=true
VITE_F1_ENABLE_CIRCUITS=true
VITE_F1_ENABLE_HISTORICAL_DATA=true
```

### Code Standards
- **Backend**: CommonJS (`require`/`module.exports`), pure JavaScript ES6+
- **Frontend**: React 19 with modern hooks, ES6 modules
- **Style**: 2-space indentation, template literals, async/await
- **Testing**: Jest for unit tests, Cypress for E2E
- **Linting**: ESLint with F1-specific rules

## Performance Characteristics
- **Simple Queries**: 2-3 seconds (single agent)
- **Complex Queries**: 8-12 seconds (multi-agent coordination)  
- **API Calls**: <500ms (with caching)
- **Concurrent Users**: Designed for 100+ concurrent users
- **Memory Usage**: <2GB per instance

## Success Metrics
1. **Query Accuracy**: >90% correct F1 domain responses
2. **Response Time**: <5 seconds for 80% of queries
3. **User Satisfaction**: Real-time agent coordination feedback
4. **System Reliability**: 99.5% uptime with graceful degradation
5. **Data Coverage**: Complete F1 historical data from 1950-2025

## Future Enhancements
1. **Real-time Race Data**: Live timing and telemetry integration
2. **Predictive Analytics**: ML models for race outcome prediction
3. **Voice Interface**: Speech-to-text F1 query processing
4. **Mobile App**: React Native client for mobile access
5. **Multi-language Support**: Internationalization for global F1 fans

---

This specification provides a comprehensive foundation for building a sophisticated F1 agentic system using LangGraph.js, combining domain expertise with modern AI orchestration patterns.
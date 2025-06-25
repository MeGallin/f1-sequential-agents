## Project Architecture

This is a **TFL Underground AI Assistant** - a sophisticated multi-agent conversational AI system for London Underground transport information. The system uses **LangGraph.js** with StateGraph workflow orchestration to route user queries to specialized line agents.

### Repository Structure
```
TFL-AGENTIC-FLOW/
├── api/                 # Node.js backend with LangGraph workflows
│   ├── src/
│   │   ├── agents/      # 13 specialized TFL line agents
│   │   ├── tools/       # TFL API integration + LangGraph tools
│   │   ├── prompts/     # System prompts for each agent
│   │   ├── workflows/   # StateGraph workflow definitions
│   │   ├── memory/      # AI-powered conversation memory
│   │   └── utils/       # Shared utilities (GraphState, StartNode)
│   └── docs/           # Technical specifications
└── client/            # React frontend with Whisper speech recognition
    └── src/
        ├── components/  # Chat UI, agent indicators, confirmations
        ├── contexts/    # React state management
        ├── hooks/       # Custom Whisper speech recognition
        └── services/    # API communication
```

### Core Workflow Pattern
The system implements **LangGraph StateGraph** with these workflow nodes:
- `input_validation` → `route_query` → `process_agent` → `check_confirmation` → `save_memory` → `finalize_response`
- Human-in-the-loop confirmation for complex journey planning
- Multi-agent collaboration for cross-line queries
- Real-time streaming with Server-Sent Events

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
  },

## Development Commands

### Backend (`/api`)
```bash
npm run dev         # Development server with nodemon
npm run lint        # ESLint on src/ directory
npm run format      # Prettier code formatting
npm start          # Production server
```

### Frontend (`/f1-client`)
```bash
npm run dev         # Vite development server
npm run build       # Production build
npm run lint        # ESLint code quality checks
npm run preview     # Preview production build
```

## Key Technologies & Patterns

### Backend Architecture
- **LangGraph.js**: StateGraph workflow orchestration with conditional routing
- **Multi-Agent System**: RouterAgent + 13 specialized line agents (Circle, Bakerloo, District, Central, Northern, Piccadilly, Victoria, Jubilee, Metropolitan, Hammersmith & City, Waterloo & City, Elizabeth)
- **Enhanced Memory**: AI-powered conversation summarization with GPT-4o-mini
- **Human-in-the-Loop**: User confirmation workflows for complex journey planning
- **Streaming Responses**: Real-time workflow progress via Server-Sent Events

### Frontend Architecture
- **React 19**: Modern functional components with hooks
- **Speech Recognition**: Local Whisper-Web processing (@xenova/transformers)
- **State Management**: React Context for global state
- **Real-time UI**: Agent typing indicators, streaming progress display
- **Confirmation Dialogs**: Interactive journey approval workflows

### Agent Development Pattern
Each Underground line follows this structure:
1. **Agent Class** (`src/agents/[line]Agent.js`): Processes queries, handles arrivals, calls LLM
2. **Tools Class** (`src/tools/[line]Tools.js`): TFL API integration with error handling
3. **Prompt Function** (`src/prompts/[line]Prompt.js`): System prompt with current time and line info
4. **LangGraph Integration**: DynamicTool wrappers in `langGraphTools.js`

## Code Standards & Conventions

### Backend (CommonJS)
- Use `require`/`module.exports` (no ES6 imports)
- No TypeScript - pure JavaScript ES6+
- 2-space indentation
- Use `const` for immutable, `let` for variables
- Prefer template literals and async/await
- Console.log statements for debugging agent flows


END POINTS
https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/circuits.md

LangGraph REPO
https://github.com/langchain-ai/langgraphjs/tree/main/docs/docs/agents
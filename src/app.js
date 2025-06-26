import express from 'express';
import cors from 'cors';
import { modelConfig } from './config/modelConfig.js';
import { F1Workflow } from './workflows/f1Workflow.js';
import { F1ChatMemory } from './memory/f1ChatMemory.js';
import { agentFactory } from './agents/agentFactory.js';

/**
 * F1 Sequential Agents App - Following TFL Pattern
 * Simplified architecture with clean conversation flow
 */
class F1App {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 8000;
    this.memory = new F1ChatMemory();
    this.agents = {};
    this.workflow = null;
    this.sharedLLM = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🏎️  Initializing F1 Sequential Agents App...');

      // Initialize shared LLM
      this.sharedLLM = modelConfig.getModelInstance({
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 2000,
      });

      // Initialize agents
      await agentFactory.initialize();
      this.agents = {
        raceResults: agentFactory.getAgent('raceResults'),
        circuit: agentFactory.getAgent('circuit'),
        driver: agentFactory.getAgent('driver'),
        constructor: agentFactory.getAgent('constructor'),
        championship: agentFactory.getAgent('championship'),
        historical: agentFactory.getAgent('historical')
      };

      // Initialize workflow
      this.workflow = new F1Workflow(this.agents, this.memory, this.sharedLLM);

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      console.log('✅ F1 Sequential Agents App initialized successfully');
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ Failed to initialize F1 App:', error);
      throw error;
    }
  }

  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));

    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        memory: this.memory.getStats(),
        agents: Object.keys(this.agents)
      });
    });

    // Main query processing endpoint
    this.app.post('/query', async (req, res) => {
      try {
        const { query, threadId, userContext } = req.body;

        if (!query) {
          return res.status(400).json({
            error: 'Query is required',
            message: 'Please provide a query parameter'
          });
        }

        console.log(`[F1App] Processing query: "${query}"`);

        // Initialize state
        const initialState = {
          query,
          threadId: threadId || `f1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userContext: userContext || {}
        };

        // Execute workflow
        const result = await this.workflow.execute(initialState);

        res.json({
          response: result.agentResponse,
          threadId: result.threadId,
          agent: result.selectedAgent,
          confidence: result.confidence,
          metadata: result.metadata
        });

      } catch (error) {
        console.error('[F1App] Query processing error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to process F1 query',
          details: error.message
        });
      }
    });

    // Get conversation history
    this.app.get('/conversation/:threadId', async (req, res) => {
      try {
        const { threadId } = req.params;
        const { limit } = req.query;

        const history = this.memory.getConversationHistory(
          threadId, 
          limit ? parseInt(limit) : null
        );

        if (!history) {
          return res.status(404).json({
            error: 'Conversation not found',
            threadId
          });
        }

        res.json(history);

      } catch (error) {
        console.error('[F1App] Conversation retrieval error:', error);
        res.status(500).json({
          error: 'Failed to retrieve conversation',
          details: error.message
        });
      }
    });

    // Clear conversation
    this.app.delete('/conversation/:threadId', async (req, res) => {
      try {
        const { threadId } = req.params;
        
        const deleted = await this.memory.deleteConversation(threadId);
        
        res.json({
          success: true,
          deleted,
          threadId
        });

      } catch (error) {
        console.error('[F1App] Conversation deletion error:', error);
        res.status(500).json({
          error: 'Failed to delete conversation',
          details: error.message
        });
      }
    });

    // Get agent info
    this.app.get('/agents', (req, res) => {
      res.json({
        agents: Object.keys(this.agents),
        capabilities: agentFactory.getAgentCapabilities(),
        workflow: this.workflow.getWorkflowVisualization()
      });
    });

    // Test endpoint for Monaco -> "this year" flow
    this.app.post('/test/monaco-flow', async (req, res) => {
      try {
        console.log('[F1App] Testing Monaco -> "this year" conversation flow');

        const testThreadId = `test_monaco_${Date.now()}`;
        
        // Step 1: Ask about Monaco without year
        console.log('Step 1: Asking about Monaco without year...');
        const step1State = {
          query: 'Who were the top 5 finishers at Monaco',
          threadId: testThreadId,
          userContext: {}
        };
        
        const step1Result = await this.workflow.execute(step1State);
        console.log('Step 1 Response:', step1Result.agentResponse);

        // Step 2: Follow up with "this year"
        console.log('Step 2: Following up with "this year"...');
        const step2State = {
          query: 'this year',
          threadId: testThreadId,
          userContext: {}
        };
        
        const step2Result = await this.workflow.execute(step2State);
        console.log('Step 2 Response:', step2Result.agentResponse);

        res.json({
          testName: 'Monaco -> "this year" conversation flow',
          threadId: testThreadId,
          steps: [
            {
              step: 1,
              query: step1State.query,
              response: step1Result.agentResponse,
              agent: step1Result.selectedAgent,
              metadata: step1Result.metadata
            },
            {
              step: 2,
              query: step2State.query,
              response: step2Result.agentResponse,
              agent: step2Result.selectedAgent,
              metadata: step2Result.metadata
            }
          ],
          conversationHistory: this.memory.getConversationHistory(testThreadId)
        });

      } catch (error) {
        console.error('[F1App] Monaco flow test error:', error);
        res.status(500).json({
          error: 'Monaco flow test failed',
          details: error.message
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: 'The requested endpoint does not exist'
      });
    });
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🏁 F1 Sequential Agents API listening on port ${this.port}`);
        console.log(`📡 Health check: http://localhost:${this.port}/health`);
        console.log(`🧪 Monaco test: POST http://localhost:${this.port}/test/monaco-flow`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

export { F1App };
export default F1App;
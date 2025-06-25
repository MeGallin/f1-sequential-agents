import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { f1StateGraph } from './src/graph/f1StateGraph.js';
import { agentFactory } from './src/agents/agentFactory.js';
import { queryRouter } from './src/services/queryRouter.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Initialize F1 system on startup
let systemInitialized = false;
let initializationPromise = null;

async function initializeF1System() {
  if (initializationPromise) return initializationPromise;
  
  initializationPromise = (async () => {
    try {
      console.log('🏎️  Initializing F1 Sequential Agents system...');
      
      // Initialize StateGraph orchestrator
      await f1StateGraph.initialize();
      
      console.log('✅ F1 Sequential Agents system ready');
      systemInitialized = true;
      
    } catch (error) {
      console.error('❌ F1 system initialization failed:', error);
      throw error;
    }
  })();
  
  return initializationPromise;
}

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://f1-client-ui.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const agentStatus = systemInitialized ? await agentFactory.performHealthChecks() : [];
    
    res.json({ 
      status: systemInitialized ? 'ready' : 'initializing',
      service: 'F1 Sequential Agents',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      agents: {
        total: agentFactory.agents.size,
        healthy: agentStatus.filter(a => a.status === 'healthy').length,
        initialized: systemInitialized
      },
      stateGraph: {
        initialized: f1StateGraph.initialized,
        structure: f1StateGraph.getGraphStructure()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'F1 Sequential Agents',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API routes
app.get('/api/agents', async (req, res) => {
  try {
    if (!systemInitialized) {
      return res.json({
        message: 'F1 Sequential Agents initializing...',
        agents: [],
        initialized: false
      });
    }

    const agentInfo = agentFactory.getAllAgentInfo();
    const capabilities = agentFactory.getAgentCapabilities();
    
    res.json({
      message: 'F1 Sequential Agents API',
      agents: agentInfo,
      capabilities,
      systemStatus: agentFactory.getSystemStatus(),
      initialized: true
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({
      error: 'Failed to get agent information',
      message: error.message
    });
  }
});

// Main query endpoint - StateGraph workflow
app.post('/api/query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, context = {}, sessionId, userId } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    // Prepare context
    const queryContext = {
      sessionId: sessionId || `session_${Date.now()}`,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      ...context
    };

    // Process query through StateGraph
    console.log(`🔍 Processing query: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    const result = await f1StateGraph.processQuery(query, queryContext);
    
    // Extract response from final AI message
    const finalMessage = result.messages[result.messages.length - 1];
    const response = finalMessage?.content || 'No response generated';
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        response,
        agentUsed: result.selectedAgent,
        confidence: result.agentConfidence,
        multiAgent: result.isMultiAgent,
        agentResults: result.multiAgentResults?.length || 1,
        processingTime: `${processingTime}ms`,
        sessionId: queryContext.sessionId,
        routing: result.routingHistory,
        metadata: result.metadata
      }
    });

  } catch (error) {
    console.error('Query processing error:', error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: 'Query processing failed',
      message: error.message,
      processingTime: `${processingTime}ms`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Stream query endpoint for real-time responses
app.post('/api/query/stream', async (req, res) => {
  try {
    const { query, context = {}, sessionId, userId } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const queryContext = {
      sessionId: sessionId || `session_${Date.now()}`,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
      ...context
    };

    console.log(`🔍 Streaming query: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    // Process query with streaming
    const stream = await f1StateGraph.processStream(query, queryContext);
    
    for await (const chunk of stream) {
      res.write(JSON.stringify(chunk) + '\n');
    }
    
    res.end();

  } catch (error) {
    console.error('Stream processing error:', error);
    res.write(JSON.stringify({ error: error.message }) + '\n');
    res.end();
  }
});

// Agent routing analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    const analysis = queryRouter.analyzeQuery(query);
    const routing = await queryRouter.routeQuery(query);
    
    res.json({
      success: true,
      data: {
        query,
        analysis,
        routing,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Query analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Query analysis failed',
      message: error.message
    });
  }
});

// Individual agent query endpoint
app.post('/api/agents/:agentId/query', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { agentId } = req.params;
    const { query, context = {} } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    console.log(`🎯 Direct agent query to ${agentId}: "${query.slice(0, 100)}${query.length > 100 ? '...' : ''}"`);
    
    const result = await agentFactory.processQuery(agentId, query, context);
    
    const processingTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        ...result,
        agentId,
        processingTime: `${processingTime}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`Agent ${req.params.agentId} query error:`, error);
    
    const processingTime = Date.now() - startTime;
    
    res.status(500).json({
      success: false,
      error: `Agent ${req.params.agentId} query failed`,
      message: error.message,
      processingTime: `${processingTime}ms`
    });
  }
});

// Human-in-the-Loop Endpoints

// Process confirmation
app.post('/api/confirmations/:confirmationId', async (req, res) => {
  try {
    const { confirmationId } = req.params;
    const { action, additionalData = {} } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required (confirm, refine, alternative, cancel)'
      });
    }

    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    console.log(`👤 Processing confirmation ${confirmationId}: ${action}`);
    
    const result = await f1StateGraph.processConfirmation(confirmationId, action, additionalData);
    
    res.json({
      success: result.success,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Confirmation processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Confirmation processing failed',
      message: error.message
    });
  }
});

// Get pending confirmations for a session
app.get('/api/sessions/:sessionId/confirmations', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    const confirmations = f1StateGraph.getPendingConfirmations(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        confirmations,
        count: confirmations.length
      }
    });

  } catch (error) {
    console.error('Get confirmations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get confirmations',
      message: error.message
    });
  }
});

// Get conversation history
app.get('/api/sessions/:sessionId/history', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20 } = req.query;
    
    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    const history = await f1StateGraph.getConversationHistory(sessionId, parseInt(limit));
    
    res.json({
      success: true,
      data: history || {
        sessionId,
        messages: [],
        summary: '',
        context: {}
      }
    });

  } catch (error) {
    console.error('Get conversation history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation history',
      message: error.message
    });
  }
});

// User preferences endpoints
app.get('/api/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    const preferences = await f1StateGraph.getUserPreferences(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        preferences
      }
    });

  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user preferences',
      message: error.message
    });
  }
});

app.put('/api/users/:userId/preferences', async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Preferences object is required'
      });
    }

    // Ensure system is initialized
    if (!systemInitialized) {
      await initializeF1System();
    }

    await f1StateGraph.setUserPreferences(userId, preferences);
    
    res.json({
      success: true,
      data: {
        userId,
        preferences,
        updated: true
      }
    });

  } catch (error) {
    console.error('Set user preferences error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set user preferences',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'  
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server and initialize system
app.listen(PORT, async () => {
  console.log(`🏎️  F1 Sequential Agents server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Query endpoint: http://localhost:${PORT}/api/query`);
  console.log(`🤖 Agents endpoint: http://localhost:${PORT}/api/agents`);
  
  // Initialize F1 system in background
  try {
    await initializeF1System();
    console.log(`✅ F1 Sequential Agents system fully operational`);
  } catch (error) {
    console.error(`❌ System initialization failed:`, error.message);
    console.log(`⚠️  Server running but F1 system may not be fully functional`);
  }
});

export default app;
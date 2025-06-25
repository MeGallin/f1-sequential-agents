import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://f1-client-ui.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Test health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'F1 Sequential Agents Test Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0-test',
    endpoints: {
      health: '/health',
      agents: '/api/agents',
      query: '/api/query',
      analyze: '/api/analyze'
    }
  });
});

// Test agents endpoint
app.get('/api/agents', (req, res) => {
  res.json({
    message: 'F1 Sequential Agents Test API',
    agents: [
      { id: 'circuit', name: 'Circuit Analysis Agent', status: 'test-ready' },
      { id: 'driver', name: 'Driver Performance Agent', status: 'test-ready' },
      { id: 'constructor', name: 'Constructor Analysis Agent', status: 'test-ready' },
      { id: 'raceResults', name: 'Race Results Agent', status: 'test-ready' },
      { id: 'championship', name: 'Championship Agent', status: 'test-ready' },
      { id: 'historical', name: 'Historical Data Agent', status: 'test-ready' }
    ],
    initialized: false,
    note: 'Test server - AI agents require OpenAI API key for full functionality'
  });
});

// Test query analysis endpoint  
app.post('/api/analyze', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query is required and must be a string'
      });
    }

    // Mock query analysis
    const analysis = {
      query,
      queryType: determineQueryType(query),
      complexity: assessComplexity(query),
      entities: extractEntities(query),
      suggestedAgent: routeToAgent(query),
      confidence: 0.8,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: analysis,
      note: 'Mock analysis - full analysis requires initialized agents'
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

// Test query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query, sessionId, userId } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    // Mock processing
    const suggestedAgent = routeToAgent(query);
    const mockResponse = generateMockResponse(query, suggestedAgent);
    
    res.json({
      success: true,
      data: {
        response: mockResponse,
        agentUsed: suggestedAgent,
        confidence: 0.8,
        multiAgent: false,
        processingTime: '150ms',
        sessionId: sessionId || `session_${Date.now()}`,
        routing: [{
          timestamp: new Date().toISOString(),
          selectedAgent: suggestedAgent,
          confidence: 0.8
        }],
        note: 'Mock response - full functionality requires OpenAI API key'
      }
    });

  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Query processing failed',
      message: error.message
    });
  }
});

// Helper functions for testing
function determineQueryType(query) {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('compare') || queryLower.includes('vs')) return 'comparison';
  if (queryLower.includes('predict') || queryLower.includes('forecast')) return 'prediction';
  if (queryLower.includes('history') || queryLower.includes('all time')) return 'historical';
  if (queryLower.includes('circuit') || queryLower.includes('track')) return 'circuit';
  if (queryLower.includes('championship') || queryLower.includes('standings')) return 'championship';
  if (queryLower.includes('race') || queryLower.includes('result')) return 'race';
  
  return 'general';
}

function assessComplexity(query) {
  const wordCount = query.split(/\s+/).length;
  if (wordCount > 20) return 'complex';
  if (wordCount > 10) return 'moderate';
  return 'simple';
}

function extractEntities(query) {
  const queryLower = query.toLowerCase();
  
  const drivers = ['hamilton', 'verstappen', 'leclerc', 'russell', 'sainz', 'norris']
    .filter(driver => queryLower.includes(driver));
    
  const constructors = ['mercedes', 'ferrari', 'red bull', 'mclaren', 'alpine']
    .filter(constructor => queryLower.includes(constructor));
    
  const circuits = ['monaco', 'silverstone', 'monza', 'spa', 'suzuka']
    .filter(circuit => queryLower.includes(circuit));
    
  const years = query.match(/\b(19|20)\d{2}\b/g) || [];
  
  return { drivers, constructors, circuits, years };
}

function routeToAgent(query) {
  const queryType = determineQueryType(query);
  
  switch (queryType) {
    case 'circuit': return 'circuit';
    case 'championship': return 'championship';
    case 'historical': return 'historical';
    case 'race': return 'raceResults';
    case 'comparison': return 'historical';
    case 'prediction': return 'championship';
    default: return 'driver';
  }
}

function generateMockResponse(query, agent) {
  const responses = {
    circuit: `Based on circuit analysis, ${query.includes('Monaco') ? 'Monaco is a challenging street circuit with limited overtaking opportunities' : 'this circuit has unique characteristics that significantly impact race strategy'}.`,
    driver: `Driver analysis shows interesting performance patterns ${query.includes('Hamilton') ? 'for Lewis Hamilton across different seasons' : 'in the data'}.`,
    constructor: `Constructor analysis reveals ${query.includes('Ferrari') ? 'Ferrari has shown strong development throughout the season' : 'significant technical developments'}.`,
    championship: `Championship analysis indicates ${query.includes('2024') ? 'the 2024 season has been highly competitive' : 'interesting title fight dynamics'}.`,
    raceResults: `Race results analysis shows ${query.includes('qualifying') ? 'qualifying performance strongly correlates with race outcomes' : 'compelling race dynamics'}.`,
    historical: `Historical analysis reveals ${query.includes('compare') ? 'fascinating comparisons across different F1 eras' : 'significant trends in F1 evolution'}.`
  };
  
  return responses[agent] || 'F1 analysis completed successfully with mock data.';
}

// Error handling
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

// Start server
app.listen(PORT, () => {
  console.log(`🏎️  F1 Sequential Agents TEST server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Query endpoint: http://localhost:${PORT}/api/query`);
  console.log(`🧪 This is a TEST server with mock responses for manual testing`);
});

export default app;
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'F1 Sequential Agents',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes placeholder
app.get('/api/agents', (req, res) => {
  res.json({
    message: 'F1 Sequential Agents API',
    agents: [
      { id: 'circuit', name: 'Circuit Analysis Agent', status: 'ready' },
      { id: 'driver', name: 'Driver Performance Agent', status: 'ready' },
      { id: 'constructor', name: 'Constructor Analysis Agent', status: 'ready' },
      { id: 'raceResults', name: 'Race Results Agent', status: 'ready' },
      { id: 'championship', name: 'Championship Agent', status: 'ready' },
      { id: 'historical', name: 'Historical Data Agent', status: 'ready' }
    ]
  });
});

// Query endpoint placeholder
app.post('/api/query', async (req, res) => {
  try {
    const { query, threadId, agentId } = req.body;
    
    res.json({
      success: true,
      data: {
        response: 'F1 Sequential Agents system is initializing. Agent workflows will be available soon.',
        agentUsed: agentId || 'system',
        processingTime: '0.1s',
        threadId: threadId || `thread_${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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

// Start server
app.listen(PORT, () => {
  console.log(`🏎️  F1 Sequential Agents server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
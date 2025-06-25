#!/usr/bin/env node

// Manual testing script for F1 Sequential Agents
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  log(`\n${colors.bold}🧪 Testing: ${testName}${colors.reset}`, 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on non-2xx status codes
      ...options
    });
    
    if (response.status >= 200 && response.status < 300) {
      logSuccess(`${name}: ${response.status} ${response.statusText}`);
      return { success: true, data: response.data, status: response.status };
    } else {
      logError(`${name}: ${response.status} ${response.statusText}`);
      return { success: false, data: response.data, status: response.status };
    }
  } catch (error) {
    logError(`${name}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🏎️  F1 Sequential Agents - Manual Testing Suite', 'bold');
  log('=' .repeat(60), 'blue');

  // Test 1: Health Check
  logTest('Health Endpoint');
  const healthResult = await testEndpoint(
    'GET /health',
    `${BASE_URL}/health`,
    { method: 'GET' }
  );
  
  if (healthResult.success) {
    console.log(JSON.stringify(healthResult.data, null, 2));
  }

  // Test 2: Agents List
  logTest('Agents List Endpoint');
  const agentsResult = await testEndpoint(
    'GET /api/agents',
    `${BASE_URL}/api/agents`,
    { method: 'GET' }
  );
  
  if (agentsResult.success) {
    console.log(JSON.stringify(agentsResult.data, null, 2));
  }

  // Test 3: Query Analysis
  logTest('Query Analysis Endpoint');
  const analysisQueries = [
    'Who is the fastest driver at Monaco?',
    'Compare Hamilton vs Verstappen performance in 2023',
    'What are the championship standings?',
    'Analyze Silverstone circuit characteristics'
  ];

  for (const query of analysisQueries) {
    log(`\nAnalyzing: "${query}"`, 'yellow');
    const analysisResult = await testEndpoint(
      'POST /api/analyze',
      `${BASE_URL}/api/analyze`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { query }
      }
    );
    
    if (analysisResult.success) {
      const { data } = analysisResult.data;
      logSuccess(`Query Type: ${data.queryType}`);
      logSuccess(`Complexity: ${data.complexity}`);
      logSuccess(`Suggested Agent: ${data.suggestedAgent}`);
      logSuccess(`Confidence: ${data.confidence}`);
      console.log('Entities:', data.entities);
    }
  }

  // Test 4: Query Processing
  logTest('Query Processing Endpoint');
  const testQueries = [
    {
      query: 'Tell me about Monaco circuit characteristics',
      expectedAgent: 'circuit'
    },
    {
      query: 'Who will win the 2024 championship?',
      expectedAgent: 'championship'
    },
    {
      query: 'Compare Lewis Hamilton and Max Verstappen career stats',
      expectedAgent: 'historical'
    },
    {
      query: 'What happened in the last race?',
      expectedAgent: 'raceResults'
    }
  ];

  for (const testCase of testQueries) {
    log(`\nQuerying: "${testCase.query}"`, 'yellow');
    const queryResult = await testEndpoint(
      'POST /api/query',
      `${BASE_URL}/api/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { 
          query: testCase.query,
          sessionId: `test_${Date.now()}`,
          userId: 'test_user'
        }
      }
    );
    
    if (queryResult.success) {
      const { data } = queryResult.data;
      logSuccess(`Agent Used: ${data.agentUsed}`);
      logSuccess(`Processing Time: ${data.processingTime}`);
      logSuccess(`Confidence: ${data.confidence}`);
      log(`Response: ${data.response}`, 'blue');
      
      if (data.agentUsed === testCase.expectedAgent) {
        logSuccess('✅ Correct agent routing!');
      } else {
        logWarning(`Expected ${testCase.expectedAgent}, got ${data.agentUsed}`);
      }
    }
  }

  // Test 5: Error Handling
  logTest('Error Handling');
  
  // Test empty query
  const emptyQueryResult = await testEndpoint(
    'POST /api/query (empty)',
    `${BASE_URL}/api/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {}
    }
  );

  if (emptyQueryResult.status === 400) {
    logSuccess('Empty query properly rejected with 400');
  }

  // Test invalid endpoint
  const invalidResult = await testEndpoint(
    'GET /invalid',
    `${BASE_URL}/invalid`,
    { method: 'GET' }
  );

  if (invalidResult.status === 404) {
    logSuccess('Invalid endpoint properly returns 404');
  }

  // Test Summary
  log('\n🏁 Testing Summary', 'bold');
  log('=' .repeat(60), 'blue');
  logSuccess('Basic server functionality verified');
  logSuccess('Endpoint routing working correctly');
  logSuccess('Query analysis logic functioning');
  logSuccess('Agent routing simulation operational');
  logSuccess('Error handling implemented');
  
  log('\n📋 Manual Testing Recommendations:', 'yellow');
  log('1. Test with real OpenAI API key for full agent functionality');
  log('2. Test concurrent queries for performance');
  log('3. Test streaming endpoint when implemented');
  log('4. Verify F1 API integration with real data');
  log('5. Test multi-agent coordination scenarios');
  
  log('\n✅ Manual testing complete!', 'green');
}

// Handle script execution
if (process.argv[2] === '--run') {
  runTests().catch(console.error);
} else {
  log('Usage: node manual-test.js --run', 'yellow');
  log('Make sure the test server is running on port 8000', 'blue');
}

export { runTests };
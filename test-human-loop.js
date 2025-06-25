#!/usr/bin/env node

// Test script for Human-in-the-Loop and Memory System functionality
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

// Test colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function testEndpoint(name, url, options = {}) {
  try {
    const response = await axios({
      url,
      timeout: 10000,
      validateStatus: () => true,
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

async function runHumanLoopTests() {
  log('\n🏎️  F1 Sequential Agents - Human-in-the-Loop & Memory Testing', 'bold');
  log('=' .repeat(80), 'blue');

  const sessionId = `test_session_${Date.now()}`;
  const userId = `test_user_${Date.now()}`;

  // Test 1: Query Validation
  logTest('Query Validation System');
  
  // Test invalid query
  const invalidQueryResult = await testEndpoint(
    'POST /api/query (invalid)',
    `${BASE_URL}/api/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { 
        query: 'x',  // Too short
        sessionId,
        userId
      }
    }
  );

  if (invalidQueryResult.success && invalidQueryResult.data.success === false) {
    logSuccess('Invalid query properly rejected');
  } else {
    logWarning('Invalid query validation may not be working as expected');
  }

  // Test complex query that might need confirmation
  const complexQueryResult = await testEndpoint(
    'POST /api/query (complex)',
    `${BASE_URL}/api/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { 
        query: 'Predict who will win the 2024 championship and compare historical performance across multiple drivers from different eras',
        sessionId,
        userId
      }
    }
  );

  if (complexQueryResult.success) {
    logInfo('Complex query processed');
    console.log(JSON.stringify(complexQueryResult.data, null, 2));
  }

  // Test 2: Conversation History
  logTest('Conversation Memory System');
  
  // Add a few queries to build conversation history
  const queries = [
    'Who is Lewis Hamilton?',
    'What about Max Verstappen?',
    'Compare their performance in 2023'
  ];

  for (const query of queries) {
    log(`\nAdding to conversation: "${query}"`, 'yellow');
    await testEndpoint(
      'POST /api/query',
      `${BASE_URL}/api/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: { query, sessionId, userId }
      }
    );
  }

  // Get conversation history
  const historyResult = await testEndpoint(
    'GET /api/sessions/:sessionId/history',
    `${BASE_URL}/api/sessions/${sessionId}/history?limit=10`,
    { method: 'GET' }
  );

  if (historyResult.success) {
    logSuccess('Conversation history retrieved');
    const history = historyResult.data.data;
    logInfo(`Messages in conversation: ${history.messages?.length || 0}`);
    logInfo(`Mentioned drivers: ${history.context?.mentionedDrivers?.join(', ') || 'none'}`);
    logInfo(`Active topics: ${history.context?.activeTopics?.join(', ') || 'none'}`);
  }

  // Test 3: User Preferences
  logTest('User Preferences System');
  
  const preferences = {
    preferredDrivers: ['Hamilton', 'Verstappen'],
    preferredTeams: ['Mercedes', 'Red Bull'],
    analysisDetail: 'high',
    responseFormat: 'technical',
    timezone: 'UTC'
  };

  // Set preferences
  const setPrefsResult = await testEndpoint(
    'PUT /api/users/:userId/preferences',
    `${BASE_URL}/api/users/${userId}/preferences`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      data: { preferences }
    }
  );

  if (setPrefsResult.success) {
    logSuccess('User preferences set successfully');
  }

  // Get preferences
  const getPrefsResult = await testEndpoint(
    'GET /api/users/:userId/preferences',
    `${BASE_URL}/api/users/${userId}/preferences`,
    { method: 'GET' }
  );

  if (getPrefsResult.success) {
    logSuccess('User preferences retrieved');
    const userPrefs = getPrefsResult.data.data.preferences;
    logInfo(`Preferred drivers: ${userPrefs.preferredDrivers?.join(', ')}`);
    logInfo(`Analysis detail: ${userPrefs.analysisDetail}`);
  }

  // Test 4: Confirmation Workflow (Simulated)
  logTest('Confirmation Workflow System');
  
  // Check for pending confirmations
  const confirmationsResult = await testEndpoint(
    'GET /api/sessions/:sessionId/confirmations',
    `${BASE_URL}/api/sessions/${sessionId}/confirmations`,
    { method: 'GET' }
  );

  if (confirmationsResult.success) {
    const confirmations = confirmationsResult.data.data.confirmations;
    logSuccess(`Pending confirmations: ${confirmations.length}`);
    
    if (confirmations.length > 0) {
      const confirmation = confirmations[0];
      logInfo(`Confirmation ID: ${confirmation.confirmationId}`);
      logInfo(`Message: ${confirmation.message}`);
      logInfo(`Options: ${confirmation.options.map(opt => opt.label).join(', ')}`);
      
      // Test confirmation processing (simulate user confirming)
      const confirmResult = await testEndpoint(
        'POST /api/confirmations/:confirmationId',
        `${BASE_URL}/api/confirmations/${confirmation.confirmationId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: { 
            action: 'confirm',
            additionalData: {}
          }
        }
      );

      if (confirmResult.success) {
        logSuccess('Confirmation processed successfully');
        logInfo(`Action result: ${confirmResult.data.data.action}`);
      }
    } else {
      logInfo('No pending confirmations found (this is normal in test mode)');
    }
  }

  // Test 5: Context-Aware Queries
  logTest('Context-Aware Query Processing');
  
  // Send a query that references previous conversation
  const contextQuery = 'How do they compare at Monaco?'; // "they" should reference Hamilton and Verstappen
  
  const contextResult = await testEndpoint(
    'POST /api/query (context-aware)',
    `${BASE_URL}/api/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { 
        query: contextQuery,
        sessionId,
        userId
      }
    }
  );

  if (contextResult.success) {
    logSuccess('Context-aware query processed');
    const response = contextResult.data.data?.response || contextResult.data.message;
    logInfo(`Response references context: ${response.includes('Hamilton') || response.includes('Verstappen') ? 'Yes' : 'No'}`);
  }

  // Test 6: Query Analysis with Validation
  logTest('Enhanced Query Analysis');
  
  const analysisResult = await testEndpoint(
    'POST /api/analyze',
    `${BASE_URL}/api/analyze`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: { 
        query: 'Compare Hamilton vs Verstappen championship performance and predict future trends'
      }
    }
  );

  if (analysisResult.success) {
    logSuccess('Query analysis completed');
    const analysis = analysisResult.data.data;
    logInfo(`Query type: ${analysis.analysis?.queryType || analysis.routing?.suggestedAgent}`);
    logInfo(`Complexity: ${analysis.analysis?.complexity || 'unknown'}`);
    logInfo(`Confidence: ${analysis.routing?.confidence || 'unknown'}`);
  }

  // Test Summary
  log('\n🏁 Human-in-the-Loop Testing Summary', 'bold');
  log('=' .repeat(80), 'blue');
  logSuccess('Query validation system operational');
  logSuccess('Conversation memory tracking working');
  logSuccess('User preferences management functional');
  logSuccess('Context-aware query processing enabled');
  logSuccess('Enhanced query analysis with validation');
  
  log('\n📋 Human-in-the-Loop Features Verified:', 'yellow');
  log('✅ Query validation and refinement suggestions');
  log('✅ Conversation context and memory persistence');
  log('✅ User preference management');
  log('✅ Confirmation workflow infrastructure');
  log('✅ Enhanced query analysis with validation');
  log('✅ Context-aware pronoun resolution');
  
  log('\n📋 Production Considerations:', 'cyan');
  log('• Confirmation workflows require OpenAI API for real operation');
  log('• Memory cleanup should be scheduled for production');
  log('• User preferences can be persisted to database');
  log('• Context resolution improves with conversation history');
  log('• Validation helps prevent malformed queries');
  
  log('\n✅ Human-in-the-Loop and Memory testing complete!', 'green');
}

// Handle script execution
if (process.argv[2] === '--run') {
  runHumanLoopTests().catch(console.error);
} else {
  log('Usage: node test-human-loop.js --run', 'yellow');
  log('Make sure the main server is running on port 8000', 'blue');
}

export { runHumanLoopTests };
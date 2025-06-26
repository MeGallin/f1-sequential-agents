#!/usr/bin/env node

/**
 * F1 Sequential Agents Integration Test
 * Tests the compatibility with F1 Client expectations
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function testIntegration() {
  console.log('🧪 Testing F1 Sequential Agents Integration...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing Health Endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Health Status:', healthResponse.data.status);
    console.log('✅ Available Agents:', healthResponse.data.agents);
    console.log('');

    // Test 2: Agents Endpoint (F1 Client compatibility)
    console.log('2. Testing Agents Endpoint...');
    const agentsResponse = await axios.get(`${BASE_URL}/agents`, { timeout: 10000 });
    console.log('✅ Available Agents:', agentsResponse.data.available);
    console.log('✅ Agent Details Sample:', Object.keys(agentsResponse.data.details));
    console.log('');

    // Test 3: F1 Client Compatibility Endpoint
    console.log('3. Testing F1 Client Compatibility Endpoint...');
    const queryPayload = {
      query: "Who won the last Monaco Grand Prix?",
      agentId: "raceResults"
    };

    const queryResponse = await axios.post(`${BASE_URL}/agents/analyze`, queryPayload, { 
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ Query Response Status:', queryResponse.status);
    console.log('✅ Response Structure:');
    console.log('   - response:', typeof queryResponse.data.response);
    console.log('   - agentUsed:', queryResponse.data.agentUsed);
    console.log('   - confidence:', queryResponse.data.confidence);
    console.log('   - threadId:', queryResponse.data.threadId ? 'present' : 'missing');
    console.log('   - metadata:', queryResponse.data.metadata ? 'present' : 'missing');
    console.log('');

    console.log('🎉 All integration tests passed!');
    console.log('🔧 F1 Client can now connect to F1 Sequential Agents');

  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Check if server is already running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 2000 });
    console.log('✅ Server is already running at', BASE_URL);
    return true;
  } catch (error) {
    console.log('⚠️  Server not running at', BASE_URL);
    console.log('   Please start the server with: npm start');
    return false;
  }
}

// Main execution
async function main() {
  const isRunning = await checkServer();
  if (isRunning) {
    await testIntegration();
  } else {
    console.log('\n🚀 To run this test:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Run this test: node test-integration.js');
  }
}

main().catch(console.error);
#!/usr/bin/env node

// Quick test with real F1 server (requires OpenAI API key)
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

async function quickRealTest() {
  console.log('🏎️  Quick Real Server Test');
  console.log('=' .repeat(40));

  try {
    // Test health endpoint
    console.log('\n🔍 Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Status:', healthResponse.data.status);
    console.log('✅ Agents Initialized:', healthResponse.data.agents?.initialized || false);
    console.log('✅ StateGraph Initialized:', healthResponse.data.stateGraph?.initialized || false);

    // Test agents endpoint
    console.log('\n🔍 Testing agents endpoint...');
    const agentsResponse = await axios.get(`${BASE_URL}/api/agents`);
    console.log('✅ Total Agents:', agentsResponse.data.capabilities?.totalAgents || 0);
    console.log('✅ System Status:', agentsResponse.data.systemStatus?.initialized || false);

    // Test a simple query (this will likely fail without OpenAI key but we can see the error handling)
    console.log('\n🔍 Testing simple query...');
    try {
      const queryResponse = await axios.post(`${BASE_URL}/api/query`, {
        query: 'Who won the 2023 F1 championship?',
        sessionId: 'test_session'
      });
      
      console.log('✅ Query Success:', queryResponse.data.success);
      console.log('✅ Agent Used:', queryResponse.data.data?.agentUsed);
      console.log('✅ Response:', queryResponse.data.data?.response?.slice(0, 100) + '...');
      
    } catch (queryError) {
      if (queryError.response?.status === 500) {
        console.log('⚠️  Query failed (expected without OpenAI key):', queryError.response.status);
        console.log('⚠️  Error:', queryError.response.data?.error);
      } else {
        console.log('❌ Unexpected error:', queryError.message);
      }
    }

  } catch (error) {
    console.log('❌ Connection Error:', error.message);
    console.log('💡 Make sure the main server is running: npm start');
  }

  console.log('\n✅ Quick test complete!');
}

quickRealTest().catch(console.error);
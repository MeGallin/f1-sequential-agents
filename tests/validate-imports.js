#!/usr/bin/env node

/**
 * Import Validation Script
 * Tests all imports to ensure they're working correctly
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

// Get current directory for proper path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables  
config({ path: resolve(__dirname, '../.env') });

console.log('🔍 Testing all imports...\n');

try {
  console.log('📦 Testing main app import...');
  const F1App = await import('../src/app.js');
  console.log('✅ F1App imported successfully');

  console.log('📦 Testing config imports...');
  const { modelConfig } = await import('../src/config/modelConfig.js');
  console.log('✅ modelConfig imported successfully');

  console.log('📦 Testing workflow imports...');
  const { F1Workflow } = await import('../src/workflows/f1Workflow.js');
  console.log('✅ F1Workflow imported successfully');

  console.log('📦 Testing memory imports...');
  const { F1ChatMemory } = await import('../src/memory/f1ChatMemory.js');
  console.log('✅ F1ChatMemory imported successfully');

  console.log('📦 Testing agent factory imports...');
  const { agentFactory } = await import('../src/agents/agentFactory.js');
  console.log('✅ agentFactory imported successfully');

  console.log('\n🎉 All imports working correctly!');
  console.log('✅ The server should start without issues.');

} catch (error) {
  console.error('\n❌ Import validation failed:');
  console.error(error);
  process.exit(1);
}

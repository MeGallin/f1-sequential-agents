#!/usr/bin/env node

import F1App from './app.js';

/**
 * F1 Sequential Agents Server
 * Following TFL pattern with simplified architecture
 */

const app = new F1App();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await app.stop();
  process.exit(0);
});

// Start the server
app.start().catch((error) => {
  console.error('❌ Failed to start F1 Sequential Agents server:', error);
  process.exit(1);
});
import { BaseF1Agent } from './baseAgent.js';
import { raceToolsLangGraph } from '../tools/langGraphTools.js';
import { promptLoader } from '../prompts/index.js';

/**
 * Race Results Agent - Simplified to use only F1 API endpoints
 * No mock data, no complex logic - just prompts and API calls
 */
class RaceResultsAgent extends BaseF1Agent {
  constructor() {
    super('raceResults', raceToolsLangGraph);
  }

  // Load system prompt from prompts folder
  async getSystemPrompt() {
    try {
      const customPrompt = await promptLoader.getSystemPrompt('raceResults');
      if (customPrompt) {
        return customPrompt;
      }
    } catch (error) {
      console.warn('Failed to load custom race results prompt, using fallback');
    }

    // Fallback prompt
    return `You are the F1 Race Results Agent. 

You have access to F1 API tools that can fetch:
- Race results by season/round
- Qualifying results
- Driver standings
- Constructor standings
- Race schedules

When users ask about races without specifying a year, ask them to clarify which year they're interested in.

Provide accurate, data-driven analysis based only on the API responses you receive.`;
  }
}

export default RaceResultsAgent;
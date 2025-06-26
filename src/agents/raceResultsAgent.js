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
      console.error('Failed to load race results system prompt:', error);
      throw new Error(
        'Race results agent system prompt is required but could not be loaded',
      );
    }
  }
}

export default RaceResultsAgent;

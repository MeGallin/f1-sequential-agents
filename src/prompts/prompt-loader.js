/**
 * Centralized Prompt Loading Utility
 * Loads agent-specific prompts with template variable support
 */

export class PromptLoader {
  static async getSystemPrompt(agentType, promptType = 'system') {
    try {
      const agentMapping = {
        'raceResults': 'race-results',
        'circuit': 'circuit-analysis',
        'driver': 'driver-performance',
        'constructor': 'constructor-analysis',
        'championship': 'championship-predictor',
        'historical': 'historical-comparison'
      };

      const agentFolder = agentMapping[agentType];
      if (!agentFolder) {
        console.warn(`No prompt folder found for agent type: ${agentType}`);
        return null;
      }

      const promptPath = `./agents/${agentFolder}/${promptType}.js`;
      const module = await import(promptPath);
      return module.systemPrompt || module.default;
    } catch (error) {
      console.warn(`Failed to load prompt for ${agentType}/${promptType}:`, error.message);
      return null;
    }
  }

  static async getAnalysisPrompt(agentType, analysisType, variables = {}) {
    try {
      const agentMapping = {
        'raceResults': 'race-results',
        'circuit': 'circuit-analysis',
        'driver': 'driver-performance',
        'constructor': 'constructor-analysis',
        'championship': 'championship-predictor',
        'historical': 'historical-comparison'
      };

      const agentFolder = agentMapping[agentType];
      if (!agentFolder) {
        return null;
      }

      const promptPath = `./agents/${agentFolder}/${analysisType}.js`;
      const module = await import(promptPath);
      let prompt = module.analysisPrompt || module.default;

      // Template variable substitution
      if (prompt && variables) {
        Object.keys(variables).forEach(key => {
          prompt = prompt.replace(new RegExp(`{${key}}`, 'g'), variables[key]);
        });
      }

      return prompt;
    } catch (error) {
      console.warn(`Failed to load analysis prompt for ${agentType}/${analysisType}:`, error.message);
      return null;
    }
  }
}

export const promptLoader = new PromptLoader();
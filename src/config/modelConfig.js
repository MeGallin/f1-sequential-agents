import { ChatOpenAI } from '@langchain/openai';

class ModelConfig {
  constructor() {
    this.models = {
      primary: process.env.OPENAI_MODEL_PRIMARY || 'gpt-4o',
      secondary: process.env.OPENAI_MODEL_SECONDARY || 'gpt-4o-mini',
      fallback: 'gpt-3.5-turbo'
    };
    this.currentModel = this.models.primary;
    this.apiKey = process.env.OPENAI_API_KEY;
    
    if (!this.apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not found in environment variables');
    }
  }

  switchModel(modelType) {
    if (this.models[modelType]) {
      this.currentModel = this.models[modelType];
      console.log(`🔄 Switched to model: ${this.currentModel}`);
      return true;
    }
    console.warn(`❌ Model type '${modelType}' not found. Available: ${Object.keys(this.models).join(', ')}`);
    return false;
  }

  getModelInstance(options = {}) {
    const defaultOptions = {
      model: this.currentModel,
      temperature: 0.1,
      maxTokens: 2000,
      timeout: 60000
    };

    const finalOptions = { ...defaultOptions, ...options };

    if (!this.apiKey) {
      throw new Error('OpenAI API key is required. Please set OPENAI_API_KEY environment variable.');
    }

    return new ChatOpenAI({
      ...finalOptions,
      openAIApiKey: this.apiKey
    });
  }

  // Specialized model instances for different agents
  getRouterModel() {
    return this.getModelInstance({
      temperature: 0.0, // Very deterministic for routing
      maxTokens: 500
    });
  }

  getAnalysisModel() {
    return this.getModelInstance({
      temperature: 0.1, // Slightly creative for analysis
      maxTokens: 2000
    });
  }

  getChampionshipPredictionModel() {
    return this.getModelInstance({
      temperature: 0.2, // More creative for predictions
      maxTokens: 1500
    });
  }

  getHistoricalComparisonModel() {
    return this.getModelInstance({
      temperature: 0.1,
      maxTokens: 2500 // More tokens for detailed comparisons
    });
  }

  getSummaryModel() {
    return this.getModelInstance({
      model: this.models.secondary, // Use cheaper model for summaries
      temperature: 0.0,
      maxTokens: 1000
    });
  }

  // Model health check
  async testConnection() {
    try {
      const model = this.getModelInstance({
        maxTokens: 50,
        temperature: 0
      });
      
      const result = await model.invoke([{
        role: 'user',
        content: 'Reply with just "OK" if you can hear me.'
      }]);
      
      console.log('✅ OpenAI connection test successful');
      return true;
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error.message);
      return false;
    }
  }

  // Get model info
  getModelInfo() {
    return {
      current: this.currentModel,
      available: this.models,
      hasApiKey: !!this.apiKey
    };
  }

  // Estimate token usage
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  // Check if we should use fallback model
  shouldUseFallback(error) {
    const fallbackTriggers = [
      'rate limit',
      'insufficient_quota',
      'model_not_found',
      'model_overloaded'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return fallbackTriggers.some(trigger => errorMessage.includes(trigger));
  }

  // Automatic fallback handling
  async invokeWithFallback(messages, options = {}) {
    try {
      const model = this.getModelInstance(options);
      return await model.invoke(messages);
    } catch (error) {
      if (this.shouldUseFallback(error) && this.currentModel !== this.models.fallback) {
        console.warn(`⚠️  Primary model failed, trying fallback: ${this.models.fallback}`);
        try {
          const fallbackModel = this.getModelInstance({
            ...options,
            model: this.models.fallback
          });
          return await fallbackModel.invoke(messages);
        } catch (fallbackError) {
          console.error('❌ Fallback model also failed:', fallbackError.message);
          throw fallbackError;
        }
      }
      throw error;
    }
  }
}

// Export singleton instance
export const modelConfig = new ModelConfig();
export default modelConfig;
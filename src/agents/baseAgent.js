import { ChatOpenAI } from '@langchain/openai';
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
  ToolMessage,
} from '@langchain/core/messages';
import { modelConfig } from '../config/modelConfig.js';
import { agentConfig } from '../config/agentConfig.js';

export class BaseF1Agent {
  constructor(agentId, tools = []) {
    this.agentId = agentId;
    this.config = agentConfig[agentId];
    this.tools = tools;
    this._model = null; // Lazy initialization

    if (!this.config) {
      throw new Error(`Agent configuration not found for: ${agentId}`);
    }

    console.log(`🤖 Initialized ${this.config.name}`);
  }

  // Get system prompt for the agent
  getSystemPrompt() {
    return `You are the ${
      this.config.name
    }, a specialized AI assistant for Formula 1 analysis.

ROLE: ${this.config.description}

SPECIALIZATIONS:
${this.config.specialization.map((spec) => `• ${spec}`).join('\n')}

GUIDELINES:
1. Focus on F1-specific analysis and insights
2. Use precise F1 terminology and technical language
3. Provide data-driven analysis when possible
4. Reference specific races, seasons, drivers, and constructors
5. Include relevant statistics and historical context
6. Format responses with clear structure and bullet points
7. Always cite data sources when making claims

RESPONSE FORMAT:
• Start with a brief summary
• Provide detailed analysis with supporting data
• Include relevant context and comparisons
• End with key insights or conclusions

Remember: You are an expert in ${
      this.agentId
    } analysis. Leverage your specialized knowledge to provide authoritative F1 insights.`;
  }

  // Lazy initialization of model to ensure environment variables are loaded
  get model() {
    if (!this._model) {
      this._model = modelConfig.getModelInstance({
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
      });

      // Bind tools using LangChain's bindTools method (correct approach)
      if (this.tools && this.tools.length > 0) {
        console.log(
          `🔧 ${this.config.name} binding ${this.tools.length} tools`,
        );
        this._model = this._model.bindTools(this.tools);
      }
    }
    return this._model;
  }

  // Process a query with the agent - Updated to follow TFL pattern
  async processQuery(query, context = {}) {
    try {
      const startTime = Date.now();
      console.log(`🏁 ${this.config.name} processing: "${query}"`);

      // Prepare messages
      const systemPrompt = await this.getSystemPrompt();
      const messages = [new SystemMessage(systemPrompt)];

      // Add conversation history if available (TFL pattern)
      if (
        context.conversationHistory &&
        context.conversationHistory.length > 0
      ) {
        // Add recent conversation history
        const recentHistory = context.conversationHistory.slice(-3);
        recentHistory.forEach((entry) => {
          if (entry.role === 'user') {
            messages.push(new HumanMessage(entry.content));
          } else if (entry.role === 'assistant') {
            messages.push(new AIMessage(entry.content));
          }
        });
      }

      // Handle year clarification context (Monaco -> "this year" flow)
      if (context.needsYearClarification) {
        const clarification = context.needsYearClarification;

        if (clarification.context === 'year_clarification') {
          // User is responding to a year clarification request
          const contextMessage = `CONTEXT: The user previously asked "${clarification.originalQuery}" and you asked for year clarification. They responded with "${clarification.yearResponse}". 

INSTRUCTIONS:
1. Interpret their year response (e.g., "this year" = 2024, "current season" = 2024, "last year" = 2023)
2. Answer their original question using that interpreted year
3. If they said "this year" or "current season", use 2024
4. If they said "last year", use 2023
5. If they specified a specific year like "2023", use that year

Answer the original question: "${clarification.originalQuery}" for the year you determined from "${clarification.yearResponse}".`;

          messages.push(new HumanMessage(contextMessage));
        } else {
          // User query needs year clarification
          const contextMessage = `INSTRUCTION: The user asked about "${query}" but didn't specify a year. Ask them which year they're referring to. Current year is 2024. Be helpful and direct.`;
          messages.push(new HumanMessage(contextMessage));
        }
      }

      // Add F1 data context if available
      if (context.f1Data && Object.keys(context.f1Data).length > 0) {
        const dataContext = this.formatF1DataContext(context.f1Data);
        messages.push(new HumanMessage(`Context data: ${dataContext}`));
      }

      // Add the current user query
      messages.push(new HumanMessage(query));

      // Invoke the model
      const response = await this.model.invoke(messages);

      // Handle tool calls if the model requested them
      let finalResponse = response;
      let toolCallResults = [];

      if (response.tool_calls && response.tool_calls.length > 0) {
        console.log(
          `🔧 ${this.config.name} making ${response.tool_calls.length} tool call(s)`,
        );

        // Execute tool calls
        for (const toolCall of response.tool_calls) {
          try {
            // Find the tool by name
            const tool = this.tools.find((t) => t.name === toolCall.name);
            if (!tool) {
              console.warn(`⚠️ Tool ${toolCall.name} not found`);
              toolCallResults.push({
                toolName: toolCall.name,
                args: toolCall.args,
                error: `Tool ${toolCall.name} not found`,
              });
              continue;
            }

            console.log(
              `🔧 Calling tool: ${toolCall.name} with args:`,
              toolCall.args,
            );
            const toolResult = await tool.invoke(toolCall.args);
            toolCallResults.push({
              toolName: toolCall.name,
              args: toolCall.args,
              result: toolResult,
            });

            console.log(`✅ Tool ${toolCall.name} completed successfully`);
          } catch (toolError) {
            console.error(
              `❌ Tool ${toolCall.name} failed:`,
              toolError.message,
            );
            console.error(`Tool error stack:`, toolError.stack);
            toolCallResults.push({
              toolName: toolCall.name,
              args: toolCall.args,
              error: toolError.message,
            });
          }
        }

        // Create tool messages for each tool call result
        const toolMessages = [];
        for (let i = 0; i < response.tool_calls.length; i++) {
          const toolCall = response.tool_calls[i];
          const toolResult = toolCallResults[i];

          if (toolResult && !toolResult.error) {
            // Truncate large tool results to prevent context overflow
            let toolContent =
              typeof toolResult.result === 'string'
                ? toolResult.result
                : JSON.stringify(toolResult.result);

            // Limit tool result content to prevent context overflow
            if (toolContent.length > 2000) {
              toolContent =
                toolContent.substring(0, 2000) + '... [content truncated]';
              console.log(
                `📝 Truncated large tool result for ${toolCall.name}`,
              );
            }

            toolMessages.push(
              new ToolMessage({
                content: toolContent,
                tool_call_id: toolCall.id,
              }),
            );
          } else if (toolResult && toolResult.error) {
            toolMessages.push(
              new ToolMessage({
                content: `Error: ${toolResult.error}`,
                tool_call_id: toolCall.id,
              }),
            );
          }
        }

        // If we got tool results, make another call to the model with the results
        if (toolMessages.length > 0) {
          // Add explicit instruction for final response with formatting guidelines
          const finalInstruction = new HumanMessage(
            "Based on the tool results above, provide a comprehensive analysis and answer to the user's question. IMPORTANT FORMATTING REQUIREMENTS: Use clean, plain text formatting with NO markdown. NEVER use asterisks (**) for bold, NEVER use hashtags (###) for headers, NEVER use hyphens (-) for bullet points. Use simple colons (:) for labels and plain text formatting that is UI-friendly. Do not leave the response empty.",
          );

          const toolMessagesInput = [
            ...messages,
            response,
            ...toolMessages,
            finalInstruction,
          ];

          // Get final response from model with tool results
          finalResponse = await this.model.invoke(toolMessagesInput);
          console.log(
            `🔍 Final response content length: ${
              finalResponse.content?.length || 0
            }`,
          );
        }
      }

      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`✅ ${this.config.name} completed in ${processingTime}s`);

      // Ensure we have a response content
      const responseContent = finalResponse.content || finalResponse.text || '';

      // Clean up any remaining markdown formatting for UI compatibility
      let cleanedResponse = responseContent;
      if (cleanedResponse) {
        // Remove markdown bold formatting
        cleanedResponse = cleanedResponse.replace(/\*\*(.*?)\*\*/g, '$1');
        // Remove markdown headers
        cleanedResponse = cleanedResponse.replace(/#{1,6}\s*/g, '');
        // Clean up excessive asterisks
        cleanedResponse = cleanedResponse.replace(/\*{3,}/g, '');
        // Remove markdown emphasis
        cleanedResponse = cleanedResponse.replace(/\*(.*?)\*/g, '$1');
      }

      if (!cleanedResponse || cleanedResponse.trim().length === 0) {
        console.warn(
          `⚠️ ${this.config.name} returned empty response, generating from tool data`,
        );

        // Generate response from tool results if available
        let fallbackContent = '';

        if (toolCallResults.length > 0) {
          // Process tool results to create a meaningful response
          const driverData = [];

          toolCallResults.forEach((result, index) => {
            if (result.result && !result.error) {
              try {
                const data =
                  typeof result.result === 'string'
                    ? JSON.parse(result.result)
                    : result.result;

                // Extract driver information if available
                if (data.MRData?.DriverTable?.Drivers?.[0]) {
                  const driver = data.MRData.DriverTable.Drivers[0];
                  driverData.push({
                    name: `${driver.givenName} ${driver.familyName}`,
                    code: driver.code,
                    number: driver.permanentNumber,
                    nationality: driver.nationality,
                    dateOfBirth: driver.dateOfBirth,
                    url: driver.url,
                  });
                }
              } catch (e) {
                console.warn(`Error parsing tool result ${index}:`, e.message);
              }
            }
          });

          if (driverData.length > 0) {
            if (driverData.length === 2) {
              // Driver comparison - completely clean formatting without any markdown
              fallbackContent = `Driver Comparison:\n\n`;
              driverData.forEach((driver, index) => {
                fallbackContent += `${driver.name}:\n`;
                fallbackContent += `Nationality: ${driver.nationality}\n`;
                if (driver.dateOfBirth)
                  fallbackContent += `Date of Birth: ${driver.dateOfBirth}\n`;
                fallbackContent += `Driver Code: ${driver.code}\n`;
                if (driver.number)
                  fallbackContent += `Permanent Number: ${driver.number}\n`;
                fallbackContent += `\n`;
              });

              fallbackContent += `Both drivers are accomplished Formula 1 competitors with unique strengths and achievements in their careers.`;
            } else {
              // Single driver - completely clean formatting without any markdown
              const driver = driverData[0];
              fallbackContent = `${driver.name}\n\n`;
              fallbackContent += `Nationality: ${driver.nationality}\n`;
              if (driver.dateOfBirth)
                fallbackContent += `Date of Birth: ${driver.dateOfBirth}\n`;
              fallbackContent += `Driver Code: ${driver.code}\n`;
              if (driver.number)
                fallbackContent += `Permanent Number: ${driver.number}\n`;
            }
          } else {
            fallbackContent = `I retrieved F1 data using ${toolCallResults.length} data calls, but encountered formatting issues. Please try asking about specific drivers or rephrasing your question.`;
          }
        } else {
          fallbackContent = `I attempted to retrieve F1 data but no results were returned. Please try asking about specific drivers, races, or F1 topics.`;
        }

        return {
          success: true,
          response: fallbackContent,
          agentId: this.agentId,
          agentName: this.config.name,
          processingTime: `${processingTime}s`,
          confidence: 0.6, // Moderate confidence for fallback with data
          toolCallResults: toolCallResults,
          metadata: {
            timestamp: new Date().toISOString(),
            model: this.config.model,
            temperature: this.config.temperature,
            toolsUsed: toolCallResults.length,
            fallbackUsed: true,
          },
        };
      }

      return {
        success: true,
        response: cleanedResponse,
        agentId: this.agentId,
        agentName: this.config.name,
        processingTime: `${processingTime}s`,
        confidence: this.calculateConfidence(query, cleanedResponse),
        toolCallResults: toolCallResults, // Include tool call info
        metadata: {
          timestamp: new Date().toISOString(),
          model: this.config.model,
          temperature: this.config.temperature,
          toolsUsed: toolCallResults.length,
        },
      };
    } catch (error) {
      console.error(`❌ ${this.config.name} error:`, error.message);
      console.error(`Agent error stack:`, error.stack);

      return {
        success: false,
        error: error.message,
        agentId: this.agentId,
        agentName: this.config.name,
        response: this.getFallbackResponse(query, error),
        confidence: 0.1,
      };
    }
  }

  // Format F1 data for context
  formatF1DataContext(f1Data) {
    const contextParts = [];

    if (f1Data.drivers) {
      contextParts.push(`Drivers: ${f1Data.drivers.length} entries`);
    }

    if (f1Data.constructors) {
      contextParts.push(`Constructors: ${f1Data.constructors.length} entries`);
    }

    if (f1Data.races) {
      contextParts.push(`Races: ${f1Data.races.length} entries`);
    }

    if (f1Data.standings) {
      contextParts.push(`Standings data available`);
    }

    if (f1Data.results) {
      contextParts.push(`Race results data available`);
    }

    // Handle race analysis data
    if (f1Data.race && f1Data.analysis) {
      const race = f1Data.race;
      const analysis = f1Data.analysis;

      contextParts.push(`\n\nRACE DATA AVAILABLE:\n`);

      if (race.raceName) {
        contextParts.push(
          `Race: ${race.raceName} (${race.season} Round ${race.round})`,
        );
      }

      if (race.Circuit) {
        contextParts.push(`Circuit: ${race.Circuit.circuitName}`);
      }

      if (race.Results && race.Results.length > 0) {
        contextParts.push(`\nRACE RESULTS - TOP 10:`);
        race.Results.slice(0, 10).forEach((result) => {
          const driver = `${result.Driver?.givenName} ${result.Driver?.familyName}`;
          const team = result.Constructor?.name;
          const time = result.Time?.time || result.status;
          contextParts.push(
            `${result.position}. ${driver} (${team}) - ${time}`,
          );
        });
      }

      if (analysis.raceOutcome && analysis.raceOutcome.podium) {
        contextParts.push(`\nPODIUM:`);
        analysis.raceOutcome.podium.forEach((podium) => {
          contextParts.push(
            `${podium.position}. ${podium.driver} (${podium.constructor}) - ${podium.points} points`,
          );
        });
      }

      if (analysis.raceOutcome && analysis.raceOutcome.fastestLap) {
        contextParts.push(
          `\nFastest Lap: ${analysis.raceOutcome.fastestLap.driver} - ${analysis.raceOutcome.fastestLap.time}`,
        );
      }
    }

    return contextParts.join('\n') || 'No specific F1 data context';
  }

  // Calculate confidence based on query and response
  calculateConfidence(query, response) {
    let confidence = 0.7; // Base confidence

    // Check if query matches agent's keywords
    const queryLower = query.toLowerCase();
    const keywordMatches = this.config.keywords.filter((keyword) =>
      queryLower.includes(keyword.toLowerCase()),
    ).length;

    if (keywordMatches > 0) {
      confidence += Math.min(keywordMatches * 0.1, 0.2);
    }

    // Check response quality indicators
    if (response.length > 200) confidence += 0.05;
    if (response.includes('•') || response.includes('-')) confidence += 0.05;
    if (response.match(/\d{4}/)) confidence += 0.05; // Contains years
    if (response.match(/\d+\.\d+/)) confidence += 0.05; // Contains times/stats

    return Math.min(confidence, 0.95);
  }

  // Get fallback response for errors
  getFallbackResponse(query, error) {
    return `I apologize, but I encountered an issue processing your ${
      this.agentId
    } query: "${query}". 

As the ${this.config.name}, I specialize in:
${this.config.specialization.map((spec) => `• ${spec}`).join('\n')}

Please try rephrasing your question or ask about specific F1 topics within my expertise. 

Error details: ${error.message}`;
  }

  // Agent health check
  async healthCheck() {
    try {
      const testQuery = `What is your role as the ${this.config.name}?`;
      const result = await this.processQuery(testQuery);
      return {
        agentId: this.agentId,
        status: result.success ? 'healthy' : 'unhealthy',
        responseTime: result.processingTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (error) {
      return {
        agentId: this.agentId,
        status: 'unhealthy',
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  // Get agent info
  getAgentInfo() {
    return {
      id: this.agentId,
      name: this.config.name,
      description: this.config.description,
      specializations: this.config.specialization,
      keywords: this.config.keywords,
      model: this.config.model,
      temperature: this.config.temperature,
      tools: this.tools.length,
    };
  }
}

export default BaseF1Agent;

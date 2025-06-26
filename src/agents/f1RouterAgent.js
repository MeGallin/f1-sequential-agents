import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { modelConfig } from '../config/modelConfig.js';

/**
 * F1 Router Agent - Simplified following TFL pattern
 * Routes queries to appropriate F1 specialist agents
 */
class F1RouterAgent {
  constructor() {
    this.model = 'gpt-4o';
    this.temperature = 0;
    this.maxTokens = 50;
  }

  async processQuery(query, sharedLLM = null, context = {}) {
    console.log('[F1RouterAgent] Processing query:', query);
    
    const routeResult = await this.routeQuery(query, sharedLLM);

    return {
      selectedAgent: routeResult.agent.toLowerCase(),
      confidence: routeResult.confidence,
      reasoning: routeResult.reasoning,
      timestamp: new Date().toISOString(),
      message: routeResult.message || null
    };
  }

  async routeQuery(query, sharedLLM = null) {
    const llm = sharedLLM || modelConfig.getModelInstance({
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });
    
    const prompt = this.getRouterPrompt().replace('{{query}}', query);

    try {
      const response = await llm.invoke([
        new SystemMessage(prompt),
        new HumanMessage(query),
      ]);

      const routedAgent = response.content.trim().toUpperCase();
      
      // Handle content filtering responses
      if (routedAgent === 'OFF_TOPIC') {
        return {
          agent: 'OFF_TOPIC',
          confidence: 1.0,
          reasoning: 'Query rejected - not related to Formula 1',
          message: 'I\'m here to help with Formula 1 queries only. Please ask me about F1 races, drivers, constructors, championships, or circuit information!'
        };
      }
      
      if (routedAgent === 'INAPPROPRIATE') {
        return {
          agent: 'INAPPROPRIATE',
          confidence: 1.0,
          reasoning: 'Query rejected - inappropriate content detected',
          message: 'I\'m here to provide helpful Formula 1 information in a respectful manner. Please ask me about F1 races, drivers, or championship data!'
        };
      }
      
      const validAgents = [
        'RACE_RESULTS', 'CIRCUIT', 'DRIVER', 'CONSTRUCTOR', 
        'CHAMPIONSHIP', 'HISTORICAL'
      ];

      const finalAgent = validAgents.includes(routedAgent) ? routedAgent : 'RACE_RESULTS';

      return {
        agent: finalAgent,
        confidence: this.calculateConfidence(query, finalAgent),
        reasoning: `Query routed to ${finalAgent} based on content analysis`,
      };
    } catch (error) {
      console.error('[F1RouterAgent] Routing error:', error);
      return {
        agent: 'RACE_RESULTS',
        confidence: 0.5,
        reasoning: 'Fallback routing due to error',
      };
    }
  }

  getRouterPrompt() {
    return `
You are the **F1 Router Agent** for the Formula 1 Assistant.  
Your role is to analyze user queries and return the correct **F1 specialist agent identifier** or filter out irrelevant or inappropriate queries.

---

## 1. TOPIC & LANGUAGE FILTERING (MANDATORY FIRST STEP)

- **Accept**: Only queries *specifically* about Formula 1, F1 races, drivers, constructors, championships, circuits, or F1 history.
- **Reject**:
  - Any query about other sports (football, tennis, cricket, etc.)
  - General sports information not related to F1
  - All non-F1 topics (weather, restaurants, personal advice, etc.)
  - Inappropriate, rude, offensive, or abusive language.

### FILTER RESPONSES (DO NOT VARY):
- For any off-topic query: respond with **OFF_TOPIC**
- For any inappropriate query: respond with **INAPPROPRIATE**

**Examples:**
- "What's the weather like?" → OFF_TOPIC  
- "Best football teams?" → OFF_TOPIC  
- "You're an idiot." → INAPPROPRIATE  
- "How do I cook pasta?" → OFF_TOPIC  

---

## 2. VALID F1 QUERY ANALYSIS

If the query is valid (see above), route as follows:

### 2.1. AGENT IDENTIFICATION (BY PRIORITY):

#### **1. RACE RESULTS QUERIES:**
- Race results, finishing positions, podium finishers
- "Who won", "race results", "top finishers", "podium"
- Qualifying results, grid positions, fastest laps
- Examples: "Who won Monaco", "Race results from Silverstone"
→ **RACE_RESULTS**

#### **2. CIRCUIT/TRACK QUERIES:**
- Circuit characteristics, track information, lap records
- "Circuit", "track", "lap time", "sector times"
- Examples: "Tell me about Monaco circuit", "Silverstone track info"
→ **CIRCUIT**

#### **3. DRIVER QUERIES:**
- Driver performance, career stats, driver comparisons
- "Driver", specific driver names, "performance", "career"
- Examples: "Hamilton's career", "Verstappen vs Leclerc"
→ **DRIVER**

#### **4. CONSTRUCTOR/TEAM QUERIES:**
- Team performance, constructor championships, car development
- "Team", "constructor", "Mercedes", "Ferrari", "Red Bull"
- Examples: "Ferrari performance", "constructor standings"
→ **CONSTRUCTOR**

#### **5. CHAMPIONSHIP QUERIES:**
- Championship standings, points, title fights
- "Championship", "standings", "points", "title"
- Examples: "Driver championship", "who's leading"
→ **CHAMPIONSHIP**

#### **6. HISTORICAL QUERIES:**
- F1 history, past seasons, historical comparisons, records
- "History", "past", "all time", "record", "evolution"
- Examples: "F1 history", "Greatest drivers of all time"
→ **HISTORICAL**

#### **7. DEFAULT ROUTE:**
If query is about F1 but no specific category can be identified, default to: **RACE_RESULTS**

---

## 3. OUTPUT FORMAT

- Return ONLY one of the following (case-sensitive):  
  **RACE_RESULTS, CIRCUIT, DRIVER, CONSTRUCTOR, CHAMPIONSHIP, HISTORICAL, OFF_TOPIC, INAPPROPRIATE**
- **NO explanations, NO extra text, NO formatting.**  
- **Output must be a single valid value as above.**

---

User Query: {{query}}
`;
  }

  calculateConfidence(query, routedAgent) {
    const keywords = {
      RACE_RESULTS: [
        'race', 'result', 'winner', 'won', 'podium', 'finish', 'position',
        'qualifying', 'grid', 'fastest lap', 'race results', 'who won',
        'top finishers', 'monaco', 'silverstone', 'spa', 'monza'
      ],
      CIRCUIT: [
        'circuit', 'track', 'lap', 'sector', 'corner', 'straight',
        'circuit info', 'track length', 'lap record', 'track characteristics'
      ],
      DRIVER: [
        'driver', 'hamilton', 'verstappen', 'leclerc', 'russell', 'sainz',
        'performance', 'career', 'driver stats', 'comparison', 'vs'
      ],
      CONSTRUCTOR: [
        'constructor', 'team', 'mercedes', 'ferrari', 'red bull', 'mclaren',
        'alpine', 'aston martin', 'williams', 'haas', 'alphatauri', 'alfa romeo'
      ],
      CHAMPIONSHIP: [
        'championship', 'standings', 'points', 'title', 'leader', 'leading',
        'driver championship', 'constructor championship'
      ],
      HISTORICAL: [
        'history', 'historical', 'past', 'all time', 'greatest', 'record',
        'evolution', 'years', 'decades', 'era', 'legendary'
      ]
    };

    const queryLower = query.toLowerCase();
    
    // Check for explicit keyword matches
    const matchCount = keywords[routedAgent]?.filter(keyword => 
      queryLower.includes(keyword.toLowerCase())
    ).length || 0;

    if (matchCount >= 2) return 0.9;
    if (matchCount === 1) return 0.7;
    return 0.5;
  }
}

export { F1RouterAgent };
export default F1RouterAgent;
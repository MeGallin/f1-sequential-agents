import { BaseF1Agent } from './baseAgent.js';
import { standingsToolsLangGraph } from '../tools/langGraphTools.js';
import { promptLoader } from '../prompts/index.js';
import StandingsTools from '../tools/standingsTools.js';

export class ChampionshipAgent extends BaseF1Agent {
  constructor() {
    super('championship', standingsToolsLangGraph);
    this.standingsTools = new StandingsTools();
  }

  // Load system prompt from prompts folder
  async getSystemPrompt() {
    try {
      const customPrompt = await promptLoader.getSystemPrompt('championship');
      if (customPrompt) {
        return customPrompt;
      }
    } catch (error) {
      console.warn('Failed to load custom championship prompt, using fallback');
    }

    // Fallback prompt
    return `You are the F1 Championship Predictor Agent. 
    
You have access to F1 API tools that can fetch:
- Current driver and constructor championship standings
- Historical championship data and analysis
- Points systems and mathematical scenarios
- Season progression and prediction modeling

When users ask about championships without specifying context, use conversation history to understand their intent.

Provide analytical, mathematically-backed predictions based only on the API responses you receive.`;
  }

  // Championship-specific analysis methods
  async analyzeCurrentChampionship() {
    try {
      const [driverStandings, constructorStandings] = await Promise.all([
        this.standingsTools.getCurrentDriverStandings(),
        this.standingsTools.getCurrentConstructorStandings()
      ]);

      return {
        drivers: driverStandings,
        constructors: constructorStandings,
        analysis: this.generateChampionshipAnalysis(driverStandings, constructorStandings)
      };
    } catch (error) {
      console.error('Error analyzing current championship:', error);
      throw error;
    }
  }

  async analyzeSeasonChampionship(season) {
    try {
      const [driverStandings, constructorStandings, seasonSummary] = await Promise.all([
        this.standingsTools.getDriverStandings(season),
        this.standingsTools.getConstructorStandings(season),
        this.standingsTools.getSeasonSummary(season)
      ]);

      return {
        season,
        drivers: driverStandings,
        constructors: constructorStandings,
        summary: seasonSummary,
        analysis: this.generateSeasonChampionshipAnalysis(driverStandings, constructorStandings, seasonSummary)
      };
    } catch (error) {
      console.error(`Error analyzing ${season} championship:`, error);
      throw error;
    }
  }

  async predictChampionship(season = 'current') {
    try {
      const [driverStandings, constructorStandings] = await Promise.all([
        season === 'current' 
          ? this.standingsTools.getCurrentDriverStandings()
          : this.standingsTools.getDriverStandings(season),
        season === 'current' 
          ? this.standingsTools.getCurrentConstructorStandings()
          : this.standingsTools.getConstructorStandings(season)
      ]);

      return {
        season,
        predictions: this.generateChampionshipPredictions(driverStandings, constructorStandings),
        scenarios: this.generateChampionshipScenarios(driverStandings, constructorStandings),
        analysis: this.generatePredictionAnalysis(driverStandings, constructorStandings)
      };
    } catch (error) {
      console.error(`Error predicting ${season} championship:`, error);
      throw error;
    }
  }

  async compareChampionships(seasons) {
    try {
      const championshipData = await Promise.all(
        seasons.map(season => this.analyzeSeasonChampionship(season))
      );

      return {
        seasons,
        championships: championshipData,
        comparison: this.generateChampionshipComparison(championshipData)
      };
    } catch (error) {
      console.error('Error comparing championships:', error);
      throw error;
    }
  }

  async analyzeChampionshipProgression(season) {
    try {
      const progression = await this.standingsTools.getStandingsProgression(season);

      return {
        season,
        progression,
        analysis: this.generateProgressionAnalysis(progression)
      };
    } catch (error) {
      console.error(`Error analyzing championship progression for ${season}:`, error);
      throw error;
    }
  }

  // Enhanced query processing with championship-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract championship information from query
      const championshipInfo = this.extractChampionshipFromQuery(query);
      
      if (championshipInfo.season) {
        // Fetch specific season championship data
        const championshipData = await this.analyzeSeasonChampionship(championshipInfo.season);
        context.f1Data = { ...context.f1Data, ...championshipData };
      } else if (championshipInfo.isCurrent) {
        // Fetch current championship data
        const currentData = await this.analyzeCurrentChampionship();
        context.f1Data = { ...context.f1Data, ...currentData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Championship agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractChampionshipFromQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Extract season
    const seasonMatch = queryLower.match(/\b(19|20)\d{2}\b/);
    const season = seasonMatch ? seasonMatch[0] : null;
    
    // Check for current championship keywords
    const isCurrent = queryLower.includes('current') || queryLower.includes('this season') || queryLower.includes('now');
    
    // Check for prediction keywords
    const isPrediction = queryLower.includes('predict') || queryLower.includes('forecast') || queryLower.includes('who will win');
    
    return {
      season,
      isCurrent,
      isPrediction
    };
  }

  generateChampionshipAnalysis(driverStandings, constructorStandings) {
    if (!driverStandings || !constructorStandings) return 'Championship data not available';

    return {
      driverTitle: this.analyzeDriverTitle(driverStandings),
      constructorTitle: this.analyzeConstructorTitle(constructorStandings),
      battleIntensity: this.assessBattleIntensity(driverStandings, constructorStandings),
      keyFactors: this.identifyKeyFactors(driverStandings, constructorStandings)
    };
  }

  analyzeDriverTitle(standings) {
    if (!standings.DriverStandings || standings.DriverStandings.length === 0) {
      return 'Driver standings not available';
    }

    const leader = standings.DriverStandings[0];
    const secondPlace = standings.DriverStandings[1];
    
    const leaderInfo = {
      driver: `${leader.Driver?.givenName} ${leader.Driver?.familyName}`,
      constructor: leader.Constructors?.[0]?.name,
      points: parseInt(leader.points),
      wins: parseInt(leader.wins),
      position: parseInt(leader.position)
    };

    const gap = secondPlace ? parseInt(leader.points) - parseInt(secondPlace.points) : 0;
    
    return {
      leader: leaderInfo,
      gap: gap,
      challenger: secondPlace ? {
        driver: `${secondPlace.Driver?.givenName} ${secondPlace.Driver?.familyName}`,
        constructor: secondPlace.Constructors?.[0]?.name,
        points: parseInt(secondPlace.points),
        wins: parseInt(secondPlace.wins)
      } : null,
      status: this.assessChampionshipStatus(gap, standings.DriverStandings.length)
    };
  }

  analyzeConstructorTitle(standings) {
    if (!standings.ConstructorStandings || standings.ConstructorStandings.length === 0) {
      return 'Constructor standings not available';
    }

    const leader = standings.ConstructorStandings[0];
    const secondPlace = standings.ConstructorStandings[1];
    
    const leaderInfo = {
      constructor: leader.Constructor?.name,
      points: parseInt(leader.points),
      wins: parseInt(leader.wins),
      position: parseInt(leader.position)
    };

    const gap = secondPlace ? parseInt(leader.points) - parseInt(secondPlace.points) : 0;
    
    return {
      leader: leaderInfo,
      gap: gap,
      challenger: secondPlace ? {
        constructor: secondPlace.Constructor?.name,
        points: parseInt(secondPlace.points),
        wins: parseInt(secondPlace.wins)
      } : null,
      status: this.assessChampionshipStatus(gap, standings.ConstructorStandings.length)
    };
  }

  assessChampionshipStatus(gap, totalContenders) {
    if (gap >= 100) return 'Dominant lead';
    if (gap >= 50) return 'Commanding lead';
    if (gap >= 25) return 'Strong lead';
    if (gap >= 10) return 'Moderate lead';
    if (gap >= 5) return 'Slight lead';
    return 'Very tight';
  }

  assessBattleIntensity(driverStandings, constructorStandings) {
    const driverGap = this.getTopGap(driverStandings.DriverStandings);
    const constructorGap = this.getTopGap(constructorStandings.ConstructorStandings);
    
    const avgGap = (driverGap + constructorGap) / 2;
    
    if (avgGap <= 10) return 'Extremely intense';
    if (avgGap <= 25) return 'Very competitive';
    if (avgGap <= 50) return 'Competitive';
    return 'One-sided';
  }

  getTopGap(standings) {
    if (!standings || standings.length < 2) return 100;
    return parseInt(standings[0].points) - parseInt(standings[1].points);
  }

  identifyKeyFactors(driverStandings, constructorStandings) {
    return [
      'Reliability and consistency',
      'Circuit-specific performance',
      'Strategic execution',
      'Weather conditions impact',
      'Development race progression'
    ];
  }

  generateChampionshipPredictions(driverStandings, constructorStandings) {
    if (!driverStandings || !constructorStandings) return 'Insufficient data for predictions';

    return {
      driverFavorite: this.predictDriverChampion(driverStandings),
      constructorFavorite: this.predictConstructorChampion(constructorStandings),
      confidence: this.calculatePredictionConfidence(driverStandings, constructorStandings),
      keyAssumptions: this.getKeyAssumptions()
    };
  }

  predictDriverChampion(standings) {
    if (!standings.DriverStandings || standings.DriverStandings.length === 0) return null;

    const leader = standings.DriverStandings[0];
    const secondPlace = standings.DriverStandings[1];
    
    const gap = secondPlace ? parseInt(leader.points) - parseInt(secondPlace.points) : 0;
    const probability = this.calculateWinProbability(gap, 'driver');

    return {
      driver: `${leader.Driver?.givenName} ${leader.Driver?.familyName}`,
      constructor: leader.Constructors?.[0]?.name,
      probability: probability,
      reasoning: this.generatePredictionReasoning(gap, probability)
    };
  }

  predictConstructorChampion(standings) {
    if (!standings.ConstructorStandings || standings.ConstructorStandings.length === 0) return null;

    const leader = standings.ConstructorStandings[0];
    const secondPlace = standings.ConstructorStandings[1];
    
    const gap = secondPlace ? parseInt(leader.points) - parseInt(secondPlace.points) : 0;
    const probability = this.calculateWinProbability(gap, 'constructor');

    return {
      constructor: leader.Constructor?.name,
      probability: probability,
      reasoning: this.generatePredictionReasoning(gap, probability)
    };
  }

  calculateWinProbability(gap, type) {
    // Simplified probability calculation based on points gap
    if (gap >= 100) return 95;
    if (gap >= 75) return 85;
    if (gap >= 50) return 75;
    if (gap >= 25) return 65;
    if (gap >= 10) return 55;
    return 50;
  }

  generatePredictionReasoning(gap, probability) {
    if (probability >= 90) return 'Mathematically very likely based on current points advantage';
    if (probability >= 75) return 'Strong position but championship not yet secure';
    if (probability >= 60) return 'Favorable position but significant challenges remain';
    return 'Championship battle remains wide open';
  }

  calculatePredictionConfidence(driverStandings, constructorStandings) {
    const driverGap = this.getTopGap(driverStandings.DriverStandings);
    const constructorGap = this.getTopGap(constructorStandings.ConstructorStandings);
    
    const avgGap = (driverGap + constructorGap) / 2;
    
    if (avgGap >= 75) return 'High confidence';
    if (avgGap >= 40) return 'Medium confidence';
    return 'Low confidence - many variables';
  }

  getKeyAssumptions() {
    return [
      'Current performance levels maintained',
      'No major technical failures or accidents',
      'Consistent competitive balance',
      'Normal weather conditions',
      'No significant regulation changes'
    ];
  }

  generateChampionshipScenarios(driverStandings, constructorStandings) {
    return {
      bestCase: 'Best case scenario for championship leader',
      worstCase: 'Worst case scenario that could change championship',
      realistic: 'Most realistic championship outcome',
      wildcard: 'Unexpected scenarios that could impact the title'
    };
  }

  generateSeasonChampionshipAnalysis(driverStandings, constructorStandings, seasonSummary) {
    return {
      summary: 'Comprehensive season championship analysis',
      highlights: 'Key championship moments and turning points',
      statistics: 'Championship statistics and records from the season'
    };
  }

  generateChampionshipComparison(championshipData) {
    return {
      totalSeasons: championshipData.length,
      comparison: 'Detailed comparison of championship battles across seasons',
      patterns: 'Patterns and trends identified across different championship years'
    };
  }

  generateProgressionAnalysis(progression) {
    return {
      trends: 'Championship progression trends throughout the season',
      turningPoints: 'Key moments that changed championship momentum',
      consistency: 'Analysis of championship contender consistency'
    };
  }

  generatePredictionAnalysis(driverStandings, constructorStandings) {
    return {
      methodology: 'Prediction methodology and key factors considered',
      uncertainty: 'Sources of uncertainty in championship predictions',
      scenarios: 'Multiple scenarios and their probability assessments'
    };
  }
}

export default ChampionshipAgent;
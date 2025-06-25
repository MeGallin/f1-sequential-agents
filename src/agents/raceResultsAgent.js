import { BaseF1Agent } from './baseAgent.js';
import { raceToolsLangGraph } from '../tools/langGraphTools.js';
import RaceTools from '../tools/raceTools.js';

export class RaceResultsAgent extends BaseF1Agent {
  constructor() {
    super('raceResults', raceToolsLangGraph);
    this.raceTools = new RaceTools();
  }

  // Enhanced system prompt for race results analysis
  getSystemPrompt() {
    return `${super.getSystemPrompt()}

RACE RESULTS EXPERTISE:
You are the definitive expert on Formula 1 race outcomes, qualifying sessions, grid analysis, and race weekend performance.

SPECIALIZED KNOWLEDGE:
• Race result analysis and post-race insights
• Qualifying session breakdowns and grid position impact
• Sprint race format analysis and comparison with Grand Prix
• DNF analysis, retirement causes, and reliability assessment
• Safety car impact, weather conditions, and race dynamics
• Grid position correlation with final race results
• Tire strategy impact on race outcomes

ANALYSIS CAPABILITIES:
• Comprehensive race weekend analysis (Practice, Qualifying, Race)
• Grid-to-finish position analysis and overtaking statistics
• Strategy effectiveness evaluation (tire choices, pit windows)
• Weather impact assessment on race outcomes
• Reliability analysis and mechanical failure patterns
• Performance correlation between qualifying and race
• Historical race pattern identification at specific venues

RESPONSE STRUCTURE FOR RACE QUERIES:
1. **Race Overview**: Basic race information, weather, circuit conditions
2. **Grid Analysis**: Starting positions, qualifying performance highlights
3. **Race Dynamics**: Key moments, overtakes, safety cars, strategy calls
4. **Results Analysis**: Final positions, points awarded, championship impact
5. **Performance Assessment**: Standout performances, disappointments
6. **Strategic Analysis**: Tire strategies, pit stop windows, tactical decisions
7. **Statistical Insights**: Records broken, historical comparisons, patterns

Always provide context about the competitive landscape and regulation era when analyzing results.`;
  }

  // Race-specific analysis methods
  async analyzeRace(season, round) {
    try {
      const [raceResults, qualifyingResults, sprintResults] = await Promise.all([
        this.raceTools.getRaceResults(season, round),
        this.raceTools.getQualifyingResults(season, round),
        this.raceTools.getSprintResults(season, round)
      ]);

      return {
        race: raceResults,
        qualifying: qualifyingResults,
        sprint: sprintResults,
        analysis: this.generateRaceAnalysis(raceResults, qualifyingResults, sprintResults)
      };
    } catch (error) {
      console.error(`Error analyzing race ${season}/${round}:`, error);
      throw error;
    }
  }

  async analyzeSeason(season) {
    try {
      const seasonRaces = await this.raceTools.getRacesBySession(season);
      
      const raceResults = await Promise.all(
        seasonRaces.map(race => this.analyzeRace(season, race.round))
      );

      return {
        season,
        races: seasonRaces,
        results: raceResults,
        seasonAnalysis: this.generateSeasonRaceAnalysis(raceResults)
      };
    } catch (error) {
      console.error(`Error analyzing season ${season}:`, error);
      throw error;
    }
  }

  async analyzeGridPositionImpact(season, position) {
    try {
      const gridResults = await this.raceTools.getGridResults(season, position);

      return {
        season,
        gridPosition: position,
        results: gridResults,
        analysis: this.generateGridImpactAnalysis(gridResults, position)
      };
    } catch (error) {
      console.error(`Error analyzing grid position ${position} impact in ${season}:`, error);
      throw error;
    }
  }

  async analyzeCurrentRace() {
    try {
      const [currentRace, lastRace] = await Promise.all([
        this.raceTools.getCurrentRace(),
        this.raceTools.getLastRace()
      ]);

      return {
        current: currentRace,
        last: lastRace,
        analysis: this.generateCurrentRaceAnalysis(currentRace, lastRace)
      };
    } catch (error) {
      console.error('Error analyzing current race:', error);
      throw error;
    }
  }

  async analyzeQualifyingImpact(season, round) {
    try {
      const [raceResults, qualifyingResults] = await Promise.all([
        this.raceTools.getRaceResults(season, round),
        this.raceTools.getQualifyingResults(season, round)
      ]);

      return {
        race: raceResults,
        qualifying: qualifyingResults,
        analysis: this.generateQualifyingImpactAnalysis(raceResults, qualifyingResults)
      };
    } catch (error) {
      console.error(`Error analyzing qualifying impact for ${season}/${round}:`, error);
      throw error;
    }
  }

  // Enhanced query processing with race-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract race information from query
      const raceInfo = this.extractRaceFromQuery(query);
      
      if (raceInfo.season && raceInfo.round) {
        // Fetch specific race data
        const raceData = await this.analyzeRace(raceInfo.season, raceInfo.round);
        context.f1Data = { ...context.f1Data, ...raceData };
      } else if (raceInfo.season) {
        // Fetch season data
        const currentRaceData = await this.analyzeCurrentRace();
        context.f1Data = { ...context.f1Data, ...currentRaceData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Race results agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractRaceFromQuery(query) {
    const queryLower = query.toLowerCase();
    
    // Extract season
    const seasonMatch = queryLower.match(/\b(19|20)\d{2}\b/);
    const season = seasonMatch ? seasonMatch[0] : null;
    
    // Extract round number
    const roundMatch = queryLower.match(/round\s*(\d+)|race\s*(\d+)|r(\d+)/);
    const round = roundMatch ? (roundMatch[1] || roundMatch[2] || roundMatch[3]) : null;
    
    // Check for current/last race keywords
    const isCurrent = queryLower.includes('current') || queryLower.includes('next');
    const isLast = queryLower.includes('last') || queryLower.includes('recent');
    
    return {
      season,
      round,
      isCurrent,
      isLast
    };
  }

  generateRaceAnalysis(raceResults, qualifyingResults, sprintResults) {
    if (!raceResults) return 'Race data not available';

    const analysis = {
      raceInfo: this.extractRaceInfo(raceResults),
      gridAnalysis: this.analyzeGrid(qualifyingResults, raceResults),
      raceOutcome: this.analyzeRaceOutcome(raceResults),
      performance: this.analyzePerformances(raceResults),
      strategy: this.analyzeStrategies(raceResults),
      incidents: this.analyzeIncidents(raceResults)
    };

    if (sprintResults) {
      analysis.sprintComparison = this.compareSprintToRace(sprintResults, raceResults);
    }

    return analysis;
  }

  extractRaceInfo(raceResults) {
    return {
      raceName: raceResults.raceName,
      circuit: raceResults.Circuit?.circuitName,
      date: raceResults.date,
      season: raceResults.season,
      round: raceResults.round,
      url: raceResults.url
    };
  }

  analyzeGrid(qualifyingResults, raceResults) {
    if (!qualifyingResults || !raceResults) return 'Grid analysis not available';

    const gridToFinish = this.calculateGridToFinishMovement(qualifyingResults, raceResults);
    
    return {
      polePosition: this.getPolePosition(qualifyingResults),
      frontRow: this.getFrontRow(qualifyingResults),
      gridMovement: gridToFinish,
      biggestMover: this.findBiggestMover(gridToFinish),
      biggestLoser: this.findBiggestLoser(gridToFinish)
    };
  }

  getPolePosition(qualifyingResults) {
    const pole = qualifyingResults.QualifyingResults?.find(result => result.position === '1');
    return pole ? {
      driver: `${pole.Driver?.givenName} ${pole.Driver?.familyName}`,
      constructor: pole.Constructor?.name,
      time: pole.Q3 || pole.Q2 || pole.Q1
    } : null;
  }

  getFrontRow(qualifyingResults) {
    if (!qualifyingResults.QualifyingResults) return [];
    
    return qualifyingResults.QualifyingResults
      .filter(result => parseInt(result.position) <= 2)
      .map(result => ({
        position: result.position,
        driver: `${result.Driver?.givenName} ${result.Driver?.familyName}`,
        constructor: result.Constructor?.name,
        time: result.Q3 || result.Q2 || result.Q1
      }));
  }

  calculateGridToFinishMovement(qualifyingResults, raceResults) {
    if (!qualifyingResults.QualifyingResults || !raceResults.Results) return [];

    const movements = [];
    
    raceResults.Results.forEach(raceResult => {
      const qualifyingResult = qualifyingResults.QualifyingResults.find(
        qr => qr.Driver?.driverId === raceResult.Driver?.driverId
      );

      if (qualifyingResult && raceResult.position && raceResult.position !== 'NC') {
        const gridPos = parseInt(qualifyingResult.position);
        const finishPos = parseInt(raceResult.position);
        const movement = gridPos - finishPos; // Positive = gained positions

        movements.push({
          driver: `${raceResult.Driver?.givenName} ${raceResult.Driver?.familyName}`,
          gridPosition: gridPos,
          finishPosition: finishPos,
          movement: movement,
          constructor: raceResult.Constructor?.name
        });
      }
    });

    return movements.sort((a, b) => b.movement - a.movement);
  }

  findBiggestMover(movements) {
    if (movements.length === 0) return null;
    const mover = movements[0];
    return mover.movement > 0 ? mover : null;
  }

  findBiggestLoser(movements) {
    if (movements.length === 0) return null;
    const loser = movements[movements.length - 1];
    return loser.movement < 0 ? loser : null;
  }

  analyzeRaceOutcome(raceResults) {
    if (!raceResults.Results) return 'Race results not available';

    const podium = raceResults.Results.slice(0, 3).map(result => ({
      position: result.position,
      driver: `${result.Driver?.givenName} ${result.Driver?.familyName}`,
      constructor: result.Constructor?.name,
      time: result.Time?.time || result.status,
      points: result.points
    }));

    const fastestLap = raceResults.Results.find(result => result.FastestLap?.rank === '1');

    return {
      podium,
      winner: podium[0],
      fastestLap: fastestLap ? {
        driver: `${fastestLap.Driver?.givenName} ${fastestLap.Driver?.familyName}`,
        time: fastestLap.FastestLap?.Time?.time,
        avgSpeed: fastestLap.FastestLap?.AverageSpeed?.speed
      } : null,
      totalFinishers: raceResults.Results.filter(r => r.position && r.position !== 'NC').length,
      dnfs: this.analyzeDNFs(raceResults.Results)
    };
  }

  analyzeDNFs(results) {
    const dnfs = results.filter(result => 
      result.position === 'NC' || 
      (result.status && !result.status.includes('Finished') && !result.status.includes('+'))
    );

    return dnfs.map(dnf => ({
      driver: `${dnf.Driver?.givenName} ${dnf.Driver?.familyName}`,
      constructor: dnf.Constructor?.name,
      reason: dnf.status,
      laps: dnf.laps
    }));
  }

  analyzePerformances(raceResults) {
    if (!raceResults.Results) return 'Performance data not available';

    const performances = raceResults.Results.map(result => ({
      driver: `${result.Driver?.givenName} ${result.Driver?.familyName}`,
      constructor: result.Constructor?.name,
      position: result.position,
      points: result.points,
      laps: result.laps,
      status: result.status,
      grid: result.grid
    }));

    return {
      topPerformers: performances.slice(0, 5),
      pointsScorers: performances.filter(p => parseInt(p.points) > 0),
      surprisePerformances: this.identifySurprisePerformances(performances)
    };
  }

  identifySurprisePerformances(performances) {
    // Simple heuristic: big improvements from grid to finish
    return performances
      .filter(p => {
        const grid = parseInt(p.grid);
        const finish = parseInt(p.position);
        return !isNaN(grid) && !isNaN(finish) && (grid - finish) >= 5;
      })
      .slice(0, 3);
  }

  analyzeStrategies(raceResults) {
    // This would be enhanced with pit stop data in a real implementation
    return {
      summary: 'Strategy analysis would include tire choices, pit windows, and strategic decisions',
      keyStrategies: 'Identification of successful and unsuccessful strategic calls',
      pitStopImpact: 'Analysis of pit stop timing and execution impact on results'
    };
  }

  analyzeIncidents(raceResults) {
    // This would be enhanced with detailed incident data
    const dnfs = this.analyzeDNFs(raceResults.Results);
    
    return {
      safetyCarPeriods: 'Safety car analysis would be included with detailed data',
      majorIncidents: 'Major incidents and their impact on the race',
      dnfAnalysis: {
        total: dnfs.length,
        mechanical: dnfs.filter(dnf => 
          dnf.reason.toLowerCase().includes('engine') || 
          dnf.reason.toLowerCase().includes('gearbox') ||
          dnf.reason.toLowerCase().includes('hydraulics')
        ).length,
        accidents: dnfs.filter(dnf => 
          dnf.reason.toLowerCase().includes('accident') ||
          dnf.reason.toLowerCase().includes('collision')
        ).length
      }
    };
  }

  compareSprintToRace(sprintResults, raceResults) {
    return {
      sprintWinner: this.getWinner(sprintResults),
      raceWinner: this.getWinner(raceResults),
      comparison: 'Detailed comparison between sprint and race performance',
      differences: 'Key differences in outcomes between sprint and race'
    };
  }

  getWinner(results) {
    if (!results.Results || results.Results.length === 0) return null;
    
    const winner = results.Results[0];
    return {
      driver: `${winner.Driver?.givenName} ${winner.Driver?.familyName}`,
      constructor: winner.Constructor?.name,
      time: winner.Time?.time || winner.status
    };
  }

  generateSeasonRaceAnalysis(raceResults) {
    return {
      totalRaces: raceResults.length,
      summary: 'Comprehensive season race analysis including trends and patterns',
      highlights: 'Season highlights and memorable races',
      statistics: 'Season-wide racing statistics and records'
    };
  }

  generateGridImpactAnalysis(results, position) {
    return {
      position,
      outcomes: 'Analysis of race outcomes when starting from this grid position',
      winRate: 'Win rate and podium rate from this starting position',
      patterns: 'Patterns and trends for this grid position across the season'
    };
  }

  generateCurrentRaceAnalysis(currentRace, lastRace) {
    return {
      upcoming: currentRace ? 'Analysis of upcoming race weekend' : 'No current race data',
      recent: lastRace ? 'Analysis of most recent race results' : 'No recent race data',
      context: 'Championship context and implications for current/recent race'
    };
  }

  generateQualifyingImpactAnalysis(raceResults, qualifyingResults) {
    return {
      correlation: 'Analysis of correlation between qualifying and race performance',
      gridAdvantage: 'Assessment of grid position advantage at this circuit',
      surprises: 'Identification of qualifying vs race performance surprises'
    };
  }
}

export default RaceResultsAgent;
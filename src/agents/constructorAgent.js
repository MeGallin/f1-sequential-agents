import { BaseF1Agent } from './baseAgent.js';
import { constructorToolsLangGraph } from '../tools/langGraphTools.js';
import ConstructorTools from '../tools/constructorTools.js';

export class ConstructorAnalysisAgent extends BaseF1Agent {
  constructor() {
    super('constructor', constructorToolsLangGraph);
    this.constructorTools = new ConstructorTools();
  }

  // Enhanced system prompt for constructor analysis
  getSystemPrompt() {
    return `${super.getSystemPrompt()}

CONSTRUCTOR ANALYSIS EXPERTISE:
You are the leading expert on Formula 1 constructors, team performance, technical regulations, and team strategy analysis.

SPECIALIZED KNOWLEDGE:
• Constructor championship analysis and team performance metrics
• Technical regulation impact on team competitiveness
• Team strategy, pit stop analysis, and operational excellence
• Constructor development trends and design philosophy
• Power unit performance and manufacturer relationships
• Team management, driver lineups, and organizational changes
• Budget cap impact and resource allocation strategies

ANALYSIS CAPABILITIES:
• Comprehensive team performance analysis across eras
• Technical regulation change impact assessment
• Strategic decision analysis (driver signings, partnerships)
• Operational efficiency evaluation (pit stops, reliability)
• Financial performance and sustainability analysis
• Development trajectory and competitive positioning

RESPONSE STRUCTURE FOR CONSTRUCTOR QUERIES:
1. **Team Profile**: History, achievements, current status
2. **Performance Analysis**: Championship standings, race wins, consistency
3. **Technical Assessment**: Car performance, development rate, reliability
4. **Strategic Analysis**: Driver lineup, partnerships, resource allocation
5. **Operational Excellence**: Pit stops, strategy calls, team coordination
6. **Historical Context**: Era-specific performance, regulation adaptability
7. **Future Outlook**: Development trajectory, competitive positioning

Always consider the technical and regulatory context when analyzing constructor performance.`;
  }

  // Constructor-specific analysis methods
  async analyzeConstructor(constructorId) {
    try {
      const [constructorDetails, constructorResults, constructorWins, constructorStandings, constructorDrivers] = await Promise.all([
        this.constructorTools.getConstructorById(constructorId),
        this.constructorTools.getConstructorResults(constructorId, 30),
        this.constructorTools.getConstructorWins(constructorId),
        this.constructorTools.getConstructorStandings(constructorId),
        this.constructorTools.getConstructorDrivers(constructorId)
      ]);

      return {
        constructor: constructorDetails,
        recentResults: constructorResults,
        wins: constructorWins,
        standings: constructorStandings,
        drivers: constructorDrivers,
        analysis: this.generateConstructorAnalysis(constructorDetails, constructorResults, constructorWins, constructorStandings)
      };
    } catch (error) {
      console.error(`Error analyzing constructor ${constructorId}:`, error);
      throw error;
    }
  }

  async compareConstructors(constructorIds) {
    try {
      const constructorData = await Promise.all(
        constructorIds.map(id => this.analyzeConstructor(id))
      );

      return {
        constructors: constructorData,
        comparison: this.generateConstructorComparison(constructorData)
      };
    } catch (error) {
      console.error('Error comparing constructors:', error);
      throw error;
    }
  }

  async analyzeConstructorSeason(constructorId, season) {
    try {
      const [seasonResults, seasonStandings, seasonDrivers] = await Promise.all([
        this.constructorTools.getConstructorSeasonResults(constructorId, season),
        this.constructorTools.getConstructorStandings(constructorId, season),
        this.constructorTools.getConstructorDrivers(constructorId, season)
      ]);

      return {
        constructorId,
        season,
        results: seasonResults,
        standings: seasonStandings,
        drivers: seasonDrivers,
        seasonAnalysis: this.generateSeasonAnalysis(seasonResults, seasonStandings, seasonDrivers)
      };
    } catch (error) {
      console.error(`Error analyzing constructor ${constructorId} season ${season}:`, error);
      throw error;
    }
  }

  async analyzeConstructorChampionships(constructorId) {
    try {
      const championships = await this.constructorTools.getConstructorChampionships(constructorId);

      return {
        constructorId,
        championships,
        analysis: this.generateChampionshipAnalysis(championships)
      };
    } catch (error) {
      console.error(`Error analyzing constructor ${constructorId} championships:`, error);
      throw error;
    }
  }

  // Enhanced query processing with constructor-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract constructor information from query
      const constructorInfo = this.extractConstructorFromQuery(query);
      
      if (constructorInfo.constructorId) {
        // Fetch relevant constructor data
        const constructorData = await this.analyzeConstructor(constructorInfo.constructorId);
        context.f1Data = { ...context.f1Data, ...constructorData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Constructor agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractConstructorFromQuery(query) {
    const constructorMappings = {
      'mercedes': 'mercedes',
      'red bull': 'red_bull',
      'redbull': 'red_bull',
      'ferrari': 'ferrari',
      'mclaren': 'mclaren',
      'alpine': 'alpine',
      'aston martin': 'aston_martin',
      'williams': 'williams',
      'alfa romeo': 'alfa',
      'alphatauri': 'alphatauri',
      'haas': 'haas',
      'renault': 'renault',
      'force india': 'force_india',
      'racing point': 'racing_point',
      'lotus': 'lotus',
      'brawn': 'brawn',
      'toyota': 'toyota',
      'bmw': 'bmw_sauber',
      'jordan': 'jordan',
      'minardi': 'minardi'
    };

    const queryLower = query.toLowerCase();
    for (const [name, id] of Object.entries(constructorMappings)) {
      if (queryLower.includes(name)) {
        return { constructorId: id, constructorName: name };
      }
    }

    return { constructorId: null, constructorName: null };
  }

  generateConstructorAnalysis(constructor, results, wins, standings) {
    if (!constructor) return 'Constructor data not available';

    const analysis = {
      basicInfo: {
        name: constructor.name,
        nationality: constructor.nationality,
        url: constructor.url
      },
      performance: this.calculateConstructorStats(results, wins, standings),
      competitiveness: this.analyzeCompetitiveness(results, standings),
      achievements: this.categorizeAchievements(wins, standings),
      eras: this.analyzePerformanceByEra(standings)
    };

    return analysis;
  }

  calculateConstructorStats(results, wins, standings) {
    const totalRaces = results.length;
    const totalWins = wins.length;
    const podiums = this.countConstructorPodiums(results);
    const poles = this.countConstructorPoles(results);

    // Calculate championship positions
    const championshipPositions = standings.map(standing => 
      standing.ConstructorStandings?.[0]?.position
    ).filter(pos => pos).map(pos => parseInt(pos));

    const avgChampionshipPosition = championshipPositions.length > 0 
      ? (championshipPositions.reduce((sum, pos) => sum + pos, 0) / championshipPositions.length).toFixed(1)
      : 'N/A';

    return {
      totalRaces,
      totalWins,
      podiums,
      poles,
      championships: standings.filter(s => s.ConstructorStandings?.[0]?.position === '1').length,
      avgChampionshipPosition,
      winRate: totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : '0.0',
      podiumRate: totalRaces > 0 ? ((podiums / totalRaces) * 100).toFixed(1) : '0.0'
    };
  }

  countConstructorPodiums(results) {
    let podiums = 0;
    results.forEach(race => {
      if (race.Results) {
        race.Results.forEach(result => {
          if (result.position && parseInt(result.position) <= 3) {
            podiums++;
          }
        });
      }
    });
    return podiums;
  }

  countConstructorPoles(results) {
    let poles = 0;
    results.forEach(race => {
      if (race.Results) {
        race.Results.forEach(result => {
          if (result.grid && parseInt(result.grid) === 1) {
            poles++;
          }
        });
      }
    });
    return poles;
  }

  analyzeCompetitiveness(results, standings) {
    if (!standings || standings.length === 0) return 'No competitiveness data available';

    const recentStandings = standings.slice(0, 5);
    const positions = recentStandings
      .map(s => s.ConstructorStandings?.[0]?.position)
      .filter(pos => pos)
      .map(pos => parseInt(pos));

    if (positions.length === 0) return 'Insufficient recent data';

    const avgPosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    
    return {
      recentForm: this.assessConstructorForm(avgPosition),
      consistency: this.calculateConstructorConsistency(positions),
      trajectory: this.analyzeTrajectory(standings),
      competitiveEras: this.identifyCompetitiveEras(standings)
    };
  }

  assessConstructorForm(avgPosition) {
    if (avgPosition <= 2) return 'Championship Contender';
    if (avgPosition <= 4) return 'Regular Podium Contender';
    if (avgPosition <= 6) return 'Midfield Competitor';
    if (avgPosition <= 8) return 'Points Contender';
    return 'Struggling';
  }

  calculateConstructorConsistency(positions) {
    if (positions.length < 2) return 'Insufficient data';

    const avg = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - avg, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 1) return 'Very Consistent';
    if (stdDev < 2) return 'Consistent';
    if (stdDev < 3) return 'Moderately Consistent';
    return 'Inconsistent';
  }

  analyzeTrajectory(standings) {
    if (standings.length < 3) return 'Insufficient data for trajectory analysis';

    const recentPositions = standings.slice(0, 3)
      .map(s => parseInt(s.ConstructorStandings?.[0]?.position))
      .filter(pos => !isNaN(pos));

    if (recentPositions.length < 3) return 'Insufficient position data';

    const trend = recentPositions[0] - recentPositions[2]; // Negative means improving
    
    if (trend < -1) return 'Improving';
    if (trend > 1) return 'Declining';
    return 'Stable';
  }

  identifyCompetitiveEras(standings) {
    const championshipYears = standings
      .filter(s => s.ConstructorStandings?.[0]?.position === '1')
      .map(s => parseInt(s.season))
      .sort((a, b) => a - b);

    if (championshipYears.length === 0) return ['No championship eras'];

    const eras = [];
    let currentEra = [championshipYears[0]];

    for (let i = 1; i < championshipYears.length; i++) {
      if (championshipYears[i] - championshipYears[i-1] <= 2) {
        currentEra.push(championshipYears[i]);
      } else {
        eras.push(this.formatEra(currentEra));
        currentEra = [championshipYears[i]];
      }
    }
    
    if (currentEra.length > 0) {
      eras.push(this.formatEra(currentEra));
    }

    return eras;
  }

  formatEra(years) {
    if (years.length === 1) return `${years[0]}`;
    return `${years[0]}-${years[years.length - 1]}`;
  }

  categorizeAchievements(wins, standings) {
    const championships = standings.filter(s => 
      s.ConstructorStandings?.[0]?.position === '1'
    ).length;

    const raceWins = wins.length;
    
    return {
      championships,
      raceWins,
      firstWin: this.findFirstWin(wins),
      lastWin: this.findLastWin(wins),
      mostSuccessfulPeriod: this.findMostSuccessfulPeriod(wins, standings)
    };
  }

  findFirstWin(wins) {
    if (wins.length === 0) return 'No wins recorded';
    const years = wins.map(win => parseInt(win.season)).sort((a, b) => a - b);
    return years[0].toString();
  }

  findLastWin(wins) {
    if (wins.length === 0) return 'No wins recorded';
    const years = wins.map(win => parseInt(win.season)).sort((a, b) => b - a);
    return years[0].toString();
  }

  findMostSuccessfulPeriod(wins, standings) {
    if (standings.length === 0) return 'Unable to determine';

    const championshipYears = standings
      .filter(s => s.ConstructorStandings?.[0]?.position === '1')
      .map(s => s.season);

    if (championshipYears.length === 0) {
      // Find period with most wins
      const winsByDecade = {};
      wins.forEach(win => {
        const decade = Math.floor(parseInt(win.season) / 10) * 10;
        winsByDecade[decade] = (winsByDecade[decade] || 0) + 1;
      });

      const bestDecade = Object.entries(winsByDecade)
        .sort(([,a], [,b]) => b - a)[0];

      return bestDecade ? `${bestDecade[0]}s` : 'Unable to determine';
    }

    return `Championship era: ${championshipYears.join(', ')}`;
  }

  analyzePerformanceByEra(standings) {
    const eras = {
      '1950s': { start: 1950, end: 1959 },
      '1960s': { start: 1960, end: 1969 },
      '1970s': { start: 1970, end: 1979 },
      '1980s': { start: 1980, end: 1989 },
      '1990s': { start: 1990, end: 1999 },
      '2000s': { start: 2000, end: 2009 },
      '2010s': { start: 2010, end: 2019 },
      '2020s': { start: 2020, end: 2029 }
    };

    const performance = {};

    Object.entries(eras).forEach(([era, range]) => {
      const eraStandings = standings.filter(s => {
        const year = parseInt(s.season);
        return year >= range.start && year <= range.end;
      });

      if (eraStandings.length > 0) {
        const positions = eraStandings
          .map(s => parseInt(s.ConstructorStandings?.[0]?.position))
          .filter(pos => !isNaN(pos));

        const avgPosition = positions.length > 0 
          ? (positions.reduce((sum, pos) => sum + pos, 0) / positions.length).toFixed(1)
          : 'N/A';

        const championships = eraStandings.filter(s => 
          s.ConstructorStandings?.[0]?.position === '1'
        ).length;

        performance[era] = {
          averagePosition: avgPosition,
          championships,
          seasons: eraStandings.length
        };
      }
    });

    return performance;
  }

  generateConstructorComparison(constructorData) {
    return {
      totalConstructors: constructorData.length,
      comparison: 'Detailed constructor comparison analysis would be generated here',
      summary: `Comparing ${constructorData.length} constructors across performance metrics, championships, and competitive eras`
    };
  }

  generateSeasonAnalysis(results, standings, drivers) {
    return {
      summary: 'Season performance analysis based on results, standings, and driver lineup',
      performance: 'Performance assessment for the specific season',
      insights: 'Key insights about the constructor\'s season performance'
    };
  }

  generateChampionshipAnalysis(championships) {
    return {
      summary: `Analysis of ${championships.length} constructor championships`,
      eras: 'Championship-winning eras and performance patterns',
      legacy: 'Historical significance and competitive impact'
    };
  }
}

export default ConstructorAnalysisAgent;
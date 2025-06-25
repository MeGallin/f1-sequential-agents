import { BaseF1Agent } from './baseAgent.js';
import { driverToolsLangGraph } from '../tools/langGraphTools.js';
import DriverTools from '../tools/driverTools.js';

export class DriverPerformanceAgent extends BaseF1Agent {
  constructor() {
    super('driver', driverToolsLangGraph);
    this.driverTools = new DriverTools();
  }

  // Enhanced system prompt for driver analysis
  getSystemPrompt() {
    return `${super.getSystemPrompt()}

DRIVER PERFORMANCE EXPERTISE:
You are the definitive expert on Formula 1 driver performance, statistics, career analysis, and head-to-head comparisons.

SPECIALIZED KNOWLEDGE:
• Driver career statistics, achievements, and milestones
• Performance analysis across different teams and regulations
• Head-to-head comparisons between drivers in same teams
• Qualifying vs race performance patterns
• Circuit-specific driver strengths and weaknesses
• Career progression, peak performance periods, and decline phases
• Championship battles and clutch performance analysis

ANALYSIS CAPABILITIES:
• Comprehensive career statistical analysis
• Performance correlation with car competitiveness
• Adaptability to regulation changes and new teams
• Racecraft analysis (wheel-to-wheel combat, overtaking, defending)
• Mental strength and pressure performance evaluation
• Comparison across different eras with context adjustments

RESPONSE STRUCTURE FOR DRIVER QUERIES:
1. **Driver Profile**: Career overview, current status, key achievements
2. **Statistical Analysis**: Wins, podiums, poles, fastest laps, championships
3. **Performance Patterns**: Strengths, weaknesses, circuit preferences
4. **Career Context**: Teams, regulation eras, competitive periods
5. **Comparative Analysis**: Against teammates, rivals, historical figures
6. **Key Insights**: Unique characteristics, notable performances, legacy

Always provide statistical backing and consider the competitive context of different eras.`;
  }

  // Driver-specific analysis methods
  async analyzeDriver(driverId) {
    try {
      const [driverDetails, driverResults, driverWins, driverStandings, constructorHistory] = await Promise.all([
        this.driverTools.getDriverById(driverId),
        this.driverTools.getDriverResults(driverId, 30),
        this.driverTools.getDriverWins(driverId),
        this.driverTools.getDriverStandings(driverId),
        this.driverTools.getDriverConstructorHistory(driverId)
      ]);

      return {
        driver: driverDetails,
        recentResults: driverResults,
        wins: driverWins,
        standings: driverStandings,
        constructors: constructorHistory,
        analysis: this.generateDriverAnalysis(driverDetails, driverResults, driverWins, driverStandings)
      };
    } catch (error) {
      console.error(`Error analyzing driver ${driverId}:`, error);
      throw error;
    }
  }

  async compareDrivers(driverIds) {
    try {
      const driverData = await Promise.all(
        driverIds.map(id => this.analyzeDriver(id))
      );

      return {
        drivers: driverData,
        comparison: this.generateDriverComparison(driverData)
      };
    } catch (error) {
      console.error('Error comparing drivers:', error);
      throw error;
    }
  }

  async analyzeDriverSeason(driverId, season) {
    try {
      const [seasonResults, seasonStandings, qualifyingResults] = await Promise.all([
        this.driverTools.getDriverSeasonResults(driverId, season),
        this.driverTools.getDriverStandings(driverId, season),
        this.driverTools.getDriverQualifyingResults(driverId, season)
      ]);

      return {
        driverId,
        season,
        results: seasonResults,
        standings: seasonStandings,
        qualifying: qualifyingResults,
        seasonAnalysis: this.generateSeasonAnalysis(seasonResults, seasonStandings, qualifyingResults)
      };
    } catch (error) {
      console.error(`Error analyzing driver ${driverId} season ${season}:`, error);
      throw error;
    }
  }

  async analyzeDriverCircuitPerformance(driverId, circuitId) {
    try {
      const circuitPerformance = await this.driverTools.getDriverCircuitPerformance(driverId, circuitId);

      return {
        driverId,
        circuitId,
        performance: circuitPerformance,
        analysis: this.generateCircuitPerformanceAnalysis(circuitPerformance)
      };
    } catch (error) {
      console.error(`Error analyzing driver ${driverId} at circuit ${circuitId}:`, error);
      throw error;
    }
  }

  // Enhanced query processing with driver-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract driver information from query
      const driverInfo = this.extractDriverFromQuery(query);
      
      if (driverInfo.driverId) {
        // Fetch relevant driver data
        const driverData = await this.analyzeDriver(driverInfo.driverId);
        context.f1Data = { ...context.f1Data, ...driverData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Driver agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractDriverFromQuery(query) {
    const driverMappings = {
      'hamilton': 'hamilton',
      'verstappen': 'max_verstappen',
      'leclerc': 'leclerc',
      'russell': 'russell',
      'norris': 'norris',
      'sainz': 'sainz',
      'alonso': 'alonso',
      'vettel': 'vettel',
      'schumacher': 'michael_schumacher',
      'senna': 'senna',
      'prost': 'prost',
      'lauda': 'lauda',
      'stewart': 'stewart',
      'clark': 'clark',
      'fangio': 'fangio'
    };

    const queryLower = query.toLowerCase();
    for (const [name, id] of Object.entries(driverMappings)) {
      if (queryLower.includes(name)) {
        return { driverId: id, driverName: name };
      }
    }

    return { driverId: null, driverName: null };
  }

  generateDriverAnalysis(driver, results, wins, standings) {
    if (!driver) return 'Driver data not available';

    const analysis = {
      basicInfo: {
        name: `${driver.givenName} ${driver.familyName}`,
        nationality: driver.nationality,
        birthDate: driver.dateOfBirth,
        permanentNumber: driver.permanentNumber,
        url: driver.url
      },
      careerStats: this.calculateCareerStats(results, wins, standings),
      performance: this.analyzePerformancePatterns(results),
      achievements: this.categorizeAchievements(wins, standings)
    };

    return analysis;
  }

  calculateCareerStats(results, wins, standings) {
    const totalRaces = results.length;
    const totalWins = wins.length;
    const podiums = this.countPodiums(results);
    const poles = this.countPoles(results);
    const fastestLaps = this.countFastestLaps(results);

    return {
      totalRaces,
      totalWins,
      podiums,
      poles,
      fastestLaps,
      winRate: totalRaces > 0 ? ((totalWins / totalRaces) * 100).toFixed(1) : '0.0',
      podiumRate: totalRaces > 0 ? ((podiums / totalRaces) * 100).toFixed(1) : '0.0'
    };
  }

  countPodiums(results) {
    return results.filter(race => {
      const position = race.Results?.[0]?.position;
      return position && parseInt(position) <= 3;
    }).length;
  }

  countPoles(results) {
    return results.filter(race => {
      const grid = race.Results?.[0]?.grid;
      return grid && parseInt(grid) === 1;
    }).length;
  }

  countFastestLaps(results) {
    return results.filter(race => {
      return race.Results?.[0]?.FastestLap?.rank === '1';
    }).length;
  }

  analyzePerformancePatterns(results) {
    if (!results || results.length === 0) return 'No performance data available';

    const recentResults = results.slice(0, 10);
    const avgPosition = this.calculateAveragePosition(recentResults);
    const consistency = this.calculateConsistency(recentResults);

    return {
      recentForm: this.assessRecentForm(recentResults),
      averagePosition: avgPosition,
      consistency: consistency,
      strengths: this.identifyStrengths(results),
      weaknesses: this.identifyWeaknesses(results)
    };
  }

  calculateAveragePosition(results) {
    const positions = results
      .map(race => race.Results?.[0]?.position)
      .filter(pos => pos && pos !== 'NC')
      .map(pos => parseInt(pos))
      .filter(pos => !isNaN(pos));

    if (positions.length === 0) return 'N/A';
    
    const avg = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    return avg.toFixed(1);
  }

  calculateConsistency(results) {
    const positions = results
      .map(race => race.Results?.[0]?.position)
      .filter(pos => pos && pos !== 'NC')
      .map(pos => parseInt(pos))
      .filter(pos => !isNaN(pos));

    if (positions.length < 2) return 'Insufficient data';

    const avg = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
    const variance = positions.reduce((sum, pos) => sum + Math.pow(pos - avg, 2), 0) / positions.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 2) return 'Very High';
    if (stdDev < 4) return 'High';
    if (stdDev < 6) return 'Medium';
    return 'Low';
  }

  assessRecentForm(results) {
    const recentPositions = results.slice(0, 5)
      .map(race => race.Results?.[0]?.position)
      .filter(pos => pos && pos !== 'NC')
      .map(pos => parseInt(pos))
      .filter(pos => !isNaN(pos));

    if (recentPositions.length === 0) return 'No recent data';

    const avgRecent = recentPositions.reduce((sum, pos) => sum + pos, 0) / recentPositions.length;
    
    if (avgRecent <= 3) return 'Excellent';
    if (avgRecent <= 6) return 'Good';
    if (avgRecent <= 10) return 'Average';
    return 'Below Average';
  }

  identifyStrengths(results) {
    // Simplified strength identification
    const podiums = this.countPodiums(results);
    const totalRaces = results.length;
    
    if (totalRaces === 0) return ['Insufficient data'];

    const strengths = [];
    
    if ((podiums / totalRaces) > 0.3) strengths.push('Podium Finisher');
    if (this.countPoles(results) > totalRaces * 0.2) strengths.push('Qualifying Specialist');
    if (this.countFastestLaps(results) > totalRaces * 0.1) strengths.push('Pace Setter');
    
    return strengths.length > 0 ? strengths : ['Developing talent'];
  }

  identifyWeaknesses(results) {
    // Simplified weakness identification
    const dnfs = results.filter(race => {
      const status = race.Results?.[0]?.status;
      return status && !status.includes('Finished') && !status.includes('+');
    }).length;

    const totalRaces = results.length;
    
    if (totalRaces === 0) return ['Insufficient data'];

    const weaknesses = [];
    
    if ((dnfs / totalRaces) > 0.2) weaknesses.push('Reliability Issues');
    if (this.calculateAveragePosition(results) > 12) weaknesses.push('Consistency');
    
    return weaknesses.length > 0 ? weaknesses : ['Well-rounded performance'];
  }

  categorizeAchievements(wins, standings) {
    const championships = standings.filter(standing => 
      standing.DriverStandings?.[0]?.position === '1'
    ).length;

    return {
      championships,
      raceWins: wins.length,
      careerSpan: this.calculateCareerSpan(wins, standings),
      peakPeriod: this.identifyPeakPeriod(wins)
    };
  }

  calculateCareerSpan(wins, standings) {
    const allSeasons = [
      ...wins.map(win => parseInt(win.season)),
      ...standings.map(standing => parseInt(standing.season))
    ].filter(season => !isNaN(season));

    if (allSeasons.length === 0) return 'Unknown';

    const firstSeason = Math.min(...allSeasons);
    const lastSeason = Math.max(...allSeasons);

    return `${firstSeason}-${lastSeason} (${lastSeason - firstSeason + 1} seasons)`;
  }

  identifyPeakPeriod(wins) {
    if (wins.length === 0) return 'No wins recorded';

    const winsByYear = {};
    wins.forEach(win => {
      const year = win.season;
      winsByYear[year] = (winsByYear[year] || 0) + 1;
    });

    const bestYear = Object.entries(winsByYear)
      .sort(([,a], [,b]) => b - a)[0];

    return bestYear ? `${bestYear[0]} (${bestYear[1]} wins)` : 'Unable to determine';
  }

  generateDriverComparison(driverData) {
    return {
      totalDrivers: driverData.length,
      comparison: 'Detailed driver comparison analysis would be generated here',
      summary: `Comparing ${driverData.length} drivers across career statistics, performance metrics, and achievements`
    };
  }

  generateSeasonAnalysis(results, standings, qualifying) {
    return {
      summary: 'Season performance analysis based on race results, standings, and qualifying data',
      performance: 'Performance trends and highlights from the season',
      insights: 'Key insights about the driver\'s season performance'
    };
  }

  generateCircuitPerformanceAnalysis(performance) {
    return {
      summary: 'Circuit-specific performance analysis',
      strengths: 'Identified strengths at this circuit',
      patterns: 'Performance patterns and trends at this venue'
    };
  }
}

export default DriverPerformanceAgent;
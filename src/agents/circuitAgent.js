import { BaseF1Agent } from './baseAgent.js';
import { circuitToolsLangGraph } from '../tools/langGraphTools.js';
import CircuitTools from '../tools/circuitTools.js';

export class CircuitAnalysisAgent extends BaseF1Agent {
  constructor() {
    super('circuit', circuitToolsLangGraph);
    this.circuitTools = new CircuitTools();
  }

  // Enhanced system prompt for circuit analysis
  getSystemPrompt() {
    return `${super.getSystemPrompt()}

CIRCUIT ANALYSIS EXPERTISE:
You are the premier expert on Formula 1 circuits, track characteristics, and circuit-specific performance analysis.

SPECIALIZED KNOWLEDGE:
• Circuit layouts, configurations, and technical specifications
• Historical lap records, sector times, and track evolution
• Track-specific performance patterns and driver strengths
• Weather impact on different circuit types
• DRS zones, elevation changes, and surface characteristics
• Pit lane configurations and strategy implications
• Corner sequences, braking zones, and overtaking opportunities

ANALYSIS CAPABILITIES:
• Compare lap times across different eras and regulations
• Analyze track-specific car setup requirements
• Evaluate driver performance at specific circuits
• Assess the impact of track modifications over time
• Predict performance based on circuit characteristics

RESPONSE STRUCTURE FOR CIRCUIT QUERIES:
1. **Circuit Overview**: Basic specifications and key characteristics
2. **Technical Analysis**: Layout, corners, straights, elevation
3. **Performance Data**: Lap records, sector times, historical trends
4. **Racing Dynamics**: Overtaking opportunities, strategy considerations
5. **Key Insights**: Notable patterns, records, or unique features

Always reference specific data points, years, and provide comparative analysis when relevant.`;
  }

  // Circuit-specific analysis methods
  async analyzeCircuit(circuitId) {
    try {
      const [circuitDetails, circuitResults, lapRecords] = await Promise.all([
        this.circuitTools.getCircuitById(circuitId),
        this.circuitTools.getCircuitResults(circuitId, 10),
        this.circuitTools.getCircuitLapRecords(circuitId)
      ]);

      return {
        circuit: circuitDetails,
        recentResults: circuitResults,
        lapRecords: lapRecords,
        analysis: this.generateCircuitAnalysis(circuitDetails, circuitResults, lapRecords)
      };
    } catch (error) {
      console.error(`Error analyzing circuit ${circuitId}:`, error);
      throw error;
    }
  }

  async compareCircuits(circuitIds) {
    try {
      const circuitData = await Promise.all(
        circuitIds.map(id => this.analyzeCircuit(id))
      );

      return {
        circuits: circuitData,
        comparison: this.generateCircuitComparison(circuitData)
      };
    } catch (error) {
      console.error('Error comparing circuits:', error);
      throw error;
    }
  }

  async analyzeCircuitPerformance(circuitId, season) {
    try {
      const [seasonResults, qualifyingData] = await Promise.all([
        this.circuitTools.getCircuitResults(circuitId, 20),
        // Note: Would need qualifying data for complete analysis
        this.circuitTools.getCircuitWinners(circuitId, 10)
      ]);

      return {
        circuitId,
        season,
        results: seasonResults,
        winners: qualifyingData,
        performanceAnalysis: this.generatePerformanceAnalysis(seasonResults, qualifyingData)
      };
    } catch (error) {
      console.error(`Error analyzing circuit performance for ${circuitId}:`, error);
      throw error;
    }
  }

  // Enhanced query processing with circuit-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract circuit information from query
      const circuitInfo = this.extractCircuitFromQuery(query);
      
      if (circuitInfo.circuitId) {
        // Fetch relevant circuit data
        const circuitData = await this.analyzeCircuit(circuitInfo.circuitId);
        context.f1Data = { ...context.f1Data, ...circuitData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Circuit agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractCircuitFromQuery(query) {
    const circuitMappings = {
      'silverstone': 'silverstone',
      'monaco': 'monaco',
      'spa': 'spa',
      'monza': 'monza',
      'interlagos': 'interlagos',
      'suzuka': 'suzuka',
      'nurburgring': 'nurburgring',
      'albert_park': 'albert_park',
      'bahrain': 'bahrain',
      'shanghai': 'shanghai',
      'catalunya': 'catalunya',
      'hungaroring': 'hungaroring',
      'valencia': 'valencia',
      'hockenheim': 'hockenheim',
      'magny_cours': 'magny_cours'
    };

    const queryLower = query.toLowerCase();
    for (const [name, id] of Object.entries(circuitMappings)) {
      if (queryLower.includes(name)) {
        return { circuitId: id, circuitName: name };
      }
    }

    return { circuitId: null, circuitName: null };
  }

  generateCircuitAnalysis(circuit, results, lapRecords) {
    if (!circuit) return 'Circuit data not available';

    const analysis = {
      basicInfo: {
        name: circuit.circuitName,
        location: `${circuit.Location?.locality}, ${circuit.Location?.country}`,
        length: circuit.length || 'Not specified',
        url: circuit.url
      },
      characteristics: this.analyzeCircuitCharacteristics(circuit),
      performance: this.analyzePerformanceData(results, lapRecords),
      historicalContext: this.generateHistoricalContext(results)
    };

    return analysis;
  }

  analyzeCircuitCharacteristics(circuit) {
    // This would be enhanced with more detailed circuit data
    return {
      type: this.categorizeCircuit(circuit),
      difficulty: this.assessDifficulty(circuit),
      overtakingOpportunities: this.assessOvertaking(circuit)
    };
  }

  categorizeCircuit(circuit) {
    const name = circuit.circuitName?.toLowerCase() || '';
    
    if (name.includes('monaco')) return 'Street Circuit - High Precision';
    if (name.includes('monza')) return 'High Speed - Low Downforce';
    if (name.includes('hungary')) return 'Technical - High Downforce';
    if (name.includes('spa')) return 'High Speed - Mixed Conditions';
    
    return 'Mixed Characteristics';
  }

  assessDifficulty(circuit) {
    // Simple assessment - would be enhanced with real data
    const name = circuit.circuitName?.toLowerCase() || '';
    
    if (name.includes('monaco') || name.includes('singapore')) return 'Very High';
    if (name.includes('spa') || name.includes('suzuka')) return 'High';
    
    return 'Medium';
  }

  assessOvertaking(circuit) {
    const name = circuit.circuitName?.toLowerCase() || '';
    
    if (name.includes('monaco')) return 'Very Limited';
    if (name.includes('monza') || name.includes('bahrain')) return 'Good';
    
    return 'Moderate';
  }

  analyzePerformanceData(results, lapRecords) {
    if (!results || results.length === 0) return 'No performance data available';

    return {
      recentWinners: results.slice(0, 5).map(race => ({
        year: race.season,
        winner: race.Results?.[0]?.Driver?.familyName || 'Unknown',
        constructor: race.Results?.[0]?.Constructor?.name || 'Unknown'
      })),
      recordHolders: lapRecords.slice(0, 3).map(record => ({
        year: record.season,
        driver: record.Results?.[0]?.Driver?.familyName || 'Unknown',
        time: record.Results?.[0]?.FastestLap?.Time?.time || 'Unknown'
      }))
    };
  }

  generateHistoricalContext(results) {
    if (!results || results.length === 0) return 'No historical data available';

    const years = results.map(race => parseInt(race.season)).sort((a, b) => b - a);
    const firstRace = Math.min(...years);
    const lastRace = Math.max(...years);

    return {
      firstF1Race: firstRace,
      lastF1Race: lastRace,
      totalRaces: results.length,
      era: this.categorizeEra(firstRace, lastRace)
    };
  }

  categorizeEra(firstYear, lastYear) {
    if (firstYear < 1960) return 'Historic Era (1950s)';
    if (firstYear < 1980) return 'Classic Era (1960s-70s)';
    if (firstYear < 2000) return 'Modern Era (1980s-90s)';
    if (firstYear < 2010) return 'Digital Era (2000s)';
    return 'Hybrid Era (2010s+)';
  }

  generateCircuitComparison(circuitData) {
    return {
      totalCircuits: circuitData.length,
      comparison: 'Detailed circuit comparison analysis would be generated here',
      summary: `Comparing ${circuitData.length} circuits with their unique characteristics and performance data`
    };
  }

  generatePerformanceAnalysis(results, winners) {
    return {
      summary: 'Circuit performance analysis based on historical results and winner data',
      trends: 'Performance trends would be analyzed here',
      insights: 'Key insights about circuit-specific performance patterns'
    };
  }
}

export default CircuitAnalysisAgent;
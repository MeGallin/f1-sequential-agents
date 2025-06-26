import { BaseF1Agent } from './baseAgent.js';
import { standingsToolsLangGraph } from '../tools/langGraphTools.js';
import { promptLoader } from '../prompts/index.js';
import StandingsTools from '../tools/standingsTools.js';
import SeasonTools from '../tools/seasonTools.js';

export class HistoricalDataAgent extends BaseF1Agent {
  constructor() {
    super('historical', standingsToolsLangGraph);
    this.standingsTools = new StandingsTools();
    this.seasonTools = new SeasonTools();
  }

  // Load system prompt from prompts folder
  async getSystemPrompt() {
    try {
      const customPrompt = await promptLoader.getSystemPrompt('historical');
      if (customPrompt) {
        return customPrompt;
      }
    } catch (error) {
      console.warn('Failed to load custom historical prompt, using fallback');
    }

    // Fallback prompt
    return `You are the F1 Historical Comparison Agent with access to real F1 historical data tools.

TOOLS AVAILABLE:
- get_season_summary: Get complete season summary including standings and races
- compare_seasons: Compare multiple F1 seasons with standings and race data
- get_driver_standings: Get historical driver championship standings
- get_constructor_standings: Get historical constructor championship standings

INSTRUCTIONS:
1. ALWAYS use the available tools to fetch real F1 historical data
2. For current year queries ("this year", "2025"), use season="2025"
3. For single season analysis, use get_season_summary with the specific year
4. For comparing multiple seasons, use compare_seasons with array of years
5. For historical standings, use get_driver_standings or get_constructor_standings with specific years
6. For era analysis, use compare_seasons with multiple years from that period
7. NEVER give generic responses - always call tools first

YEAR INTERPRETATION:
- "this year" = 2025 (current year)
- "current season" = 2025
- "last year" = 2024
- Specific years like "2023" = use that exact year

HISTORICAL ANALYSIS EXPERTISE:
• Historical F1 data spanning 1950-2025
• Cross-era comparisons and trend analysis
• Multi-season statistical analysis
• Historical records and achievements
• Regulation change impact analysis
• Evolution of performance and technology

FORMATTING GUIDELINES:
- Use clean, structured responses with NO markdown formatting
- NEVER use asterisks (**) for bold text or emphasis
- NEVER use hashtags (###) for headers
- NEVER use hyphens (-) for bullet points
- Use plain text with simple colons (:) for labels
- Use simple headings like "1980s Era:" or "Modern F1:"
- Present historical data in simple lines without special characters
- Use proper spacing and line breaks for readability
- Format should be UI-friendly and clean for display

When users ask about F1 history, use the appropriate tools to fetch historical data and provide comprehensive, historically-informed analysis with clean formatting.`;
  }

  // Historical-specific analysis methods
  async analyzeEra(startYear, endYear) {
    try {
      const eraData = await this.seasonTools.getEraData(startYear, endYear);

      return {
        period: `${startYear}-${endYear}`,
        seasons: eraData,
        analysis: this.generateEraAnalysis(eraData, startYear, endYear),
      };
    } catch (error) {
      console.error(`Error analyzing era ${startYear}-${endYear}:`, error);
      throw error;
    }
  }

  async compareEras(eras) {
    try {
      const eraComparisons = await Promise.all(
        eras.map((era) => this.analyzeEra(era.start, era.end)),
      );

      return {
        eras: eraComparisons,
        comparison: this.generateEraComparison(eraComparisons),
      };
    } catch (error) {
      console.error('Error comparing eras:', error);
      throw error;
    }
  }

  async analyzeDecades(decades) {
    try {
      const decadeData = await this.seasonTools.getDecadeComparison(decades);

      return {
        decades: decadeData,
        analysis: this.generateDecadeAnalysis(decadeData),
      };
    } catch (error) {
      console.error('Error analyzing decades:', error);
      throw error;
    }
  }

  async analyzeRegulationChanges(regulationYears) {
    try {
      const regulationData = await Promise.all(
        regulationYears.map((year) =>
          this.seasonTools.getSeasonByRegulation(year),
        ),
      );

      return {
        regulations: regulationData,
        analysis: this.generateRegulationAnalysis(regulationData),
      };
    } catch (error) {
      console.error('Error analyzing regulation changes:', error);
      throw error;
    }
  }

  async trackEvolution(entity, entityId, startYear, endYear) {
    try {
      let evolutionData;

      switch (entity) {
        case 'driver':
          evolutionData = await this.trackDriverEvolution(
            entityId,
            startYear,
            endYear,
          );
          break;
        case 'constructor':
          evolutionData = await this.trackConstructorEvolution(
            entityId,
            startYear,
            endYear,
          );
          break;
        case 'circuit':
          evolutionData = await this.trackCircuitEvolution(
            entityId,
            startYear,
            endYear,
          );
          break;
        default:
          throw new Error(`Unknown entity type: ${entity}`);
      }

      return {
        entity,
        entityId,
        period: `${startYear}-${endYear}`,
        evolution: evolutionData,
        analysis: this.generateEvolutionAnalysis(evolutionData, entity),
      };
    } catch (error) {
      console.error(`Error tracking ${entity} evolution:`, error);
      throw error;
    }
  }

  async generateAllTimeRankings(category, criteria = 'championships') {
    try {
      let rankingData;

      switch (category) {
        case 'drivers':
          rankingData = await this.generateDriverRankings(criteria);
          break;
        case 'constructors':
          rankingData = await this.generateConstructorRankings(criteria);
          break;
        default:
          throw new Error(`Unknown ranking category: ${category}`);
      }

      return {
        category,
        criteria,
        rankings: rankingData,
        analysis: this.generateRankingAnalysis(rankingData, category, criteria),
      };
    } catch (error) {
      console.error(`Error generating ${category} rankings:`, error);
      throw error;
    }
  }

  // Enhanced query processing with historical-specific data fetching
  async processQuery(query, context = {}) {
    try {
      // Extract historical information from query
      const historicalInfo = this.extractHistoricalFromQuery(query);

      if (historicalInfo.era) {
        // Fetch era-specific data
        const eraData = await this.analyzeEra(
          historicalInfo.era.start,
          historicalInfo.era.end,
        );
        context.f1Data = { ...context.f1Data, ...eraData };
      } else if (historicalInfo.decades && historicalInfo.decades.length > 0) {
        // Fetch decade comparison data
        const decadeData = await this.analyzeDecades(historicalInfo.decades);
        context.f1Data = { ...context.f1Data, ...decadeData };
      }

      // Process with enhanced context
      return await super.processQuery(query, context);
    } catch (error) {
      console.error('Historical agent query processing error:', error);
      return await super.processQuery(query, context);
    }
  }

  // Helper methods
  extractHistoricalFromQuery(query) {
    const queryLower = query.toLowerCase();

    // Extract years and ranges
    const yearMatches = queryLower.match(/\b(19|20)\d{2}\b/g);
    const rangeMatch = queryLower.match(/(\d{4})\s*[-–—]\s*(\d{4})/);

    // Identify decades
    const decadeMatches = queryLower.match(/\b(\d{4})s\b/g);
    const decades = decadeMatches
      ? decadeMatches.map((d) => parseInt(d.replace('s', '')))
      : [];

    // Identify era keywords
    const eraKeywords = {
      'turbo era': { start: 1982, end: 1988 },
      'v8 era': { start: 2006, end: 2013 },
      'hybrid era': { start: 2014, end: new Date().getFullYear() },
      'ground effect': { start: 1977, end: 1982 },
      'early years': { start: 1950, end: 1960 },
      'modern era': { start: 1990, end: new Date().getFullYear() },
    };

    let era = null;
    for (const [keyword, period] of Object.entries(eraKeywords)) {
      if (queryLower.includes(keyword)) {
        era = period;
        break;
      }
    }

    // Range extraction
    if (rangeMatch) {
      era = { start: parseInt(rangeMatch[1]), end: parseInt(rangeMatch[2]) };
    }

    return {
      years: yearMatches ? yearMatches.map((y) => parseInt(y)) : [],
      era,
      decades,
      isHistorical:
        queryLower.includes('historical') ||
        queryLower.includes('all time') ||
        queryLower.includes('evolution'),
    };
  }

  generateEraAnalysis(eraData, startYear, endYear) {
    if (!eraData || eraData.length === 0) return 'Era data not available';

    const totalSeasons = eraData.length;
    const eraName = this.getEraName(startYear, endYear);

    return {
      eraInfo: {
        name: eraName,
        period: `${startYear}-${endYear}`,
        totalSeasons,
        characteristics: this.getEraCharacteristics(startYear, endYear),
      },
      dominantDrivers: this.identifyDominantDrivers(eraData),
      dominantConstructors: this.identifyDominantConstructors(eraData),
      competitiveBalance: this.assessCompetitiveBalance(eraData),
      technicalEvolution: this.assessTechnicalEvolution(startYear, endYear),
      keyMilestones: this.identifyKeyMilestones(eraData),
    };
  }

  getEraName(startYear, endYear) {
    if (startYear >= 2014) return 'Hybrid Era';
    if (startYear >= 2006) return 'V8 Era';
    if (startYear >= 1989) return 'Naturally Aspirated Era';
    if (startYear >= 1982) return 'Turbo Era';
    if (startYear >= 1972) return 'Safety Revolution Era';
    if (startYear >= 1966) return 'Power Era';
    if (startYear >= 1958) return 'Classic Era';
    if (startYear >= 1950) return 'Early Championship Era';
    return 'Custom Era';
  }

  getEraCharacteristics(startYear, endYear) {
    const characteristics = [];

    if (startYear >= 2014) {
      characteristics.push(
        'V6 turbo hybrid power units',
        'Energy recovery systems',
        'Advanced aerodynamics',
      );
    } else if (startYear >= 2006) {
      characteristics.push(
        'Standardized V8 engines',
        'KERS introduction',
        'Slick tires return',
      );
    } else if (startYear >= 1982) {
      characteristics.push(
        'Turbocharged engines',
        'Extreme power levels',
        'Ground effect aerodynamics',
      );
    }

    return characteristics;
  }

  identifyDominantDrivers(eraData) {
    const driverWins = {};
    const driverChampionships = {};

    eraData.forEach((season) => {
      if (season.driverStandings?.DriverStandings) {
        const champion = season.driverStandings.DriverStandings[0];
        if (champion) {
          const driverId = champion.Driver?.driverId;
          if (driverId) {
            driverChampionships[driverId] =
              (driverChampionships[driverId] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(driverChampionships)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([driverId, championships]) => ({ driverId, championships }));
  }

  identifyDominantConstructors(eraData) {
    const constructorChampionships = {};

    eraData.forEach((season) => {
      if (season.constructorStandings?.ConstructorStandings) {
        const champion = season.constructorStandings.ConstructorStandings[0];
        if (champion) {
          const constructorId = champion.Constructor?.constructorId;
          if (constructorId) {
            constructorChampionships[constructorId] =
              (constructorChampionships[constructorId] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(constructorChampionships)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([constructorId, championships]) => ({
        constructorId,
        championships,
      }));
  }

  assessCompetitiveBalance(eraData) {
    const uniqueWinners = new Set();
    const uniqueConstructorWinners = new Set();

    eraData.forEach((season) => {
      season.races?.forEach((race) => {
        if (race.Results?.[0]) {
          uniqueWinners.add(race.Results[0].Driver?.driverId);
          uniqueConstructorWinners.add(
            race.Results[0].Constructor?.constructorId,
          );
        }
      });
    });

    return {
      uniqueDriverWinners: uniqueWinners.size,
      uniqueConstructorWinners: uniqueConstructorWinners.size,
      competitiveLevel: this.categorizeCompetitiveLevel(
        uniqueWinners.size,
        uniqueConstructorWinners.size,
      ),
    };
  }

  categorizeCompetitiveLevel(driverWinners, constructorWinners) {
    const avgWinners = (driverWinners + constructorWinners) / 2;

    if (avgWinners >= 15) return 'Highly competitive';
    if (avgWinners >= 10) return 'Competitive';
    if (avgWinners >= 6) return 'Moderately competitive';
    return 'Dominated by few';
  }

  assessTechnicalEvolution(startYear, endYear) {
    const span = endYear - startYear;

    return {
      span: `${span} years`,
      majorChanges: this.identifyMajorTechnicalChanges(startYear, endYear),
      evolutionRate: span > 10 ? 'Significant evolution' : 'Limited evolution',
    };
  }

  identifyMajorTechnicalChanges(startYear, endYear) {
    const changes = [];

    if (startYear <= 2014 && endYear >= 2014)
      changes.push('Introduction of hybrid power units');
    if (startYear <= 2009 && endYear >= 2009)
      changes.push('Return of slick tires');
    if (startYear <= 1994 && endYear >= 1994)
      changes.push('Introduction of electronic driver aids');
    if (startYear <= 1982 && endYear >= 1982)
      changes.push('Turbo engine era begins');

    return changes;
  }

  identifyKeyMilestones(eraData) {
    return [
      'Major regulation changes',
      'First-time winners',
      'Significant records broken',
      'Technology introductions',
    ];
  }

  generateEraComparison(eraComparisons) {
    return {
      totalEras: eraComparisons.length,
      comparison: 'Detailed cross-era comparison analysis',
      evolution: 'Evolution patterns across different F1 eras',
    };
  }

  generateDecadeAnalysis(decadeData) {
    return {
      totalDecades: decadeData.length,
      trends: 'Long-term trends across decades of F1 racing',
      evolution: 'Decade-by-decade evolution of Formula 1',
    };
  }

  generateRegulationAnalysis(regulationData) {
    return {
      impact: 'Analysis of regulation change impact on competitive balance',
      adaptation: 'How teams and drivers adapted to major regulation changes',
      effectiveness:
        'Assessment of regulation effectiveness in achieving intended goals',
    };
  }

  async trackDriverEvolution(driverId, startYear, endYear) {
    // Implementation would track driver performance over time
    return {
      performance: 'Driver performance evolution over the specified period',
      milestones: 'Key career milestones and achievements',
      context: 'Competitive context and team changes',
    };
  }

  async trackConstructorEvolution(constructorId, startYear, endYear) {
    return {
      performance:
        'Constructor performance evolution over the specified period',
      technical: 'Technical development and innovation',
      competitive: 'Competitive position changes over time',
    };
  }

  async trackCircuitEvolution(circuitId, startYear, endYear) {
    return {
      modifications: 'Circuit modifications and layout changes',
      lapTimes: 'Lap time evolution and technology impact',
      safety: 'Safety improvements and incident patterns',
    };
  }

  generateEvolutionAnalysis(evolutionData, entity) {
    return {
      trends: `${entity} evolution trends and patterns`,
      insights: `Key insights about ${entity} development`,
      significance: `Historical significance of ${entity} evolution`,
    };
  }

  async generateDriverRankings(criteria) {
    return {
      methodology: `Driver rankings based on ${criteria}`,
      topDrivers: 'All-time top drivers with era-adjusted metrics',
      context: 'Historical context for ranking methodology',
    };
  }

  async generateConstructorRankings(criteria) {
    return {
      methodology: `Constructor rankings based on ${criteria}`,
      topConstructors: 'All-time top constructors with era-adjusted metrics',
      context: 'Historical context for ranking methodology',
    };
  }

  generateRankingAnalysis(rankingData, category, criteria) {
    return {
      methodology: `Ranking methodology for ${category} based on ${criteria}`,
      considerations: 'Era adjustments and contextual factors',
      limitations: 'Limitations and caveats of historical rankings',
    };
  }
}

export default HistoricalDataAgent;

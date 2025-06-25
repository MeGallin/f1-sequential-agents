import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import CircuitTools from './circuitTools.js';
import DriverTools from './driverTools.js';
import ConstructorTools from './constructorTools.js';
import RaceTools from './raceTools.js';
import StandingsTools from './standingsTools.js';

// Initialize tool instances
const circuitTools = new CircuitTools();
const driverTools = new DriverTools();
const constructorTools = new ConstructorTools();
const raceTools = new RaceTools();
const standingsTools = new StandingsTools();

// Circuit-related tools
export const getCircuitsTool = tool(
  async ({ season }) => {
    if (season) {
      return await circuitTools.getCircuitsBySession(season);
    }
    return await circuitTools.getAllCircuits();
  },
  {
    name: 'get_circuits',
    description: 'Get F1 circuits data. Optionally filter by season.',
    schema: z.object({
      season: z.string().optional().describe('Season year (e.g., "2024")')
    })
  }
);

export const getCircuitDetailsTool = tool(
  async ({ circuitId }) => {
    return await circuitTools.getCircuitById(circuitId);
  },
  {
    name: 'get_circuit_details',
    description: 'Get detailed information about a specific F1 circuit',
    schema: z.object({
      circuitId: z.string().describe('Circuit identifier (e.g., "silverstone")')
    })
  }
);

export const getCircuitResultsToolLangGraph = tool(
  async ({ circuitId, limit }) => {
    return await circuitTools.getCircuitResults(circuitId, limit);
  },
  {
    name: 'get_circuit_results',
    description: 'Get historical race results for a specific circuit',
    schema: z.object({
      circuitId: z.string().describe('Circuit identifier (e.g., "silverstone")'),
      limit: z.number().optional().default(30).describe('Maximum number of results to return')
    })
  }
);

// Driver-related tools
export const getDriversToolLangGraph = tool(
  async ({ season }) => {
    if (season) {
      return await driverTools.getDriversBySession(season);
    }
    return await driverTools.getAllDrivers();
  },
  {
    name: 'get_drivers',
    description: 'Get F1 drivers data. Optionally filter by season.',
    schema: z.object({
      season: z.string().optional().describe('Season year (e.g., "2024")')
    })
  }
);

export const getDriverDetailsToolLangGraph = tool(
  async ({ driverId }) => {
    return await driverTools.getDriverById(driverId);
  },
  {
    name: 'get_driver_details',
    description: 'Get detailed information about a specific F1 driver',
    schema: z.object({
      driverId: z.string().describe('Driver identifier (e.g., "hamilton")')
    })
  }
);

export const getDriverResultsToolLangGraph = tool(
  async ({ driverId, season, limit }) => {
    if (season) {
      return await driverTools.getDriverSeasonResults(driverId, season);
    }
    return await driverTools.getDriverResults(driverId, limit);
  },
  {
    name: 'get_driver_results',
    description: 'Get race results for a specific driver. Optionally filter by season.',
    schema: z.object({
      driverId: z.string().describe('Driver identifier (e.g., "hamilton")'),
      season: z.string().optional().describe('Season year (e.g., "2024")'),
      limit: z.number().optional().default(50).describe('Maximum number of results to return')
    })
  }
);

// Constructor-related tools
export const getConstructorsToolLangGraph = tool(
  async ({ season }) => {
    if (season) {
      return await constructorTools.getConstructorsBySession(season);
    }
    return await constructorTools.getAllConstructors();
  },
  {
    name: 'get_constructors',
    description: 'Get F1 constructors/teams data. Optionally filter by season.',
    schema: z.object({
      season: z.string().optional().describe('Season year (e.g., "2024")')
    })
  }
);

export const getConstructorDetailsToolLangGraph = tool(
  async ({ constructorId }) => {
    return await constructorTools.getConstructorById(constructorId);
  },
  {
    name: 'get_constructor_details',
    description: 'Get detailed information about a specific F1 constructor/team',
    schema: z.object({
      constructorId: z.string().describe('Constructor identifier (e.g., "mercedes")')
    })
  }
);

export const getConstructorResultsToolLangGraph = tool(
  async ({ constructorId, season, limit }) => {
    if (season) {
      return await constructorTools.getConstructorSeasonResults(constructorId, season);
    }
    return await constructorTools.getConstructorResults(constructorId, limit);
  },
  {
    name: 'get_constructor_results',
    description: 'Get race results for a specific constructor/team. Optionally filter by season.',
    schema: z.object({
      constructorId: z.string().describe('Constructor identifier (e.g., "mercedes")'),
      season: z.string().optional().describe('Season year (e.g., "2024")'),
      limit: z.number().optional().default(50).describe('Maximum number of results to return')
    })
  }
);

// Race-related tools
export const getRacesToolLangGraph = tool(
  async ({ season }) => {
    if (season) {
      return await raceTools.getRacesBySession(season);
    }
    return await raceTools.getAllRaces();
  },
  {
    name: 'get_races',
    description: 'Get F1 races data. Optionally filter by season.',
    schema: z.object({
      season: z.string().optional().describe('Season year (e.g., "2024")')
    })
  }
);

export const getRaceResultsToolLangGraph = tool(
  async ({ season, round }) => {
    return await raceTools.getRaceResults(season, round);
  },
  {
    name: 'get_race_results',
    description: 'Get results for a specific race by season and round number',
    schema: z.object({
      season: z.string().describe('Season year (e.g., "2024")'),
      round: z.string().describe('Round number (e.g., "1", "2", etc.)')
    })
  }
);

export const getQualifyingResultsToolLangGraph = tool(
  async ({ season, round }) => {
    return await raceTools.getQualifyingResults(season, round);
  },
  {
    name: 'get_qualifying_results',
    description: 'Get qualifying results for a specific race by season and round number',
    schema: z.object({
      season: z.string().describe('Season year (e.g., "2024")'),
      round: z.string().describe('Round number (e.g., "1", "2", etc.)')
    })
  }
);

// Standings-related tools
export const getDriverStandingsToolLangGraph = tool(
  async ({ season, round }) => {
    if (season === 'current') {
      return await standingsTools.getCurrentDriverStandings();
    }
    return await standingsTools.getDriverStandings(season, round);
  },
  {
    name: 'get_driver_standings',
    description: 'Get driver championship standings for a season. Use "current" for current season.',
    schema: z.object({
      season: z.string().describe('Season year (e.g., "2024") or "current"'),
      round: z.string().optional().describe('Round number for standings after specific race')
    })
  }
);

export const getConstructorStandingsToolLangGraph = tool(
  async ({ season, round }) => {
    if (season === 'current') {
      return await standingsTools.getCurrentConstructorStandings();
    }
    return await standingsTools.getConstructorStandings(season, round);
  },
  {
    name: 'get_constructor_standings',
    description: 'Get constructor championship standings for a season. Use "current" for current season.',
    schema: z.object({
      season: z.string().describe('Season year (e.g., "2024") or "current"'),
      round: z.string().optional().describe('Round number for standings after specific race')
    })
  }
);

// Current race info tools
export const getCurrentRaceToolLangGraph = tool(
  async () => {
    return await raceTools.getCurrentRace();
  },
  {
    name: 'get_current_race',
    description: 'Get information about the current/next F1 race',
    schema: z.object({})
  }
);

export const getLastRaceToolLangGraph = tool(
  async () => {
    return await raceTools.getLastRace();
  },
  {
    name: 'get_last_race',
    description: 'Get results from the most recent F1 race',
    schema: z.object({})
  }
);

// Historical data tools
export const getSeasonSummaryToolLangGraph = tool(
  async ({ season }) => {
    return await standingsTools.getSeasonSummary(season);
  },
  {
    name: 'get_season_summary',
    description: 'Get complete season summary including standings and races',
    schema: z.object({
      season: z.string().describe('Season year (e.g., "2024")')
    })
  }
);

export const compareSeasonsToolLangGraph = tool(
  async ({ seasons }) => {
    return await standingsTools.compareSeasons(seasons);
  },
  {
    name: 'compare_seasons',
    description: 'Compare multiple F1 seasons with standings and race data',
    schema: z.object({
      seasons: z.array(z.string()).describe('Array of season years to compare (e.g., ["2023", "2024"])')
    })
  }
);

// Export all tools as an array for easy use
export const allF1Tools = [
  getCircuitsToolLangGraph,
  getCircuitDetailsToolLangGraph,
  getCircuitResultsToolLangGraph,
  getDriversToolLangGraph,
  getDriverDetailsToolLangGraph,
  getDriverResultsToolLangGraph,
  getConstructorsToolLangGraph,
  getConstructorDetailsToolLangGraph,
  getConstructorResultsToolLangGraph,
  getRacesToolLangGraph,
  getRaceResultsToolLangGraph,
  getQualifyingResultsToolLangGraph,
  getDriverStandingsToolLangGraph,
  getConstructorStandingsToolLangGraph,
  getCurrentRaceToolLangGraph,
  getLastRaceToolLangGraph,
  getSeasonSummaryToolLangGraph,
  compareSeasonsToolLangGraph
];

// Export tools by category for agent-specific use
export const circuitToolsLangGraph = [
  getCircuitsToolLangGraph,
  getCircuitDetailsToolLangGraph,
  getCircuitResultsToolLangGraph
];

export const driverToolsLangGraph = [
  getDriversToolLangGraph,
  getDriverDetailsToolLangGraph,
  getDriverResultsToolLangGraph,
  getDriverStandingsToolLangGraph
];

export const constructorToolsLangGraph = [
  getConstructorsToolLangGraph,
  getConstructorDetailsToolLangGraph,
  getConstructorResultsToolLangGraph,
  getConstructorStandingsToolLangGraph
];

export const raceToolsLangGraph = [
  getRacesToolLangGraph,
  getRaceResultsToolLangGraph,
  getQualifyingResultsToolLangGraph,
  getCurrentRaceToolLangGraph,
  getLastRaceToolLangGraph
];

export const standingsToolsLangGraph = [
  getDriverStandingsToolLangGraph,
  getConstructorStandingsToolLangGraph,
  getSeasonSummaryToolLangGraph,
  compareSeasonsToolLangGraph
];
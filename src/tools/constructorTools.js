import F1ApiClient from './f1ApiClient.js';

class ConstructorTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getAllConstructors() {
    try {
      const response = await this.f1Client.fetchWithCache('/constructors');
      return this.f1Client.extractData(response, 'ConstructorTable')?.Constructors || [];
    } catch (error) {
      console.error('Error fetching all constructors:', error);
      return [];
    }
  }

  async getConstructorById(constructorId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}`);
      const constructors = this.f1Client.extractData(response, 'ConstructorTable')?.Constructors || [];
      return constructors[0] || null;
    } catch (error) {
      console.error(`Error fetching constructor ${constructorId}:`, error);
      return null;
    }
  }

  async getConstructorsBySession(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/constructors`);
      return this.f1Client.extractData(response, 'ConstructorTable')?.Constructors || [];
    } catch (error) {
      console.error(`Error fetching constructors for season ${season}:`, error);
      return [];
    }
  }

  async getConstructorResults(constructorId, limit = 50) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching results for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorSeasonResults(constructorId, season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/constructors/${constructorId}/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching season results for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorWins(constructorId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/results/1`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching wins for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorStandings(constructorId, season = null) {
    try {
      const endpoint = season 
        ? `/${season}/constructors/${constructorId}/constructorStandings`
        : `/constructors/${constructorId}/constructorStandings`;
      
      const response = await this.f1Client.fetchWithCache(endpoint);
      return this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
    } catch (error) {
      console.error(`Error fetching standings for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorDrivers(constructorId, season = null) {
    try {
      const endpoint = season 
        ? `/${season}/constructors/${constructorId}/drivers`
        : `/constructors/${constructorId}/drivers`;
      
      const response = await this.f1Client.fetchWithCache(endpoint);
      return this.f1Client.extractData(response, 'DriverTable')?.Drivers || [];
    } catch (error) {
      console.error(`Error fetching drivers for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorCircuitPerformance(constructorId, circuitId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/circuits/${circuitId}/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching circuit performance for constructor ${constructorId} at ${circuitId}:`, error);
      return [];
    }
  }

  async getConstructorChampionships(constructorId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/constructorStandings/1`);
      return this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
    } catch (error) {
      console.error(`Error fetching championships for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorSeasons(constructorId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/seasons`);
      return this.f1Client.extractData(response, 'SeasonTable')?.Seasons || [];
    } catch (error) {
      console.error(`Error fetching seasons for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorPodiums(constructorId) {
    try {
      // Get all positions 1, 2, 3
      const [wins, seconds, thirds] = await Promise.all([
        this.f1Client.fetchWithCache(`/constructors/${constructorId}/results/1`),
        this.f1Client.fetchWithCache(`/constructors/${constructorId}/results/2`),
        this.f1Client.fetchWithCache(`/constructors/${constructorId}/results/3`)
      ]);

      const allPodiums = [
        ...(this.f1Client.extractData(wins, 'RaceTable')?.Races || []),
        ...(this.f1Client.extractData(seconds, 'RaceTable')?.Races || []),
        ...(this.f1Client.extractData(thirds, 'RaceTable')?.Races || [])
      ];

      // Sort by season and round
      return allPodiums.sort((a, b) => {
        if (a.season !== b.season) return parseInt(a.season) - parseInt(b.season);
        return parseInt(a.round) - parseInt(b.round);
      });
    } catch (error) {
      console.error(`Error fetching podiums for constructor ${constructorId}:`, error);
      return [];
    }
  }

  async getConstructorFastestLaps(constructorId, limit = 20) {
    try {
      const response = await this.f1Client.fetchWithCache(`/constructors/${constructorId}/fastest/1/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching fastest laps for constructor ${constructorId}:`, error);
      return [];
    }
  }
}

export default ConstructorTools;
import F1ApiClient from './f1ApiClient.js';

class DriverTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getAllDrivers() {
    try {
      const response = await this.f1Client.fetchWithCache('/drivers');
      return this.f1Client.extractData(response, 'DriverTable')?.Drivers || [];
    } catch (error) {
      console.error('Error fetching all drivers:', error);
      return [];
    }
  }

  async getDriverById(driverId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}`);
      const drivers = this.f1Client.extractData(response, 'DriverTable')?.Drivers || [];
      return drivers[0] || null;
    } catch (error) {
      console.error(`Error fetching driver ${driverId}:`, error);
      return null;
    }
  }

  async getDriversBySession(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/drivers`);
      return this.f1Client.extractData(response, 'DriverTable')?.Drivers || [];
    } catch (error) {
      console.error(`Error fetching drivers for season ${season}:`, error);
      return [];
    }
  }

  async getDriverResults(driverId, limit = 50) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching results for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverSeasonResults(driverId, season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/drivers/${driverId}/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching season results for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverWins(driverId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}/results/1`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching wins for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverPodiums(driverId) {
    try {
      // Get all positions 1, 2, 3
      const [wins, seconds, thirds] = await Promise.all([
        this.f1Client.fetchWithCache(`/drivers/${driverId}/results/1`),
        this.f1Client.fetchWithCache(`/drivers/${driverId}/results/2`),
        this.f1Client.fetchWithCache(`/drivers/${driverId}/results/3`)
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
      console.error(`Error fetching podiums for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverStandings(driverId, season = null) {
    try {
      const endpoint = season 
        ? `/${season}/drivers/${driverId}/driverStandings`
        : `/drivers/${driverId}/driverStandings`;
      
      const response = await this.f1Client.fetchWithCache(endpoint);
      return this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
    } catch (error) {
      console.error(`Error fetching standings for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverCircuitPerformance(driverId, circuitId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}/circuits/${circuitId}/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching circuit performance for driver ${driverId} at ${circuitId}:`, error);
      return [];
    }
  }

  async getDriverConstructorHistory(driverId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}/constructors`);
      return this.f1Client.extractData(response, 'ConstructorTable')?.Constructors || [];
    } catch (error) {
      console.error(`Error fetching constructor history for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverQualifyingResults(driverId, season = null, limit = 30) {
    try {
      const endpoint = season 
        ? `/${season}/drivers/${driverId}/qualifying`
        : `/drivers/${driverId}/qualifying`;
      
      const response = await this.f1Client.fetchWithCache(endpoint, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching qualifying results for driver ${driverId}:`, error);
      return [];
    }
  }

  async getDriverFastestLaps(driverId, limit = 20) {
    try {
      const response = await this.f1Client.fetchWithCache(`/drivers/${driverId}/fastest/1/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching fastest laps for driver ${driverId}:`, error);
      return [];
    }
  }
}

export default DriverTools;
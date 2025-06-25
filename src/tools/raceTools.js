import F1ApiClient from './f1ApiClient.js';

class RaceTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getAllRaces() {
    try {
      const response = await this.f1Client.fetchWithCache('/races');
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error('Error fetching all races:', error);
      return [];
    }
  }

  async getRacesBySession(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/races`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching races for season ${season}:`, error);
      return [];
    }
  }

  async getRaceResults(season, round) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/results`);
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error(`Error fetching race results for ${season}/${round}:`, error);
      return null;
    }
  }

  async getQualifyingResults(season, round) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/qualifying`);
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error(`Error fetching qualifying results for ${season}/${round}:`, error);
      return null;
    }
  }

  async getSprintResults(season, round) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/sprint`);
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error(`Error fetching sprint results for ${season}/${round}:`, error);
      return null;
    }
  }

  async getAllSprintResults() {
    try {
      const response = await this.f1Client.fetchWithCache('/sprint');
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error('Error fetching all sprint results:', error);
      return [];
    }
  }

  async getLapTimes(season, round, lap = null) {
    try {
      const endpoint = lap ? `/${season}/${round}/laps/${lap}` : `/${season}/${round}/laps`;
      const response = await this.f1Client.fetchWithCache(endpoint);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching lap times for ${season}/${round}:`, error);
      return [];
    }
  }

  async getDriverLaps(season, round, driverId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/drivers/${driverId}/laps`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching laps for driver ${driverId} in ${season}/${round}:`, error);
      return [];
    }
  }

  async getPitstops(season, round) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/pitstops`);
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error(`Error fetching pitstops for ${season}/${round}:`, error);
      return null;
    }
  }

  async getDriverPitstops(season, round, driverId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/${round}/drivers/${driverId}/pitstops`);
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error(`Error fetching pitstops for driver ${driverId} in ${season}/${round}:`, error);
      return null;
    }
  }

  async getCurrentRace() {
    try {
      const response = await this.f1Client.fetchWithCache('/current/next');
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error('Error fetching current race:', error);
      return null;
    }
  }

  async getLastRace() {
    try {
      const response = await this.f1Client.fetchWithCache('/current/last/results');
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      return races[0] || null;
    } catch (error) {
      console.error('Error fetching last race:', error);
      return null;
    }
  }

  async getRaceByPosition(season, position, limit = 10) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/results/${position}`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching races with position ${position} in ${season}:`, error);
      return [];
    }
  }

  async getFastestLapsByPosition(season, position, limit = 10) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/fastest/${position}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching fastest laps with position ${position} in ${season}:`, error);
      return [];
    }
  }

  async getGridResults(season, position, limit = 10) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/grid/${position}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching grid results with position ${position} in ${season}:`, error);
      return [];
    }
  }

  async getStatusResults(statusId, limit = 20) {
    try {
      const response = await this.f1Client.fetchWithCache(`/status/${statusId}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching results with status ${statusId}:`, error);
      return [];
    }
  }

  async getAllStatuses() {
    try {
      const response = await this.f1Client.fetchWithCache('/status');
      return this.f1Client.extractData(response, 'StatusTable')?.Status || [];
    } catch (error) {
      console.error('Error fetching all statuses:', error);
      return [];
    }
  }
}

export default RaceTools;
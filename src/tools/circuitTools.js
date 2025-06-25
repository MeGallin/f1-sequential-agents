import F1ApiClient from './f1ApiClient.js';

class CircuitTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getAllCircuits() {
    try {
      const response = await this.f1Client.fetchWithCache('/circuits');
      return this.f1Client.extractData(response, 'CircuitTable')?.Circuits || [];
    } catch (error) {
      console.error('Error fetching all circuits:', error);
      return [];
    }
  }

  async getCircuitById(circuitId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/circuits/${circuitId}`);
      const circuits = this.f1Client.extractData(response, 'CircuitTable')?.Circuits || [];
      return circuits[0] || null;
    } catch (error) {
      console.error(`Error fetching circuit ${circuitId}:`, error);
      return null;
    }
  }

  async getCircuitsBySession(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/circuits`);
      return this.f1Client.extractData(response, 'CircuitTable')?.Circuits || [];
    } catch (error) {
      console.error(`Error fetching circuits for season ${season}:`, error);
      return [];
    }
  }

  async getCircuitResults(circuitId, limit = 30) {
    try {
      const response = await this.f1Client.fetchWithCache(`/circuits/${circuitId}/results`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching results for circuit ${circuitId}:`, error);
      return [];
    }
  }

  async getCircuitWinners(circuitId, limit = 10) {
    try {
      const response = await this.f1Client.fetchWithCache(`/circuits/${circuitId}/results/1`, { limit });
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching winners for circuit ${circuitId}:`, error);
      return [];
    }
  }

  async getCircuitLapRecords(circuitId) {
    try {
      const response = await this.f1Client.fetchWithCache(`/circuits/${circuitId}/fastest/1/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching lap records for circuit ${circuitId}:`, error);
      return [];
    }
  }

  // Get all races at a specific circuit
  async getCircuitRaceHistory(circuitId, startYear, endYear) {
    try {
      const params = {};
      if (startYear) params.startYear = startYear;
      if (endYear) params.endYear = endYear;
      
      const response = await this.f1Client.fetchWithCache(`/circuits/${circuitId}/seasons`, params);
      return this.f1Client.extractData(response, 'SeasonTable')?.Seasons || [];
    } catch (error) {
      console.error(`Error fetching race history for circuit ${circuitId}:`, error);
      return [];
    }
  }
}

export default CircuitTools;
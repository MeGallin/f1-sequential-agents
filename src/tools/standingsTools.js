import F1ApiClient from './f1ApiClient.js';

class StandingsTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getDriverStandings(season, round = null) {
    try {
      const endpoint = round 
        ? `/${season}/${round}/driverStandings`
        : `/${season}/driverStandings`;
      
      const response = await this.f1Client.fetchWithCache(endpoint);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching driver standings for ${season}:`, error);
      return null;
    }
  }

  async getConstructorStandings(season, round = null) {
    try {
      const endpoint = round 
        ? `/${season}/${round}/constructorStandings`
        : `/${season}/constructorStandings`;
      
      const response = await this.f1Client.fetchWithCache(endpoint);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching constructor standings for ${season}:`, error);
      return null;
    }
  }

  async getCurrentDriverStandings() {
    try {
      const response = await this.f1Client.fetchWithCache('/current/driverStandings');
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error('Error fetching current driver standings:', error);
      return null;
    }
  }

  async getCurrentConstructorStandings() {
    try {
      const response = await this.f1Client.fetchWithCache('/current/constructorStandings');
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error('Error fetching current constructor standings:', error);
      return null;
    }
  }

  async getDriverStandingsByPosition(season, position) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/driverStandings/${position}`);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching driver standings position ${position} for ${season}:`, error);
      return null;
    }
  }

  async getConstructorStandingsByPosition(season, position) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/constructorStandings/${position}`);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching constructor standings position ${position} for ${season}:`, error);
      return null;
    }
  }

  async getDriverChampions(startYear = null, endYear = null) {
    try {
      const params = {};
      if (startYear) params.startYear = startYear;
      if (endYear) params.endYear = endYear;
      
      const response = await this.f1Client.fetchWithCache('/driverStandings/1', params);
      return this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
    } catch (error) {
      console.error('Error fetching driver champions:', error);
      return [];
    }
  }

  async getConstructorChampions(startYear = null, endYear = null) {
    try {
      const params = {};
      if (startYear) params.startYear = startYear;
      if (endYear) params.endYear = endYear;
      
      const response = await this.f1Client.fetchWithCache('/constructorStandings/1', params);
      return this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
    } catch (error) {
      console.error('Error fetching constructor champions:', error);
      return [];
    }
  }

  async getStandingsProgression(season, driverId = null, constructorId = null) {
    try {
      let allStandings = [];
      
      if (driverId) {
        // Get driver standings progression through the season
        const races = await this.f1Client.fetchWithCache(`/${season}/races`);
        const raceList = this.f1Client.extractData(races, 'RaceTable')?.Races || [];
        
        for (const race of raceList) {
          const standings = await this.getDriverStandings(season, race.round);
          if (standings) {
            allStandings.push({
              round: race.round,
              raceName: race.raceName,
              standings: standings
            });
          }
        }
      } else if (constructorId) {
        // Get constructor standings progression through the season
        const races = await this.f1Client.fetchWithCache(`/${season}/races`);
        const raceList = this.f1Client.extractData(races, 'RaceTable')?.Races || [];
        
        for (const race of raceList) {
          const standings = await this.getConstructorStandings(season, race.round);
          if (standings) {
            allStandings.push({
              round: race.round,
              raceName: race.raceName,
              standings: standings
            });
          }
        }
      }
      
      return allStandings;
    } catch (error) {
      console.error(`Error fetching standings progression for ${season}:`, error);
      return [];
    }
  }

  async getSeasonSummary(season) {
    try {
      const [driverStandings, constructorStandings, races] = await Promise.all([
        this.getDriverStandings(season),
        this.getConstructorStandings(season),
        this.f1Client.fetchWithCache(`/${season}/races`)
      ]);

      return {
        season,
        driverStandings,
        constructorStandings,
        races: this.f1Client.extractData(races, 'RaceTable')?.Races || []
      };
    } catch (error) {
      console.error(`Error fetching season summary for ${season}:`, error);
      return null;
    }
  }

  async compareSeasons(seasons) {
    try {
      const seasonData = await Promise.all(
        seasons.map(season => this.getSeasonSummary(season))
      );
      
      return seasonData.filter(data => data !== null);
    } catch (error) {
      console.error('Error comparing seasons:', error);
      return [];
    }
  }
}

export default StandingsTools;
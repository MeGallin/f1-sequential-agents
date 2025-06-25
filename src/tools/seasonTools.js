import F1ApiClient from './f1ApiClient.js';

class SeasonTools {
  constructor() {
    this.f1Client = new F1ApiClient();
  }

  async getAllSeasons() {
    try {
      const response = await this.f1Client.fetchWithCache('/seasons');
      return this.f1Client.extractData(response, 'SeasonTable')?.Seasons || [];
    } catch (error) {
      console.error('Error fetching all seasons:', error);
      return [];
    }
  }

  async getCurrentSeason() {
    try {
      const response = await this.f1Client.fetchWithCache('/current');
      const races = this.f1Client.extractData(response, 'RaceTable')?.Races || [];
      if (races.length > 0) {
        return races[0].season;
      }
      return new Date().getFullYear().toString();
    } catch (error) {
      console.error('Error fetching current season:', error);
      return new Date().getFullYear().toString();
    }
  }

  async getSeasonRaces(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/races`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching races for season ${season}:`, error);
      return [];
    }
  }

  async getSeasonDriverStandings(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/driverStandings`);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching driver standings for season ${season}:`, error);
      return null;
    }
  }

  async getSeasonConstructorStandings(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/constructorStandings`);
      const standings = this.f1Client.extractData(response, 'StandingsTable')?.StandingsLists || [];
      return standings[0] || null;
    } catch (error) {
      console.error(`Error fetching constructor standings for season ${season}:`, error);
      return null;
    }
  }

  async getSeasonResults(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/results`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching results for season ${season}:`, error);
      return [];
    }
  }

  async getSeasonWinners(season) {
    try {
      const response = await this.f1Client.fetchWithCache(`/${season}/results/1`);
      return this.f1Client.extractData(response, 'RaceTable')?.Races || [];
    } catch (error) {
      console.error(`Error fetching winners for season ${season}:`, error);
      return [];
    }
  }

  async getSeasonChampions(season) {
    try {
      const [driverChampion, constructorChampion] = await Promise.all([
        this.f1Client.fetchWithCache(`/${season}/driverStandings/1`),
        this.f1Client.fetchWithCache(`/${season}/constructorStandings/1`)
      ]);

      const driverStandings = this.f1Client.extractData(driverChampion, 'StandingsTable')?.StandingsLists || [];
      const constructorStandings = this.f1Client.extractData(constructorChampion, 'StandingsTable')?.StandingsLists || [];

      return {
        season,
        driverChampion: driverStandings[0]?.DriverStandings?.[0] || null,
        constructorChampion: constructorStandings[0]?.ConstructorStandings?.[0] || null
      };
    } catch (error) {
      console.error(`Error fetching champions for season ${season}:`, error);
      return null;
    }
  }

  async getSeasonStatistics(season) {
    try {
      const [races, driverStandings, constructorStandings, winners] = await Promise.all([
        this.getSeasonRaces(season),
        this.getSeasonDriverStandings(season),
        this.getSeasonConstructorStandings(season),
        this.getSeasonWinners(season)
      ]);

      // Calculate statistics
      const totalRaces = races.length;
      const totalDrivers = driverStandings?.DriverStandings?.length || 0;
      const totalConstructors = constructorStandings?.ConstructorStandings?.length || 0;
      
      // Count unique race winners
      const uniqueWinners = new Set();
      winners.forEach(race => {
        if (race.Results && race.Results[0]) {
          uniqueWinners.add(race.Results[0].Driver.driverId);
        }
      });

      // Count wins per driver
      const winsByDriver = {};
      winners.forEach(race => {
        if (race.Results && race.Results[0]) {
          const driverId = race.Results[0].Driver.driverId;
          winsByDriver[driverId] = (winsByDriver[driverId] || 0) + 1;
        }
      });

      return {
        season,
        totalRaces,
        totalDrivers,
        totalConstructors,
        uniqueWinners: uniqueWinners.size,
        winsByDriver,
        races,
        driverStandings,
        constructorStandings
      };
    } catch (error) {
      console.error(`Error calculating season statistics for ${season}:`, error);
      return null;
    }
  }

  async compareSeasons(seasons) {
    try {
      const seasonData = await Promise.all(
        seasons.map(season => this.getSeasonStatistics(season))
      );
      
      return seasonData.filter(data => data !== null);
    } catch (error) {
      console.error('Error comparing seasons:', error);
      return [];
    }
  }

  async getEraData(startYear, endYear) {
    try {
      const seasons = [];
      for (let year = startYear; year <= endYear; year++) {
        seasons.push(year.toString());
      }
      
      return await this.compareSeasons(seasons);
    } catch (error) {
      console.error(`Error fetching era data ${startYear}-${endYear}:`, error);
      return [];
    }
  }

  async getSeasonByRegulation(regulationYear) {
    // Map regulation changes to years
    const regulationEras = {
      2022: [2022, 2023, 2024], // Ground effect era
      2017: [2017, 2018, 2019, 2020, 2021], // Hybrid V6 turbo era continuation
      2014: [2014, 2015, 2016], // Hybrid V6 turbo era start
      2009: [2009, 2010, 2011, 2012, 2013], // V8 era
      1989: [1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008] // V10/V12 era
    };

    const era = regulationEras[regulationYear] || [regulationYear];
    return await this.compareSeasons(era.map(year => year.toString()));
  }

  async getDecadeComparison(decades) {
    try {
      const decadeData = [];
      
      for (const decade of decades) {
        const startYear = decade;
        const endYear = decade + 9;
        const eraData = await this.getEraData(startYear, endYear);
        
        decadeData.push({
          decade: `${startYear}s`,
          startYear,
          endYear,
          seasons: eraData
        });
      }
      
      return decadeData;
    } catch (error) {
      console.error('Error comparing decades:', error);
      return [];
    }
  }
}

export default SeasonTools;
import fetch from 'node-fetch';

class F1ApiClient {
  constructor() {
    this.baseUrl = process.env.F1_API_BASE_URL || 'http://api.jolpi.ca/ergast/f1';
    this.cache = new Map();
    this.cacheTTL = parseInt(process.env.F1_API_CACHE_TTL) || 300; // 5 minutes default
  }

  async fetchWithCache(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${this.baseUrl}${endpoint}.json${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTTL * 1000) {
        console.log(`Cache hit for: ${endpoint}`);
        return cached.data;
      } else {
        this.cache.delete(cacheKey);
      }
    }

    try {
      console.log(`Fetching from F1 API: ${fullUrl}`);
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'F1-Sequential-Agents/1.0'
        },
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`F1 API error for ${endpoint}:`, error.message);
      throw new Error(`Failed to fetch F1 data from ${endpoint}: ${error.message}`);
    }
  }

  // Helper method to extract the main data from Ergast response
  extractData(response, dataType) {
    return response?.MRData?.[dataType] || [];
  }

  // Clear cache manually if needed
  clearCache() {
    this.cache.clear();
    console.log('F1 API cache cleared');
  }

  // Get cache stats
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default F1ApiClient;
import fetch from 'node-fetch';

class F1ApiClient {
  constructor() {
    this.baseUrl =
      process.env.F1_API_BASE_URL || 'https://api.jolpi.ca/ergast/f1';
    this.cache = new Map();
    this.cacheTTL = parseInt(process.env.F1_API_CACHE_TTL) || 300; // 5 minutes default
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimitDelay = 100; // 100ms between requests
  }

  async fetchWithCache(endpoint, params = {}) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ endpoint, params, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const { endpoint, params, resolve, reject } = this.requestQueue.shift();

      try {
        const result = await this.makeRequest(endpoint, params);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Rate limiting delay
      if (this.requestQueue.length > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.rateLimitDelay),
        );
      }
    }

    this.isProcessing = false;
  }

  async makeRequest(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${this.baseUrl}${endpoint}.json${
      queryString ? `?${queryString}` : ''
    }`;
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
          Accept: 'application/json',
          'User-Agent': 'F1-Sequential-Agents/1.0',
        },
        timeout: 10000,
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - increase delay
          this.rateLimitDelay = Math.min(this.rateLimitDelay * 2, 2000);
          throw new Error(
            `Rate limited (429). Increased delay to ${this.rateLimitDelay}ms`,
          );
        }
        if (response.status === 400) {
          // Bad request - often means invalid endpoint
          console.warn(`Invalid API endpoint: ${endpoint}`);
          return { MRData: { total: '0' } }; // Return empty but valid response
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      // Reset rate limit delay on success
      this.rateLimitDelay = Math.max(this.rateLimitDelay * 0.8, 100);

      return data;
    } catch (error) {
      console.error(`F1 API error for ${endpoint}:`, error.message);

      // For rate limiting, return cached data if available
      if (error.message.includes('429') && this.cache.has(cacheKey)) {
        console.log(
          `Returning stale cache for rate-limited request: ${endpoint}`,
        );
        return this.cache.get(cacheKey).data;
      }

      throw new Error(
        `Failed to fetch F1 data from ${endpoint}: ${error.message}`,
      );
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
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default F1ApiClient;

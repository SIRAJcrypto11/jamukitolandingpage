/**
 * ULTIMATE INSTANT APP - ZERO LOADING, EXTREME CACHE
 * Aggressive cache-first strategy for instant UX
 */

class RequestManager {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.requestTimestamps = [];
    this.maxRequestsPerSecond = 1; // ✅ MAXIMUM 1 request per 15 seconds
    this.requestQueue = [];
    this.isProcessingQueue = false;
    this.retryDelays = [120000, 300000, 600000]; // ✅ 2min, 5min, 10min retry delays
    
    this.loadCacheFromStorage();
    
    setInterval(() => this.saveCacheToStorage(), 60000); // Save every minute
    setInterval(() => this.cleanOldTimestamps(), 2000);
  }

  cleanOldTimestamps() {
    const fifteenSecondsAgo = Date.now() - 15000; // ✅ 15 second window
    this.requestTimestamps = this.requestTimestamps.filter(t => t > fifteenSecondsAgo);
  }

  async waitForRateLimit() {
    this.cleanOldTimestamps();
    
    while (this.requestTimestamps.length >= this.maxRequestsPerSecond) {
      await new Promise(resolve => setTimeout(resolve, 15000)); // ✅ Wait 15s
      this.cleanOldTimestamps();
    }
    
    this.requestTimestamps.push(Date.now());
  }

  async queueRequest(fn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const { fn, resolve, reject } = this.requestQueue.shift();
      try {
        await this.waitForRateLimit();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
      await new Promise(r => setTimeout(r, 15000)); // ✅ 15s gap between requests
    }

    this.isProcessingQueue = false;
  }

  saveCacheToStorage() {
    try {
      const cacheData = {};
      let count = 0;
      
      this.cache.forEach((value, key) => {
        const age = Date.now() - (value.timestamp || Date.now());
        if (age < 604800000) { // ✅ Keep cache for 7 days
          cacheData[key] = {
            data: value.data,
            timestamp: value.timestamp
          };
          count++;
        }
      });
      
      localStorage.setItem('TODOIT_DATA_CACHE', JSON.stringify(cacheData));
    } catch (e) {}
  }

  loadCacheFromStorage() {
    try {
      const stored = localStorage.getItem('TODOIT_DATA_CACHE');
      if (stored) {
        const cacheData = JSON.parse(stored);
        let count = 0;
        
        Object.entries(cacheData).forEach(([key, value]) => {
          const age = Date.now() - (value.timestamp || Date.now());
          if (age < 604800000) { // ✅ Keep cache for 7 days
            this.cache.set(key, {
              data: value.data,
              timestamp: value.timestamp
            });
            count++;
          }
        });
        
        console.log(`💾 Cache loaded: ${count} items - INSTANT MODE`);
      }
    } catch (e) {}
  }

  getCacheKey(entityName, method, filters = {}) {
    const filterStr = JSON.stringify(filters);
    return `${entityName}:${method}:${filterStr}`;
  }

  getCached(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - (cached.timestamp || Date.now());

    return {
      data: cached.data,
      isStale: age > 3600000, // ✅ 1 hour before stale
      age
    };
  }

  setCache(key, data) {
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  invalidateCache(keyOrPattern) {
    if (typeof keyOrPattern === 'string') {
      this.cache.delete(keyOrPattern);
    } else if (keyOrPattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (keyOrPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
    setTimeout(() => this.saveCacheToStorage(), 100);
  }

  async retryRequest(entityName, method, filters, attemptNumber = 0) {
    if (attemptNumber >= this.retryDelays.length) {
      console.error(`❌ Max retries exceeded for ${entityName}.${method}`);
      throw new Error('Max retries exceeded');
    }

    try {
      await this.waitForRateLimit();
      return await this.executeRequest(entityName, method, filters);
    } catch (error) {
      const isRateLimit = 
        error?.response?.status === 429 || 
        error?.message?.includes('Rate limit') ||
        error?.message?.includes('429');

      if (isRateLimit && attemptNumber < this.retryDelays.length) {
        const delay = this.retryDelays[attemptNumber];
        console.log(`⏳ Rate limit hit, retrying in ${delay/1000}s (attempt ${attemptNumber + 1}/${this.retryDelays.length})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(entityName, method, filters, attemptNumber + 1);
      }

      throw error;
    }
  }

  async request(entityName, method, filters = {}, options = {}) {
    const { skipCache = false, background = false } = options;
    const cacheKey = this.getCacheKey(entityName, method, filters);

    if (!skipCache) {
      const cached = this.getCached(cacheKey);
      if (cached && cached.data !== null && cached.data !== undefined) {
        console.log(`⚡ INSTANT: ${entityName}.${method} (age: ${Math.round(cached.age/1000)}s)`);

        if (cached.isStale && !background && !this.pendingRequests.has(cacheKey)) {
          setTimeout(() => {
            this.request(entityName, method, filters, { skipCache: true, background: true })
              .catch(() => {});
          }, 1000); // ✅ Refresh stale data after 1 second
        }

        return cached.data;
      }
    }

    if (!skipCache && !this.cache.has(cacheKey)) {
      let placeholder;
      if (method === 'list' || method === 'filter') {
        placeholder = [];
      } else if (method === 'get' || method === 'me') {
        placeholder = null;
      }
      
      console.log(`⚡ NO CACHE: ${entityName}.${method} - Placeholder returned`);
      
      if (placeholder !== null) {
        setTimeout(() => {
          this.request(entityName, method, filters, { skipCache: true, background: true })
            .then(data => {
              window.dispatchEvent(new CustomEvent('cacheUpdated', {
                detail: { entityName, method, filters, data }
              }));
            })
            .catch(() => {});
        }, 120000); // ✅ Delay background load 2 minutes
        
        return placeholder;
      }
    }

    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const requestPromise = this.queueRequest(async () => {
      try {
        const result = await this.retryRequest(entityName, method, filters);
        this.setCache(cacheKey, result);
        
        if (!background) {
          setTimeout(() => this.saveCacheToStorage(), 1000);
        }
        
        return result;
        
      } catch (error) {
        const staleCache = this.cache.get(cacheKey);
        if (staleCache && staleCache.data) {
          console.log(`✅ Using STALE cache on error: ${entityName}.${method}`);
          return staleCache.data;
        }
        
        const isRateLimit = 
          error?.response?.status === 429 || 
          error?.message?.includes('Rate limit') ||
          error?.message?.includes('429');
        
        if (isRateLimit) {
          console.error(`❌ RATE LIMIT: ${entityName}.${method}`);
          
          if (method === 'list' || method === 'filter') return [];
          if (method === 'me') return null;
          if (method === 'get') return null;
        }
        
        if (method === 'list' || method === 'filter') return [];
        if (method === 'me') return null;
        if (method === 'get') return null;
        
        throw error;
        
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async executeRequest(entityName, method, filters) {
    try {
      const entityModule = await import(`@/entities/${entityName}`);
      const Entity = entityModule[entityName];
      
      let result;
      switch (method) {
        case 'me':
          result = await Entity.me();
          break;
        case 'list':
          result = await Entity.list();
          break;
        case 'filter':
          result = await Entity.filter(filters);
          break;
        case 'get':
          if (!filters || !filters.id) {
            console.warn(`⚠️ Invalid get query - missing ID for ${entityName}`);
            return null;
          }
          result = await Entity.get(filters.id);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }
      
      return result;
    } catch (error) {
      const errorMsg = error?.message || String(error);
      const statusCode = error?.response?.status;
      
      if (statusCode === 403 || errorMsg.includes('RLS') || errorMsg.includes('not authorized')) {
        if (method === 'list' || method === 'filter') return [];
        if (method === 'get' || method === 'me') return null;
      }
      
      throw error;
    }
  }

  clearAll() {
    this.cache.clear();
    this.pendingRequests.clear();
    this.requestTimestamps = [];
    localStorage.removeItem('TODOIT_DATA_CACHE');
  }
}

export const requestManager = new RequestManager();

export async function cachedRequest(entityName, method, filters = {}, options = {}) {
  return requestManager.request(entityName, method, filters, options);
}

export function invalidateCache(keyOrPattern) {
  requestManager.invalidateCache(keyOrPattern);
}

export function clearAllCaches() {
  requestManager.clearAll();
}

export async function prefetchData(entityName, method, filters = {}) {
  return requestManager.request(entityName, method, filters, { background: true });
}
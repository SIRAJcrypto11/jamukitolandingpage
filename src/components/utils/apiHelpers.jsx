
// API call helpers with rate limiting and retry logic

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimitError = error?.response?.status === 429 || 
                               error?.message?.includes('Rate limit') ||
                               error?.message?.includes('429');
      
      if (isRateLimitError && i < maxRetries - 1) {
        const backoffDelay = delayMs * Math.pow(2, i); // Exponential backoff
        console.log(`Rate limit hit, retrying in ${backoffDelay}ms... (attempt ${i + 1}/${maxRetries})`);
        await delay(backoffDelay);
        continue;
      }
      
      // If not rate limit or last retry, throw error
      if (!isRateLimitError || i === maxRetries - 1) {
        throw error;
      }
    }
  }
}

export async function batchWithDelay(items, fn, delayBetweenMs = 200) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    try {
      const result = await fn(items[i], i);
      results.push(result);
      
      // Add delay between calls except for the last one
      if (i < items.length - 1) {
        await delay(delayBetweenMs);
      }
    } catch (error) {
      console.error(`Error processing item ${i}:`, error);
      results.push(null);
    }
  }
  return results;
}

export function createThrottledFunction(fn, minDelayMs = 300) {
  let lastCallTime = 0;
  
  return async function(...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;
    
    if (timeSinceLastCall < minDelayMs) {
      await delay(minDelayMs - timeSinceLastCall);
    }
    
    lastCallTime = Date.now();
    return fn(...args);
  };
}

// Smart data fetcher with caching and background refresh
export async function fetchWithCache(key, fetchFn, options = {}) {
  const {
    ttl = 180000, // 3 minutes default
    forceRefresh = false,
    onStaleData = null
  } = options;

  const { cacheManager } = await import('./cacheManager');

  // Get cached data (allow stale)
  if (!forceRefresh) {
    const cached = cacheManager.get(key, true);
    if (cached && cached.data) {
      // Return stale data immediately for instant UI
      if (cached.isStale && typeof onStaleData === 'function') {
        onStaleData(cached.data);
        
        // Fetch fresh data in background
        withRetry(fetchFn)
          .then(freshData => {
            cacheManager.set(key, freshData, ttl);
          })
          .catch(err => console.error('Background refresh failed for key', key, ':', err));
      }
      
      return cached.data;
    }
  }

  // No cache, or forced refresh, fetch fresh data
  const freshData = await withRetry(fetchFn);
  cacheManager.set(key, freshData, ttl);
  return freshData;
}

// Prefetch data in background
export function prefetchData(key, fetchFn, ttl) {
  setTimeout(async () => {
    try {
      const data = await withRetry(fetchFn);
      const { cacheManager } = await import('./cacheManager');
      cacheManager.set(key, data, ttl);
    } catch (err) {
      console.log('Prefetch failed for key', key, ':', err);
    }
  }, 100);
}

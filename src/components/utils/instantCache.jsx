// ✅ INSTANT CACHE SYSTEM - Zero Loading Time Experience
// Stale-While-Revalidate pattern untuk instant UI

const CACHE_PREFIX = 'SNISHOP_INSTANT_';
const CACHE_DURATION = 60000; // 1 minute (faster refresh)
const MEMORY_CACHE = new Map(); // ✅ In-memory cache for ultra-fast access

/**
 * Get cached data instantly, refresh in background
 */
export async function instantCache(key, fetchFn, options = {}) {
  const {
    ttl = CACHE_DURATION,
    forceRefresh = false,
    onStaleData = null
  } = options;

  const cacheKey = `${CACHE_PREFIX}${key}`;
  
  try {
    // ✅ 0. Check MEMORY cache first (ultra-fast, ~0ms)
    if (!forceRefresh && MEMORY_CACHE.has(cacheKey)) {
      const memCached = MEMORY_CACHE.get(cacheKey);
      const memAge = Date.now() - memCached.timestamp;
      
      if (memAge < ttl) {
        // Fresh memory cache - return instantly
        return memCached.data;
      } else {
        // Stale memory cache - return instantly & refresh
        setTimeout(() => refreshCache(cacheKey, fetchFn), 50);
        return memCached.data;
      }
    }
    
    // 1. Check localStorage cache (instant return)
    if (!forceRefresh) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          // Return cached data immediately (even if stale)
          if (data) {
            const isStale = age > ttl;
            
            // ✅ Store to memory cache
            MEMORY_CACHE.set(cacheKey, { data, timestamp });
            
            if (onStaleData && isStale) {
              onStaleData(data);
            }
            
            // Refresh in background if stale
            if (isStale) {
              setTimeout(() => refreshCache(cacheKey, fetchFn), 50);
            }
            
            return data;
          }
        } catch (e) {
          console.warn('Cache parse error:', e);
        }
      }
    }
    
    // 2. No cache or forced refresh - fetch fresh data
    const freshData = await fetchFn();
    const now = Date.now();
    
    // 3. Store in both caches
    MEMORY_CACHE.set(cacheKey, { data: freshData, timestamp: now });
    localStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: now
    }));
    
    return freshData;
    
  } catch (error) {
    console.error(`❌ INSTANT: Error fetching ${key}:`, error);
    
    // Fallback to memory cache first
    if (MEMORY_CACHE.has(cacheKey)) {
      return MEMORY_CACHE.get(cacheKey).data;
    }
    
    // Fallback to localStorage cache
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        return data;
      } catch (e) {}
    }
    
    throw error;
  }
}

/**
 * Refresh cache in background
 */
async function refreshCache(cacheKey, fetchFn) {
  try {
    const freshData = await fetchFn();
    const now = Date.now();
    
    // ✅ Update both caches
    MEMORY_CACHE.set(cacheKey, { data: freshData, timestamp: now });
    localStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: now
    }));
    
    // Broadcast update
    window.dispatchEvent(new CustomEvent('cacheUpdated', { 
      detail: { key: cacheKey.replace(CACHE_PREFIX, '') } 
    }));
  } catch (error) {
    console.error('Background refresh failed:', error);
  }
}

/**
 * Invalidate specific cache
 */
export function invalidateInstantCache(key) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  MEMORY_CACHE.delete(cacheKey);
  localStorage.removeItem(cacheKey);
}

/**
 * Invalidate all caches for a company
 */
export function invalidateCompanyCache(companyId) {
  // ✅ Clear memory cache
  for (const key of MEMORY_CACHE.keys()) {
    if (key.includes(companyId)) {
      MEMORY_CACHE.delete(key);
    }
  }
  
  // Clear localStorage cache
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(CACHE_PREFIX) && key.includes(companyId)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Prefetch data for instant loading later
 */
export async function prefetchData(key, fetchFn) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  
  try {
    const data = await fetchFn();
    localStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    console.log(`✅ INSTANT: Prefetched ${key}`);
  } catch (error) {
    console.warn(`⚠️ INSTANT: Prefetch failed for ${key}:`, error);
  }
}
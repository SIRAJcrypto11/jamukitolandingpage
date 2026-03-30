// ✅ INSTANT PAGE LOADER - Zero loading time for all pages
// Uses aggressive caching + stale-while-revalidate pattern

import { base44 } from '@/api/base44Client';

const CACHE_PREFIX = 'SNISHOP_PAGE_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached page data instantly, refresh in background
 */
export async function loadPageData(pageKey, loaderFn, options = {}) {
  const {
    ttl = CACHE_TTL,
    forceRefresh = false,
    onStaleData = null,
    dependencies = []
  } = options;

  const cacheKey = `${CACHE_PREFIX}${pageKey}_${dependencies.join('_')}`;

  try {
    // 1. ✅ INSTANT CACHE HIT - Return immediately if available
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;
          
          if (data) {
            const isStale = age > ttl;
            
            console.log(`📦 INSTANT PAGE: ${pageKey} - ${isStale ? 'STALE' : 'FRESH'} cache (${Math.round(age/1000)}s old)`);
            
            if (onStaleData && isStale) {
              onStaleData(data);
            }
            
            // ✅ Refresh in background if stale
            if (isStale) {
              setTimeout(() => refreshPageData(cacheKey, loaderFn, pageKey), 100);
            }
            
            return data;
          }
        } catch (e) {
          console.warn('Cache parse error:', e);
        }
      }
    }

    // 2. ⏳ No cache - load fresh
    console.log(`⏳ INSTANT PAGE: ${pageKey} - Loading fresh data...`);
    const freshData = await loaderFn();
    
    // 3. ✅ Save to cache
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: Date.now()
    }));
    
    console.log(`✅ INSTANT PAGE: ${pageKey} - Data loaded and cached`);
    return freshData;

  } catch (error) {
    console.error(`❌ Error loading ${pageKey}:`, error);
    
    // ✅ Fallback to stale cache on error
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data } = JSON.parse(cached);
        console.log(`⚠️ INSTANT PAGE: ${pageKey} - Using stale cache due to error`);
        return data;
      } catch (e) {}
    }
    
    throw error;
  }
}

/**
 * Refresh cache in background
 */
async function refreshPageData(cacheKey, loaderFn, pageKey) {
  try {
    console.log(`🔄 BACKGROUND: Refreshing ${pageKey}...`);
    const freshData = await loaderFn();
    
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: freshData,
      timestamp: Date.now()
    }));
    
    console.log(`✅ BACKGROUND: ${pageKey} refreshed`);
    
    // Broadcast update
    window.dispatchEvent(new CustomEvent('pageDataUpdated', {
      detail: { pageKey }
    }));
  } catch (error) {
    console.warn(`⚠️ BACKGROUND: Refresh failed for ${pageKey}`);
  }
}

/**
 * Invalidate page cache
 */
export function invalidatePageCache(pageKey) {
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith(`${CACHE_PREFIX}${pageKey}`)) {
      sessionStorage.removeItem(key);
    }
  });
  console.log(`🗑️ INSTANT PAGE: Cache invalidated for ${pageKey}`);
}

/**
 * Prefetch page data for instant loading later
 */
export async function prefetchPage(pageKey, loaderFn) {
  const cacheKey = `${CACHE_PREFIX}${pageKey}`;
  
  try {
    const data = await loaderFn();
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    console.log(`✅ PREFETCH: ${pageKey} prefetched`);
  } catch (error) {
    console.warn(`⚠️ PREFETCH: Failed for ${pageKey}`);
  }
}

/**
 * Preload common pages in background
 */
export function preloadCommonPages(user, selectedCompany) {
  console.log('🚀 PRELOAD: Starting background preload...');
  
  setTimeout(() => {
    // Personal pages
    if (!selectedCompany) {
      prefetchPage('tasks', () => base44.entities.Task.filter({ 
        created_by: user.email, 
        status: { '$ne': 'completed' } 
      }));
      
      setTimeout(() => {
        prefetchPage('notes', () => base44.entities.Note.filter({ created_by: user.email }));
      }, 1000);
      
      setTimeout(() => {
        prefetchPage('workspaces', () => base44.entities.Workspace.filter({ owner_id: user.id }));
      }, 2000);
    }
    
    // Company pages
    if (selectedCompany) {
      prefetchPage('company_products', () => base44.entities.CompanyPOSProduct.filter({ 
        company_id: selectedCompany.id 
      }));
      
      setTimeout(() => {
        prefetchPage('company_transactions', () => base44.entities.CompanyPOSTransaction.filter({ 
          company_id: selectedCompany.id 
        }));
      }, 1000);
      
      setTimeout(() => {
        prefetchPage('company_customers', () => base44.entities.Customer.filter({ 
          company_id: selectedCompany.id 
        }));
      }, 2000);
    }
  }, 3000); // Start after 3 seconds to not block initial load
}
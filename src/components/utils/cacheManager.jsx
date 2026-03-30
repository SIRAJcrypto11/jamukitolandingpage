// Enhanced Cache Manager dengan TTL dan stale-while-revalidate
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttls = new Map();
  }

  set(key, value, ttl = 300000) { // 5 minutes default
    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl: ttl
    });
  }

  get(key, allowStale = false) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp;

    if (age > cached.ttl) {
      if (allowStale) {
        return {
          data: cached.data,
          isStale: true
        };
      }
      this.cache.delete(key);
      return null;
    }

    return {
      data: cached.data,
      isStale: false
    };
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.cache.has(key);
  }
}

export const cacheManager = new CacheManager();

// Cache keys
export const CACHE_KEYS = {
  USER: 'user_data',
  WORKSPACES: 'workspaces_list',
  TASKS: 'tasks_list',
  NOTES: 'notes_list',
  PRODUCTS: 'products_list',
  POS_PRODUCTS: 'pos_products_list',
  ORDERS: 'orders_list',
  CATEGORIES: 'categories_list',
  FINANCIAL_CATEGORIES: 'financial_categories_list',
  MEMBERS: 'members_list',
  TRANSACTIONS: 'transactions_list'
};

// Cache TTL values (in milliseconds)
export const CACHE_TTL = {
  SHORT: 30000,      // 30 seconds - for frequently changing data
  MEDIUM: 180000,    // 3 minutes - for moderate data
  LONG: 600000,      // 10 minutes - for static data
  VERY_LONG: 1800000 // 30 minutes - for very static data
};
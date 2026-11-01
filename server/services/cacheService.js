import Redis from 'ioredis';

/**
 * High-performance Cache Service with automatic Redis and In-Memory fallback.
 * Provides resilient, sub-millisecond data retrieval for UI response optimization.
 */

class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = 300) {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
    return true;
  }

  async del(key) {
    return this.store.delete(key);
  }

  async delPattern(pattern) {
    const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
    let deletedCount = 0;
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  async flush() {
    this.store.clear();
  }
}

class CacheService {
  constructor() {
    this.redisClient = null;
    this.isRedisReady = false;
    this.memoryCache = new MemoryCache();

    this.init();
  }

  init() {
    const redisUrl = process.env.REDIS_URL;
    
    // Only attempt Redis connection if explicitly configured or in non-Windows test environments
    if (redisUrl || process.env.ENABLE_LOCAL_REDIS === 'true') {
      try {
        const client = new Redis(redisUrl || 'redis://127.0.0.1:6379', {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          retryStrategy(times) {
            if (times > 3) {
              return null; // Stop reconnecting after 3 tries and use memory cache
            }
            return Math.min(times * 500, 2000);
          },
          lazyConnect: true,
        });

        client.connect().then(() => {
          this.isRedisReady = true;
          this.redisClient = client;
          console.log('[CacheService] ✅ Connected to Redis. Distributed caching active.');
        }).catch((err) => {
          console.log(`[CacheService] ⚡ Redis server unavailable (${err.message}). Using high-speed In-Memory Cache.`);
          this.isRedisReady = false;
        });

        client.on('error', (err) => {
          this.isRedisReady = false;
        });
      } catch (err) {
        this.isRedisReady = false;
        console.log(`[CacheService] ⚡ Using In-Memory Cache (${err.message}).`);
      }
    } else {
      console.log('[CacheService] ⚡ In-Memory Cache initialized (Ultra-fast 0ms latency).');
    }
  }

  /**
   * Get cached item by key
   */
  async get(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? JSON.parse(data) : null;
      } catch (err) {
        console.warn(`[CacheService] Redis get error on key ${key}:`, err.message);
      }
    }
    return await this.memoryCache.get(key);
  }

  /**
   * Set cached item with TTL in seconds
   */
  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
          await this.redisClient.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.redisClient.set(key, serialized);
        }
        return true;
      } catch (err) {
        console.warn(`[CacheService] Redis set error on key ${key}:`, err.message);
      }
    }
    return await this.memoryCache.set(key, value, ttlSeconds);
  }

  /**
   * Delete single key
   */
  async del(key) {
    if (this.isRedisReady && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        console.warn(`[CacheService] Redis del error on key ${key}:`, err.message);
      }
    }
    return await this.memoryCache.del(key);
  }

  /**
   * Delete by pattern (e.g., 'categories:*')
   */
  async delPattern(pattern) {
    if (this.isRedisReady && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err) {
        console.warn(`[CacheService] Redis delPattern error on ${pattern}:`, err.message);
      }
    }
    return await this.memoryCache.delPattern(pattern);
  }

  /**
   * Cache-Aside Helper: Get from cache, or compute and cache
   * @param {string} key
   * @param {Function} fetcherAsync - function returning a Promise with data
   * @param {number} ttlSeconds - default 300s (5 mins)
   */
  async getOrSet(key, fetcherAsync, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const freshData = await fetcherAsync();
    if (freshData !== null && freshData !== undefined) {
      await this.set(key, freshData, ttlSeconds);
    }
    return freshData;
  }
}

const cacheService = new CacheService();
export default cacheService;

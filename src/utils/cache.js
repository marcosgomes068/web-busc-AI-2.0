import NodeCache from 'node-cache';
import crypto from 'crypto';
import { CONFIG } from '../config.js';
import logger from './logger.js';

const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';
const QUERY_TRUNCATION_LENGTH = 50;
const CACHE_QUERY_STORAGE_LENGTH = 100;

/**
 * Cache manager for storing and retrieving query results
 * Uses SHA256 hashing for key generation and provides TTL management
 */
class CacheManager {
  constructor() {
    this.cache = this.initializeCache();
  }

  /**
   * Initializes the NodeCache instance with configuration
   */
  initializeCache() {
    return new NodeCache({
      stdTTL: CONFIG.cache.ttl,
      maxKeys: CONFIG.cache.maxSize,
      useClones: false
    });
  }

  /**
   * Generates a unique cache key from query string using SHA256
   */
  generateCacheKey(query) {
    const normalizedQuery = this.normalizeQuery(query);
    return crypto.createHash(HASH_ALGORITHM).update(normalizedQuery).digest(HASH_ENCODING);
  }

  /**
   * Normalizes query string for consistent hashing
   */
  normalizeQuery(query) {
    return query.toLowerCase().trim();
  }

  /**
   * Retrieves cached result for the given query
   */
  get(query) {
    const cacheKey = this.generateCacheKey(query);
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult) {
      this.logCacheHit(query);
      return cachedResult;
    }
    
    this.logCacheMiss(query);
    return null;
  }

  /**
   * Stores query result in cache with metadata
   */
  set(query, data) {
    const cacheKey = this.generateCacheKey(query);
    const dataWithMetadata = this.createCacheEntry(data, query);
    const isSuccessful = this.cache.set(cacheKey, dataWithMetadata);
    
    if (isSuccessful) {
      this.logCacheSet(query);
    }
    
    return isSuccessful;
  }

  /**
   * Creates cache entry with metadata
   */
  createCacheEntry(data, query) {
    return {
      ...data,
      timestamp: Date.now(),
      query: this.truncateQuery(query, CACHE_QUERY_STORAGE_LENGTH)
    };
  }

  /**
   * Truncates query string to specified length
   */
  truncateQuery(query, maxLength) {
    return query.substring(0, maxLength);
  }

  /**
   * Clears all cached entries
   */
  clear() {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Retrieves cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Logs cache hit event
   */
  logCacheHit(query) {
    const truncatedQuery = this.truncateQuery(query, QUERY_TRUNCATION_LENGTH);
    logger.info(`Cache hit for query: ${truncatedQuery}...`);
  }

  /**
   * Logs cache miss event
   */
  logCacheMiss(query) {
    const truncatedQuery = this.truncateQuery(query, QUERY_TRUNCATION_LENGTH);
    logger.info(`Cache miss for query: ${truncatedQuery}...`);
  }

  /**
   * Logs cache set event
   */
  logCacheSet(query) {
    const truncatedQuery = this.truncateQuery(query, QUERY_TRUNCATION_LENGTH);
    logger.info(`Cached result for query: ${truncatedQuery}...`);
  }
}

export default new CacheManager();

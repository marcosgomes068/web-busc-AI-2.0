import NodeCache from 'node-cache';
import crypto from 'crypto';
import { CONFIG } from '../config.js';
import logger from './logger.js';

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: CONFIG.cache.ttl,
      maxKeys: CONFIG.cache.maxSize,
      useClones: false
    });
  }

  generateKey(query) {
    return crypto.createHash('sha256').update(query.toLowerCase().trim()).digest('hex');
  }

  get(query) {
    const key = this.generateKey(query);
    const result = this.cache.get(key);
    
    if (result) {
      logger.info(`Cache hit for query: ${query.substring(0, 50)}...`);
      return result;
    }
    
    logger.info(`Cache miss for query: ${query.substring(0, 50)}...`);
    return null;
  }

  set(query, data) {
    const key = this.generateKey(query);
    const success = this.cache.set(key, {
      ...data,
      timestamp: Date.now(),
      query: query.substring(0, 100)
    });
    
    if (success) {
      logger.info(`Cached result for query: ${query.substring(0, 50)}...`);
    }
    
    return success;
  }

  clear() {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  getStats() {
    return this.cache.getStats();
  }
}

export default new CacheManager();

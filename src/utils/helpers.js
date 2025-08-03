import pLimit from 'p-limit';

const DEFAULT_MAX_CONCURRENT = 5;
const DEFAULT_INTERVAL_MS = 1000;
const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const EXPONENTIAL_BACKOFF_BASE = 2;

/**
 * Rate limiter that controls concurrent operations and timing between requests
 */
export class RateLimiter {
  constructor(maxConcurrent = DEFAULT_MAX_CONCURRENT, interval = DEFAULT_INTERVAL_MS) {
    this.limit = pLimit(maxConcurrent);
    this.interval = interval;
    this.lastRequestTimestamp = 0;
  }

  /**
   * Executes a function with rate limiting applied
   */
  async execute(fn) {
    return this.limit(async () => {
      await this.enforceRateLimit();
      this.updateLastRequestTimestamp();
      return fn();
    });
  }

  /**
   * Enforces rate limiting by waiting if necessary
   */
  async enforceRateLimit() {
    const currentTime = Date.now();
    const timeSinceLastRequest = currentTime - this.lastRequestTimestamp;
    
    if (this.shouldWaitBeforeRequest(timeSinceLastRequest)) {
      const waitTime = this.calculateWaitTime(timeSinceLastRequest);
      await this.waitForDelay(waitTime);
    }
  }

  /**
   * Determines if we should wait before making the next request
   */
  shouldWaitBeforeRequest(timeSinceLastRequest) {
    return timeSinceLastRequest < this.interval;
  }

  /**
   * Calculates how long to wait before the next request
   */
  calculateWaitTime(timeSinceLastRequest) {
    return this.interval - timeSinceLastRequest;
  }

  /**
   * Waits for the specified delay
   */
  async waitForDelay(delay) {
    await sleep(delay);
  }

  /**
   * Updates the timestamp of the last request
   */
  updateLastRequestTimestamp() {
    this.lastRequestTimestamp = Date.now();
  }
}

/**
 * Creates a promise that resolves after the specified number of milliseconds
 */
export const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

/**
 * Retries a function with exponential backoff
 */
export const retry = async (fn, attempts = DEFAULT_RETRY_ATTEMPTS, delay = DEFAULT_RETRY_DELAY_MS) => {
  for (let attemptIndex = 0; attemptIndex < attempts; attemptIndex++) {
    try {
      return await fn();
    } catch (error) {
      if (isLastAttempt(attemptIndex, attempts)) {
        throw error;
      }
      
      const backoffDelay = calculateExponentialBackoffDelay(delay, attemptIndex);
      await sleep(backoffDelay);
    }
  }
};

/**
 * Determines if this is the last retry attempt
 */
function isLastAttempt(currentAttempt, totalAttempts) {
  return currentAttempt === totalAttempts - 1;
}

/**
 * Calculates exponential backoff delay
 */
function calculateExponentialBackoffDelay(baseDelay, attemptIndex) {
  return baseDelay * Math.pow(EXPONENTIAL_BACKOFF_BASE, attemptIndex);
}

/**
 * Validates if a string is a valid URL
 */
export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes text by normalizing whitespace and removing special characters
 */
export const sanitizeText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,!?;:]/g, '')
    .trim();
};

/**
 * Extracts domain name from a URL
 */
export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

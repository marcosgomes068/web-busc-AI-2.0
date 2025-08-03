import pLimit from 'p-limit';

export class RateLimiter {
  constructor(maxConcurrent = 5, interval = 1000) {
    this.limit = pLimit(maxConcurrent);
    this.interval = interval;
    this.lastRequest = 0;
  }

  async execute(fn) {
    return this.limit(async () => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequest;
      
      if (timeSinceLastRequest < this.interval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.interval - timeSinceLastRequest)
        );
      }
      
      this.lastRequest = Date.now();
      return fn();
    });
  }
}

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retry = async (fn, attempts = 3, delay = 1000) => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === attempts - 1) throw error;
      await sleep(delay * Math.pow(2, i));
    }
  }
};

export const validateUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const sanitizeText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-.,!?;:]/g, '')
    .trim();
};

export const extractDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

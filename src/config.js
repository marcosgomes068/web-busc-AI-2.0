import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '../.config');

let config;
try {
  config = JSON.parse(readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('Failed to load config file:', error.message);
  process.exit(1);
}

export const CONFIG = {
  ...config,
  api: {
    cohere: process.env.COHERE_API_KEY,
    serper: process.env.SERPER_API_KEY,
    rateLimit: parseInt(process.env.API_RATE_LIMIT) || 10,
    webRateLimit: parseInt(process.env.WEB_REQUEST_RATE_LIMIT) || 5
  },
  env: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info'
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL) || 86400,
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000
  },
  paths: {
    cache: join(__dirname, '../cache'),
    logs: join(__dirname, '../logs'),
    temp: join(__dirname, '../temp')
  }
};

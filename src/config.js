import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

dotenv.config();

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE_PATH = join(CURRENT_DIRECTORY, '../.config');
const CONFIG_LOAD_ERROR_MESSAGE = 'Failed to load config file:';

const DEFAULT_API_RATE_LIMIT = 10;
const DEFAULT_WEB_REQUEST_RATE_LIMIT = 5;
const DEFAULT_NODE_ENV = 'development';
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_CACHE_TTL = 86400;
const DEFAULT_CACHE_MAX_SIZE = 1000;

/**
 * Loads and parses the configuration file
 */
function loadConfigurationFile() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE_PATH, 'utf8'));
  } catch (error) {
    console.error(CONFIG_LOAD_ERROR_MESSAGE, error.message);
    process.exit(1);
  }
}

/**
 * Creates API configuration object
 */
function createApiConfiguration() {
  return {
    cohere: process.env.COHERE_API_KEY,
    serper: process.env.SERPER_API_KEY,
    rateLimit: parseInt(process.env.API_RATE_LIMIT) || DEFAULT_API_RATE_LIMIT,
    webRateLimit: parseInt(process.env.WEB_REQUEST_RATE_LIMIT) || DEFAULT_WEB_REQUEST_RATE_LIMIT
  };
}

/**
 * Creates environment configuration object
 */
function createEnvironmentConfiguration() {
  return {
    nodeEnv: process.env.NODE_ENV || DEFAULT_NODE_ENV,
    logLevel: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL
  };
}

/**
 * Creates cache configuration object
 */
function createCacheConfiguration() {
  return {
    ttl: parseInt(process.env.CACHE_TTL) || DEFAULT_CACHE_TTL,
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || DEFAULT_CACHE_MAX_SIZE
  };
}

/**
 * Creates paths configuration object
 */
function createPathsConfiguration() {
  return {
    cache: join(CURRENT_DIRECTORY, '../cache'),
    logs: join(CURRENT_DIRECTORY, '../logs'),
    temp: join(CURRENT_DIRECTORY, '../temp')
  };
}

const fileConfiguration = loadConfigurationFile();

export const CONFIG = {
  ...fileConfiguration,
  api: createApiConfiguration(),
  env: createEnvironmentConfiguration(),
  cache: createCacheConfiguration(),
  paths: createPathsConfiguration()
};

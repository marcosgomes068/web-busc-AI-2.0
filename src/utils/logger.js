import winston from 'winston';
import { join } from 'path';
import { CONFIG } from '../config.js';

const ERROR_LOG_FILENAME = 'error.log';
const COMBINED_LOG_FILENAME = 'combined.log';
const SERVICE_NAME = 'busc-ai';
const PRODUCTION_ENVIRONMENT = 'production';

/**
 * Creates and configures the main logger format
 */
function createLoggerFormat() {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );
}

/**
 * Creates file transport for error logs
 */
function createErrorFileTransport() {
  return new winston.transports.File({
    filename: join(CONFIG.paths.logs, ERROR_LOG_FILENAME),
    level: 'error'
  });
}

/**
 * Creates file transport for combined logs
 */
function createCombinedFileTransport() {
  return new winston.transports.File({
    filename: join(CONFIG.paths.logs, COMBINED_LOG_FILENAME)
  });
}

/**
 * Creates console transport for development environments
 */
function createConsoleTransport() {
  return new winston.transports.Console({
    format: winston.format.simple()
  });
}

/**
 * Creates array of base transports for file logging
 */
function createBaseTransports() {
  return [
    createErrorFileTransport(),
    createCombinedFileTransport()
  ];
}

/**
 * Determines if console logging should be enabled
 */
function shouldEnableConsoleLogging() {
  return CONFIG.env.nodeEnv !== PRODUCTION_ENVIRONMENT;
}

/**
 * Creates the complete logger configuration
 */
function createLoggerConfiguration() {
  const transports = createBaseTransports();
  
  if (shouldEnableConsoleLogging()) {
    transports.push(createConsoleTransport());
  }
  
  return {
    level: CONFIG.env.logLevel,
    format: createLoggerFormat(),
    defaultMeta: { service: SERVICE_NAME },
    transports
  };
}

const logger = winston.createLogger(createLoggerConfiguration());

export default logger;

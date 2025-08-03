import winston from 'winston';
import { join } from 'path';
import { CONFIG } from '../config.js';

const logger = winston.createLogger({
  level: CONFIG.env.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'busc-ai' },
  transports: [
    new winston.transports.File({
      filename: join(CONFIG.paths.logs, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: join(CONFIG.paths.logs, 'combined.log')
    })
  ]
});

if (CONFIG.env.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;

/**
 * @fileoverview Structured logging module for the blockchain application
 */
import winston from 'winston';
import path from 'path';

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'forge-mini-chain' },
  transports: [
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: path.join(process.env.DATA_DIR || '.', 'logs', 'combined.log'),
      maxsize: 10000000, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: path.join(process.env.DATA_DIR || '.', 'logs', 'error.log'),
      level: 'error',
      maxsize: 10000000, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// If we're not in production, also log to the console
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create a child logger with module context
export function createLogger(module: string) {
  return logger.child({ module });
}

export default logger;
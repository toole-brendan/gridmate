import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log levels for financial application
const customLevels = {
  levels: {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
  },
  colors: {
    fatal: 'red bold',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'grey'
  }
};

// Format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (metadata && Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    return log;
  })
);

// Create transport for error logs
const errorTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  format: logFormat
});

// Create transport for all logs
const combinedTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '14d',
  format: logFormat
});

// Create transport for audit logs (financial operations)
const auditTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '90d', // Keep audit logs for 3 months
  format: logFormat
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Create the main logger
export const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    errorTransport,
    combinedTransport,
    consoleTransport
  ],
  exitOnError: false
});

// Create audit logger for financial operations
export const auditLogger = winston.createLogger({
  levels: customLevels.levels,
  level: 'info',
  transports: [auditTransport],
  defaultMeta: { service: 'audit' }
});

// Add colors to winston
winston.addColors(customLevels.colors);

// Log unhandled errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

// Helper functions for structured logging
export function logSpreadsheetOperation(
  operation: string,
  details: any,
  userId?: string
): void {
  auditLogger.info('Spreadsheet operation', {
    operation,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
}

export function logAIOperation(
  operation: string,
  prompt: string,
  response?: string,
  error?: any,
  userId?: string
): void {
  const logData = {
    operation,
    prompt: prompt.substring(0, 200), // Truncate long prompts
    responseLength: response?.length,
    userId,
    timestamp: new Date().toISOString(),
    error: error ? error.message : undefined
  };

  if (error) {
    logger.error('AI operation failed', logData);
  } else {
    auditLogger.info('AI operation', logData);
  }
}

export function logAuthEvent(
  event: string,
  userId?: string,
  success: boolean = true,
  error?: any
): void {
  const logData = {
    event,
    userId,
    success,
    timestamp: new Date().toISOString(),
    error: error ? error.message : undefined
  };

  if (success) {
    auditLogger.info('Auth event', logData);
  } else {
    logger.warn('Auth event failed', logData);
  }
}

export function logPerformance(
  operation: string,
  durationMs: number,
  metadata?: any
): void {
  logger.debug('Performance metric', {
    operation,
    durationMs,
    timestamp: new Date().toISOString(),
    ...metadata
  });
}

// Flush logs before app quits
app.on('before-quit', async () => {
  logger.info('Application shutting down, flushing logs...');
  
  // Close all transports
  logger.end();
  auditLogger.end();
  
  // Wait for logs to be written
  await new Promise(resolve => setTimeout(resolve, 1000));
});

// Export log file paths for debugging
export function getLogFilePaths(): string[] {
  return [
    path.join(logsDir, `error-${new Date().toISOString().split('T')[0]}.log`),
    path.join(logsDir, `combined-${new Date().toISOString().split('T')[0]}.log`),
    path.join(logsDir, `audit-${new Date().toISOString().split('T')[0]}.log`)
  ];
}
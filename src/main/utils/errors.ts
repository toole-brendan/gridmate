export enum ErrorCode {
  // Spreadsheet errors
  SPREADSHEET_CONNECTION_FAILED = 'SPREADSHEET_CONNECTION_FAILED',
  SPREADSHEET_NOT_CONNECTED = 'SPREADSHEET_NOT_CONNECTED',
  SPREADSHEET_OPERATION_FAILED = 'SPREADSHEET_OPERATION_FAILED',
  SPREADSHEET_INVALID_RANGE = 'SPREADSHEET_INVALID_RANGE',
  
  // AI/LLM errors
  AI_CONNECTION_FAILED = 'AI_CONNECTION_FAILED',
  AI_RATE_LIMITED = 'AI_RATE_LIMITED',
  AI_INVALID_RESPONSE = 'AI_INVALID_RESPONSE',
  AI_TIMEOUT = 'AI_TIMEOUT',
  AI_UNAUTHORIZED = 'AI_UNAUTHORIZED',
  
  // Authentication errors
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  
  // Database errors
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // System errors
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorMetadata {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action?: string;
  context?: Record<string, any>;
  stackTrace?: string;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly metadata: ErrorMetadata;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    originalError?: Error,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.originalError = originalError;
    this.metadata = {
      timestamp: new Date(),
      stackTrace: this.stack,
      ...metadata
    };

    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      metadata: this.metadata
    };
  }
}

export class SpreadsheetError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(code, message, 400, true, originalError, metadata);
    this.name = 'SpreadsheetError';
  }
}

export class AIError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    originalError?: Error,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(code, message, statusCode, true, originalError, metadata);
    this.name = 'AIError';
  }
}

export class AuthError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(code, message, 401, true, originalError, metadata);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(ErrorCode.VALIDATION_FAILED, message, 400, true, undefined, metadata);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class DatabaseError extends AppError {
  constructor(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    metadata?: Partial<ErrorMetadata>
  ) {
    super(code, message, 500, true, originalError, metadata);
    this.name = 'DatabaseError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorCode(error: unknown): ErrorCode {
  if (isAppError(error)) {
    return error.code;
  }
  return ErrorCode.UNKNOWN_ERROR;
}

export interface ErrorRecoveryStrategy {
  shouldRetry: boolean;
  retryAfterMs?: number;
  fallbackAction?: () => Promise<any>;
  userMessage: string;
}

export function getRecoveryStrategy(error: AppError): ErrorRecoveryStrategy {
  switch (error.code) {
    case ErrorCode.AI_RATE_LIMITED:
      return {
        shouldRetry: true,
        retryAfterMs: 60000,
        userMessage: 'AI service is rate limited. Will retry in 1 minute.'
      };
    
    case ErrorCode.SPREADSHEET_CONNECTION_FAILED:
      return {
        shouldRetry: true,
        retryAfterMs: 5000,
        userMessage: 'Failed to connect to spreadsheet. Retrying...'
      };
    
    case ErrorCode.AUTH_TOKEN_EXPIRED:
      return {
        shouldRetry: false,
        userMessage: 'Authentication expired. Please sign in again.',
        fallbackAction: async () => {
          // Trigger re-authentication flow
        }
      };
    
    case ErrorCode.NETWORK_ERROR:
    case ErrorCode.TIMEOUT_ERROR:
      return {
        shouldRetry: true,
        retryAfterMs: 3000,
        userMessage: 'Network issue detected. Retrying...'
      };
    
    case ErrorCode.VALIDATION_FAILED:
    case ErrorCode.INVALID_INPUT:
      return {
        shouldRetry: false,
        userMessage: 'Invalid input provided. Please check your data.'
      };
    
    default:
      return {
        shouldRetry: false,
        userMessage: 'An unexpected error occurred. Please try again.'
      };
  }
}
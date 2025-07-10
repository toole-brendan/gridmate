import { app, dialog, BrowserWindow } from 'electron';
import { AppError, isOperationalError, getErrorMessage, getRecoveryStrategy } from './errors';
import { logger } from './logger'; // We'll create this next

export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryQueue: Map<string, { count: number; lastAttempt: Date }> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;

  private constructor() {
    this.setupGlobalHandlers();
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      
      if (!isOperationalError(error)) {
        // Non-operational error, should restart the app
        this.handleCriticalError(error);
      } else {
        this.handleError(error as AppError);
      }
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(error);
    });

    // Handle Electron-specific errors
    app.on('gpu-process-crashed', (event, killed) => {
      logger.error('GPU process crashed', { killed });
      this.notifyUser('GPU process crashed. Some features may not work correctly.');
    });

    app.on('renderer-process-crashed', (event, webContents, killed) => {
      logger.error('Renderer process crashed', { killed });
      this.handleCriticalError(new Error('Renderer process crashed'));
    });
  }

  public async handleError(error: Error | AppError, context?: any): Promise<void> {
    // Log the error with context
    logger.error('Error occurred:', {
      error: error instanceof AppError ? error.toJSON() : {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });

    if (error instanceof AppError) {
      const recovery = getRecoveryStrategy(error);
      
      if (recovery.shouldRetry) {
        await this.handleRetry(error, recovery.retryAfterMs || 1000);
      } else if (recovery.fallbackAction) {
        try {
          await recovery.fallbackAction();
        } catch (fallbackError) {
          logger.error('Fallback action failed:', fallbackError);
        }
      }

      // Notify user with appropriate message
      this.notifyUser(recovery.userMessage, error.isOperational ? 'warning' : 'error');
    } else {
      // Unknown error type
      this.notifyUser('An unexpected error occurred. Please try again.');
    }
  }

  private async handleRetry(error: AppError, delayMs: number): Promise<void> {
    const retryKey = `${error.code}-${error.message}`;
    const retryInfo = this.retryQueue.get(retryKey) || { count: 0, lastAttempt: new Date() };
    
    if (retryInfo.count >= this.MAX_RETRY_ATTEMPTS) {
      logger.warn('Max retry attempts reached for error:', error.code);
      this.retryQueue.delete(retryKey);
      this.notifyUser('Operation failed after multiple attempts. Please try again later.');
      return;
    }

    retryInfo.count++;
    retryInfo.lastAttempt = new Date();
    this.retryQueue.set(retryKey, retryInfo);

    logger.info(`Retrying operation in ${delayMs}ms (attempt ${retryInfo.count}/${this.MAX_RETRY_ATTEMPTS})`);
    
    // Schedule retry
    setTimeout(() => {
      // Emit retry event that services can listen to
      app.emit('retry-operation', error);
    }, delayMs);
  }

  private handleCriticalError(error: Error): void {
    logger.fatal('Critical error occurred:', error);

    // Show error dialog
    dialog.showErrorBox(
      'Critical Error',
      `A critical error has occurred:\n\n${error.message}\n\nThe application will now restart.`
    );

    // Restart the app after a delay
    setTimeout(() => {
      app.relaunch();
      app.exit(1);
    }, 1000);
  }

  private notifyUser(message: string, type: 'info' | 'warning' | 'error' = 'error'): void {
    // Send to all renderer processes
    BrowserWindow.getAllWindows().forEach(window => {
      window.webContents.send('error-notification', {
        message,
        type,
        timestamp: new Date().toISOString()
      });
    });

    // Also log for debugging
    logger[type](`User notification: ${message}`);
  }

  public async wrapAsync<T>(
    operation: () => Promise<T>,
    errorContext?: any
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      await this.handleError(error as Error, errorContext);
      return null;
    }
  }

  public clearRetryQueue(): void {
    this.retryQueue.clear();
  }
}
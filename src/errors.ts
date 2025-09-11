/**
 * @fileoverview Error handling utilities and custom error types for the blockchain
 */

/**
 * Custom error types for different blockchain operations
 */
export class BlockchainError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class ValidationError extends BlockchainError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class TransactionError extends BlockchainError {
  constructor(message: string, public txHash?: string, details?: any) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export class ConsensusError extends BlockchainError {
  constructor(message: string, public blockHeight?: number, details?: any) {
    super(message, 'CONSENSUS_ERROR', details);
    this.name = 'ConsensusError';
  }
}

export class NetworkError extends BlockchainError {
  constructor(message: string, public peerId?: string, details?: any) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private readonly maxRetries = 3;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with optional retry logic
   */
  async handleError<T>(
    operation: () => Promise<T>,
    errorType: string,
    maxRetries: number = this.maxRetries,
    retryDelay: number = 1000
  ): Promise<T> {
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
        const result = await operation();
        // Reset error count on success
        this.errorCounts.delete(errorType);
        return result;
      } catch (error) {
        attempts++;
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
        
        console.error(`[error] ${errorType} attempt ${attempts}/${maxRetries + 1}: ${(error as Error).message}`);
        
        if (attempts > maxRetries) {
          throw error;
        }
        
        // Wait before retry
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        }
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Log error with context
   */
  logError(error: Error, context: string, additionalInfo?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name,
      ...additionalInfo
    };

    console.error(`[${timestamp}] ERROR in ${context}:`, JSON.stringify(errorInfo, null, 2));
  }

  /**
   * Create a safe async wrapper for operations
   */
  safeAsync<T>(
    operation: () => Promise<T>,
    fallback?: T,
    context?: string
  ): Promise<T | undefined> {
    return operation().catch(error => {
      if (context) {
        this.logError(error, context);
      }
      return fallback;
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  /**
   * Reset error counts
   */
  resetErrorStats(): void {
    this.errorCounts.clear();
  }
}

/**
 * Graceful shutdown handler
 */
export class ShutdownHandler {
  private static instance: ShutdownHandler;
  private shutdownCallbacks: Array<() => Promise<void>> = [];
  private isShuttingDown = false;

  static getInstance(): ShutdownHandler {
    if (!ShutdownHandler.instance) {
      ShutdownHandler.instance = new ShutdownHandler();
    }
    return ShutdownHandler.instance;
  }

  /**
   * Register a callback to run during shutdown
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Initialize shutdown handlers for process signals
   */
  init(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        
        console.log(`[shutdown] Received ${signal}, initiating graceful shutdown...`);
        
        try {
          await this.executeShutdown();
          process.exit(0);
        } catch (error) {
          console.error('[shutdown] Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('[uncaught] Uncaught Exception:', error);
      this.executeShutdown().then(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[unhandled] Unhandled Rejection at:', promise, 'reason:', reason);
      this.executeShutdown().then(() => process.exit(1));
    });
  }

  private async executeShutdown(): Promise<void> {
    console.log('[shutdown] Executing shutdown callbacks...');
    
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('[shutdown] Error in shutdown callback:', error);
      }
    }
    
    console.log('[shutdown] Graceful shutdown completed');
  }
}

/**
 * Circuit breaker for preventing cascade failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number } {
    return { state: this.state, failures: this.failures };
  }
}
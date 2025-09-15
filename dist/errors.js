/**
 * @fileoverview Error handling utilities and custom error types for the blockchain
 */
/**
 * Custom error types for different blockchain operations
 */
export class BlockchainError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'BlockchainError';
    }
}
export class ValidationError extends BlockchainError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
export class TransactionError extends BlockchainError {
    txHash;
    constructor(message, txHash, details) {
        super(message, 'TRANSACTION_ERROR', details);
        this.txHash = txHash;
        this.name = 'TransactionError';
    }
}
export class ConsensusError extends BlockchainError {
    blockHeight;
    constructor(message, blockHeight, details) {
        super(message, 'CONSENSUS_ERROR', details);
        this.blockHeight = blockHeight;
        this.name = 'ConsensusError';
    }
}
export class NetworkError extends BlockchainError {
    peerId;
    constructor(message, peerId, details) {
        super(message, 'NETWORK_ERROR', details);
        this.peerId = peerId;
        this.name = 'NetworkError';
    }
}
/**
 * Error handling utilities
 */
export class ErrorHandler {
    static instance;
    errorCounts = new Map();
    maxRetries = 3;
    static getInstance() {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }
    /**
     * Handle an error with optional retry logic
     */
    async handleError(operation, errorType, maxRetries = this.maxRetries, retryDelay = 1000) {
        let attempts = 0;
        while (attempts <= maxRetries) {
            try {
                const result = await operation();
                // Reset error count on success
                this.errorCounts.delete(errorType);
                return result;
            }
            catch (error) {
                attempts++;
                const currentCount = this.errorCounts.get(errorType) || 0;
                this.errorCounts.set(errorType, currentCount + 1);
                console.error(`[error] ${errorType} attempt ${attempts}/${maxRetries + 1}: ${error.message}`);
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
    logError(error, context, additionalInfo) {
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
    safeAsync(operation, fallback, context) {
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
    getErrorStats() {
        return Object.fromEntries(this.errorCounts);
    }
    /**
     * Reset error counts
     */
    resetErrorStats() {
        this.errorCounts.clear();
    }
}
/**
 * Graceful shutdown handler
 */
export class ShutdownHandler {
    static instance;
    shutdownCallbacks = [];
    isShuttingDown = false;
    static getInstance() {
        if (!ShutdownHandler.instance) {
            ShutdownHandler.instance = new ShutdownHandler();
        }
        return ShutdownHandler.instance;
    }
    /**
     * Register a callback to run during shutdown
     */
    onShutdown(callback) {
        this.shutdownCallbacks.push(callback);
    }
    /**
     * Initialize shutdown handlers for process signals
     */
    init() {
        const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown)
                    return;
                this.isShuttingDown = true;
                console.log(`[shutdown] Received ${signal}, initiating graceful shutdown...`);
                try {
                    await this.executeShutdown();
                    process.exit(0);
                }
                catch (error) {
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
    async executeShutdown() {
        console.log('[shutdown] Executing shutdown callbacks...');
        for (const callback of this.shutdownCallbacks) {
            try {
                await callback();
            }
            catch (error) {
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
    threshold;
    timeout;
    failures = 0;
    lastFailureTime = 0;
    state = 'CLOSED';
    constructor(threshold = 5, timeout = 60000 // 1 minute
    ) {
        this.threshold = threshold;
        this.timeout = timeout;
    }
    async execute(operation) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                this.state = 'HALF_OPEN';
            }
            else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.state = 'CLOSED';
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = 'OPEN';
        }
    }
    getState() {
        return { state: this.state, failures: this.failures };
    }
}

/**
 * js/utils/logger.js
 * Structured logging and error handling utility
 * Allows centralized error tracking and debug mode toggle
 */

export class Logger {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.context = options.context || 'APP';
    this.service = options.errorService || null; // Sentry, LogRocket, etc
  }

  /**
   * Log error with context
   * @param {string} context - Error context (e.g., 'page-loader', 'shop')
   * @param {Error|string} error - Error object or message
   * @param {object} extra - Additional context data
   */
  error(context, error, extra = {}) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    const logEntry = {
      level: 'ERROR',
      timestamp,
      context,
      message: errorMessage,
      stack: errorStack,
      ...extra
    };

    if (this.debug) {
      console.error(`[${context}] ${errorMessage}`, error, extra);
    }

    // Send to error tracking service in production
    if (this.service && typeof this.service.captureException === 'function') {
      this.service.captureException(error, {
        contexts: { app: { ...logEntry, ...extra } }
      });
    }
  }

  /**
   * Log warning
   * @param {string} context - Context
   * @param {string} message - Warning message
   * @param {object} extra - Additional data
   */
  warn(context, message, extra = {}) {
    if (this.debug) {
      console.warn(`[${context}] ${message}`, extra);
    }
  }

  /**
   * Log info
   * @param {string} context - Context
   * @param {string} message - Info message
   * @param {object} extra - Additional data
   */
  info(context, message, extra = {}) {
    if (this.debug) {
      console.info(`[${context}] ${message}`, extra);
    }
  }

  /**
   * Log debug message
   * @param {string} context - Context
   * @param {string} message - Debug message
   * @param {object} data - Data to log
   */
  debug(context, message, data = {}) {
    if (this.debug) {
      console.debug(`[${context}] ${message}`, data);
    }
  }
}

// Create a global instance
if (typeof window !== 'undefined') {
  window.__Logger__ = new Logger({
    debug: typeof window.__ENV_DEBUG !== 'undefined' ? window.__ENV_DEBUG : false,
    context: 'DORNORI'
  });
}

export default Logger;

import { CONFIG } from '@/blockchain/config/config.js';

/**
 * Logger utility for development and debugging
 * Provides configurable logging with different levels and formatting
 */
export class Logger {
  constructor(component = 'App') {
    this.component = component;
    this.config = CONFIG.LOGGING;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * Check if logging is enabled and if the level should be logged
   * @param {string} level - Log level to check
   * @returns {boolean} - Whether to log this message
   */
  shouldLog(level) {
    if (!this.config.ENABLED) return false;
    
    const currentLevel = this.levels[this.config.LEVEL] || 0;
    const messageLevel = this.levels[level] || 0;
    
    return messageLevel >= currentLevel;
  }

  /**
   * Format log message with timestamp and component name
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data to log
   * @returns {string} - Formatted log message
   */
  formatMessage(level, message, data = null) {
    let formattedMessage = '';
    
    // Add timestamp if enabled
    if (this.config.TIMESTAMPS) {
      const timestamp = new Date().toISOString();
      formattedMessage += `[${timestamp}] `;
    }
    
    // Add component name if enabled
    if (this.config.SHOW_COMPONENT) {
      formattedMessage += `[${this.component}] `;
    }
    
    // Add log level
    formattedMessage += `[${level.toUpperCase()}] `;
    
    // Add main message
    formattedMessage += message;
    
    return formattedMessage;
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {any} data - Additional data
   */
  debug(message, data = null) {
    if (!this.shouldLog('debug')) return;
    
    const formattedMessage = this.formatMessage('debug', message);
    
    if (this.config.CONSOLE) {
      if (data !== null) {
        console.debug(formattedMessage, data);
      } else {
        console.debug(formattedMessage);
      }
    }
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {any} data - Additional data
   */
  info(message, data = null) {
    if (!this.shouldLog('info')) return;
    
    const formattedMessage = this.formatMessage('info', message);
    
    if (this.config.CONSOLE) {
      if (data !== null) {
        console.info(formattedMessage, data);
      } else {
        console.info(formattedMessage);
      }
    }
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {any} data - Additional data
   */
  warn(message, data = null) {
    if (!this.shouldLog('warn')) return;
    
    const formattedMessage = this.formatMessage('warn', message);
    
    if (this.config.CONSOLE) {
      if (data !== null) {
        console.warn(formattedMessage, data);
      } else {
        console.warn(formattedMessage);
      }
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {any} data - Additional data
   */
  error(message, data = null) {
    if (!this.shouldLog('error')) return;
    
    const formattedMessage = this.formatMessage('error', message);
    
    if (this.config.CONSOLE) {
      if (data !== null) {
        console.error(formattedMessage, data);
      } else {
        console.error(formattedMessage);
      }
    }
  }

  /**
   * Log blockchain-specific operations
   * @param {string} operation - Operation being performed
   * @param {any} data - Operation data
   */
  blockchain(operation, data = null) {
    if (!this.config.BLOCKCHAIN_LOGGING) return;
    
    this.debug(`🔗 Blockchain: ${operation}`, data);
  }

  /**
   * Log wallet-specific operations
   * @param {string} operation - Operation being performed
   * @param {any} data - Operation data
   */
  wallet(operation, data = null) {
    if (!this.config.WALLET_LOGGING) return;
    
    this.debug(`👛 Wallet: ${operation}`, data);
  }

  /**
   * Log transaction details
   * @param {string} txType - Type of transaction
   * @param {any} txData - Transaction data
   */
  transaction(txType, txData = null) {
    this.info(`📝 Transaction: ${txType}`, txData);
  }

  /**
   * Log performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {any} additionalData - Additional performance data
   */
  performance(operation, duration, additionalData = null) {
    this.info(`⚡ Performance: ${operation} took ${duration}ms`, additionalData);
  }

  /**
   * Create a child logger with a specific component name
   * @param {string} childComponent - Child component name
   * @returns {Logger} - New logger instance
   */
  child(childComponent) {
    return new Logger(`${this.component}.${childComponent}`);
  }
}

// Create default logger instance
export const logger = new Logger('App');

// Export convenience functions
export const log = {
  debug: (message, data) => logger.debug(message, data),
  info: (message, data) => logger.info(message, data),
  warn: (message, data) => logger.warn(message, data),
  error: (message, data) => logger.error(message, data),
  blockchain: (operation, data) => logger.blockchain(operation, data),
  wallet: (operation, data) => logger.wallet(operation, data),
  transaction: (txType, txData) => logger.transaction(txType, txData),
  performance: (operation, duration, data) => logger.performance(operation, duration, data)
};

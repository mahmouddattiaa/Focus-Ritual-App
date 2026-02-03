/**
 * Logger Utility
 * Replaces console.log with proper logging for production
 */

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Format timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Info level logging - general information
   */
  info(message, ...args) {
    if (this.isDevelopment) {
      console.log(
        `${colors.blue}[INFO ${this.getTimestamp()}]${colors.reset}`,
        message,
        ...args
      );
    }
  }

  /**
   * Success level logging - successful operations
   */
  success(message, ...args) {
    if (this.isDevelopment) {
      console.log(
        `${colors.green}[SUCCESS ${this.getTimestamp()}]${colors.reset}`,
        message,
        ...args
      );
    }
  }

  /**
   * Warning level logging - potential issues
   */
  warn(message, ...args) {
    console.warn(
      `${colors.yellow}[WARN ${this.getTimestamp()}]${colors.reset}`,
      message,
      ...args
    );
  }

  /**
   * Error level logging - errors and exceptions
   */
  error(message, error, ...args) {
    console.error(
      `${colors.red}[ERROR ${this.getTimestamp()}]${colors.reset}`,
      message,
      error,
      ...args
    );
  }

  /**
   * Debug level logging - detailed debugging info
   */
  debug(message, ...args) {
    if (this.isDevelopment && process.env.DEBUG === "true") {
      console.log(
        `${colors.magenta}[DEBUG ${this.getTimestamp()}]${colors.reset}`,
        message,
        ...args
      );
    }
  }

  /**
   * HTTP request logging
   */
  http(method, path, statusCode, responseTime) {
    const color = statusCode >= 400 ? colors.red : colors.green;
    if (this.isDevelopment) {
      console.log(
        `${colors.cyan}[HTTP ${this.getTimestamp()}]${colors.reset}`,
        `${color}${method}${colors.reset}`,
        path,
        `${color}${statusCode}${colors.reset}`,
        `${responseTime}ms`
      );
    }
  }

  /**
   * Database operation logging
   */
  db(operation, collection, details) {
    if (this.isDevelopment) {
      console.log(
        `${colors.blue}[DB ${this.getTimestamp()}]${colors.reset}`,
        operation,
        collection,
        details || ""
      );
    }
  }
}

// Export singleton instance
module.exports = new Logger();

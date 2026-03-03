/**
 * @file logger.js
 * @description Custom logger utility for GoTrack. Wraps console methods with
 * structured formatting. All components must use this instead of raw console.log.
 *
 * Log format: [ComponentName] action description
 * Levels: info, warn, error, debug
 */

const isDev = import.meta.env.DEV;

/**
 * @typedef {'info' | 'warn' | 'error' | 'debug'} LogLevel
 */

/**
 * Internal log dispatcher — formats and outputs a log message.
 * @param {LogLevel} level - Log severity level
 * @param {string} message - The log message
 * @param {...any} args - Optional additional data to log
 */
const _log = (level, message, ...args) => {
  if (!isDev && level === 'debug') return;

  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[GT ${timestamp}]`;

  switch (level) {
    case 'info':
      // eslint-disable-next-line no-console
      console.info(`${prefix} ℹ️  ${message}`, ...args);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(`${prefix} ⚠️  ${message}`, ...args);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(`${prefix} ❌ ${message}`, ...args);
      break;
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug(`${prefix} 🐛 ${message}`, ...args);
      break;
    default:
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${message}`, ...args);
  }
};

/**
 * GoTrack logger utility.
 * Usage: logger.info('[ComponentName] Something happened', optionalData)
 */
const logger = {
  /**
   * Log an informational message.
   * @param {string} message - Log message (include [ComponentName] prefix)
   * @param {...any} args - Optional additional data
   */
  info: (message, ...args) => _log('info', message, ...args),

  /**
   * Log a warning (non-critical issue).
   * @param {string} message - Log message
   * @param {...any} args - Optional additional data
   */
  warn: (message, ...args) => _log('warn', message, ...args),

  /**
   * Log an error (failures, unexpected states).
   * @param {string} message - Log message
   * @param {...any} args - Optional additional data
   */
  error: (message, ...args) => _log('error', message, ...args),

  /**
   * Log a debug message (dev-only, stripped in production).
   * @param {string} message - Log message
   * @param {...any} args - Optional additional data
   */
  debug: (message, ...args) => _log('debug', message, ...args),
};

export default logger;

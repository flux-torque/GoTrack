/**
 * @file logger.js
 * @description Simple structured logger for gt-api.
 * Format: [LEVEL] [timestamp] message
 */

const timestamp = () => new Date().toISOString();

export const logger = {
  info:  (...args) => console.log(`[INFO]  ${timestamp()}`, ...args),
  warn:  (...args) => console.warn(`[WARN]  ${timestamp()}`, ...args),
  error: (...args) => console.error(`[ERROR] ${timestamp()}`, ...args),
  debug: (...args) => console.debug(`[DEBUG] ${timestamp()}`, ...args),
};

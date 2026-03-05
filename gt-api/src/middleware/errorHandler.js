/**
 * @file middleware/errorHandler.js
 * @description Global Express error handler.
 * Catches any error thrown or passed to next(err) in routes.
 */

import { logger } from '../utils/logger.js';

/**
 * Express error-handling middleware (4-argument signature required).
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
export function errorHandler(err, req, res, _next) {
  logger.error(`[errorHandler] ${req.method} ${req.path}`, err.message);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

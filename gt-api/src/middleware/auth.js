/**
 * @file middleware/auth.js
 * @description Verifies the Supabase JWT sent by the GT frontend.
 * Attaches the decoded user to req.user on success.
 *
 * The frontend sends: Authorization: Bearer <supabase_access_token>
 * We verify it server-side using the Supabase admin client.
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Express middleware — authenticates requests from the GT frontend.
 * Rejects with 401 if the token is missing, expired, or invalid.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    logger.warn('[middleware/auth] Invalid or expired token:', error?.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  next();
}

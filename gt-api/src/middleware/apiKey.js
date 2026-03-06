/**
 * @file middleware/apiKey.js
 * @description Authenticates external POST requests (e.g. iOS Shortcuts)
 * using the user's personal API key stored in the profiles table.
 *
 * External callers send: Authorization: Bearer <api_key>
 * We look up the api_key in profiles, attach the user_id to req.
 */

import { supabase } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

/**
 * Express middleware — authenticates external API key requests.
 * Rejects with 401 if the key is missing or not found.
 *
 * On success, attaches req.userId (string UUID).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function requireApiKey(req, res, next) {
  // Accept key from Authorization header OR ?key= query param (for iOS Shortcuts)
  const authHeader = req.headers.authorization;
  const apiKey = (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)
              ?? req.query.key
              ?? null;

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key — pass as Authorization: Bearer <key> or ?key=<key>' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('api_key', apiKey)
    .single();

  if (error || !data) {
    logger.warn('[middleware/apiKey] Invalid API key attempted');
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.userId = data.id;
  next();
}

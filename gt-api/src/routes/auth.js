/**
 * @file routes/auth.js
 * @description Auth routes — proxies sign-up, sign-in, sign-out to Supabase Auth.
 * The frontend never calls Supabase directly; all auth goes through here.
 *
 * Routes:
 *   POST /auth/signup
 *   POST /auth/signin
 *   POST /auth/signout
 *   GET  /auth/me        (requires auth)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const authRouter = Router();

const credentialsSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

/**
 * POST /auth/signup
 * Body: { email, password }
 */
authRouter.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation for now
    });

    if (error) {
      logger.warn('[auth/signup] Signup failed:', error.message);
      return res.status(400).json({ error: error.message });
    }

    logger.info(`[auth/signup] New user created: ${data.user.id}`);
    res.status(201).json({ message: 'Account created. You can now sign in.' });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

/**
 * POST /auth/signin
 * Body: { email, password }
 * Returns: { access_token, refresh_token, user }
 */
authRouter.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logger.warn('[auth/signin] Signin failed:', error.message);
      return res.status(401).json({ error: error.message });
    }

    logger.info(`[auth/signin] User signed in: ${data.user.id}`);
    res.json({
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at:    data.session.expires_at,
      user: {
        id:    data.user.id,
        email: data.user.email,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

/**
 * POST /auth/signout
 * Requires: Authorization: Bearer <access_token>
 */
authRouter.post('/signout', requireAuth, async (req, res, next) => {
  try {
    const token = req.headers.authorization.slice(7);
    await supabase.auth.admin.signOut(token);
    logger.info(`[auth/signout] User signed out: ${req.user.id}`);
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Requires: Authorization: Bearer <access_token>
 * Returns the current user's profile + api_key
 */
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, api_key, created_at')
      .eq('id', req.user.id)
      .single();

    if (error) return res.status(404).json({ error: 'Profile not found' });

    res.json({
      id:           req.user.id,
      email:        req.user.email,
      display_name: data.display_name,
      api_key:      data.api_key,
      created_at:   data.created_at,
    });
  } catch (err) {
    next(err);
  }
});

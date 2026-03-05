/**
 * @file routes/statements.js
 * @description Statement import tracking and monthly balance routes.
 * Called by the frontend after parsing a bank PDF.
 *
 * Routes:
 *   POST /statements              — record a new statement import
 *   GET  /statements              — list all imports for the user
 *   GET  /statements/balances     — get monthly_balances for the user
 *   POST /statements/balances     — upsert a monthly balance entry
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const statementsRouter = Router();

statementsRouter.use(requireAuth);

// ─── POST /statements ─────────────────────────────────────────────────────────

/**
 * POST /statements
 * Records a PDF statement upload. Called after bulk transaction insert.
 * Returns the created statement_imports row (id used to link transactions).
 */
statementsRouter.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      statement_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      statement_to:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      opening_balance: z.number(),
      closing_balance: z.number(),
      bank:            z.string().default('icici'),
      tx_count:        z.number().int().nonnegative(),
      tx_skipped:      z.number().int().nonnegative(),
    });

    const body = schema.parse(req.body);

    const { data, error } = await supabase
      .from('statement_imports')
      .insert({ ...body, user_id: req.user.id })
      .select()
      .single();

    if (error) throw error;

    logger.info(`[statements/POST] Import recorded ${data.id} for user=${req.user.id}`);
    res.status(201).json(data);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// ─── GET /statements ──────────────────────────────────────────────────────────

/**
 * GET /statements
 * Returns all statement imports for the user, newest first.
 */
statementsRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('statement_imports')
      .select('*')
      .eq('user_id', req.user.id)
      .order('imported_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /statements/balances ─────────────────────────────────────────────────

/**
 * GET /statements/balances
 * Returns all monthly_balances rows for the user.
 */
statementsRouter.get('/balances', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('monthly_balances')
      .select('*')
      .eq('user_id', req.user.id)
      .order('month', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /statements/balances ────────────────────────────────────────────────

/**
 * POST /statements/balances
 * Upserts a monthly balance entry.
 * The most recently-dated statement wins for opening/closing balance.
 * Called once per calendar month covered by a statement import.
 */
statementsRouter.post('/balances', async (req, res, next) => {
  try {
    const schema = z.object({
      month:           z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
      opening_balance: z.number(),
      closing_balance: z.number(),
      statement_from:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      statement_to:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      source:          z.string().default('icici_pdf'),
    });

    const body = schema.parse(req.body);

    // Use a Postgres function to handle the conditional upsert logic
    const { error } = await supabase.rpc('upsert_monthly_balance', {
      p_user_id:  req.user.id,
      p_month:    body.month,
      p_opening:  body.opening_balance,
      p_closing:  body.closing_balance,
      p_from:     body.statement_from,
      p_to:       body.statement_to,
      p_source:   body.source,
    });

    if (error) throw error;

    logger.info(`[statements/balances POST] Upserted balance for month=${body.month} user=${req.user.id}`);
    res.json({ message: 'Monthly balance updated', month: body.month });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

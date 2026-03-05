/**
 * @file routes/transactions.js
 * @description Transaction CRUD routes — used by the GT frontend.
 * All routes require a valid Supabase JWT (requireAuth middleware).
 *
 * Routes:
 *   GET    /transactions              — fetch all (with optional month filter)
 *   POST   /transactions              — create single transaction (manual entry)
 *   POST   /transactions/bulk         — bulk insert from PDF parser (dedup applied)
 *   PATCH  /transactions/:id          — update (e.g. toggle budget_excluded)
 *   DELETE /transactions/:id          — delete
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { computeTxnHash } from '../utils/hash.js';
import { logger } from '../utils/logger.js';

export const transactionsRouter = Router();

// All routes in this file require JWT auth
transactionsRouter.use(requireAuth);

// ─── Shared Zod schemas ───────────────────────────────────────────────────────

const txnSchema = z.object({
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  description:      z.string().min(1).max(500),
  amount:           z.number().positive(),
  type:             z.enum(['expense', 'income']),
  category:         z.string().optional().default('other'),
  bank_ref:         z.string().optional().nullable(),
  budget_excluded:  z.boolean().optional().default(false),
  source:           z.string().optional().default('manual'),
  statement_id:     z.string().uuid().optional().nullable(),
});

// ─── GET /transactions ────────────────────────────────────────────────────────

/**
 * GET /transactions?month=YYYY-MM
 * Returns all transactions for the user, optionally filtered to a calendar month.
 */
transactionsRouter.get('/', async (req, res, next) => {
  try {
    const { month } = req.query;

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (month) {
      const [year, mon] = month.split('-');
      const from = `${year}-${mon}-01`;
      // last day of month
      const to = new Date(Number(year), Number(mon), 0).toISOString().slice(0, 10);
      query = query.gte('date', from).lte('date', to);
    }

    const { data, error } = await query;
    if (error) throw error;

    logger.info(`[transactions/GET] user=${req.user.id} count=${data.length} month=${month ?? 'all'}`);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ─── POST /transactions (single manual entry) ─────────────────────────────────

/**
 * POST /transactions
 * Body: single transaction object (txnSchema)
 * Hash is computed server-side — client does not send txn_hash.
 */
transactionsRouter.post('/', async (req, res, next) => {
  try {
    const tx = txnSchema.parse(req.body);
    const txn_hash = computeTxnHash(tx.date, tx.amount, tx.type, tx.description);

    const row = { ...tx, user_id: req.user.id, txn_hash };

    const { data, error } = await supabase
      .from('transactions')
      .insert(row)
      .select()
      .single();

    if (error) {
      // Unique constraint violation = duplicate
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Duplicate transaction — already exists' });
      }
      throw error;
    }

    logger.info(`[transactions/POST] Inserted txn ${data.id} for user=${req.user.id}`);
    res.status(201).json(data);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// ─── POST /transactions/bulk ──────────────────────────────────────────────────

/**
 * POST /transactions/bulk
 * Body: { transactions: txnSchema[], statement_id?: string }
 * Hashes computed server-side. Duplicates silently skipped (ON CONFLICT DO NOTHING).
 * Returns: { inserted, skipped }
 */
transactionsRouter.post('/bulk', async (req, res, next) => {
  try {
    const bulkSchema = z.object({
      transactions: z.array(txnSchema).min(1).max(1000),
      statement_id: z.string().uuid().optional().nullable(),
    });

    const { transactions, statement_id } = bulkSchema.parse(req.body);

    const rows = transactions.map((tx) => ({
      ...tx,
      user_id:      req.user.id,
      txn_hash:     computeTxnHash(tx.date, tx.amount, tx.type, tx.description),
      statement_id: statement_id ?? null,
    }));

    // Insert with dedup — conflicts silently skipped
    const { data, error } = await supabase
      .from('transactions')
      .upsert(rows, {
        onConflict:    'user_id,txn_hash',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;

    const inserted = data?.length ?? 0;
    const skipped  = rows.length - inserted;

    logger.info(`[transactions/bulk] user=${req.user.id} inserted=${inserted} skipped=${skipped}`);
    res.status(201).json({ inserted, skipped });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// ─── PATCH /transactions/:id ──────────────────────────────────────────────────

/**
 * PATCH /transactions/:id
 * Partial update — currently used to toggle budget_excluded and update category.
 * Only the owning user can update their own transaction.
 */
transactionsRouter.patch('/:id', async (req, res, next) => {
  try {
    const patchSchema = z.object({
      budget_excluded: z.boolean().optional(),
      category:        z.string().optional(),
      description:     z.string().min(1).max(500).optional(),
    });

    const updates = patchSchema.parse(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)   // ownership check
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Transaction not found' });

    logger.info(`[transactions/PATCH] Updated txn ${req.params.id}`);
    res.json(data);
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// ─── DELETE /transactions/:id ─────────────────────────────────────────────────

/**
 * DELETE /transactions/:id
 * Only the owning user can delete their own transaction.
 */
transactionsRouter.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);   // ownership check

    if (error) throw error;

    logger.info(`[transactions/DELETE] Deleted txn ${req.params.id} for user=${req.user.id}`);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
});

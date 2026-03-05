/**
 * @file routes/budgets.js
 * @description Budget settings routes.
 * Stores the global default budget and per-month overrides.
 *
 * Routes:
 *   GET  /budgets   — load all budget settings for the user
 *   POST /budgets   — upsert default or per-month budget
 *   DELETE /budgets/:month — remove a month override (pass 'default' for global)
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

// ─── GET /budgets ─────────────────────────────────────────────────────────────

/**
 * GET /budgets
 * Returns all budget settings for the user.
 * Response shape matches BudgetContext: { defaultBudget, monthlyBudgets }
 */
budgetsRouter.get('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('budget_settings')
      .select('month, monthly_budget')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const defaultRow     = data.find((r) => r.month === null);
    const defaultBudget  = defaultRow?.monthly_budget ?? null;
    const monthlyBudgets = Object.fromEntries(
      data.filter((r) => r.month !== null).map((r) => [r.month, r.monthly_budget])
    );

    logger.info(`[budgets/GET] user=${req.user.id} rows=${data.length}`);
    res.json({ defaultBudget, monthlyBudgets });
  } catch (err) {
    next(err);
  }
});

// ─── POST /budgets ────────────────────────────────────────────────────────────

/**
 * POST /budgets
 * Body: { monthly_budget, month? }
 * Omit month (or pass null) for global default.
 * Pass 'YYYY-MM' string for a month-specific override.
 */
budgetsRouter.post('/', async (req, res, next) => {
  try {
    const schema = z.object({
      monthly_budget: z.number().nonnegative(),
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM')
        .optional()
        .nullable(),
    });

    const { monthly_budget, month } = schema.parse(req.body);

    const { error } = await supabase
      .from('budget_settings')
      .upsert(
        { user_id: req.user.id, month: month ?? null, monthly_budget },
        { onConflict: 'user_id,month' }
      );

    if (error) throw error;

    logger.info(`[budgets/POST] user=${req.user.id} month=${month ?? 'default'} amount=${monthly_budget}`);
    res.json({ message: 'Budget saved', month: month ?? null, monthly_budget });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    next(err);
  }
});

// ─── DELETE /budgets/:month ───────────────────────────────────────────────────

/**
 * DELETE /budgets/:month
 * Pass 'default' to delete the global default, or 'YYYY-MM' for a month override.
 */
budgetsRouter.delete('/:month', async (req, res, next) => {
  try {
    const monthParam = req.params.month === 'default' ? null : req.params.month;

    const query = supabase
      .from('budget_settings')
      .delete()
      .eq('user_id', req.user.id);

    // Handle null vs string month filter
    const { error } = monthParam === null
      ? await query.is('month', null)
      : await query.eq('month', monthParam);

    if (error) throw error;

    logger.info(`[budgets/DELETE] user=${req.user.id} month=${monthParam ?? 'default'}`);
    res.json({ message: 'Budget removed' });
  } catch (err) {
    next(err);
  }
});

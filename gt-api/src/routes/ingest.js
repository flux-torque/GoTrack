/**
 * @file routes/ingest.js
 * @description External transaction ingestion endpoint.
 * Used by iOS Shortcuts, scripts, and any external integration.
 * Authentication: API key (not JWT) — sent as: Authorization: Bearer <api_key>
 *
 * Routes:
 *   POST /ingest      — push one or many transactions
 *   POST /ingest/rotate-key — rotate the caller's API key
 */

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { requireApiKey } from '../middleware/apiKey.js';
import { computeTxnHash } from '../utils/hash.js';
import { parseSMS } from '../utils/smsParser.js';
import { logger } from '../utils/logger.js';

export const ingestRouter = Router();

// ─── Shared schema ────────────────────────────────────────────────────────────

const txnSchema = z.object({
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  description:     z.string().min(1).max(500),
  amount:          z.number().positive(),
  type:            z.enum(['expense', 'income']),
  category:        z.string().optional().default('other'),
  bank_ref:        z.string().optional().nullable(),
  budget_excluded: z.boolean().optional().default(false),
});

// ─── POST /ingest ─────────────────────────────────────────────────────────────

/**
 * POST /ingest
 * Authorization: Bearer <api_key>
 *
 * Body (single):
 *   { date, description, amount, type, category?, bank_ref? }
 *
 * Body (batch):
 *   { transactions: [...] }
 *
 * Both formats are supported so iOS Shortcuts can POST a single object
 * while scripts can batch multiple at once.
 *
 * Returns: { inserted, skipped, errors }
 */
ingestRouter.post('/', requireApiKey, async (req, res, next) => {
  try {
    // Accept both single object and { transactions: [...] } batch format
    const rawList = Array.isArray(req.body.transactions)
      ? req.body.transactions
      : [req.body];

    const valid   = [];
    const errors  = [];

    for (let i = 0; i < rawList.length; i++) {
      const result = txnSchema.safeParse(rawList[i]);
      if (result.success) {
        valid.push(result.data);
      } else {
        errors.push({ index: i, issues: result.error.errors });
      }
    }

    if (valid.length === 0) {
      return res.status(400).json({ inserted: 0, skipped: 0, errors });
    }

    const rows = valid.map((tx) => ({
      ...tx,
      user_id:  req.userId,
      txn_hash: computeTxnHash(tx.date, tx.amount, tx.type, tx.description),
      source:   'api',
    }));

    const { data, error } = await supabase
      .from('transactions')
      .upsert(rows, {
        onConflict:       'user_id,txn_hash',
        ignoreDuplicates: true,
      })
      .select();

    if (error) throw error;

    const inserted = data?.length ?? 0;
    const skipped  = valid.length - inserted;

    logger.info(`[ingest/POST] user=${req.userId} inserted=${inserted} skipped=${skipped} errors=${errors.length}`);
    res.status(201).json({ inserted, skipped, errors });
  } catch (err) {
    next(err);
  }
});

// ─── POST /ingest/sms ─────────────────────────────────────────────────────────

/**
 * POST /ingest/sms
 * Authorization: Bearer <api_key>
 *
 * Designed for iOS Shortcuts — accepts a raw bank SMS string, parses it
 * server-side, and records the transaction.
 *
 * Body: { "message": "ICICI Bank Acct XX578 debited for Rs 51209.44 on 06-Mar-26; CRED Club credited." }
 *
 * Returns: { transaction, parsed } on success
 * Returns: { error, parsed } with 422 if SMS could not be understood
 */
ingestRouter.post('/sms', requireApiKey, async (req, res, next) => {
  try {
    const { message } = z.object({
      message: z.string().min(10, 'Message too short to parse'),
    }).parse(req.body);

    const parsed = parseSMS(message);
    logger.info(`[ingest/sms] Parsed SMS — amount=${parsed.amount} type=${parsed.type} date=${parsed.date} desc="${parsed.description}"`);

    // Reject if we couldn't extract the essentials
    if (!parsed.amount || !parsed.type) {
      return res.status(422).json({
        error: !parsed.amount
          ? 'Could not extract amount from message'
          : 'Could not determine transaction type (debit/credit) from message',
        parsed,
      });
    }

    const { _raw, ...txData } = parsed; // strip debug field before storing

    const row = {
      ...txData,
      user_id:  req.userId,
      txn_hash: computeTxnHash(txData.date, txData.amount, txData.type, txData.description),
      source:   'sms',
    };

    // If we have a bank_ref (UPI number), check for existing match first.
    // This prevents duplicates when the same transaction arrives via both
    // SMS (short description) and PDF upload (full UPI remark string).
    if (row.bank_ref) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('user_id', req.userId)
        .eq('bank_ref', row.bank_ref)
        .maybeSingle();

      if (existing) {
        logger.info(`[ingest/sms] Duplicate via bank_ref=${row.bank_ref} — skipped`);
        return res.status(200).json({ status: 'duplicate', transaction: null, parsed });
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .upsert(row, { onConflict: 'user_id,txn_hash', ignoreDuplicates: true })
      .select()
      .single();

    if (error) throw error;

    const wasSkipped = !data;
    logger.info(`[ingest/sms] user=${req.userId} ${wasSkipped ? 'skipped duplicate' : `inserted txn ${data?.id}`}`);

    res.status(wasSkipped ? 200 : 201).json({
      status:      wasSkipped ? 'duplicate' : 'inserted',
      transaction: data ?? null,
      parsed,
    });
  } catch (err) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

// ─── POST /ingest/rotate-key ──────────────────────────────────────────────────

/**
 * POST /ingest/rotate-key
 * Authorization: Bearer <current_api_key>
 * Generates a new API key for the user. Old key is immediately invalidated.
 * Returns: { api_key: <new_key> }
 */
ingestRouter.post('/rotate-key', requireApiKey, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .rpc('rotate_api_key', { p_user_id: req.userId });

    if (error) throw error;

    logger.info(`[ingest/rotate-key] API key rotated for user=${req.userId}`);
    res.json({ api_key: data });
  } catch (err) {
    next(err);
  }
});

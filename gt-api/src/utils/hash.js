/**
 * @file hash.js
 * @description Deterministic transaction hash — used for deduplication.
 * Same transaction data always produces the same hash regardless of source
 * (PDF upload, iOS shortcut, manual entry, external API).
 */

import { createHash } from 'crypto';

/**
 * Compute a SHA-256 dedup hash for a transaction.
 * Hash inputs are normalised before hashing so minor formatting
 * differences (trailing spaces, case) don't create false duplicates.
 *
 * @param {string} date        - ISO date string e.g. '2026-03-10'
 * @param {number|string} amount - Transaction amount (positive)
 * @param {string} type        - 'expense' | 'income'
 * @param {string} description - Transaction remarks / description
 * @returns {string} 64-char lowercase hex SHA-256 digest
 */
export function computeTxnHash(date, amount, type, description) {
  const raw = [
    date,
    String(amount),
    type,
    description.toLowerCase().trim().slice(0, 120),
  ].join('|');

  return createHash('sha256').update(raw).digest('hex');
}

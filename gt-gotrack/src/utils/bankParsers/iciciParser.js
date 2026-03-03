/**
 * @file bankParsers/iciciParser.js
 * @description Parser for ICICI Bank OpTransactionHistory PDFs.
 *
 * Actual column layout (verified from PDF debug output):
 *   S No. (~x=30) | Date (~x=61) | Cheque (~x=122) | Remarks (~x=192)
 *   | Withdrawal (~x=418-432) | Deposit (~x=483) | Balance (~x=535)
 *
 * Key structural insight (from PDF text item dump):
 *   - Each transaction has an ANCHOR row: [S No] [Date DD.MM.YYYY] [Amount] [Balance]
 *   - The description FIRST LINE appears ~5 PDF units ABOVE the anchor (higher y)
 *   - Description continuation lines appear BELOW the anchor (lower y)
 *
 * Algorithm (two-pass, x-range based — no header detection needed):
 *   Pass 1: Find anchor rows by locating date items (x=50–100) + nearby amount items
 *           Also extract the running balance from the balance column (x=515–580)
 *   Pass 2: For each anchor, collect description text (x=170–400) in its y-range:
 *           (next_anchor_y, current_anchor_y + 10]
 *
 * v1.6: Balance column is now extracted per-row.
 *   openingBalance = reconstructed from first transaction (balance ± amount)
 *   closingBalance = balance of last transaction (most recent)
 */

import { parse } from 'date-fns';
import { detectCategory } from '../categoryDetector';
import logger from '../logger';

// ---------------------------------------------------------------------------
// Column x-ranges (measured from actual ICICI OpTransactionHistory PDF)
// ---------------------------------------------------------------------------

const COL = {
  date:       { min: 50,  max: 100 },
  remarks:    { min: 170, max: 400 },
  withdrawal: { min: 385, max: 460 },
  deposit:    { min: 455, max: 520 },
  balance:    { min: 515, max: 580 },
};

const DATE_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;
const AMOUNT_REGEX = /^[\d,]+\.\d{2}$/;

const SKIP_PATTERNS = [
  'PLEASE CALL', 'NEVER SHARE', 'OPENING BALANCE', 'CLOSING BALANCE',
  'TOTAL', 'GENERATED ON', 'STATEMENT OF', 'ACCOUNT NO', 'ACCOUNT NUMBER',
  'IFSC', 'WWW.ICICI', 'DIAL YOUR', 'SAVING ACCOUNT', 'BASE BRANCH',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {number} x @returns {string} */
function classifyX(x) {
  for (const [col, range] of Object.entries(COL)) {
    if (x >= range.min && x <= range.max) return col;
  }
  return 'other';
}

/** @param {string} str @returns {number} */
function parseAmount(str) {
  if (!str || !AMOUNT_REGEX.test(str.trim())) return 0;
  return parseFloat(str.replace(/,/g, ''));
}

/** @param {string} str @returns {Date|null} */
function parseDate(str) {
  try {
    const d = parse(str.trim(), 'dd.MM.yyyy', new Date());
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/** @param {string} str @returns {boolean} */
function shouldSkip(str) {
  const upper = str.toUpperCase();
  return SKIP_PATTERNS.some((p) => upper.includes(p));
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ParsedTransaction
 * @property {Date} date
 * @property {string} description
 * @property {number} amount
 * @property {'expense'|'income'} type
 * @property {string} categoryId
 * @property {string} rawRow
 * @property {number} balance  - Running account balance after this transaction
 */

/**
 * @typedef {Object} ICICIParseResult
 * @property {ParsedTransaction[]} transactions
 * @property {number} openingBalance  - Estimated balance before the first transaction
 * @property {number} closingBalance  - Balance after the last (most recent) transaction
 */

/**
 * Parses ICICI Bank OpTransactionHistory PDF text items into normalized transactions.
 * @param {import('../pdfParser').PagedTextItems} pagedItems
 * @returns {ICICIParseResult}
 */
export function parseICICIStatement(pagedItems) {
  const allTransactions = [];

  for (let pageIdx = 0; pageIdx < pagedItems.length; pageIdx++) {
    const items = pagedItems[pageIdx];
    if (!items.length) continue;

    const classified = items
      .filter((item) => !shouldSkip(item.str))
      .map((item) => ({ ...item, col: classifyX(item.x) }));

    // ── Pass 1: Find anchors (date + amount + balance in same y-band) ────────

    const dateItems = classified.filter(
      (item) => item.col === 'date' && DATE_REGEX.test(item.str.trim())
    );

    const anchors = [];

    for (const dateItem of dateItems) {
      const rowBand = classified.filter((i) => Math.abs(i.y - dateItem.y) <= 4);
      const wItem = rowBand.find((i) => i.col === 'withdrawal' && AMOUNT_REGEX.test(i.str.trim()));
      const dItem = rowBand.find((i) => i.col === 'deposit'    && AMOUNT_REGEX.test(i.str.trim()));
      if (!wItem && !dItem) continue;

      const amount = wItem ? parseAmount(wItem.str) : parseAmount(dItem.str);
      if (amount === 0) continue;

      // Extract running balance from the balance column in the same row-band
      const bItem = rowBand.find((i) => i.col === 'balance' && AMOUNT_REGEX.test(i.str.trim()));
      const balance = bItem ? parseAmount(bItem.str) : 0;

      anchors.push({
        y: dateItem.y,
        dateStr: dateItem.str.trim(),
        amount,
        type: dItem ? 'income' : 'expense',
        balance,
      });
    }

    anchors.sort((a, b) => b.y - a.y); // descending y = top to bottom on page
    logger.debug(`[iciciParser] Page ${pageIdx + 1}: ${anchors.length} anchors`);

    // ── Pass 2: Collect descriptions per anchor ─────────────────────────────

    const remarkItems = classified.filter((i) => i.col === 'remarks');

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const nextAnchorY = i + 1 < anchors.length ? anchors[i + 1].y : -Infinity;

      // Description spans from just above anchor down to just above next anchor
      const descItems = remarkItems
        .filter((item) => item.y <= anchor.y + 10 && item.y > nextAnchorY + 5)
        .sort((a, b) => b.y - a.y);

      const description = descItems.map((i) => i.str.trim()).join(' ').trim();
      const date = parseDate(anchor.dateStr);
      if (!date) continue;

      allTransactions.push({
        date,
        description,
        amount: anchor.amount,
        type: anchor.type,
        categoryId: detectCategory(description),
        balance: anchor.balance,
        rawRow: `${anchor.dateStr} | ${anchor.type} | ${anchor.amount} | bal:${anchor.balance}`,
      });
    }

    logger.info(`[iciciParser] Page ${pageIdx + 1}: ${anchors.length} transactions`);
  }

  // ── Derive opening and closing balance ────────────────────────────────────
  // Transactions are in chronological order (oldest page first, top-to-bottom).
  // closingBalance = balance on the LAST (most recent) transaction row.
  // openingBalance = reconstructed: for the FIRST transaction, balance before it =
  //   balance + amount (if debit) or balance - amount (if credit).

  let openingBalance = 0;
  let closingBalance = 0;

  if (allTransactions.length > 0) {
    const first = allTransactions[0];
    const last  = allTransactions[allTransactions.length - 1];

    closingBalance = last.balance;

    if (first.balance > 0) {
      openingBalance = first.type === 'expense'
        ? first.balance + first.amount   // balance was higher before the debit
        : first.balance - first.amount;  // balance was lower before the credit
    }
  }

  logger.info(
    `[GT-Go-Track] STATEMENT_PARSED - Opening: ${openingBalance} - Closing: ${closingBalance} - Transactions: ${allTransactions.length}`
  );

  return { transactions: allTransactions, openingBalance, closingBalance };
}

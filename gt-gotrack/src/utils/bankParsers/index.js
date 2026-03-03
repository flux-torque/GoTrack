/**
 * @file bankParsers/index.js
 * @description Parser registry and dispatcher for bank statement PDFs.
 * Exports a single `parseStatement(bank, pagedItems)` function that routes
 * to the correct bank-specific parser based on the selected bank key.
 *
 * Supported banks:
 *   'icici' → ✅ Active (ICICI OpTransactionHistory format)
 *   'axis'  → 🔜 Placeholder (not yet implemented)
 *   'hdfc'  → 🔜 Placeholder (not yet implemented)
 */

import { parseICICIStatement } from './iciciParser';
import { parseAxisStatement } from './axisParser';
import { parseHDFCStatement } from './hdfcParser';
import logger from '../logger';

// ---------------------------------------------------------------------------
// Bank registry
// ---------------------------------------------------------------------------

/**
 * @typedef {'icici' | 'axis' | 'hdfc'} BankKey
 */

/**
 * @typedef {Object} BankInfo
 * @property {string} key        - Unique bank identifier
 * @property {string} label      - Display name
 * @property {string} logo       - Short text/emoji used as logo placeholder
 * @property {boolean} supported - Whether the parser is implemented
 * @property {string} color      - Tailwind bg color for bank card
 */

/** @type {BankInfo[]} All banks supported in the UI (active or placeholder) */
export const SUPPORTED_BANKS = [
  {
    key: 'icici',
    label: 'ICICI Bank',
    logo: 'ICICI',
    supported: true,
    color: 'bg-orange-50 border-orange-200',
    activeColor: 'bg-orange-100 border-orange-500',
  },
  {
    key: 'axis',
    label: 'Axis Bank',
    logo: 'AXIS',
    supported: false,
    color: 'bg-purple-50 border-purple-200',
    activeColor: 'bg-purple-100 border-purple-500',
  },
  {
    key: 'hdfc',
    label: 'HDFC Bank',
    logo: 'HDFC',
    supported: false,
    color: 'bg-blue-50 border-blue-200',
    activeColor: 'bg-blue-100 border-blue-500',
  },
];

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} ParseResult
 * @property {import('./iciciParser').ParsedTransaction[]} transactions
 * @property {number} openingBalance  - Balance before first statement transaction
 * @property {number} closingBalance  - Balance after last statement transaction
 */

/**
 * Parses a bank statement PDF using the appropriate bank-specific parser.
 * Always returns a ParseResult with { transactions, openingBalance, closingBalance }.
 * Placeholder parsers (axis, hdfc) return empty transactions with zero balances.
 *
 * @param {BankKey} bank - The selected bank key
 * @param {import('../pdfParser').PagedTextItems} pagedItems - From extractPdfText()
 * @returns {ParseResult}
 * @throws {Error} If bank key is unknown
 */
export function parseStatement(bank, pagedItems) {
  logger.info('[bankParsers] Parsing statement for bank:', bank);

  switch (bank) {
    case 'icici':
      // Returns ICICIParseResult = { transactions, openingBalance, closingBalance }
      return parseICICIStatement(pagedItems);
    case 'axis': {
      const transactions = parseAxisStatement(pagedItems);
      return { transactions, openingBalance: 0, closingBalance: 0 };
    }
    case 'hdfc': {
      const transactions = parseHDFCStatement(pagedItems);
      return { transactions, openingBalance: 0, closingBalance: 0 };
    }
    default:
      throw new Error(`[bankParsers] Unknown bank key: "${bank}"`);
  }
}

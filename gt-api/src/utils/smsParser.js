/**
 * @file utils/smsParser.js
 * @description Parses raw Indian bank SMS messages into GoTrack transaction objects.
 * Primarily targets ICICI Bank SMS format but handles common patterns from
 * HDFC, SBI, and Axis as well.
 *
 * Supported SMS patterns:
 *   ICICI debit:  "ICICI Bank Acct XX578 debited for Rs 51209.44 on 06-Mar-26; CRED Club credited."
 *   ICICI credit: "ICICI Bank Acct XX578 credited with Rs 10000 on 06-Mar-26; Salary."
 *   HDFC debit:   "Rs.500.00 debited from HDFC Bank A/c XX1234 on 01-Mar-26. Info: ZOMATO"
 *   Generic UPI:  "Paid Rs 200 to merchant@upi on 01/03/2026"
 */

const MONTH_MAP = {
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Extracts the transaction amount from SMS text.
 * Handles: Rs.1,234.56 | Rs 1234 | INR 500.00
 *
 * @param {string} text
 * @returns {number|null}
 */
function extractAmount(text) {
  const match = text.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

/**
 * Determines transaction type from SMS text.
 * "debited" in the first segment = expense; "credited" before any semicolon = income.
 *
 * @param {string} text
 * @returns {'expense'|'income'|null}
 */
function extractType(text) {
  // Check the portion before first semicolon to avoid "CRED Club credited" false positives
  const primary = text.split(';')[0];
  if (/debited|debit|spent|withdrawn/i.test(primary)) return 'expense';
  if (/credited|credit|received|deposited/i.test(primary)) return 'income';
  // Fallback: check full text
  if (/debited/i.test(text)) return 'expense';
  if (/credited/i.test(text)) return 'income';
  return null;
}

/**
 * Parses a date string from SMS text.
 * Handles: DD-Mon-YY, DD-Mon-YYYY, DD/MM/YYYY, DD-MM-YYYY
 * Returns today's date as fallback.
 *
 * @param {string} text
 * @returns {string} YYYY-MM-DD
 */
function extractDate(text) {
  // DD-Mon-YY(YY): e.g. 06-Mar-26 or 06-Mar-2026
  const namedMonth = text.match(/(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{2,4})/);
  if (namedMonth) {
    const [, dd, mon, yy] = namedMonth;
    const mm = MONTH_MAP[mon.toLowerCase()];
    if (mm) {
      const yyyy = yy.length === 2 ? `20${yy}` : yy;
      return `${yyyy}-${mm}-${dd.padStart(2, '0')}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const numericDate = text.match(/(\d{2})[-\/](\d{2})[-\/](\d{4})/);
  if (numericDate) {
    const [, dd, mm, yyyy] = numericDate;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback: today
  return new Date().toISOString().slice(0, 10);
}

/**
 * Extracts a human-readable description/merchant name from SMS text.
 *
 * Strategy:
 *  1. ICICI format: text after first `;`, before `UPI:` or `.` — strip trailing "credited/debited"
 *  2. HDFC/generic `Info:` pattern: text after `Info:`
 *  3. UPI VPA pattern: text after `to ` or `at `
 *  4. Fallback: first 80 chars of SMS
 *
 * @param {string} text
 * @returns {string}
 */
function extractDescription(text) {
  // Strategy 1 — ICICI: content after first semicolon
  const semiIdx = text.indexOf(';');
  if (semiIdx !== -1) {
    let desc = text.slice(semiIdx + 1).trim();
    desc = desc.split(/UPI:/i)[0].trim();       // cut at UPI ref
    desc = desc.split(/\.\s+/)[0].trim();        // cut at sentence end
    desc = desc.replace(/\s+(credited|debited)\s*\.?$/i, '').trim();
    if (desc.length >= 2) return desc;
  }

  // Strategy 2 — "Info: MERCHANT"
  const infoMatch = text.match(/Info:\s*([^\n.]+)/i);
  if (infoMatch) return infoMatch[1].trim();

  // Strategy 3 — UPI VPA "to merchant@upi"
  const upiVpa = text.match(/(?:to|at)\s+([A-Za-z0-9@._-]{3,60})/i);
  if (upiVpa) return upiVpa[1].trim();

  // Fallback
  return text.slice(0, 80).trim();
}

/**
 * Extracts the UPI reference number or bank ref from SMS text.
 *
 * @param {string} text
 * @returns {string|null}
 */
function extractBankRef(text) {
  const upiMatch = text.match(/UPI[:\s]+(\d{10,})/i);
  if (upiMatch) return upiMatch[1];

  const refMatch = text.match(/Ref\.?\s*(?:No\.?)?\s*(\d{8,})/i);
  if (refMatch) return refMatch[1];

  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parses a raw Indian bank SMS string into a GoTrack transaction object.
 *
 * @param {string} smsText - Raw SMS message string
 * @returns {{
 *   date: string,
 *   description: string,
 *   amount: number|null,
 *   type: 'expense'|'income'|null,
 *   category: string,
 *   bank_ref: string|null,
 *   _raw: string
 * }}
 */
export function parseSMS(smsText) {
  const text = smsText.trim();

  return {
    date:        extractDate(text),
    description: extractDescription(text),
    amount:      extractAmount(text),
    type:        extractType(text),
    category:    'other',
    bank_ref:    extractBankRef(text),
    _raw:        text,   // preserved for debugging — not stored in DB
  };
}

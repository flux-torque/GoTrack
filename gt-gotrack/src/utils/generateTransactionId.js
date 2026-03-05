/**
 * @file generateTransactionId.js
 * @description Generates unique, human-readable transaction IDs for manually entered transactions.
 * Format: GT-YYYYMMDD-XXXXXX where XXXXXX is a random alphanumeric suffix.
 * Example: GT-20260305-A7K3M2
 *
 * Manual transactions use this format; imported bank transactions use `import-{timestamp}-{index}`.
 */

import { format } from 'date-fns';

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Omits ambiguous chars (I, O, 0, 1)
const SUFFIX_LENGTH = 6;

/**
 * Generates a random alphanumeric suffix of the given length.
 * @param {number} length - Number of characters to generate
 * @returns {string} Random uppercase alphanumeric string
 */
function randomSuffix(length) {
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += CHARSET[array[i] % CHARSET.length];
  }
  return result;
}

/**
 * Generates a unique transaction ID for a manually entered transaction.
 * @param {Date} [date=new Date()] - The transaction date (defaults to today)
 * @returns {string} Transaction ID in format `GT-YYYYMMDD-XXXXXX`
 * @example
 * generateTransactionId()           // "GT-20260305-A7K3M2"
 * generateTransactionId(new Date()) // "GT-20260305-B3KP9N"
 */
export function generateTransactionId(date = new Date()) {
  const datePart = format(date, 'yyyyMMdd');
  const suffix = randomSuffix(SUFFIX_LENGTH);
  return `GT${datePart}-${suffix}`;
}

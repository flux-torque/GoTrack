/**
 * @file bankParsers/axisParser.js
 * @description Axis Bank statement parser — placeholder for v1.5.
 *
 * Expected column layout:
 *   Date | Description | Ref No/Cheque No | Branch Code
 *        | Withdrawal Amt | Deposit Amt | Balance
 *
 * Date format: DD-MM-YYYY
 * Debit column: "Withdrawal Amt" → expense
 * Credit column: "Deposit Amt"   → income
 *
 * TODO: Implement when Axis Bank sample PDF is available in samples/axis/
 *
 * @param {import('../pdfParser').PagedTextItems} pagedItems
 * @returns {import('./iciciParser').ParsedTransaction[]}
 */
export function parseAxisStatement(pagedItems) {
  // TODO: implement Axis Bank parser
  // Column keywords: 'Withdrawal Amt', 'Deposit Amt'
  // Date format: DD-MM-YYYY (use date-fns parse with 'dd-MM-yyyy')
  throw new Error('[axisParser] Axis Bank parser not yet implemented. Add samples/axis/ PDF to test.');
}

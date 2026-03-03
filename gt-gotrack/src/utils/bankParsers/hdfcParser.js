/**
 * @file bankParsers/hdfcParser.js
 * @description HDFC Bank statement parser — placeholder for v1.5.
 *
 * Expected column layout:
 *   Date | Narration | Chq/Ref No | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
 *
 * Date format: DD/MM/YY
 * Debit column: "Withdrawal Amt." → expense
 * Credit column: "Deposit Amt."   → income
 *
 * TODO: Implement when HDFC Bank sample PDF is available in samples/hdfc/
 *
 * @param {import('../pdfParser').PagedTextItems} pagedItems
 * @returns {import('./iciciParser').ParsedTransaction[]}
 */
export function parseHDFCStatement(pagedItems) {
  // TODO: implement HDFC Bank parser
  // Column keywords: 'Withdrawal Amt.', 'Deposit Amt.'
  // Date format: DD/MM/YY (use date-fns parse with 'dd/MM/yy')
  throw new Error('[hdfcParser] HDFC Bank parser not yet implemented. Add samples/hdfc/ PDF to test.');
}

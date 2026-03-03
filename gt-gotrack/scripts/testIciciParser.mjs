/**
 * @file scripts/testIciciParser.mjs
 * @description Node.js integration test for the ICICI PDF parser.
 * Mirrors the logic in src/utils/bankParsers/iciciParser.js exactly.
 *
 *   node gt-gotrack/scripts/testIciciParser.mjs
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH  = resolve(__dirname, '../../samples/icici/OpTransactionHistory01-03-2026.pdf');
const PDFJS     = resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.js');

if (!existsSync(PDF_PATH)) { console.error('❌ PDF not found:', PDF_PATH); process.exit(1); }
if (!existsSync(PDFJS))    { console.error('❌ pdfjs-dist not installed'); process.exit(1); }

// Load pdfjs (Node/legacy build)
const m = await import(pathToFileURL(PDFJS).href);
const pdfjsLib = m.default ?? m;
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// ── Column x-ranges (from actual ICICI PDF debug) ───────────────────────────
const COL = {
  date:       { min: 50,  max: 100 },
  remarks:    { min: 170, max: 400 },
  withdrawal: { min: 385, max: 460 },
  deposit:    { min: 455, max: 520 },
  balance:    { min: 515, max: 580 },
};

const DATE_REGEX   = /^\d{2}\.\d{2}\.\d{4}$/;
const AMOUNT_REGEX = /^[\d,]+\.\d{2}$/;
const SKIP = [
  'PLEASE CALL','NEVER SHARE','OPENING BALANCE','CLOSING BALANCE',
  'TOTAL','GENERATED ON','STATEMENT OF','ACCOUNT NO','ACCOUNT NUMBER',
  'IFSC','WWW.ICICI','DIAL YOUR','SAVING ACCOUNT','BASE BRANCH',
];

function classifyX(x) {
  for (const [col, r] of Object.entries(COL)) if (x >= r.min && x <= r.max) return col;
  return 'other';
}
function parseAmount(s) {
  if (!s || !AMOUNT_REGEX.test(s.trim())) return 0;
  return parseFloat(s.replace(/,/g, ''));
}
function parseDate(s) {
  const [d, mo, y] = s.trim().split('.');
  const dt = new Date(+y, +mo - 1, +d);
  return isNaN(dt) ? null : dt;
}
function shouldSkip(s) { const u = s.toUpperCase(); return SKIP.some(p => u.includes(p)); }

// ── Extract text from PDF ────────────────────────────────────────────────────
console.log('📄 Loading:', PDF_PATH);
const buf = await readFile(PDF_PATH);
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
console.log(`   Pages: ${pdf.numPages}\n`);

const pagedItems = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const page = await pdf.getPage(p);
  const ct = await page.getTextContent();
  const items = ct.items
    .filter(i => i.str && i.str.trim())
    .map(i => ({ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width }));
  pagedItems.push(items);
  console.log(`   Page ${p}: ${items.length} text items`);
}

// ── Two-pass ICICI parser ────────────────────────────────────────────────────
const transactions = [];

for (let pi = 0; pi < pagedItems.length; pi++) {
  const classified = pagedItems[pi]
    .filter(i => !shouldSkip(i.str))
    .map(i => ({ ...i, col: classifyX(i.x) }));

  // Pass 1 — find anchors
  const dateItems = classified.filter(i => i.col === 'date' && DATE_REGEX.test(i.str.trim()));
  const anchors = [];

  for (const di of dateItems) {
    const band = classified.filter(i => Math.abs(i.y - di.y) <= 4);
    const w = band.find(i => i.col === 'withdrawal' && AMOUNT_REGEX.test(i.str.trim()));
    const d = band.find(i => i.col === 'deposit'    && AMOUNT_REGEX.test(i.str.trim()));
    if (!w && !d) continue;
    const amount = w ? parseAmount(w.str) : parseAmount(d.str);
    if (!amount) continue;
    anchors.push({ y: di.y, dateStr: di.str.trim(), amount, type: d ? 'income' : 'expense' });
  }

  anchors.sort((a, b) => b.y - a.y);
  console.log(`   Page ${pi + 1}: ${anchors.length} anchors found`);

  // Pass 2 — collect descriptions
  const remarkItems = classified.filter(i => i.col === 'remarks');

  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const nextY = i + 1 < anchors.length ? anchors[i + 1].y : -Infinity;

    const desc = remarkItems
      .filter(item => item.y <= a.y + 10 && item.y > nextY + 5)
      .sort((x, y) => y.y - x.y)
      .map(item => item.str.trim())
      .join(' ').trim();

    const date = parseDate(a.dateStr);
    if (!date) continue;

    transactions.push({ date: a.dateStr, description: desc, amount: a.amount, type: a.type });
  }
}

// ── Results ───────────────────────────────────────────────────────────────────
const expenses  = transactions.filter(t => t.type === 'expense');
const income    = transactions.filter(t => t.type === 'income');
const totalExp  = expenses.reduce((s, t) => s + t.amount, 0);
const totalInc  = income.reduce((s, t)   => s + t.amount, 0);

console.log('\n' + '─'.repeat(72));
console.log('✅ PARSE COMPLETE');
console.log('─'.repeat(72));
console.log(`   Total transactions : ${transactions.length}`);
console.log(`   Expenses (debits)  : ${expenses.length}  →  ₹${totalExp.toLocaleString('en-IN')}`);
console.log(`   Income  (credits)  : ${income.length}   →  ₹${totalInc.toLocaleString('en-IN')}`);
console.log('─'.repeat(72));
console.log('\n📋 First 10 transactions:\n');

for (const [i, tx] of transactions.slice(0, 10).entries()) {
  const sign = tx.type === 'expense' ? '−' : '+';
  const amt  = `₹${tx.amount.toLocaleString('en-IN')}`;
  const desc = tx.description.slice(0, 52).padEnd(52);
  console.log(`  ${String(i+1).padStart(2)}. [${tx.date}]  ${sign}${amt.padStart(14)}   ${desc}`);
}

if (!transactions.length) {
  console.error('\n❌ Test FAILED — no transactions parsed.\n');
  process.exit(1);
} else {
  console.log('\n✅ Test PASSED\n');
}

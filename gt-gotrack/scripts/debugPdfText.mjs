/**
 * @file scripts/debugPdfText.mjs
 * @description Dumps raw text items from the ICICI PDF to understand its structure.
 * Run once, read the output, then update the parser accordingly.
 *
 *   node gt-gotrack/scripts/debugPdfText.mjs
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PDF_PATH = resolve(__dirname, '../../samples/icici/OpTransactionHistory01-03-2026.pdf');
const PDFJS_PATH = resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.js');

const pdfjsModule = await import(pathToFileURL(PDFJS_PATH).href);
const pdfjsLib = pdfjsModule.default ?? pdfjsModule;
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

const pdfBuffer = await readFile(PDF_PATH);
const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;

// Dump first page in detail
const page = await pdf.getPage(1);
const content = await page.getTextContent();

console.log(`\n=== PAGE 1 RAW TEXT ITEMS (${content.items.length} total) ===\n`);
for (const item of content.items) {
  if (!item.str || !item.str.trim()) continue;
  const x = item.transform[4].toFixed(1);
  const y = item.transform[5].toFixed(1);
  console.log(`  y=${y.padStart(6)}  x=${x.padStart(6)}  "${item.str}"`);
}

// Group into rows and print
function groupIntoRows(items, tolerance = 3) {
  if (!items.length) return [];
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  let cur = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(cur[0].y - sorted[i].y) <= tolerance) cur.push(sorted[i]);
    else { rows.push(cur.sort((a, b) => a.x - b.x)); cur = [sorted[i]]; }
  }
  rows.push(cur.sort((a, b) => a.x - b.x));
  return rows;
}

const items = content.items
  .filter((i) => i.str && i.str.trim())
  .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width }));

const rows = groupIntoRows(items, 3);

console.log(`\n=== PAGE 1 GROUPED ROWS (${rows.length} rows) ===\n`);
for (const [idx, row] of rows.entries()) {
  const text = row.map((i) => `"${i.str}"`).join('  ');
  console.log(`  Row ${String(idx).padStart(3)}: ${text}`);
}

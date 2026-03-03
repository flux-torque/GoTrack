/**
 * @file pdfParser.js
 * @description Browser-side PDF text extractor using pdfjs-dist v3.11.174 (stable).
 * Extracts text items with their x,y positions from each page of a PDF file.
 * Used by bank parsers to reconstruct table rows from statement PDFs.
 *
 * Worker strategy: Vite's `?url` suffix bundles the worker as a local static asset
 * and returns its hashed URL at build time. This is fully offline, version-matched,
 * and immune to CDN failures or browser cache mismatches.
 *
 * History:
 *  - v5 → toHex error on ICICI PDFs (color-space API change in v5)
 *  - v3 + CDN worker URL → "Failed to fetch" (cdnjs has no v5.x; stale browser cache)
 *  - v3 + ?url local worker → ✅ stable (Phase 6.1 fix)
 */

import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves `?url` at build time: copies the worker to dist/ and returns its URL.
// This guarantees the worker always matches the installed library version.
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import logger from './logger';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} TextItem
 * @property {string} str    - The text content of this item
 * @property {number} x      - Horizontal position (PDF user space units)
 * @property {number} y      - Vertical position (PDF user space units, origin bottom-left)
 * @property {number} width  - Rendered width of the text
 * @property {number} page   - 1-based page number
 */

/**
 * @typedef {TextItem[][]} PagedTextItems
 * One array per page, each array contains all TextItems on that page.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reads a File object as an ArrayBuffer.
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('[pdfParser] FileReader failed'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Groups a flat array of TextItems into rows by clustering y-positions.
 * Items within `tolerance` units of each other in y are considered the same row.
 * Each row is sorted by ascending x (left → right).
 *
 * @param {TextItem[]} items  - All items on a single page
 * @param {number} [tolerance=3] - Y-distance tolerance in PDF units
 * @returns {TextItem[][]} Array of rows, sorted top → bottom (descending y)
 */
export function groupIntoRows(items, tolerance = 3) {
  if (!items.length) return [];

  // Sort by descending y (PDF origin is bottom-left; higher y = higher on page)
  const sorted = [...items].sort((a, b) => b.y - a.y);

  const rows = [];
  let currentRow = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const item = sorted[i];
    const rowRef = currentRow[0];

    if (Math.abs(rowRef.y - item.y) <= tolerance) {
      currentRow.push(item);
    } else {
      rows.push(currentRow.sort((a, b) => a.x - b.x));
      currentRow = [item];
    }
  }
  rows.push(currentRow.sort((a, b) => a.x - b.x));

  return rows;
}

// ---------------------------------------------------------------------------
// Main extractor
// ---------------------------------------------------------------------------

/**
 * Extracts all text items with their positional data from every page of a PDF.
 *
 * @param {File} file - The PDF file to parse
 * @returns {Promise<PagedTextItems>} Text items grouped by page
 */
export async function extractPdfText(file) {
  logger.info('[pdfParser] Starting extraction:', file.name, `(${(file.size / 1024).toFixed(1)} KB)`);

  const buffer = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  logger.info('[pdfParser] PDF loaded,', pdf.numPages, 'page(s)');

  const pagedItems = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    /** @type {TextItem[]} */
    const items = content.items
      .filter((item) => item.str && item.str.trim().length > 0)
      .map((item) => ({
        str: item.str,
        // transform is [scaleX, skewX, skewY, scaleY, translateX, translateY]
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        page: pageNum,
      }));

    logger.debug(`[pdfParser] Page ${pageNum}: ${items.length} text items`);
    pagedItems.push(items);
  }

  logger.info('[pdfParser] Extraction complete,', pagedItems.flat().length, 'total items');
  return pagedItems;
}

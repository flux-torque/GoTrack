/**
 * @file BankUploadModal.jsx
 * @description 3-step modal for uploading a bank statement PDF and importing transactions.
 *
 * Steps:
 *   1. Select Bank  — grid of bank cards (ICICI active, Axis/HDFC coming soon)
 *   2. Upload File  — drag-and-drop PDF, then click "Parse Statement"
 *   3. Preview      — shows parsed transaction count, opening/closing balance, first 5 rows
 *
 * On confirm: dispatches IMPORT_TRANSACTIONS (ParseResult) to ExpenseContext.
 * On cancel or backdrop click: closes with no changes.
 *
 * v1.6: Consumes ParseResult ({ transactions, openingBalance, closingBalance }) instead of
 *       a flat ParsedTransaction[]. Shows opening/closing balance in Step 3 preview.
 */

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

import { cn } from '../../utils/cn';
import logger from '../../utils/logger';
import { extractPdfText } from '../../utils/pdfParser';
import { parseStatement, SUPPORTED_BANKS } from '../../utils/bankParsers/index';
import { useExpenses } from '../../context/ExpenseContext';
import { APP_CONFIG } from '../../constants';
import { FileDropZone } from './FileDropZone';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = {
  SELECT_BANK: 1,
  UPLOAD: 2,
  PREVIEW: 3,
};

const STEP_LABELS = {
  [STEPS.SELECT_BANK]: 'Select Bank',
  [STEPS.UPLOAD]: 'Upload Statement',
  [STEPS.PREVIEW]: 'Preview & Import',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Step indicator bar at the top of the modal.
 * @param {{ step: number }} props
 */
function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Object.entries(STEP_LABELS).map(([s, label]) => {
        const stepNum = Number(s);
        const isActive = stepNum === step;
        const isDone = stepNum < step;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                )}
              >
                {isDone ? <CheckCircle2 size={14} /> : stepNum}
              </div>
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-indigo-600' : isDone ? 'text-emerald-600' : 'text-gray-400'
                )}
              >
                {label}
              </span>
            </div>
            {stepNum < 3 && (
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Bank selection card.
 * @param {{ bank: import('../../utils/bankParsers/index').BankInfo, selected: boolean, onSelect: function }} props
 */
function BankCard({ bank, selected, onSelect }) {
  return (
    <button
      onClick={() => bank.supported && onSelect(bank.key)}
      disabled={!bank.supported}
      className={cn(
        'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-150',
        'w-full text-center',
        bank.supported
          ? selected
            ? 'border-indigo-500 bg-indigo-50 shadow-sm'
            : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer'
          : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-lg flex items-center justify-center text-xs font-bold tracking-wide',
          selected ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'
        )}
      >
        {bank.logo}
      </div>
      <span className="text-sm font-medium text-gray-700">{bank.label}</span>
      {!bank.supported && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
          Soon
        </span>
      )}
      {selected && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold text-indigo-600 bg-indigo-100 border border-indigo-300 px-1.5 py-0.5 rounded-full">
          Selected
        </span>
      )}
    </button>
  );
}

/**
 * Formats an INR amount for display (no decimals).
 * @param {number} amount
 * @returns {string}
 */
function fmt(amount) {
  return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

/**
 * BankUploadModal — full 3-step bank statement import flow.
 *
 * @param {Object} props
 * @param {boolean} props.open             - Whether the modal is visible
 * @param {function(): void} props.onClose - Called to close the modal
 * @returns {JSX.Element|null}
 */
export function BankUploadModal({ open, onClose }) {
  const { importBulk } = useExpenses();

  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(STEPS.SELECT_BANK);
  const [selectedBank, setSelectedBank] = useState(null);
  const [file, setFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState(null);
  /** @type {[import('../../utils/bankParsers/index').ParseResult|null, function]} */
  const [parsedResult, setParsedResult] = useState(null);

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setStep(STEPS.SELECT_BANK);
      setSelectedBank(null);
      setFile(null);
      setIsParsing(false);
      setParseError(null);
      setParsedResult(null);
    }
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleBankSelect = (bankKey) => {
    setSelectedBank(bankKey);
    logger.info('[BankUploadModal] Bank selected:', bankKey);
  };

  const handleNextFromBank = () => {
    if (!selectedBank) return;
    setStep(STEPS.UPLOAD);
  };

  const handleFileSelect = (f) => {
    setFile(f);
    setParseError(null);
    setParsedResult(null);
  };

  const handleFileClear = () => {
    setFile(null);
    setParseError(null);
    setParsedResult(null);
  };

  const handleParse = useCallback(async () => {
    if (!file || !selectedBank) return;
    setIsParsing(true);
    setParseError(null);
    setParsedResult(null);

    try {
      logger.info('[BankUploadModal] Starting PDF extraction...');
      const pagedItems = await extractPdfText(file);
      // parseStatement now returns ParseResult: { transactions, openingBalance, closingBalance }
      const result = parseStatement(selectedBank, pagedItems);

      if (result.transactions.length === 0) {
        setParseError('No transactions found in this PDF. Make sure you uploaded the correct bank statement.');
      } else {
        setParsedResult(result);
        setStep(STEPS.PREVIEW);
        logger.info(
          '[BankUploadModal] Parsed', result.transactions.length, 'transactions',
          '| opening:', result.openingBalance,
          '| closing:', result.closingBalance
        );
      }
    } catch (err) {
      logger.error('[BankUploadModal] Parse failed:', err.message);
      setParseError(err.message || 'Failed to parse the PDF. Please check the file and try again.');
    } finally {
      setIsParsing(false);
    }
  }, [file, selectedBank]);

  const handleImport = async () => {
    if (!parsedResult || isImporting) return;
    setIsImporting(true);
    setParseError(null);
    try {
      const result = await importBulk(parsedResult, selectedBank);
      logger.info('[BankUploadModal] Import complete — inserted:', result?.inserted, 'skipped:', result?.skipped);
      onClose();
    } catch (err) {
      logger.error('[BankUploadModal] Import failed:', err.message);
      setParseError(err.message || 'Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Derived summary ────────────────────────────────────────────────────────

  const summary = parsedResult
    ? {
        count: parsedResult.transactions.length,
        totalExpense: parsedResult.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        totalIncome:  parsedResult.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        openingBalance: parsedResult.openingBalance,
        closingBalance: parsedResult.closingBalance,
        minDate: parsedResult.transactions.reduce((d, t) => (t.date < d ? t.date : d), parsedResult.transactions[0].date),
        maxDate: parsedResult.transactions.reduce((d, t) => (t.date > d ? t.date : d), parsedResult.transactions[0].date),
        preview: parsedResult.transactions.slice(0, 5),
      }
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upload Bank Statement</h2>
            <p className="text-xs text-gray-500 mt-0.5">Import transactions automatically from your PDF</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <StepIndicator step={step} />

          {/* ── Step 1: Select Bank ── */}
          {step === STEPS.SELECT_BANK && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Choose your bank to continue</p>
              <div className="grid grid-cols-3 gap-3">
                {SUPPORTED_BANKS.map((bank) => (
                  <BankCard
                    key={bank.key}
                    bank={bank}
                    selected={selectedBank === bank.key}
                    onSelect={handleBankSelect}
                  />
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleNextFromBank}
                  disabled={!selectedBank}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                    selectedBank
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Continue <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload ── */}
          {step === STEPS.UPLOAD && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Upload your{' '}
                <span className="font-semibold text-gray-700">
                  {SUPPORTED_BANKS.find((b) => b.key === selectedBank)?.label}
                </span>{' '}
                statement PDF
              </p>

              <FileDropZone
                accept=".pdf"
                acceptLabel="PDF"
                onFile={handleFileSelect}
                file={file}
                onClear={handleFileClear}
              />

              {parseError && (
                <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">{parseError}</p>
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep(STEPS.SELECT_BANK)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <button
                  onClick={handleParse}
                  disabled={!file || isParsing}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-colors',
                    file && !isParsing
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isParsing ? (
                    <><Loader2 size={15} className="animate-spin" />Parsing…</>
                  ) : (
                    <>Parse Statement <ChevronRight size={15} /></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Preview ── */}
          {step === STEPS.PREVIEW && summary && (
            <div>
              {/* Balance row */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-indigo-700">{APP_CONFIG.CURRENCY_SYMBOL}{fmt(summary.openingBalance)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Opening Balance</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-indigo-700">{APP_CONFIG.CURRENCY_SYMBOL}{fmt(summary.closingBalance)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Closing Balance</p>
                </div>
              </div>

              {/* Transaction summary row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{summary.count}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Transactions</p>
                </div>
                <div className="bg-rose-50 rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-rose-600">{APP_CONFIG.CURRENCY_SYMBOL}{fmt(summary.totalExpense)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Expenses</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-base font-bold text-emerald-600">{APP_CONFIG.CURRENCY_SYMBOL}{fmt(summary.totalIncome)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Income</p>
                </div>
              </div>

              {/* Date range */}
              <p className="text-xs text-gray-400 text-center mb-4">
                {format(summary.minDate, 'MMM d, yyyy')} – {format(summary.maxDate, 'MMM d, yyyy')}
              </p>

              {/* Preview table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden mb-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 uppercase tracking-wide">
                      <th className="text-left px-3 py-2">Date</th>
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Amount</th>
                      <th className="text-right px-3 py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.preview.map((tx, i) => (
                      <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                          {format(tx.date, 'dd MMM')}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">
                          {tx.description.slice(0, 40)}
                        </td>
                        <td className={cn(
                          'px-3 py-2 text-right font-semibold',
                          tx.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                        )}>
                          {APP_CONFIG.CURRENCY_SYMBOL}{fmt(tx.amount)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={cn(
                            'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                            tx.type === 'expense' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          )}>
                            {tx.type === 'expense' ? 'Debit' : 'Credit'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {summary.count > 5 && (
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-400">
                    +{summary.count - 5} more transactions
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(STEPS.UPLOAD)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isImporting ? (
                    <><Loader2 size={15} className="animate-spin" />Saving…</>
                  ) : (
                    <><CheckCircle2 size={15} />Import All {summary.count} Transactions</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

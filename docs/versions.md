# GoTrack — Version & Phase History

> Tracks every released version, what was built, and what bugs were encountered and fixed.

---

## v1.0 — Core UI (In Progress)

**Status:** Phases 0–1 complete, Phases 2–5 pending

| Phase | Name | Status |
|-------|------|--------|
| 0 | Project Setup | ✅ Complete |
| 1 | Home / Dashboard | ✅ Complete |
| 2 | Expenses Page | 🔜 Pending |
| 3 | Add Expense Page | 🔜 Pending |
| 4 | Placeholder Pages | 🔜 Pending |
| 5 | Polish & Responsive | 🔜 Pending |

**What's in v1.0:**
- Vite + React 18 + Tailwind v4 project scaffold
- React Router v6, Recharts, date-fns, lucide-react, clsx
- ExpenseContext (useReducer, in-memory state)
- Full dashboard: StatsCards, SpendingChart (Recharts bar), CategoryBreakdown (donut), RecentTransactions
- Sidebar + Navbar + PageWrapper layout
- App-wide constants, logger utility, cn() helper

---

## v1.5 — Bank Statement Upload

**Status:** ✅ Complete (Phase 6)
**Released:** 2026-03-01

### Phase 6 — v1.5: Bank Statement Upload

**What was built:**

| File | Purpose |
|------|---------|
| `src/utils/pdfParser.js` | pdfjs-dist v3 text extractor — positional items with x,y |
| `src/utils/categoryDetector.js` | Keyword→category mapper (40+ UPI/merchant rules) |
| `src/utils/bankParsers/iciciParser.js` | ICICI active parser (two-pass, x-range based) |
| `src/utils/bankParsers/axisParser.js` | Axis placeholder |
| `src/utils/bankParsers/hdfcParser.js` | HDFC placeholder |
| `src/utils/bankParsers/index.js` | Parser registry + SUPPORTED_BANKS |
| `src/components/common/FileDropZone.jsx` | Drag-and-drop PDF file input |
| `src/components/common/BankUploadModal.jsx` | 3-step upload modal (select bank → upload → preview) |
| `src/pages/ExpensesPage.jsx` | Transactions list + upload button + clear button + empty state |
| `src/context/ExpenseContext.jsx` | Added IMPORT_TRANSACTIONS + CLEAR_EXPENSES actions |
| `gt-gotrack/scripts/testIciciParser.mjs` | Node.js integration test (runs against real PDF) |
| `samples/icici/` | Drop ICICI PDFs here for testing |

**Demo flow:**
1. App starts empty (no mock data)
2. Expenses page → "No transactions yet" empty state
3. Click "Upload Statement" → Select ICICI → Upload PDF → Parse
4. Preview: 34 transactions, ₹73,026 expenses, ₹5,65,314 income
5. Click "Import All" → transactions populate with date groups + auto-categories
6. Refresh → back to empty (in-memory only, no persistence)

**ICICI Parser — Technical Notes:**
- Column x-ranges hardcoded from actual PDF debug (OpTransactionHistory format)
- Two-pass: Pass 1 finds anchors (date + amount rows), Pass 2 collects descriptions per anchor
- Description first line appears 5 PDF units ABOVE anchor (not below — quirk of ICICI PDF layout)
- Handles multi-line descriptions spanning above and below anchor y-value

---

### Phase 6.1 — Worker + Parser Fixes

**Status:** ✅ Complete
**Fixed:** 2026-03-01

#### Bug 1 — `a.toHex is not a function`
- **pdfjs-dist v5** introduced color-space handling changes that break on ICICI PDFs
- **Fix:** Downgraded to `pdfjs-dist@3.11.174`

#### Bug 2 — `API version 5.4.624 does not match Worker version 3.11.174`
- Browser cache still served v5 main bundle after downgrade; CDN worker URL also unreliable
- **Fix:** Replaced CDN URL with Vite `?url` import (`pdfjs-dist/build/pdf.worker.min.js?url`) — worker bundled locally, always version-matched

#### Bug 3 — ICICI Parser: "header not found, skipping" — 0 transactions parsed
- **Root cause:** ICICI PDF has header text split across 3 y-levels (619, 614, 609). Old parser used y-tolerance=3 so header rows stayed separate — header detection failed. Also, description first lines appear ABOVE the anchor row, not below (contrary to initial assumption).
- **Fix:** Complete parser rewrite using two-pass x-range approach:
  - No header detection needed — x-ranges hardcoded from PDF debug
  - Pass 1: find anchor rows (date + amount in same y-band ±4 units)
  - Pass 2: collect description items in y-range `(next_anchor_y, anchor_y + 10]`
- **Test result:** 34/34 transactions parsed correctly ✅

---

## v1.6 — Period Analytics & Balance Intelligence

**Status:** ✅ Complete (Phase 6.2)
**Released:** 2026-03-02

### What was built

| File | Purpose |
|------|---------|
| `src/utils/periodAnalytics.js` | Pure analytics engine: period key computation, filtering, balance derivation, summary |
| `src/hooks/usePeriodAnalytics.js` | React hook: period navigation state + analytics, connected to ExpenseContext |
| `src/components/expenses/PeriodSelector.jsx` | [Weekly\|Monthly\|Quarterly] toggle + ‹ Period Label › navigator |
| `src/components/expenses/PeriodSummaryCard.jsx` | Full analytics card: balances, income/expense, trends, savings rate, score, top categories |
| `src/utils/bankParsers/iciciParser.js` | Extended: extracts balance column, returns `{ transactions, openingBalance, closingBalance }` |
| `src/utils/bankParsers/index.js` | Updated: handles new `ParseResult` shape, wraps placeholder parsers |
| `src/context/ExpenseContext.jsx` | Extended: `balance` on Expense, `balanceMeta` in state, updated IMPORT_TRANSACTIONS |
| `src/components/common/BankUploadModal.jsx` | Step 3 now shows Opening/Closing Balance boxes |
| `src/components/dashboard/StatsRow.jsx` | "Total Balance" now uses `balanceMeta.closingBalance` (actual bank balance) |
| `src/pages/ExpensesPage.jsx` | Integrated PeriodSelector + PeriodSummaryCard + period-filtered transaction list |

### Demo flow (v1.6)
1. Upload ICICI PDF → Step 3 preview shows Opening Balance + Closing Balance
2. Click Import → Dashboard "Total Balance" = statement's closing balance (accurate!)
3. Expenses page → Period Analytics bar shows [Weekly|Monthly|Quarterly]
4. Default: latest month (March 2026) with full summary card
5. Summary card shows: Opening ₹X | Income ₹Y | Expenses ₹Z (↑↓ trend vs prev) | Net Flow | Closing ₹W
6. Smart row: Savings Rate | Avg Daily Spend | Cash Flow Score (0–100, color-coded)
7. Top 3 categories shown as color-coded pills
8. Navigate ‹ Feb 2026 › ← → shows different data; buttons disabled at boundaries
9. Switch to Weekly → shows week-level breakdown with navigation
10. Switch to Quarterly → shows Q1 2026 aggregated view

### Technical highlights
- `computeBalanceForPeriod()` — derives opening/closing from running balance stored on each imported transaction
- `getBoundaryPeriod()` — enforces navigation cannot go beyond earliest/latest transaction date
- Week start = Monday (`{ weekStartsOn: 1 }`) — ISO standard used in India
- All analytics are memoized; no recalculation on unrelated renders
- `cashFlowScore` = composite of savings rate (50 pts) + expense consistency (50 pts)

---

## v1.8 — Feature Enrichment + Code Quality

**Status:** ✅ Complete (Phase 8)
**Released:** 2026-03-03

### What was built

| File | Purpose |
|------|---------|
| `src/utils/paymentTypeDetector.js` | UPI/NEFT/IMPS/RTGS/ATM/Card/Auto-Debit detection + aggregation |
| `src/utils/budgetEngine.js` | Rewritten: pure monthly model (no salary tracking) |
| `src/context/BudgetContext.jsx` | `targetSavings` → `monthlyBudget`, storage key bumped to `gt_budget_v2` |
| `src/hooks/useBudget.js` | Simplified, no salary detection |
| `src/components/budget/BudgetInsights.jsx` | 6 insight cards: Peak Day, Largest Tx, Needs/Wants, Weekend/Weekday, Payment Methods, Month Rhythm |
| `src/pages/BudgetPage.jsx` | 3 states: no data / unconfigured / configured |
| `src/pages/ExpensesPage.jsx` | Search + sort + payment type filter pills + Insights tab |
| `src/pages/AnalysisPage.jsx` | Cash Inflow Sources, Payment Methods breakdown, Day-of-Week chart |
| `src/components/dashboard/StatsRow.jsx` | 4 cards: Balance, Cash Inflow, Expenses, Net Flow |
| `src/pages/HomePage.jsx` | Budget Quick-Stats widget added |
| `docs/phase4-auth-db-plan.md` | Supabase auth + Postgres DB plan |

---

## v1.9 — Manual Transaction Entry

**Status:** ✅ Complete (Phase 9)
**Released:** 2026-03-05

### What was built

| File | Purpose |
|------|---------|
| `src/utils/generateTransactionId.js` | Generates `GT{YYYYMMDD}-{XXXXXX}` IDs using `crypto.getRandomValues` |
| `src/components/common/Input.jsx` | Reusable labeled input (text/number/date) with error state |
| `src/components/common/Select.jsx` | Reusable labeled dropdown with error state |
| `src/components/forms/AddExpenseForm.jsx` | Full manual transaction form: Debit/Credit toggle, amount, title, category, date, note, TXN ID |
| `src/pages/AddExpensePage.jsx` | Replaced placeholder — centered card with "Record Transaction" header |

### Transaction ID Format
- Pattern: `GT{YYYYMMDD}-{XXXXXX}` — e.g. `GT20260305-A7K3M2`
- Date portion is embedded for human readability and sortability
- 6-char random suffix uses unambiguous charset (no I, O, 0, 1)
- Regenerates automatically when transaction date changes; user can also manually regenerate
- Distinguishable from imported transactions (`import-{timestamp}-{index}`)

### Demo flow
1. Click "Add Expense" in sidebar
2. Select Debit or Credit
3. Fill amount, title, category, date, optional note
4. Transaction ID auto-generates (GT-format) — can be refreshed
5. Submit → brief success flash → redirects to Expenses page
6. New transaction appears at top of the list

---

## v2.0 — Backend + Persistence (Planned)

- Node.js + Express backend
- MongoDB for persistence
- JWT authentication
- REST API replacing localStorage
- Persist imported bank statement data to DB
- HDFC + Axis parsers implemented

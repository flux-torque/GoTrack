# GoTrack v1.0 — Release Plan
# UI Only · Static Dummy Data · No Backend

> **Goal:** A fully designed, responsive, navigable React app with realistic dummy data.
> All pages render correctly. No API calls. No auth. No backend.
> When v1 is complete, the app looks and feels production-ready to any visitor.

---

## 🗂️ Phase 0 — Project Setup
> Foundation: folder structure, libraries, config, utilities

- [x] 0.1 — Initialize Vite + React project (`gt-gotrack`)
- [x] 0.2 — Install all dependencies: tailwindcss, react-router-dom, lucide-react, recharts, date-fns, axios (future use), clsx
- [x] 0.3 — Configure Tailwind CSS (`tailwind.config.js`, `index.css`)
- [x] 0.4 — Create complete folder structure as defined in `CLAUDE.md`
- [x] 0.5 — Create `src/utils/logger.js` — custom logger utility
- [x] 0.6 — Create `src/utils/cn.js` — className utility (clsx wrapper)
- [x] 0.7 — Create `src/constants/index.js` — categories, routes, colors, app config
- [x] 0.8 — Create `src/data/mockData.js` — realistic dummy expenses (20+ entries, multiple categories, 3 months of data)
- [x] 0.9 — Set up React Router in `App.jsx` with all routes defined
- [x] 0.10 — Create `src/context/ExpenseContext.jsx` — context + useReducer for expense state

**Phase 0 complete when:** `npm run dev` starts without errors, router works, context loads mock data.

---

## 🏠 Phase 1 — Home Page (v1 Priority)
> Reference: `screenshots/home.png`
> This is the most important page for v1. Match the screenshot exactly.

- [x] 1.1 — Build `components/layout/Sidebar.jsx`
  - GT logo (indigo rounded square with "GT" monogram)
  - Navigation links: Dashboard, Expenses, Categories, Settings
  - Active state indicator
  - Bottom: user avatar placeholder
  - Expenses, Categories, Settings links → disabled with "Coming Soon" tooltip in v1

- [x] 1.2 — Build `components/layout/Navbar.jsx` (top bar)
  - Page title (dynamic based on route)
  - Right side: notification bell icon, avatar/profile placeholder
  - Month selector or date range display

- [x] 1.3 — Build `components/layout/PageWrapper.jsx`
  - Combines Sidebar + Navbar + main content area
  - Handles responsive layout (sidebar collapses on mobile)

- [x] 1.4 — Build `components/dashboard/StatsCard.jsx`
  - Props: title, amount, delta (% change), icon, color variant
  - Variants: default (white), income (emerald), expense (rose), balance (indigo)
  - Show up/down arrow with delta percentage
  - Subtle shadow, rounded-2xl

- [x] 1.5 — Build `components/dashboard/StatsRow.jsx`
  - Renders 3 StatsCards in a responsive grid
  - Cards: Total Balance, This Month Income, This Month Expenses
  - Pulls data from ExpenseContext (dummy data)

- [x] 1.6 — Build `components/dashboard/SpendingChart.jsx`
  - Monthly spending bar chart using Recharts BarChart
  - X-axis: last 6 months, Y-axis: amount in ₹
  - Two bars per month: Income (emerald) vs Expense (rose)
  - Clean, minimal styling — no heavy grid lines

- [x] 1.7 — Build `components/dashboard/CategoryBreakdown.jsx`
  - Recharts PieChart or DonutChart
  - Shows spending by category for current month
  - Legend with category name + percentage + amount
  - Color-coded by category

- [x] 1.8 — Build `components/dashboard/RecentTransactions.jsx`
  - List of last 5 transactions
  - Each row: category icon, name/note, date, amount (red for expense, green for income)
  - "View all" link → routes to /expenses (disabled in v1 with toast)
  - Empty state component if no data

- [x] 1.9 — Build `pages/HomePage.jsx`
  - Assemble all dashboard components
  - Layout: StatsRow on top, SpendingChart + CategoryBreakdown side by side, RecentTransactions below
  - Match `screenshots/home.png` layout exactly
  - All data from ExpenseContext (mock data)

**Phase 1 complete when:** Home page renders with all components, matches screenshot, dummy data shows correctly. Tell me how user can run and see the webapp up and running

---

## 📋 Phase 2 — Expenses Page
> Reference: `screenshots/expenses.png`

- [ ] 2.1 — Build `components/expenses/ExpenseRow.jsx`
  - Category icon + color dot, title/note, date, amount
  - Delete button (icon, appears on hover)
  - Expense vs income color coding

- [ ] 2.2 — Build `components/expenses/ExpenseFilters.jsx`
  - Filter by: category (dropdown), date range (month picker), type (expense/income/all)
  - Clear filters button
  - Results count: "Showing 12 of 34 transactions"

- [ ] 2.3 — Build `components/expenses/ExpenseList.jsx`
  - Renders filtered list of ExpenseRows
  - Groups by date (e.g. "Today", "Yesterday", "March 15")
  - Empty state when filters return nothing

- [ ] 2.4 — Build `pages/ExpensesPage.jsx`
  - Filters on top, ExpenseList below
  - Summary bar: total shown, total expenses, total income for filtered range
  - Match `screenshots/expenses.png`

**Phase 2 complete when:** Expenses page shows all mock transactions, filters work on dummy data.

---

## ➕ Phase 3 — Add Expense Page
> Reference: `screenshots/add-expense.png`

- [ ] 3.1 — Build `components/common/Input.jsx` — reusable input with label + error state
- [ ] 3.2 — Build `components/common/Select.jsx` — custom styled dropdown
- [ ] 3.3 — Build `components/forms/AddExpenseForm.jsx`
  - Fields: Amount (₹), Type (Expense/Income toggle), Category, Date, Note/Description
  - Validation: amount required + numeric, category required, date required
  - On submit: dispatch to ExpenseContext, show success toast, reset form
  - Match `screenshots/add-expense.png`

- [ ] 3.4 — Build `pages/AddExpensePage.jsx`
  - Wraps the form with page layout
  - Back button → /expenses
  - Success → redirect to /expenses

**Phase 3 complete when:** Form submits and adds to context state, visible in ExpensesPage.

---

## 🔒 Phase 4 — Placeholder Pages
> Locked pages that show "Coming Soon" instead of crashing

- [ ] 4.1 — Build `components/common/ComingSoon.jsx`
  - Clean card: lock icon, "Coming Soon", feature name, "Available in v2" badge
  - Consistent style matching the app design

- [ ] 4.2 — `pages/CategoriesPage.jsx` → renders ComingSoon with "Categories Management"
- [ ] 4.3 — `pages/SettingsPage.jsx` → renders ComingSoon with "Settings"

**Phase 4 complete when:** All routes render without errors, no blank/white pages.

---

## 🎨 Phase 5 — Polish & Responsive
> Final quality pass before v1 is "done"

- [ ] 5.1 — Mobile responsive audit: all pages work on 375px width
- [ ] 5.2 — Sidebar collapses to bottom nav on mobile
- [ ] 5.3 — Add subtle page transition animation (fade-in on route change)
- [ ] 5.4 — Add loading skeleton to StatsCards and charts (even for mock data — for realism)
- [ ] 5.5 — Add `components/common/Toast.jsx` — success/error notification system
- [ ] 5.6 — Final design QA: check all pages against screenshots, fix spacing/color mismatches
- [ ] 5.7 — Code review pass: ensure all components have JSDoc, logger calls, no raw console.log

**Phase 5 complete when:** App is fully responsive, no console errors, every route works, matches design intent.

---

## ✅ v1.0 Completion Checklist

- [ ] All 5 phases complete
- [ ] `npm run dev` runs with zero errors and zero warnings
- [ ] Home page matches `screenshots/home.png` closely
- [ ] All routes render (no blank pages)
- [ ] Dummy data populates all stats and charts
- [ ] Mobile layout works at 375px
- [ ] All components have JSDoc comments
- [ ] Logger utility used everywhere (no raw console.log)
- [ ] README.md written with setup instructions

---

## 🏦 Phase 6 — v1.5: Bank Statement Upload
> Upload a real bank PDF statement and auto-populate expenses. No persistence — in-memory only for v1.5.
> Reference: `screenshots/BANK_SS_ICICI` (for ICICI column layout — Axis is the only functional parser in v1.5)

### Overview
A functional "Upload Statement" button on the Expenses page opens a modal where the user selects their bank and uploads a PDF statement. The app parses the PDF client-side, maps rows to expense/income entries, and populates the expense list. Data is in-memory only — refreshing clears it.

### Demo Flow
Empty expense list → Click "Upload Statement" → Select "Axis Bank" → Upload PDF → All transactions populate.

---

### Setup

- [x] 6.1 — Install `pdfjs-dist` for browser-side PDF text extraction
  - `npm install pdfjs-dist`
  - Configure worker: copy `pdfjs-dist/build/pdf.worker.min.js` to `public/`
  - Set `pdfjsLib.GlobalWorkerOptions.workerSrc` in the parser utility

- [x] 6.2 — Create `samples/` folder at project root with subfolders:
  ```
  samples/
    axis/        ← drop Axis Bank PDF statements here
    icici/       ← drop ICICI PDF statements here
    hdfc/        ← drop HDFC PDF statements here
    README.md    ← instructions for adding sample files
  ```

---

### Parsers & Utilities

- [x] 6.3 — Create `src/utils/pdfParser.js` — raw PDF text extractor
  - Uses `pdfjs-dist` to extract all text lines from every page
  - Returns: `string[][]` (array of pages, each page = array of text tokens)
  - Handles multi-page statements

- [x] 6.4 — Create `src/utils/bankParsers/index.js` — parser registry
  - Exports `parseStatement(bank, pdfText)` dispatcher
  - Supported banks: `'icici'` (active), `'axis'` (placeholder), `'hdfc'` (placeholder)
  - Returns normalized `ParsedTransaction[]`:
    ```js
    { date: Date, description: string, amount: number, type: 'expense'|'income', rawRow: string }
    ```

- [x] 6.5 — Create `src/utils/bankParsers/iciciParser.js` — ICICI Bank PDF parser (ACTIVE)
  - Columns: `S No. | Transaction Date | Cheque Number | Transaction Remarks | Withdrawal Amount (INR) | Deposit Amount (INR) | Balance (INR)`
  - `Withdrawal Amount` → type: `'expense'`, `Deposit Amount` → type: `'income'`
  - Date format: `DD.MM.YYYY` → parse with `date-fns`
  - Amount: strip commas, parse float
  - Position-based column detection from header row
  - Multi-line description row handling

- [x] 6.6 — Create `src/utils/bankParsers/axisParser.js` — Axis parser (placeholder)
  - TODO: implement when Axis sample PDF is available

- [x] 6.7 — Create `src/utils/bankParsers/hdfcParser.js` — HDFC parser (placeholder)
  - TODO: implement when HDFC sample is available

- [x] 6.8 — Create `src/utils/categoryDetector.js` — keyword-based auto-categorizer
  - Maps common UPI/merchant keywords → GoTrack category ids
  - Falls back to `'other'` if no match
  - Case-insensitive, partial match

---

### UI Components

- [x] 6.9 — Create `src/components/common/BankUploadModal.jsx`
  - Multi-step modal (3 steps):
    - **Step 1 — Select Bank:** Grid of bank cards (HDFC, ICICI, Axis)
      - Axis: active (clickable, indigo border on select)
      - HDFC, ICICI: disabled with "Coming Soon" badge
    - **Step 2 — Upload File:** Drag-and-drop zone + browse button, `.pdf` only
      - Shows file name + size after selection
      - Parse button → triggers PDF extraction + parsing
      - Loading spinner during parse
    - **Step 3 — Preview & Confirm:** Shows parsed results
      - Summary: `"Found 42 transactions · ₹23,400 in expenses · ₹55,000 in income"`
      - Date range: `"Jan 1 2026 – Mar 1 2026"`
      - Table preview: first 5 rows (Date | Description | Amount | Type)
      - Two actions: "Import All" (confirm) and "Cancel"
  - On confirm: dispatches `IMPORT_TRANSACTIONS` action to ExpenseContext

- [x] 6.10 — Create `src/components/common/FileDropZone.jsx` — reusable drag-and-drop file input
  - Props: `accept`, `onFile(file)`, `label`
  - Visual drag-over state (dashed indigo border)
  - Shows selected file name badge

---

### Context & State

- [x] 6.11 — Add `IMPORT_TRANSACTIONS` action to `ExpenseContext`
  - Payload: `ParsedTransaction[]`
  - Maps each to internal expense format (assign `id`, detect `category`, set `type`)
  - **Replaces** current expense list (for demo clarity — not append)

- [x] 6.12 — Add `CLEAR_EXPENSES` action to `ExpenseContext`
  - Resets expense list to `[]`
  - Used by "Clear Data" button for demo reset

---

### Integration

- [x] 6.13 — Add "Upload Statement" button to `ExpensesPage.jsx` header
  - Indigo filled button with upload icon (lucide `Upload`)
  - Opens `BankUploadModal` on click

- [x] 6.14 — Add "Clear Data" ghost button next to "Upload Statement" (demo helper)
  - Dispatches `CLEAR_EXPENSES`
  - Confirms with a small inline confirmation (`"Clear all X transactions?"`)

- [x] 6.15 — Update `ExpensesPage.jsx` empty state
  - When no expenses: show centered prompt — "No transactions yet. Upload a bank statement to get started."
  - Include an inline "Upload Statement" call-to-action button

---

### Bank Column Reference

| Bank | Debit Column | Credit Column | Date Format | Status |
|------|-------------|--------------|-------------|--------|
| ICICI | `Withdrawal Amount (INR)` | `Deposit Amount (INR)` | DD.MM.YYYY | ✅ Active |
| Axis | `Withdrawal Amt` | `Deposit Amt` | DD-MM-YYYY | 🔜 Placeholder |
| HDFC | `Withdrawal Amt.` | `Deposit Amt.` | DD/MM/YY | 🔜 Placeholder |

---

**Phase 6 complete when:** Uploading an ICICI PDF from `samples/icici/` fills the expense list with correctly typed and auto-categorized transactions. Empty state shows before upload. No data persists on refresh. ✅ DONE

---

## 🐛 Bug Log

> Bugs discovered during testing. Each bug is tracked here from discovery to fix.

- [x] **[BUG] Phase 6** — `a.toHex is not a function` on PDF parse
  - **Symptom:** "Parse Statement" throws `a.toHex is not a function` in the browser console
  - **Root cause:** `pdfjs-dist` v5 color-space handling breaks on ICICI's embedded font/color profiles.
  - **Fix:** Downgrade `pdfjs-dist` to v3.11.174.
  - **Status:** ✅ Fixed

- [x] **[BUG] Phase 6** — `API version 5.4.624 does not match Worker version 3.11.174`
  - **Symptom:** After downgrade, browser still served the v5 main bundle from cache — version mismatch error.
  - **Root cause:** Browser/Vite cache served stale v5 bundle. CDN URL also unreliable.
  - **Fix:** Replaced CDN URL with Vite `?url` import (`pdfjs-dist/build/pdf.worker.min.js?url`) — worker bundled locally, always version-matched, no CDN dependency.
  - **Status:** ✅ Fixed

- [x] **[BUG] Phase 6.1** — Parser returns 0 transactions ("header not found, skipping")
  - **Symptom:** PDF loads and extracts text but parser finds no transactions on any page.
  - **Root cause:** ICICI PDF header is split across 3 y-levels (y=619, 614, 609). y-tolerance=3 kept them as separate rows → header detection always failed. Also, description first lines appear ~5 units ABOVE the anchor row (wrong assumption in original design).
  - **Fix:** Complete parser rewrite using a two-pass x-range approach (no header detection needed). Hardcoded x-ranges from real PDF debug output. Pass 1 finds anchor rows (date + amount items in same y-band). Pass 2 collects description items in the y-range `(next_anchor_y, anchor_y + 10]`.
  - **Test:** `node gt-gotrack/scripts/testIciciParser.mjs` → 34/34 transactions ✅
  - **Status:** ✅ Fixed

- [x] **[BUG] Phase 6.2** — Dashboard stats ("This Month Income / Expenses") show ₹0 after import
  - **Symptom:** Transactions populate correctly on the Expenses page, but StatsRow, CategoryBreakdown, and SpendingChart on the Dashboard show empty/zero data.
  - **Root cause:** All three components anchored "this month" to `new Date()` (the system clock). ICICI statement dates (Jan–Mar 2026) may not match the system date — causing all month-based filters to return nothing.
  - **Fix:** Derive the "current month" from the most recent transaction date in the expense list. Falls back to `new Date()` when no data is loaded. Applied to `StatsRow.jsx`, `CategoryBreakdown.jsx`, and `SpendingChart.jsx`.
  - **Status:** ✅ Fixed

---

## 🔖 Phase 6.1 — v1.51: Parser & Worker Stability

> Bug-fix phase that followed v1.5 demo testing.

- [x] 6.1.1 — Force reinstall `pdfjs-dist@3.11.174` (remove v5)
- [x] 6.1.2 — Replace CDN worker URL with Vite `?url` local bundle import
- [x] 6.1.3 — Rewrite `iciciParser.js` — two-pass x-range approach (no header detection)
  - Column x-ranges hardcoded from real PDF debug: date(50–100), remarks(170–400), withdrawal(385–460), deposit(455–520)
  - Pass 1: anchor detection (date item + nearby amount item within y±4)
  - Pass 2: description collection per anchor in y-range `(next_anchor.y, anchor.y + 10]`
- [x] 6.1.4 — Write `scripts/testIciciParser.mjs` — Node.js integration test (runs against real PDF, 34 tx ✅)
- [x] 6.1.5 — Write `scripts/debugPdfText.mjs` — PDF structure debugger (dump raw items + rows)
- [x] 6.1.6 — Create `docs/versions.md` — version + phase history tracker

**Phase 6.1 complete when:** Test script passes with 34 transactions, browser demo works end-to-end. ✅ DONE

---

## 🔖 Phase 6.2 — v1.6: Period Analytics & Balance Intelligence

> Adds period-based analytics to the Expenses page and syncs dashboard balance to the actual bank statement balance.

### Feature Set 1 — Period Analytics Engine
- [x] 6.2.1 — Create `src/utils/periodAnalytics.js` — pure utility functions: `getPeriodKey`, `navigatePeriod`, `filterExpensesByPeriod`, `computeBalanceForPeriod`, `computePeriodSummary`, `computeExpenseTrend`, `getBoundaryPeriod`
- [x] 6.2.2 — Create `src/hooks/usePeriodAnalytics.js` — period state + analytics hook (manages periodType, currentPeriod, navigation, summary)
- [x] 6.2.3 — Create `src/components/expenses/PeriodSelector.jsx` — [Weekly|Monthly|Quarterly] toggle + `‹ Period › ` nav bar
- [x] 6.2.4 — Create `src/components/expenses/PeriodSummaryCard.jsx` — Opening/Closing Bal, Income, Expenses (with trend ↑↓), Net Flow, Savings Rate, Avg Daily, Score, Top 3 categories
- [x] 6.2.5 — Update `ExpensesPage.jsx` — integrate hook + components, filter list to `periodExpenses`

### Feature Set 2 — Balance Intelligence
- [x] 6.2.6 — Update `iciciParser.js` — extract balance column in Pass 1, return `{ transactions, openingBalance, closingBalance }`
- [x] 6.2.7 — Update `bankParsers/index.js` — handle new `ParseResult` shape, wrap placeholder parsers
- [x] 6.2.8 — Update `ExpenseContext.jsx` — add `balance` to Expense typedef, add `balanceMeta` to state, update `IMPORT_TRANSACTIONS` and `CLEAR_EXPENSES`
- [x] 6.2.9 — Update `BankUploadModal.jsx` — consume `ParseResult`, show Opening/Closing Balance in Step 3 preview
- [x] 6.2.10 — Update `StatsRow.jsx` — use `balanceMeta.closingBalance` for Total Balance card

**Phase 6.2 complete when:** Upload PDF → Step 3 shows Opening/Closing Balance → Import → Dashboard balance matches → Expenses page shows period analytics with navigation ✅ DONE

---

## 💰 Phase 7 — Budget Tab (v1.7)
> Salary-period-aware budgeting, savings goal tracking, and spend-pace intelligence.
> Data source: imported ICICI bank statements. Budget target: localStorage-persisted.
> No backend — all calculations are client-side from the in-memory transaction list.

### Overview
A full budgeting system anchored to real salary periods. The app detects each Morgan Stanley
NEFT salary credit, defines a period from one salary to the next, and tracks how you're
spending relative to your savings goal. If no budget is configured, the page shows raw
financial data and a setup prompt.

### Salary Period Logic
- Salary event = income transaction where description contains "MORGAN STANLEY" (case-insensitive)
- Period = [salary date → day before next salary] (last period = salary date → today)
- Savings = `endBalance − preSalaryBalance`
  - preSalaryBalance = balance of last transaction before the salary credit
  - endBalance = balance of last transaction before the next salary credit
- spendableBudget = `salaryIncome − targetSavings`
- moneyLeftToSpend = `spendableBudget − totalSpentInPeriod`

### Budget Status Zones (projection-based)
| Label | Condition | Color |
|---|---|---|
| Cruising | projectedSavings ≥ target × 1.2 | Emerald |
| On Track | projectedSavings ≥ target | Green |
| Pacing | projectedSavings ≥ target × 0.85 | Amber |
| Heads Up | projectedSavings ≥ target × 0.65 | Orange |
| At Risk | projectedSavings ≥ target × 0.4 | Rose |
| Danger Zone | projectedSavings < target × 0.4 | Red |

---

### 7.1 — Utilities
- [x] 7.1.1 — Create `src/utils/salaryDetector.js`
  - `detectSalaryEvents(expenses)` → sorted salary events with pre/post balance
  - `detectSalaryPeriods(expenses)` → array of `SalaryPeriod` objects
  - Morgan Stanley NEFT keyword matching (case-insensitive)

- [x] 7.1.2 — Create `src/utils/budgetEngine.js`
  - `computeCurrentPeriodMetrics(period, expenses, targetSavings)` → live budget stats
  - `buildDailySpendingTimeline(expenses, periodStart, periodEnd)` → day-by-day cumulative for chart
  - `computeLifetimeSavings(periods)` → total saved, avg, best month, streak
  - `getBudgetStatus(projectedSavings, targetSavings)` → status label + colors

---

### 7.2 — State
- [x] 7.2.1 — Create `src/context/BudgetContext.jsx`
  - State: `{ targetSavings: number | null, budgetConfigured: boolean }`
  - Persisted to localStorage key `gt_budget_v1`
  - Actions: `SET_TARGET`, `CLEAR_BUDGET`
  - Exports: `BudgetProvider`, `useBudgetSettings`

- [x] 7.2.2 — Create `src/hooks/useBudget.js`
  - Combines `useExpenses` + `useBudgetSettings`
  - Derives: salary periods, current period metrics, daily timeline, lifetime stats
  - Returns: `{ isConfigured, currentPeriod, metrics, dailyTimeline, lifetimeStats, salaryPeriods }`

---

### 7.3 — Components
- [x] 7.3.1 — Create `src/components/budget/BudgetSetupCard.jsx`
  - Full-width card with piggy-bank icon, prompt, and savings target input
  - Shows when `!budgetConfigured` — sits above raw data view

- [x] 7.3.2 — Create `src/components/budget/BudgetStatusBar.jsx`
  - Animated progress bar spanning full width
  - Zones rendered as colored segments: Cruising / Pacing / Heads Up / At Risk
  - Needle/marker at current spend position
  - Status chip showing current zone label + icon

- [x] 7.3.3 — Create `src/components/budget/BudgetStatCard.jsx`
  - Reusable card: title, value, subtext, optional icon, optional color variant
  - Used for: Money Left, Projected Savings, Burn Rate, Days Left, Safe to Spend Today

- [x] 7.3.4 — Create `src/components/budget/SpendingPaceChart.jsx`
  - Recharts AreaChart
  - X: dates in current salary period, Y: cumulative spend (₹)
  - Area series (indigo gradient): actual daily cumulative spend
  - ReferenceLine (dashed rose): spendable budget ceiling

- [x] 7.3.5 — Create `src/components/budget/SavingsHistoryChart.jsx`
  - Recharts BarChart
  - One bar per salary period (past + current projected)
  - Bar color: emerald if savings ≥ target, rose if below
  - ReferenceLine: target savings
  - Tooltip shows period dates + actual vs target

- [x] 7.3.6 — Create `src/components/budget/LifetimeSavingsCard.jsx`
  - Summary card: Total Saved (all time), Average per Period, Best Month
  - Streak indicator: "X periods meeting target in a row"

---

### 7.4 — Page & Routing
- [x] 7.4.1 — Add `ROUTES.BUDGET = '/budget'` to `src/constants/index.js`
- [x] 7.4.2 — Add Budget nav link to `NAV_LINKS` in constants (PiggyBank icon, enabled)
- [x] 7.4.3 — Create `src/pages/BudgetPage.jsx`
  - If no data imported: empty state → "Upload a bank statement first"
  - If data but no budget set: `BudgetSetupCard` on top + raw summary stats below
  - If budget configured: full dashboard with status bar, 5 stat cards, pace chart, history chart, lifetime card
- [x] 7.4.4 — Add `BudgetProvider` to `App.jsx`
- [x] 7.4.5 — Add `PiggyBank` to Sidebar icon map + route to `App.jsx`

---

**Phase 7 complete when:** Budget tab live in sidebar → salary periods auto-detected from ICICI
import → budget status updates as data changes → target persists across refresh. ✅

---

---

## 🚀 Phase 8 — v3.0: Feature Enrichment + Code Quality

> Simplify budget model, enrich Transactions page, improve Analysis, upgrade Dashboard, write Phase 4 doc.

### 8.1 — New Utilities
- [x] 8.1.1 — Create `src/utils/paymentTypeDetector.js`
  - `PAYMENT_TYPES` enum (UPI, NEFT, IMPS, RTGS, ATM, Card, Auto-Debit, Other)
  - `detectPaymentType(note)` — priority-ordered string matching
  - `summariseByPaymentType(expenses)` — grouped aggregation for charts

### 8.2 — Budget Simplification
- [x] 8.2.1 — Rewrite `src/utils/budgetEngine.js` — pure monthly model (no salary tracking)
  - `getBudgetMonth(expenses)`, `computeMonthlyBudgetMetrics()`, `buildDailySpendingTimeline()`, `computeMonthlyBudgetInsights()`
- [x] 8.2.2 — Update `src/context/BudgetContext.jsx` — rename `targetSavings` → `monthlyBudget`, bump storage key to `gt_budget_v2`, add v1 migration
- [x] 8.2.3 — Rewrite `src/hooks/useBudget.js` — simplified, no salary detection
- [x] 8.2.4 — Update `BudgetSetupCard.jsx` — updated labels to "Monthly Budget"
- [x] 8.2.5 — Update `BudgetStatusBar.jsx` — prop `targetSavings` → `monthlyBudget`
- [x] 8.2.6 — Rewrite `BudgetInsights.jsx` — 6 cards: Peak Day, Largest Tx, Needs/Wants, Weekend/Weekday, Payment Methods (new), Month Rhythm (new)
- [x] 8.2.7 — Rewrite `BudgetPage.jsx` — 3 states (no data / unconfigured / configured), remove salary/period navigation, simplified Overview + Insights tabs

### 8.3 — Transactions Page Enrichment
- [x] 8.3.1 — Rewrite `ExpensesPage.jsx`
  - Search bar (by title/note keyword)
  - Sort: Newest, Oldest, Highest amount, Lowest amount
  - Payment type filter pills (UPI, NEFT, IMPS, RTGS, ATM, Card, Auto-Debit, Other)
  - Payment type badge on each transaction row
  - Insights tab: payment method breakdown, top merchants, category breakdown, cash inflow by method

### 8.4 — Analysis Page Enrichment
- [x] 8.4.1 — Rename "Income" → "Cash Inflow" in `PeriodSummaryCard.jsx`
- [x] 8.4.2 — Rename "Income" → "Cash Inflow" in `SpendingChart.jsx`
- [x] 8.4.3 — Enhance `AnalysisPage.jsx` — add Cash Inflow Sources card, Payment Methods breakdown, Spending by Day of Week chart

### 8.5 — Dashboard Enrichment
- [x] 8.5.1 — Update `StatsRow.jsx` — 4 cards (add Net Flow), rename "Income" → "Cash Inflow"
- [x] 8.5.2 — Update `HomePage.jsx` — add Budget Quick-Stats widget (status, remaining, burn rate, safe daily spend)

### 8.6 — Phase 4 Planning
- [x] 8.6.1 — Write `docs/phase4-auth-db-plan.md` — detailed auth + DB plan with Supabase recommendation, schema, API design, cost analysis, migration path

**Phase 8 complete when:** Build passes, all tabs enhanced, Budget monthly model live. ✅ DONE

---

## 🔮 v2.0 Preview (don't build yet)

- Node.js + Express backend
- MongoDB for persistence
- JWT authentication
- REST API replacing localStorage
- Real user accounts
- Export to CSV/PDF
- Persist imported bank statement data to DB

# GoTrack — Phase 4: Auth & Database Plan

> **Author:** Claude (GoTrack AI assistant)
> **Date:** 2026-03-03 (revised 2026-03-03)
> **Status:** Final — Ready for Implementation
> **Scope:** Replacing localStorage-only v1 storage with persistent backend + user authentication

---

## 1. Executive Summary

GoTrack v1 stores data in `localStorage` — transactions and budget settings. Phase 4 introduces:

- **User authentication** (email/password, session management)
- **Cloud database persistence** (transactions, per-month budgets, monthly balances)
- **Transaction deduplication** — bank reference + deterministic hash prevent overlapping uploads
- **Per-month opening/closing balances** — each statement upload stores its own balance range
- **External API** — other applications can POST transactions via API key (same dedup rules apply)
- **PDF parser stays client-side** — raw PDFs never leave the browser

---

## 2. Goals & Non-Goals

### Goals
- Users can sign up and sign in (email/password)
- Transactions persist across devices and sessions
- Overlapping statement uploads are handled gracefully — duplicates are silently skipped
- Opening/closing balance tracked per calendar month, not just globally
- External apps can push transactions via a simple POST API with an API key
- Budget configuration (default + per-month overrides) persists per user
- Dashboard loads in < 1s for a typical 6-month dataset

### Non-Goals (Phase 4)
- OAuth / social login (Google, GitHub) — Phase 5
- Bank account linking (Plaid / Fi Money) — Phase 5
- Multi-currency — Post Phase 5
- Team / shared budgets — Future

---

## 3. Tech Stack Decision

**Supabase (hosted, free tier)** — bundles Postgres + Auth + REST API + Edge Functions in one service.

| Feature | Supabase |
|---------|----------|
| Email/password auth | ✅ Built-in |
| JWT + session refresh | ✅ Automatic |
| Row-level security (RLS) | ✅ Native Postgres RLS |
| Edge Functions (for external API) | ✅ Deno-based |
| Free tier | ✅ 50,000 MAU, 500 MB DB |
| Self-hostable | ✅ Fully open-source |
| Schema migrations | ✅ Supabase CLI `supabase migration new` |

---

## 4. How Schema Migration Works in Supabase

> Answering: *"How difficult is it to change / edit the schema once it's in Supabase?"*

Schema changes in Supabase are standard Postgres `ALTER TABLE` statements. The Supabase dashboard has a SQL editor, and the Supabase CLI supports version-controlled migration files (like Rails migrations).

| Change type | Difficulty | Notes |
|-------------|------------|-------|
| Add a new column (nullable) | ✅ Trivial | `ALTER TABLE ADD COLUMN` — zero downtime |
| Add a new column (NOT NULL) | ⚠️ Easy | Must provide a `DEFAULT` or backfill existing rows first |
| Add a new table | ✅ Trivial | Just `CREATE TABLE` + RLS policy |
| Add an index | ✅ Trivial | Use `CREATE INDEX CONCURRENTLY` — no table lock |
| Add a UNIQUE constraint | ⚠️ Moderate | Fails if existing rows have duplicates — must deduplicate first, then add constraint |
| Rename a column | ✅ Easy | `ALTER TABLE RENAME COLUMN` — update Supabase client calls to match |
| Change column type | ⚠️ Moderate | Needs a `USING` cast if types are incompatible (e.g. TEXT → UUID) |
| Drop a column | ✅ Easy (SQL) | Audit all API calls first; data is gone permanently |
| Drop a table | ⚠️ Dangerous | Must migrate data first; irreversible |

**Recommendation:** Use the Supabase CLI with migration files from the start. Each change is a timestamped `.sql` file you can apply to dev, staging, and production independently. Running `supabase db push` applies pending migrations safely.

**Bottom line:** Schema changes are very manageable. The only genuinely risky operations are dropping columns/tables with live data. Everything else is routine Postgres DDL.

---

## 5. Transaction Deduplication Design

### 5.1 The Problem

ICICI statements frequently overlap. A user might upload:
- Statement A: 1 Mar – 15 Mar
- Statement B: 10 Mar – 31 Mar

Transactions from 10–15 Mar appear in both. Without dedup, they'd be inserted twice.

### 5.2 Two-Layer Dedup Strategy

**Layer 1 — `txn_hash` (primary dedup key)**

A deterministic SHA-256 hash computed from the transaction's core fields. Same transaction → same hash, always.

```js
// Computed client-side before insert (Web Crypto API — no dependency)
async function computeTxnHash(date, amount, type, description) {
  const raw = [
    date,                                          // '2026-03-10'
    String(amount),                                // '450.00'
    type,                                          // 'expense'
    description.toLowerCase().trim().slice(0, 120) // normalized remark
  ].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

The DB enforces `UNIQUE (user_id, txn_hash)`. On bulk import, use `INSERT ... ON CONFLICT (user_id, txn_hash) DO NOTHING`. Duplicates are silently skipped — no error, no UI noise.

**Layer 2 — `bank_ref` (extracted reference number)**

The transaction remarks in ICICI PDFs often embed a bank reference number (UPI transaction ID, NEFT UTR, etc.):

```
"UPI/402321456789/SWIGGY/abc@ybl"  →  bank_ref = "402321456789"
"NEFT/INBNIN26060000000/HDFC..."   →  bank_ref = "INBNIN26060000000"
"ATM WDR/1234"                     →  bank_ref = "1234"
```

`bank_ref` is stored as-is (nullable). It's useful for audits and customer support but is NOT the primary dedup mechanism — many transactions (especially UPI) have references that appear similar. The `txn_hash` is the authoritative dedup key.

### 5.3 External API dedup

Same rules apply. External POST requests must include `txn_hash` (computed by the caller). If a transaction with that hash already exists for the user, the insert is silently skipped via `ON CONFLICT DO NOTHING`.

---

## 6. Final Database Schema

### 6.1 `profiles`

Extends the Supabase-managed `auth.users` table. Stores the user's display name and their external API key.

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  api_key       TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile (with a fresh API key) on every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RLS: users can only read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);
```

**`api_key`** — a 64-char hex token auto-generated at signup. Used to authenticate external POST requests to the Edge Function. The user can rotate it from Settings.

---

### 6.2 `transactions`

The core table. Supports dedup via `txn_hash`, stores the bank reference, and links to the statement it came from.

```sql
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core transaction fields
  date            DATE NOT NULL,
  description     TEXT NOT NULL,          -- Transaction Remarks from bank
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type            TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category        TEXT NOT NULL DEFAULT 'other',

  -- Deduplication
  txn_hash        TEXT NOT NULL,          -- SHA-256 of (date|amount|type|description[:120])
  bank_ref        TEXT,                   -- Extracted UTR / UPI ref / cheque no. (nullable)

  -- Budget
  budget_excluded BOOLEAN NOT NULL DEFAULT false,

  -- Provenance
  source          TEXT NOT NULL DEFAULT 'manual',  -- 'icici_pdf' | 'hdfc_pdf' | 'manual' | 'api'
  statement_id    UUID REFERENCES public.statement_imports(id) ON DELETE SET NULL,
  imported_at     TIMESTAMPTZ DEFAULT now()
);

-- Primary dedup constraint — the DB enforces uniqueness
CONSTRAINT uq_transactions_user_hash UNIQUE (user_id, txn_hash);

-- Fast monthly range queries
CREATE INDEX idx_transactions_user_date
  ON public.transactions (user_id, date DESC);

-- Fast category queries for Analysis page
CREATE INDEX idx_transactions_user_category
  ON public.transactions (user_id, category);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);
```

**Bulk import pattern (with dedup):**

```js
const { error } = await supabase
  .from('transactions')
  .insert(rows, { onConflict: 'user_id,txn_hash', ignoreDuplicates: true });
  // Supabase JS v2: use { onConflict: '...', defaultToNull: false }
  // Raw SQL equivalent: INSERT ... ON CONFLICT (user_id, txn_hash) DO NOTHING
```

---

### 6.3 `statement_imports`

Tracks each PDF upload. Links transactions back to their source statement and stores the balance data for that specific upload.

```sql
CREATE TABLE public.statement_imports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Statement date range (from the PDF, not calendar month)
  statement_from   DATE NOT NULL,
  statement_to     DATE NOT NULL,

  -- Balances as read from the PDF
  opening_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  closing_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Metadata
  bank             TEXT NOT NULL DEFAULT 'icici',
  tx_count         INTEGER NOT NULL DEFAULT 0,   -- transactions inserted (after dedup)
  tx_skipped       INTEGER NOT NULL DEFAULT 0,   -- duplicates skipped
  imported_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own imports"
  ON public.statement_imports FOR ALL
  USING (auth.uid() = user_id);
```

**Why separate from `monthly_balances`?**
`statement_imports` captures the exact date range and balances from a real PDF — it's an audit log. `monthly_balances` (below) is a derived, calendar-aligned view used by the dashboard. They serve different purposes.

---

### 6.4 `monthly_balances`

Stores opening/closing balance **per calendar month per user**. Updated on each statement import via upsert — the more recent statement's closing balance wins.

```sql
CREATE TABLE public.monthly_balances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,           -- 'YYYY-MM' e.g. '2026-03'

  opening_balance  NUMERIC(12, 2) NOT NULL,
  closing_balance  NUMERIC(12, 2) NOT NULL,

  -- The actual date range that contributed these balances
  statement_from   DATE NOT NULL,
  statement_to     DATE NOT NULL,

  source           TEXT NOT NULL DEFAULT 'icici_pdf',
  updated_at       TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_monthly_balances_user_month UNIQUE (user_id, month)
);

-- RLS
ALTER TABLE public.monthly_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own monthly balances"
  ON public.monthly_balances FOR ALL
  USING (auth.uid() = user_id);
```

**Upsert logic on statement import:**

For each calendar month that the imported statement covers, upsert a row. The `statement_to` date determines which import "wins" for the closing balance — the most recently-dated statement's closing balance is authoritative.

```sql
INSERT INTO public.monthly_balances
  (user_id, month, opening_balance, closing_balance, statement_from, statement_to, source)
VALUES
  ($user_id, '2026-03', $opening, $closing, $from, $to, 'icici_pdf')
ON CONFLICT (user_id, month)
DO UPDATE SET
  closing_balance = CASE
    WHEN EXCLUDED.statement_to >= monthly_balances.statement_to
      THEN EXCLUDED.closing_balance
    ELSE monthly_balances.closing_balance
  END,
  opening_balance = CASE
    WHEN EXCLUDED.statement_from <= monthly_balances.statement_from
      THEN EXCLUDED.opening_balance
    ELSE monthly_balances.opening_balance
  END,
  updated_at = now();
```

**Real-world example:**

| Upload | statement_from | statement_to | opening | closing |
|--------|---------------|-------------|---------|---------|
| Upload A | 2026-03-01 | 2026-03-15 | ₹1,00,000 | ₹72,000 |
| Upload B | 2026-03-10 | 2026-03-31 | ₹80,000 | ₹58,000 |

After both uploads, `monthly_balances` row for `2026-03`:
- `opening_balance = ₹1,00,000` (Upload A's from-date is earlier)
- `closing_balance = ₹58,000` (Upload B's to-date is later)

---

### 6.5 `budget_settings`

Per-month budget limits. A row with `month = NULL` is the global default. A row with `month = 'YYYY-MM'` is an override for that specific month — maps directly to the `BudgetContext` schema in the frontend.

```sql
CREATE TABLE public.budget_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month           TEXT,                    -- NULL = global default; 'YYYY-MM' = month override
  monthly_budget  NUMERIC(12, 2) NOT NULL CHECK (monthly_budget >= 0),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_budget_settings_user_month UNIQUE (user_id, month)
);

-- RLS
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own budget settings"
  ON public.budget_settings FOR ALL
  USING (auth.uid() = user_id);
```

**Example rows:**

| user_id | month | monthly_budget |
|---------|-------|---------------|
| abc-123 | NULL | 100000 | ← global default (₹1L) |
| abc-123 | 2026-03 | 50000 | ← March override (₹50k) |
| abc-123 | 2026-02 | 120000 | ← February override (₹1.2L) |

**Upsert pattern:**

```js
// Set default budget
await supabase.from('budget_settings').upsert(
  { user_id, month: null, monthly_budget: amount },
  { onConflict: 'user_id,month' }
);

// Set month-specific budget
await supabase.from('budget_settings').upsert(
  { user_id, month: '2026-03', monthly_budget: 50000 },
  { onConflict: 'user_id,month' }
);

// Load all budget settings for the user (default + all overrides)
const { data } = await supabase
  .from('budget_settings')
  .select('month, monthly_budget')
  .eq('user_id', user_id);
// Reconstruct: { defaultBudget, monthlyBudgets: { 'YYYY-MM': amount } }
```

---

## 7. External API Design

### 7.1 Overview

GoTrack exposes a POST endpoint so external applications (scripts, other services, bank integrations) can push transactions programmatically. Authentication uses the user's `api_key` from `profiles`, not a Supabase JWT.

### 7.2 Endpoint

**Implemented as a Supabase Edge Function** (Deno runtime, deployed to `supabase/functions/ingest-transactions/`).

```
POST https://<project>.supabase.co/functions/v1/ingest-transactions
Authorization: Bearer <api_key>
Content-Type: application/json
```

### 7.3 Request Body

```json
{
  "transactions": [
    {
      "date": "2026-03-10",
      "description": "SWIGGY ORDER",
      "amount": 450.00,
      "type": "expense",
      "category": "food",
      "bank_ref": "UPI/402321456789",
      "txn_hash": "a3f9c2d8e1b..."
    },
    {
      "date": "2026-03-11",
      "description": "MORGAN STANLEY NEFT SALARY",
      "amount": 80000.00,
      "type": "income",
      "category": "income",
      "bank_ref": "INBN26060000123",
      "txn_hash": "b4e7d1a2c9f..."
    }
  ]
}
```

**Field rules:**

| Field | Required | Notes |
|-------|----------|-------|
| `date` | ✅ | ISO format `YYYY-MM-DD` |
| `description` | ✅ | Max 500 chars |
| `amount` | ✅ | Positive number, no sign |
| `type` | ✅ | `"expense"` or `"income"` |
| `txn_hash` | ✅ | SHA-256 hash — caller must compute |
| `category` | ❌ | Defaults to `"other"` if omitted |
| `bank_ref` | ❌ | UTR / UPI ref / cheque number |
| `budget_excluded` | ❌ | Defaults to `false` |

### 7.4 Response

```json
{
  "inserted": 14,
  "skipped": 3,
  "errors": []
}
```

- `inserted` — rows actually written to DB
- `skipped` — duplicates silently ignored (same `txn_hash` already exists for this user)
- `errors` — validation failures (malformed rows are skipped, not rejected wholesale)

### 7.5 Dedup on external POST

The caller must compute `txn_hash` using the same algorithm as the frontend:

```
SHA-256( date + "|" + amount + "|" + type + "|" + description.toLowerCase().trim().slice(0,120) )
```

The Edge Function uses `INSERT ... ON CONFLICT (user_id, txn_hash) DO NOTHING` — identical to the PDF import path. There is no special handling needed: same transaction = same hash = silently skipped regardless of whether it came from PDF upload or external API.

### 7.6 API key rotation

Users can rotate their `api_key` from the Settings page. This invalidates all existing external integrations (by design). Old key → 401 Unauthorized.

```sql
UPDATE public.profiles
SET api_key = encode(gen_random_bytes(32), 'hex')
WHERE id = auth.uid();
```

---

## 8. API Operations Reference (Supabase JS Client)

### Auth

```js
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();
const { data: { session } } = await supabase.auth.getSession();
```

### Transactions — bulk import

```js
// Compute hashes client-side first
const rows = await Promise.all(parsedTxns.map(async (tx) => ({
  user_id:     session.user.id,
  date:        tx.date,
  description: tx.description,
  amount:      tx.amount,
  type:        tx.type,
  category:    tx.category,
  bank_ref:    tx.bankRef ?? null,
  txn_hash:    await computeTxnHash(tx.date, tx.amount, tx.type, tx.description),
  source:      'icici_pdf',
  statement_id: statementImportId,
})));

const { error } = await supabase
  .from('transactions')
  .insert(rows, { onConflict: 'user_id,txn_hash', ignoreDuplicates: true });
```

### Transactions — fetch for a month

```js
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', session.user.id)
  .gte('date', '2026-03-01')
  .lte('date', '2026-03-31')
  .order('date', { ascending: false });
```

### Transactions — toggle budget exclude / delete

```js
// Budget exclude toggle
await supabase.from('transactions')
  .update({ budget_excluded: !current })
  .eq('id', txId)
  .eq('user_id', session.user.id);

// Delete
await supabase.from('transactions')
  .delete()
  .eq('id', txId)
  .eq('user_id', session.user.id);
```

### Monthly balances — upsert after import

```js
// For each calendar month covered by the statement
await supabase.rpc('upsert_monthly_balance', {
  p_user_id:        session.user.id,
  p_month:          '2026-03',
  p_opening:        openingBalance,
  p_closing:        closingBalance,
  p_from:           statementFrom,
  p_to:             statementTo,
  p_source:         'icici_pdf',
});
// (implement as a Postgres function to encapsulate the conditional upsert logic)
```

### Budget settings — load all

```js
const { data } = await supabase
  .from('budget_settings')
  .select('month, monthly_budget')
  .eq('user_id', session.user.id);

// Reconstruct BudgetContext state
const defaultRow = data.find(r => r.month === null);
const defaultBudget = defaultRow?.monthly_budget ?? null;
const monthlyBudgets = Object.fromEntries(
  data.filter(r => r.month !== null).map(r => [r.month, r.monthly_budget])
);
```

---

## 9. Frontend Architecture Changes

### 9.1 New files

```
src/
  services/
    supabase.js            ← Supabase client (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    transactionService.js  ← bulkInsert (with hash), fetch, toggle, delete
    balanceService.js      ← upsertMonthlyBalance, fetchMonthlyBalances
    budgetService.js       ← upsert/fetch budget_settings (default + per-month)
    statementService.js    ← create statement_imports record
    authService.js         ← signUp, signIn, signOut, onAuthStateChange
  context/
    AuthContext.jsx        ← session, user, loading
  pages/
    LoginPage.jsx
    SignUpPage.jsx
  components/
    auth/
      ProtectedRoute.jsx
```

### 9.2 Modified files

| File | Change |
|------|--------|
| `ExpenseContext.jsx` | Replace in-memory reset on load with Supabase fetch; dispatch actions write to DB |
| `BudgetContext.jsx` | Replace localStorage with `budgetService.js` — load all rows, reconstruct `{ defaultBudget, monthlyBudgets }` |
| `App.jsx` | Wrap with `<AuthProvider>`, add `<ProtectedRoute>` |
| `Sidebar.jsx` | User avatar + sign out |
| `iciciParser.js` | Add `extractBankRef(description)` helper |
| `BankUploadModal.jsx` | After import: call `statementService`, `balanceService`, show inserted/skipped counts |

### 9.3 Data flow

```
User opens app
  → AuthContext.getSession()
  → No session → /login
  → Session valid
      → transactionService.fetchAll() → ExpenseContext loaded
      → budgetService.fetchAll()      → BudgetContext loaded
      → All hooks (useBudget, usePeriodAnalytics) work unchanged
```

---

## 10. Schema Migration Plan (from v1 localStorage)

| Data | Migration |
|------|-----------|
| `gt_budget_v3` localStorage | On first post-login load, read localStorage, POST to `budget_settings`, clear localStorage |
| Transactions (in-memory) | Not persisted in v1 — user re-uploads PDF after login |
| `gt_budget_v2` / `gt_budget_v1` | Already migrated by BudgetContext v3 reducer; just read `defaultBudget` and push to Supabase |

---

## 11. Security

1. **PDFs never leave the browser** — `pdfjs-dist` extracts text locally; only structured JSON rows are sent to Supabase.
2. **RLS on every table** — `USING (auth.uid() = user_id)`. Even with the anon key exposed, users only access their own data.
3. **`service_role` key never in frontend** — only `anon` key in browser. `service_role` is used only inside Edge Functions (server-side, env var).
4. **API key rotation** — users can invalidate external integrations at any time.
5. **Input validation** — amounts validated (> 0, ≤ NUMERIC(12,2) max); descriptions sanitized (no raw HTML); dates validated as ISO format before insert.
6. **`txn_hash` computed by caller** — the DB doesn't generate it. This means the external caller is responsible for producing a correct hash. The Edge Function validates that `txn_hash` is a 64-char hex string before accepting the row.

---

## 12. Cost Analysis

### Supabase Free Tier ($0/month)

| Resource | Limit | GoTrack usage |
|----------|-------|---------------|
| Database | 500 MB | ~100k transactions ≈ 50 MB |
| Auth | 50,000 MAU | < 100 for personal/beta |
| REST API | Unlimited | Standard usage |
| Edge Functions | 500k calls/month | < 1k/month |
| Realtime | 200 concurrent | Not needed |

**Verdict:** Free tier is sufficient for personal use and small beta.

### Supabase Pro ($25/month) — upgrade triggers

- Daily backups (critical once real financial data is stored)
- > 500 MB database storage
- Preview environments for safe schema testing

---

## 13. Implementation Phases

### Phase 4.1 — Auth (Week 1)
1. Create Supabase project; run all SQL migrations from §6
2. `AuthContext`, `LoginPage`, `SignUpPage`, `ProtectedRoute`
3. Wire `Sidebar` with avatar + sign out

### Phase 4.2 — Transaction persistence (Week 2)
1. `transactionService.js` with `computeTxnHash` + `INSERT ON CONFLICT DO NOTHING`
2. `statementService.js` + `balanceService.js`
3. Update `BankUploadModal` to record statement import + inserted/skipped counts
4. Update `ExpenseContext` to load from Supabase on mount

### Phase 4.3 — Budget persistence (Week 2)
1. `budgetService.js` — load all `budget_settings` rows, reconstruct BudgetContext state
2. Update `BudgetContext` dispatch to write to Supabase instead of localStorage
3. Migrate existing localStorage budget data on first post-login load

### Phase 4.4 — External API (Week 3)
1. Supabase Edge Function `ingest-transactions`
2. Settings page: show API key, rotate button
3. Document the POST API for external callers

### Phase 4.5 — Polish (Week 3–4)
1. Loading skeletons on initial data fetch
2. Offline detection + graceful degradation
3. Error handling (network errors, auth expiry, duplicate upload feedback)
4. End-to-end test: upload PDF → parse → save → reload → verify balances

---

*This document is the final approved schema design. Implementation can begin.*

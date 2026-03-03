# GoTrack — Phase 4: Auth & Database Plan

> **Author:** Claude (GoTrack AI assistant)
> **Date:** 2026-03-03
> **Status:** Draft — Pending User Review
> **Scope:** Replacing localStorage-only v1 storage with persistent backend + user authentication

---

## 1. Executive Summary

GoTrack v1 stores all data in `localStorage` — transactions, budget settings, and parsing metadata. This works for a single-user demo but has severe limitations: data is browser-bound, not shareable across devices, and lost on browser clear.

Phase 4 introduces:
- **User authentication** (sign up, sign in, session management)
- **Cloud database persistence** (transactions, budget config, user profile)
- **PDF parser stays client-side** (no sensitive file upload to server)
- **Incremental migration** (localStorage fallback during transition)

---

## 2. Goals & Non-Goals

### Goals
- Users can sign up and sign in (email/password to start)
- Transactions persist across devices and sessions
- Budget configuration persists per user
- Fast reads — dashboard loads in < 1s
- Privacy-first — raw bank statement PDFs never leave the browser

### Non-Goals (Phase 4)
- OAuth / social login (Google, GitHub) — Phase 5
- Bank account linking (Plaid/Fi Money) — Phase 5
- Multi-currency support — Post Phase 5
- Team/shared budgets — Future

---

## 3. Recommended Tech Stack

### 3.1 Authentication

**Choice: [Supabase Auth](https://supabase.com/docs/guides/auth)**

| Feature | Supabase Auth |
|---------|--------------|
| Email/password | ✅ Built-in |
| JWT tokens | ✅ Automatic |
| Session refresh | ✅ Automatic |
| Row-level security | ✅ Native (Postgres RLS) |
| Free tier | ✅ 50,000 MAU |
| Self-hostable | ✅ If needed later |

**Why not Firebase Auth?**
Firebase Auth is equally capable, but Supabase bundles auth + Postgres database + storage in one service, reducing vendor count and cost. The Postgres + RLS combo is also a natural fit for the relational data model (transactions, budgets, users).

**Why not custom JWT with Express?**
Rolling custom auth means building token refresh, secure cookie handling, password hashing, and rate limiting from scratch. Supabase eliminates all of this in < 1 hour of setup.

### 3.2 Database

**Choice: [Supabase Postgres](https://supabase.com/docs/guides/database)**
(managed Postgres with REST API + realtime)

**Why Postgres over MongoDB?**
- Transactions have fixed schema (date, amount, category, type) — relational fits perfectly
- Aggregation queries (monthly totals, category breakdown) are simpler in SQL
- Row-level security (RLS) policies make per-user isolation trivial at the DB layer
- No ODM needed — clean SQL via Supabase client

**Why not PlanetScale / Neon?**
- PlanetScale is MySQL, which lacks some Postgres features we'd want (RLS, JSONB)
- Neon is Postgres but auth still needs a separate service
- Supabase bundles everything — less infrastructure to manage

### 3.3 Client Library

```
@supabase/supabase-js
```

Replaces direct `localStorage` calls in `ExpenseContext` and `BudgetContext` with Supabase realtime subscriptions and REST calls.

---

## 4. Database Schema

### 4.1 `users` (managed by Supabase Auth)

Supabase Auth creates a `auth.users` table automatically. We extend with a `public.profiles` table:

```sql
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
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
```

### 4.2 `transactions`

```sql
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  title           TEXT NOT NULL,
  note            TEXT,
  amount          NUMERIC(12, 2) NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category        TEXT NOT NULL DEFAULT 'other',
  budget_excluded BOOLEAN NOT NULL DEFAULT false,
  imported_at     TIMESTAMPTZ DEFAULT now(),
  source          TEXT DEFAULT 'manual'  -- 'icici_pdf', 'manual', etc.
);

-- Index for fast monthly queries
CREATE INDEX idx_transactions_user_date
  ON public.transactions (user_id, date DESC);

-- Row-level security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);
```

### 4.3 `budget_settings`

```sql
CREATE TABLE public.budget_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget  NUMERIC(12, 2),
  configured      BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own budget settings"
  ON public.budget_settings FOR ALL
  USING (auth.uid() = user_id);
```

### 4.4 `balance_meta`

```sql
CREATE TABLE public.balance_meta (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opening_balance   NUMERIC(12, 2) DEFAULT 0,
  closing_balance   NUMERIC(12, 2) DEFAULT 0,
  statement_from    DATE,
  statement_to      DATE,
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.balance_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own balance meta"
  ON public.balance_meta FOR ALL
  USING (auth.uid() = user_id);
```

---

## 5. API Design (Supabase Client)

All reads/writes go through `@supabase/supabase-js`. No custom Express API needed for v2.

### 5.1 Auth operations

```js
// Sign up
const { data, error } = await supabase.auth.signUp({ email, password });

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// Sign out
await supabase.auth.signOut();

// Get current session
const { data: { session } } = await supabase.auth.getSession();
```

### 5.2 Transaction operations

```js
// Bulk import (after PDF parse)
const { error } = await supabase
  .from('transactions')
  .insert(parsedTransactions.map(tx => ({ ...tx, user_id: session.user.id })));

// Fetch for a month
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', session.user.id)
  .gte('date', '2026-02-01')
  .lte('date', '2026-02-28')
  .order('date', { ascending: false });

// Toggle budget exclude
const { error } = await supabase
  .from('transactions')
  .update({ budget_excluded: !current })
  .eq('id', txId)
  .eq('user_id', session.user.id);

// Delete
const { error } = await supabase
  .from('transactions')
  .delete()
  .eq('id', txId)
  .eq('user_id', session.user.id);
```

### 5.3 Budget settings

```js
// Upsert budget
const { error } = await supabase
  .from('budget_settings')
  .upsert({ user_id: session.user.id, monthly_budget: amount, configured: true });

// Fetch
const { data } = await supabase
  .from('budget_settings')
  .select('*')
  .eq('user_id', session.user.id)
  .single();
```

---

## 6. Frontend Architecture Changes

### 6.1 New files

```
src/
  services/
    supabase.js          ← Supabase client init (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
    transactionService.js ← CRUD wrappers for transactions table
    budgetService.js      ← Upsert/fetch for budget_settings
    authService.js        ← signUp, signIn, signOut, onAuthStateChange
  context/
    AuthContext.jsx       ← session state, loading, user object
  pages/
    LoginPage.jsx         ← sign in form
    SignUpPage.jsx        ← sign up form
  components/
    auth/
      ProtectedRoute.jsx  ← wraps routes, redirects to /login if not authed
```

### 6.2 Modified files

| File | Change |
|------|--------|
| `ExpenseContext.jsx` | Replace `localStorage` reads/writes with `transactionService.js` calls; keep in-memory state as cache |
| `BudgetContext.jsx` | Replace `gt_budget_v2` localStorage with `budgetService.js` |
| `App.jsx` | Wrap routes with `<AuthProvider>`, add `<ProtectedRoute>` around all non-auth routes |
| `Sidebar.jsx` | Add user avatar + sign out button at bottom |

### 6.3 Data flow after auth

```
User opens app
  → AuthContext checks session (Supabase)
  → If no session → redirect to /login
  → If session exists → load transactions (Supabase) into ExpenseContext
  → All existing hooks (useBudget, usePeriodAnalytics) work unchanged
```

### 6.4 localStorage migration

On first login after Phase 4 deploy, we check for existing `gt_budget_v2` localStorage data and automatically migrate it to Supabase. This ensures no data loss for existing users.

---

## 7. Cost Analysis

### Supabase Free Tier (Hobby plan — $0/month)

| Resource | Limit | GoTrack Expected Usage |
|----------|-------|----------------------|
| Database rows | 500 MB storage | ~100k transactions = ~50 MB |
| Auth users | 50,000 MAU | < 100 for v2 launch |
| API requests | 500k/month | < 10k/month for personal use |
| Realtime | 200 concurrent | Not needed initially |
| Edge Functions | 500k calls/month | Not needed initially |

**Verdict:** Free tier is more than sufficient for personal use and small beta.

### Supabase Pro ($25/month) — when needed

| Feature | Why upgrade |
|---------|------------|
| 8 GB database | When transactions exceed 500 MB (years of data) |
| Daily backups | Critical once real financial data is stored |
| Branching (preview envs) | Useful for testing schema migrations |

### Alternative: Self-hosted Supabase ($5-10/month VPS)

For max control and no vendor lock-in, Supabase is fully open-source and can be run on a Hetzner/DigitalOcean VPS. Suitable when user count grows or data privacy requires it.

---

## 8. Security Considerations

1. **PDFs never leave the browser** — parsing stays client-side (`pdfjs-dist`). Only structured transaction data (JSON) is sent to Supabase.

2. **Row-level security on all tables** — every table has `USING (auth.uid() = user_id)` RLS policy. Even if the anon key is exposed, users can only read their own data.

3. **Anon key is safe to expose** — Supabase's `anon` key is designed to be used in browser code. It only grants access based on RLS policies. The `service_role` key must never be in frontend code.

4. **Sensitive env vars** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` go in `.env.local` (gitignored). Use Vercel/Netlify environment variable injection for production.

5. **Input validation** — all amounts are validated before insert (non-negative, within reasonable range). Titles/notes are sanitized (no raw HTML).

---

## 9. Migration Path

### Phase 4.1 — Auth layer (Week 1)
1. Create Supabase project, run schema migrations
2. Build `AuthContext`, `LoginPage`, `SignUpPage`, `ProtectedRoute`
3. Test sign up / sign in flow
4. Wire `Sidebar` with user avatar + sign out

### Phase 4.2 — Database persistence (Week 2)
1. Build `transactionService.js` and `budgetService.js`
2. Update `ExpenseContext` — load from Supabase on mount, write on dispatch
3. Update `BudgetContext` — upsert on budget save
4. Add localStorage → Supabase migration on first auth

### Phase 4.3 — Polish (Week 3)
1. Loading skeletons while data fetches
2. Offline detection + graceful degradation
3. Error handling (network errors, auth expiry)
4. End-to-end test: upload PDF → parse → save → reload → verify

---

## 10. Open Questions

1. **Multi-bank support** — Currently only ICICI is parsed. Should Phase 4 add HDFC/SBI parsers? (Yes — separate task)
2. **Statement deduplication** — If user uploads the same PDF twice, do we merge or reject? (Recommend: hash-based dedup on transaction date+amount+note)
3. **Data export** — Should users be able to export their data as CSV/JSON? (Yes — simple Phase 4.3 addition)
4. **Rate limiting** — Supabase free tier has no built-in rate limiting per user. Add client-side debouncing on write operations.

---

## 11. Recommended Decision

**Go with Supabase (Hosted, Free tier)** for Phase 4.

- ✅ Fastest to implement (< 2 days to working auth + DB)
- ✅ Free for personal/small use
- ✅ Postgres + RLS = secure by default
- ✅ Self-hostable if needed later
- ✅ No custom backend code needed
- ✅ supabase-js client is well-documented and actively maintained

The only risk is vendor lock-in, which is mitigated by Supabase being open-source and self-hostable.

---

*This document should be reviewed and approved before beginning Phase 4 implementation.*

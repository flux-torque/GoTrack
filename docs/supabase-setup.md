# GoTrack — Supabase Setup Guide

> Complete step-by-step reference for setting up the Supabase backend for GoTrack.
> Follow this guide in order. All SQL can be run in the Supabase SQL editor.

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New project**
3. Fill in:
   - **Name:** `gotrack` (or whatever you prefer)
   - **Database password:** generate a strong password and save it somewhere safe
   - **Region:** pick the one closest to you
4. Click **Create new project** — wait ~2 minutes for provisioning

---

## 2. Get Your API Credentials

1. In your Supabase project, go to **Settings → API**
2. You will see two keys under **Project API keys**:

| Dashboard label | Also called | `.env` variable | Use |
|----------------|-------------|-----------------|-----|
| `anon` / `public` | Publishable key | — | **Not needed** — gt-api handles all DB access |
| `service_role` | Secret key | `SUPABASE_SERVICE_ROLE_KEY` | gt-api `.env` only |

Also copy:

| Dashboard label | `.env` variable |
|----------------|-----------------|
| Project URL | `SUPABASE_URL` |

> **Warning:** The `service_role` (secret) key bypasses all Row Level Security.
> It must only live in `gt-api/.env` — never commit it to git, never put it in the frontend.

---

## 3. Configure gt-api Environment

```bash
# in gt-api/
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 4. Run Database Migrations

Go to your Supabase project → **SQL Editor** → **New query**.
Run each block below in order.

---

### Migration 001 — profiles table

```sql
-- Extends auth.users with display name and external API key
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  api_key       TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row whenever a new user signs up
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

-- RLS: users can only see/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);
```

---

### Migration 002 — statement_imports table

```sql
-- Tracks each PDF bank statement upload (audit log)
CREATE TABLE public.statement_imports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  statement_from   DATE NOT NULL,
  statement_to     DATE NOT NULL,

  opening_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  closing_balance  NUMERIC(12, 2) NOT NULL DEFAULT 0,

  bank             TEXT NOT NULL DEFAULT 'icici',
  tx_count         INTEGER NOT NULL DEFAULT 0,
  tx_skipped       INTEGER NOT NULL DEFAULT 0,
  imported_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own imports"
  ON public.statement_imports FOR ALL
  USING (auth.uid() = user_id);
```

---

### Migration 003 — transactions table

```sql
-- Core transactions table with deduplication via txn_hash
CREATE TABLE public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type            TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  category        TEXT NOT NULL DEFAULT 'other',

  -- Deduplication key (SHA-256 of date|amount|type|description[:120])
  -- Computed server-side in gt-api — client never sends this
  txn_hash        TEXT NOT NULL,
  bank_ref        TEXT,

  budget_excluded BOOLEAN NOT NULL DEFAULT false,

  -- Where this transaction came from
  source          TEXT NOT NULL DEFAULT 'manual',
  -- 'icici_pdf' | 'manual' | 'api' | 'ios_shortcut'

  statement_id    UUID REFERENCES public.statement_imports(id) ON DELETE SET NULL,
  imported_at     TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_transactions_user_hash UNIQUE (user_id, txn_hash)
);

-- Fast monthly range queries (used on every page load)
CREATE INDEX idx_transactions_user_date
  ON public.transactions (user_id, date DESC);

-- Fast category breakdown queries (Analysis page)
CREATE INDEX idx_transactions_user_category
  ON public.transactions (user_id, category);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own transactions"
  ON public.transactions FOR ALL
  USING (auth.uid() = user_id);
```

---

### Migration 004 — monthly_balances table

```sql
-- Calendar-month opening/closing balances (derived from statement imports)
CREATE TABLE public.monthly_balances (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month            TEXT NOT NULL,           -- 'YYYY-MM'

  opening_balance  NUMERIC(12, 2) NOT NULL,
  closing_balance  NUMERIC(12, 2) NOT NULL,

  statement_from   DATE NOT NULL,
  statement_to     DATE NOT NULL,

  source           TEXT NOT NULL DEFAULT 'icici_pdf',
  updated_at       TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_monthly_balances_user_month UNIQUE (user_id, month)
);

ALTER TABLE public.monthly_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own monthly balances"
  ON public.monthly_balances FOR ALL
  USING (auth.uid() = user_id);
```

---

### Migration 005 — budget_settings table

```sql
-- Budget limits: NULL month = global default, 'YYYY-MM' = month override
CREATE TABLE public.budget_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month           TEXT,
  monthly_budget  NUMERIC(12, 2) NOT NULL CHECK (monthly_budget >= 0),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT uq_budget_settings_user_month UNIQUE (user_id, month)
);

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own budget settings"
  ON public.budget_settings FOR ALL
  USING (auth.uid() = user_id);
```

---

### Migration 006 — helper functions

```sql
-- upsert_monthly_balance
-- Conditional upsert: more recent statement_to wins for closing balance,
-- earlier statement_from wins for opening balance.
CREATE OR REPLACE FUNCTION public.upsert_monthly_balance(
  p_user_id  UUID,
  p_month    TEXT,
  p_opening  NUMERIC,
  p_closing  NUMERIC,
  p_from     DATE,
  p_to       DATE,
  p_source   TEXT DEFAULT 'icici_pdf'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.monthly_balances
    (user_id, month, opening_balance, closing_balance, statement_from, statement_to, source)
  VALUES
    (p_user_id, p_month, p_opening, p_closing, p_from, p_to, p_source)
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- rotate_api_key
-- Generates a new API key for the given user. Returns the new key.
CREATE OR REPLACE FUNCTION public.rotate_api_key(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := encode(gen_random_bytes(32), 'hex');
  UPDATE public.profiles SET api_key = new_key WHERE id = p_user_id;
  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 5. Verify Setup

Run this in the SQL editor to confirm all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:
```
budget_settings
monthly_balances
profiles
statement_imports
transactions
```

Run this to confirm RLS is enabled on all tables:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should show `rowsecurity = true`.

---

## 6. Configure Auth Settings (optional but recommended)

In Supabase dashboard → **Authentication → Settings**:

| Setting | Recommended value |
|---------|------------------|
| Enable email confirmations | Off (for personal/dev use) |
| Minimum password length | 8 |
| JWT expiry | 3600 (1 hour) — default |

---

## 7. Start gt-api

```bash
cd gt-api
npm install        # first time only
npm run dev        # starts with --watch (auto-restart on file change)
```

Test it:
```bash
curl http://localhost:3001/health
# → { "status": "ok", "service": "gt-api" }
```

---

## 8. API Reference (quick)

Base URL: `http://localhost:3001` (dev) or your deployed URL (prod)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | — | Health check |
| POST | /auth/signup | — | Create account |
| POST | /auth/signin | — | Get access token |
| POST | /auth/signout | JWT | Sign out |
| GET | /auth/me | JWT | Current user + API key |
| GET | /transactions?month=YYYY-MM | JWT | Fetch transactions |
| POST | /transactions | JWT | Manual single entry |
| POST | /transactions/bulk | JWT | Bulk insert from PDF |
| PATCH | /transactions/:id | JWT | Update (category, budget_excluded) |
| DELETE | /transactions/:id | JWT | Delete transaction |
| POST | /ingest | API key | External push (iOS Shortcut, scripts) |
| POST | /ingest/rotate-key | API key | Rotate your API key |
| GET | /budgets | JWT | Load budget settings |
| POST | /budgets | JWT | Save budget (default or per-month) |
| DELETE | /budgets/:month | JWT | Remove budget (pass 'default' for global) |
| POST | /statements | JWT | Record a statement import |
| GET | /statements | JWT | List all imports |
| GET | /statements/balances | JWT | Get monthly balances |
| POST | /statements/balances | JWT | Upsert a monthly balance |

**JWT auth:** `Authorization: Bearer <access_token>` (from /auth/signin)

**API key auth:** `Authorization: Bearer <api_key>` (from /auth/me)

---

## 9. iOS Shortcut Setup

Once gt-api is deployed (or running locally via ngrok for testing):

1. In iOS Shortcuts, create a new shortcut triggered by **Message received from ICICI**
2. Use **Get Details of Messages** to extract sender and body
3. Parse the SMS body with regex to extract amount, type, description
4. Use **Get Contents of URL** action:
   - URL: `https://your-gt-api.com/ingest`
   - Method: `POST`
   - Headers: `Authorization: Bearer <your_api_key>`
   - Body (JSON):
     ```json
     {
       "date": "YYYY-MM-DD",
       "description": "parsed from SMS",
       "amount": 450.00,
       "type": "expense",
       "source": "ios_shortcut"
     }
     ```

> Note: `txn_hash` is NOT required — gt-api computes it server-side.

---

## 10. Deploying gt-api

For production, deploy `gt-api` to any Node.js host:

| Platform | Free tier | Notes |
|----------|-----------|-------|
| **Railway** | $5 credit/month | Easiest — connect GitHub, auto-deploy |
| **Render** | 750 hrs/month | Free web service, spins down after 15min inactivity |
| **Fly.io** | 3 shared VMs free | More control, persistent |

Set the same env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `ALLOWED_ORIGINS`) in the platform's environment settings.

Update `ALLOWED_ORIGINS` to your deployed frontend URL.

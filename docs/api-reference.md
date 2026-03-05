# GoTrack API Reference

> **Base URL:** `http://localhost:3001` (dev) | your deployed URL (prod)
> **Auth:** All protected routes require `Authorization: Bearer <access_token>` (JWT from sign-in)
> **API Key auth:** `/ingest` routes use `Authorization: Bearer <api_key>` (from `/auth/me`)

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Returns `{ status: "ok", service: "gt-api" }` |

---

## Auth

### POST `/auth/signup`
Create a new account.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```
**Response:** `201 Created`
```json
{ "message": "Account created" }
```

---

### POST `/auth/signin`
Sign in and get access tokens.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```
**Response:** `200 OK`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "expires_at": 1700000000,
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

---

### POST `/auth/signout`
Invalidate the current session.

**Auth:** JWT
**Response:** `200 OK` `{ "message": "Signed out" }`

---

### GET `/auth/me`
Returns the current authenticated user plus their API key.

**Auth:** JWT
**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "api_key": "abc123...",
  "created_at": "2026-01-01T00:00:00Z"
}
```

---

## Transactions

### GET `/transactions`
Fetch all transactions for the authenticated user. Optionally filter by month.

**Auth:** JWT
**Query params:**

| Param | Type | Description |
|-------|------|-------------|
| `month` | `YYYY-MM` | Optional. If provided, returns only transactions in that month |

**Response:** `200 OK` — array of transaction objects
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "date": "2026-03-01",
    "description": "Swiggy / Food Delivery",
    "amount": "450.00",
    "type": "expense",
    "category": "food",
    "txn_hash": "sha256hash",
    "bank_ref": null,
    "budget_excluded": false,
    "source": "icici_pdf",
    "statement_id": "uuid",
    "imported_at": "2026-03-06T12:00:00Z"
  }
]
```

---

### POST `/transactions`
Create a single manual transaction.

**Auth:** JWT
**Body:**
```json
{
  "date": "2026-03-06",
  "description": "Coffee at Starbucks",
  "amount": 350,
  "type": "expense",
  "category": "food",
  "source": "manual"
}
```
**Response:** `201 Created` — the created transaction object

---

### POST `/transactions/bulk`
Insert multiple transactions (from PDF import). Duplicate hashes are silently skipped.

**Auth:** JWT
**Body:**
```json
{
  "transactions": [
    {
      "date": "2026-03-01",
      "description": "NEFT Transfer In",
      "amount": 50000,
      "type": "income",
      "category": "other",
      "source": "icici_pdf"
    }
  ],
  "statement_id": "uuid"
}
```
**Response:** `200 OK`
```json
{
  "inserted": 45,
  "skipped": 3,
  "message": "Bulk import complete"
}
```

---

### PATCH `/transactions/:id`
Update a single transaction field (category or budget_excluded).

**Auth:** JWT
**Body (any subset):**
```json
{
  "category": "food",
  "budget_excluded": true
}
```
**Response:** `200 OK` — updated transaction object

---

### DELETE `/transactions/:id`
Delete a transaction permanently.

**Auth:** JWT
**Response:** `200 OK` `{ "message": "Deleted" }`

---

## Ingest (External / iOS Shortcut)

### POST `/ingest`
Push a single transaction from an external source (iOS Shortcut, automation script).

**Auth:** API Key
**Body:**
```json
{
  "date": "2026-03-06",
  "description": "HDFC UPI Payment",
  "amount": 1200,
  "type": "expense",
  "source": "ios_shortcut"
}
```
> `txn_hash` is NOT required — gt-api computes it server-side for deduplication.

**Response:** `201 Created` — the created transaction object

---

### POST `/ingest/rotate-key`
Generate a new API key, invalidating the previous one.

**Auth:** API Key
**Response:** `200 OK`
```json
{ "api_key": "newkey123..." }
```

---

## Budgets

### GET `/budgets`
Load all budget settings for the user.

**Auth:** JWT
**Response:** `200 OK`
```json
{
  "defaultBudget": 30000,
  "monthlyBudgets": {
    "2026-03": 35000
  }
}
```

---

### POST `/budgets`
Save a budget setting. Pass `month: null` for the global default, or `"YYYY-MM"` for a month-specific override.

**Auth:** JWT
**Body:**
```json
{
  "monthly_budget": 30000,
  "month": null
}
```
or for a specific month:
```json
{
  "monthly_budget": 35000,
  "month": "2026-03"
}
```
**Response:** `200 OK` `{ "message": "Budget saved" }`

---

### DELETE `/budgets/:month`
Remove a budget setting. Pass `"default"` to remove the global default, or `"YYYY-MM"` to remove a month override.

**Auth:** JWT
**Response:** `200 OK` `{ "message": "Budget removed" }`

---

## Statements

### POST `/statements`
Record a statement import audit entry.

**Auth:** JWT
**Body:**
```json
{
  "statement_from": "2026-02-01",
  "statement_to": "2026-02-28",
  "opening_balance": 12345.67,
  "closing_balance": 8765.43,
  "bank": "icici",
  "tx_count": 48,
  "tx_skipped": 2
}
```
**Response:** `201 Created` — the created statement_imports record

---

### GET `/statements`
List all statement imports for the user.

**Auth:** JWT
**Response:** `200 OK` — array of statement_imports objects

---

### GET `/statements/balances`
Get monthly opening/closing balances derived from statements.

**Auth:** JWT
**Response:** `200 OK`
```json
[
  {
    "month": "2026-02",
    "opening_balance": 12345.67,
    "closing_balance": 8765.43,
    "statement_from": "2026-02-01",
    "statement_to": "2026-02-28",
    "source": "icici_pdf"
  }
]
```

---

### POST `/statements/balances`
Upsert a monthly balance. More recent `statement_to` wins for closing balance; earlier `statement_from` wins for opening balance.

**Auth:** JWT
**Body:**
```json
{
  "month": "2026-02",
  "opening_balance": 12345.67,
  "closing_balance": 8765.43,
  "statement_from": "2026-02-01",
  "statement_to": "2026-02-28",
  "source": "icici_pdf"
}
```
**Response:** `200 OK` `{ "message": "Balance upserted" }`

---

## Error Responses

All errors return a consistent shape:
```json
{
  "error": "Human-readable message"
}
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — invalid or expired token |
| `403` | Forbidden — not your resource |
| `404` | Not found |
| `409` | Conflict — duplicate transaction (deduplication) |
| `500` | Internal server error |

---

## Frontend Services Layer

The frontend calls gt-api via `src/services/api.js` using `apiFetch()`.

| Function | Used by | Description |
|----------|---------|-------------|
| `apiFetch(path, options)` | All contexts | Base fetch wrapper — attaches JWT, handles 401 expiry |

### Context actions → API calls

| Context action | API call |
|---------------|----------|
| `fetchExpenses()` | `GET /transactions` |
| `addExpense(data)` | `POST /transactions` |
| `deleteExpense(id)` | `DELETE /transactions/:id` |
| `toggleBudgetExclude(id)` | `PATCH /transactions/:id` |
| `importBulk(parsedResult, bank)` | `POST /statements` + `POST /transactions/bulk` + `POST /statements/balances` |
| `login(email, pw)` | `POST /auth/signin` |
| `signup(email, pw)` | `POST /auth/signup` |
| `logout()` | `POST /auth/signout` |
| `dispatch(SET_DEFAULT_BUDGET)` | `POST /budgets` |
| `dispatch(SET_MONTH_BUDGET)` | `POST /budgets` |
| `dispatch(CLEAR_MONTH_BUDGET)` | `DELETE /budgets/:month` |
| `dispatch(CLEAR_BUDGET)` | `DELETE /budgets/default` + `DELETE /budgets/:month` (×N) |

---

## Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | One row per user — display_name, api_key |
| `transactions` | All financial transactions (deduped by `txn_hash`) |
| `statement_imports` | Audit log of PDF uploads |
| `monthly_balances` | Opening/closing balances per calendar month |
| `budget_settings` | Monthly budget limits (`month = null` = global default) |

Full schema + migrations: see `docs/supabase-setup.md`

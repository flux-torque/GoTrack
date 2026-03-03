# GoTrack — Database & Persistence Analysis

> **Purpose:** Research and cost analysis for adding backend persistence to GoTrack (v2.0).
> Covers storage estimation, database options, pricing tiers, and a final recommendation.
>
> **Date:** March 2026 | **Author:** Research via Claude

---

## 1. The Problem

GoTrack v1.5 is fully **in-memory**. Importing a bank statement populates data only for that browser tab session — a page refresh resets everything to empty. For v2.0, we need a real database so data survives across sessions and devices.

---

## 2. What Does One Record Look Like?

Every expense/transaction stored in GoTrack has 7 fields (v1.5 shape), plus fields we'll need to add in v2.0:

### Current Expense Schema (v1.5)
```js
{
  id:       "import-1740825600000-0",  // string  ~30 chars
  title:    "SWIGGY ORDER",            // string  ≤40 chars
  note:     "UPI/SWIGGY/123456789",    // string  ~80 chars avg
  category: "food",                    // string  ~10 chars
  type:     "expense",                 // string   7 chars
  amount:   349,                       // number   8 bytes
  date:     "2026-02-14",             // string  10 chars
}
```

### Additional fields needed in v2.0
```js
  userId:    "uuid-v4",               // string  36 chars  (multi-user)
  createdAt: 1740825600000,           // number   8 bytes  (audit)
  updatedAt: 1740825600000,           // number   8 bytes  (sync)
```

### Per-Record Size Estimate

| Component | Size |
|-----------|------|
| All field values (avg) | ~230 B |
| Field name keys | ~55 B |
| JSON / BSON document overhead | ~65 B |
| Index overhead (userId, date) | ~50 B |
| **Total per record** | **~400 B (use 500 B to be safe)** |

---

## 3. Storage Calculation — 10 Users, 500 Transactions Each

| Item | Count | Size Each | Total |
|------|-------|-----------|-------|
| Transaction records | 10 × 500 = **5,000** | 500 B | **2.5 MB** |
| User account records | 10 | 500 B | 5 KB |
| Database indexes | — | — | ~0.5 MB |
| **Grand Total** | | | **~3 MB** |

> **3 MB is extremely small.** Every database's free tier starts at 500 MB minimum.
> GoTrack at 10 users consumes **less than 1% of any free tier's storage quota.**

---

## 4. Scale Projections

| Users | Tx / User | Total Records | Est. Storage | Fits in Free Tier? |
|-------|-----------|--------------|--------------|---------------------|
| 10 | 500 | 5,000 | **~3 MB** | ✅ All options |
| 100 | 500 | 50,000 | **~25 MB** | ✅ All options |
| 500 | 500 | 250,000 | **~125 MB** | ✅ All options |
| 1,000 | 500 | 500,000 | **~250 MB** | ✅ All options |
| 2,000 | 500 | 1,000,000 | **~500 MB** | ⚠️ MongoDB M0 limit reached |
| 5,000 | 500 | 2,500,000 | **~1.25 GB** | ❌ Upgrade needed ($8–$25/mo) |

**Takeaway:** GoTrack won't need a paid database tier until it has **~2,000+ active users** each importing a full year of bank statements.

---

## 5. Database Options Compared

### Option A — MongoDB Atlas (M0 Free)

> Best fit for GoTrack's planned v2.0 stack (Node.js + Express + MongoDB + JWT)

| Spec | Value |
|------|-------|
| Free storage | **512 MB** |
| Max operations | 100 ops/sec |
| Credit card required | No |
| Sleeps on inactivity | **No** (always on) |
| Backups on free tier | No |
| Data model | Document (JSON/BSON) — native fit for GoTrack expenses |
| Auth strategy | DIY: JWT + bcrypt via Express middleware |

**Pricing tiers:**

| Tier | Price | Storage | Use when |
|------|-------|---------|----------|
| M0 Free | **$0** | 512 MB | 0–2,000 users |
| Flex | **$8/mo** (capped $30) | 5 GB | 2,000–50,000 users |
| M10 Dedicated | **$57/mo** | 10 GB | Production, SLA needed |

**GoTrack cost at 10 users: $0**

---

### Option B — Supabase (PostgreSQL)

| Spec | Value |
|------|-------|
| Free storage | **500 MB** |
| Free monthly active users | 50,000 |
| Credit card required | No |
| Sleeps on inactivity | ⚠️ **Yes — after 7 days** (bad for demos) |
| Backups on free tier | No |
| Data model | Relational (PostgreSQL) — needs schema migration |
| Auth strategy | Built-in (email, Google, GitHub SSO) — saves dev time |

**Pricing tiers:**

| Tier | Price | Storage | Use when |
|------|-------|---------|----------|
| Free | **$0** | 500 MB | Prototyping only (project pauses) |
| Pro | **$25/mo** | 8 GB | Always-on, no pausing |
| Team | **$599/mo** | Custom | Enterprise |

**GoTrack cost at 10 users: $0** (but project will sleep between sessions on free tier)

---

### Option C — Firebase Firestore

| Spec | Value |
|------|-------|
| Free storage | **1 GB** |
| Free reads | 50,000 / day |
| Free writes | 20,000 / day |
| Free deletes | 20,000 / day |
| Sleeps on inactivity | No |
| Backend required | No (Firestore SDK works directly from browser) |
| Auth strategy | Excellent built-in Firebase Auth |

**Pricing (beyond free tier):**

| Operation | Price |
|-----------|-------|
| Reads | $0.06 per 100,000 |
| Writes | $0.18 per 100,000 |
| Deletes | $0.02 per 100,000 |
| Storage | $0.18 per GB / month |

**GoTrack cost at 10 users: $0** (50K reads/day is ~10,000× our needs)

**Downside:** Requires full architecture rethink — no Express/REST layer, uses Firestore SDK directly. Doesn't fit the planned v2.0 stack.

---

### Option D — Neon (Serverless PostgreSQL)

| Spec | Value |
|------|-------|
| Free storage | **0.5 GB** |
| Free compute | 100 CU-hours/month |
| Sleeps on inactivity | Auto-suspend (resumes in ~1 sec on next request) |
| Credit card required | No |
| Data model | Relational (standard PostgreSQL) |
| Auth strategy | DIY JWT with pg / postgres.js |

**Pricing tiers:**

| Tier | Price | Storage | Use when |
|------|-------|---------|----------|
| Free | **$0** | 0.5 GB | Prototyping |
| Launch | **$5/mo min** + $0.30/GB | Pay-as-you-go | Small production |
| Scale | **$19/mo min** + usage | Larger apps | Growing product |

**GoTrack cost at 10 users: $0**

---

## 6. Side-by-Side Cost Summary

| Database | 10 users (~3 MB) | 500 users (~125 MB) | 2,000 users (~500 MB) | Paid tier starts |
|----------|-----------------|--------------------|-----------------------|-----------------|
| MongoDB Atlas | **$0** | **$0** | **$0** | $8/mo |
| Supabase | **$0** | **$0** | **$0** | $25/mo |
| Firebase Firestore | **$0** | **$0** | **$0** | ~$1–5/mo |
| Neon | **$0** | **$0** | **$0** | $5/mo |

> At 10 users, **all four options are completely free.** Cost only becomes a factor beyond ~2,000 users.

---

## 7. Recommendation: MongoDB Atlas M0

**Verdict: MongoDB Atlas is the right choice for GoTrack v2.0.**

| Reason | Detail |
|--------|--------|
| Already in the v2.0 plan | `docs/versions.md` specifies Node + Express + MongoDB + JWT |
| Native data model fit | GoTrack expenses are JSON objects — MongoDB stores BSON natively, zero transformation |
| Never sleeps | Unlike Supabase free tier, M0 clusters are always available |
| Flexible schema | Add new fields (bank name, account number, tags) without running migrations |
| Ecosystem | Mongoose ODM gives clean model definitions, validation, and query helpers |
| Free headroom | 512 MB covers GoTrack until ~2,000 users with 500 transactions each |
| Upgrade path | Simple move to Atlas Flex ($8/mo) when needed — same driver, same code |

---

## 8. v2.0 Implementation Scope (When Ready)

### New files to create
```
server/
  index.js                    ← Express app entry point
  models/
    User.js                   ← Mongoose schema (email, passwordHash, createdAt)
    Expense.js                ← Mongoose schema (mirrors current Expense typedef + userId)
  routes/
    auth.js                   ← POST /register, POST /login, POST /refresh
    expenses.js               ← GET/POST/DELETE /expenses, POST /expenses/import
  middleware/
    auth.js                   ← JWT verify middleware (protects all expense routes)
  config/
    db.js                     ← Mongoose connect (reads MONGODB_URI from .env)
```

### Files to modify
```
src/context/ExpenseContext.jsx    ← Replace useReducer in-memory state with axios API calls
src/pages/ExpensesPage.jsx        ← Add loading/error states for async fetch
src/components/common/
  BankUploadModal.jsx             ← POST parsed transactions to /api/expenses/import
```

### New dependencies
```bash
# Server
npm install express mongoose cors dotenv bcryptjs jsonwebtoken

# Already installed (from Phase 0)
# axios — ready to use in the React app
```

### Environment variables needed
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/gotrack
JWT_SECRET=your-secret-key-here
PORT=3001
```

---

## 9. How to Verify (When v2.0 is Built)

1. Create a free MongoDB Atlas M0 cluster — [cloud.mongodb.com](https://cloud.mongodb.com)
2. Add `MONGODB_URI` to `server/.env`
3. Run `npm run dev` in both `server/` and `gt-gotrack/`
4. Register a new user → JWT returned → stored in browser localStorage
5. Upload ICICI PDF → 34 transactions → `POST /api/expenses/import`
6. Refresh the page → data still there (now fetched from MongoDB)
7. Check Atlas Data Explorer in the browser → confirm documents in `expenses` collection
8. Storage used: **~2.5 MB for 5,000 records** (visible in Atlas cluster metrics)

---

## 10. References

- [MongoDB Atlas Pricing](https://www.mongodb.com/pricing)
- [MongoDB M0 Free Cluster Limits](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [Supabase Pricing 2026](https://uibakery.io/blog/supabase-pricing)
- [Firebase Firestore Pricing](https://firebase.google.com/pricing)
- [Firebase Firestore Quotas & Limits](https://firebase.google.com/docs/firestore/quotas)
- [Neon Serverless PostgreSQL Plans](https://neon.com/docs/introduction/plans)
- [Top PostgreSQL Free Tiers 2026](https://www.koyeb.com/blog/top-postgresql-database-free-tiers-in-2026)

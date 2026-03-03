# GoTrack — Analysis Strategy & Feature Roadmap

> Brainstorm of every analysis feature, graph, and insight we can build to help users
> understand their money flow end-to-end and actively improve their financial health.

---

## 1. Current State (v1.6 / v1.7)

| Feature | Status |
|---------|--------|
| Import bank statement (ICICI PDF) | ✅ Done |
| Dashboard stats (balance, income, expenses) | ✅ Done |
| Weekly / Monthly toggle on dashboard | ✅ Done |
| Period analytics (Weekly / Monthly / Quarterly) | ✅ Done |
| Savings rate, avg daily spend, cash flow score | ✅ Done |
| Top 3 spending categories per period | ✅ Done |
| 6-month Income vs Expense bar chart | ✅ Done |
| Category donut chart | ✅ Done |
| Expense trend vs previous period | ✅ Done |

---

## 2. Core Analysis Pillars

### 2.1 Spending Intelligence
*"Where is my money going?"*

| Feature | Description | Priority |
|---------|-------------|----------|
| **Merchant-level breakdown** | Which specific merchants (Swiggy, Amazon, Zomato, BigBasket) get the most money | High |
| **Category spend rank** | Rank all 10 categories by total spend — not just top 3 | High |
| **Recurring expenses detector** | Auto-detect subscriptions and fixed costs (Netflix, rent, SIPs appearing every month) | High |
| **Unusual spend alert** | Flag transactions that are 2× the average for that merchant or category | Medium |
| **Day-of-week spending pattern** | Heatmap of spend by day (Mon–Sun) — do you overspend on weekends? | Medium |
| **Time-of-month pattern** | Bar showing spend in first/second/third/fourth week — salary day effect visible | Medium |
| **Top 10 transactions** | Biggest single transactions of the period | Low |

### 2.2 Income Intelligence
*"How much do I earn and is it growing?"*

| Feature | Description | Priority |
|---------|-------------|----------|
| **Income sources** | Break down income by payer (salary, freelance, rent received, etc.) | High |
| **Income stability score** | Month-over-month income variance — low variance = stable job | Medium |
| **Income vs Expenses ratio** | Simple ratio card: for every ₹100 earned, ₹X spent | High |
| **Income growth trend** | Line chart: monthly income for last 12 months | Medium |

### 2.3 Balance Intelligence
*"Where is my money sitting?"*

| Feature | Description | Priority |
|---------|-------------|----------|
| **Running balance timeline** | Line chart of daily closing balance — shows drawdown periods | High |
| **Balance low-point alert** | Detect the month where balance dropped to its lowest | Medium |
| **Savings accumulation** | Month-end balance trend — is the user actually accumulating wealth? | High |
| **Cash runway** | At avg monthly spend, how many months can current balance sustain? | Medium |

### 2.4 Savings & Goals
*"Am I making progress?"*

| Feature | Description | Priority |
|---------|-------------|----------|
| **Savings rate trend** | Line chart: savings rate % for each of last 6 months | High |
| **Monthly savings amount** | Net flow (income − expense) as a bar chart — positive = saved, negative = dipped | High |
| **Savings goal tracker** | User sets a monthly savings target; bar shows actual vs target | Medium |
| **Breakeven month** | Month where income barely covered expenses — highlight in red | Medium |

### 2.5 Forecasting
*"What if I keep going like this?"*

| Feature | Description | Priority |
|---------|-------------|----------|
| **Projected monthly expense** | Based on current month's pace (day N of month), project end-of-month total | Medium |
| **Savings projection** | If current savings rate holds, balance in 3 / 6 / 12 months | Medium |
| **Category budget vs actual** | User sets category budgets; progress bar shows spend vs budget | High |

---

## 3. Visualizations to Build

### Charts

| Chart | Type | Data | Description |
|-------|------|------|-------------|
| Income vs Expense | Bar (grouped) | 6 months | Already done — show 12 months version on Analysis page |
| Net Flow | Bar (waterfall) | 6 months | Positive = green bar, negative = red bar |
| Running Balance | Area / Line | Daily | Balance over the statement period |
| Savings Rate Trend | Line | 6 months | % saved each month |
| Category Spend | Donut | This period | Already done — add filter to switch periods |
| Merchant Spend | Horizontal bar | Top 10 | How much to each merchant |
| Day-of-week Heatmap | Heatmap | All time | Sun–Sat × time showing avg spend |
| Category Budget Progress | Horizontal bars | This month | X spent of Y budgeted |
| Income Sources | Donut | This period | Credit by payer |

### KPI Cards (beyond current)

| Card | Formula |
|------|---------|
| Expense-to-Income Ratio | total_expense / total_income × 100 |
| Fixed vs Variable Cost Split | recurring / total_expense |
| Cash Runway | current_balance / avg_monthly_expense |
| Months of Positive Savings | count(months where net_flow > 0) in last 12 |
| Biggest Saving Month | month with highest net_flow |
| Worst Month | month with most negative net_flow |

---

## 4. User Insight Narratives ("Your Money Story")

Instead of raw numbers, surface plain-language insights:

```
"You spent ₹2,400 more on food this month than last month — mostly on weekends."
"Your March balance was the lowest in 3 months — salary came in late."
"You've saved ₹18,000 across the last 3 months. At this rate, you'll have ₹72,000 by year end."
"Subscription costs have grown from ₹1,200 to ₹2,800 over 6 months (+133%)."
"Your top merchant is Swiggy — ₹4,200 spent in March alone."
```

These require:
- Merchant name extraction from bank description (regex / NLP)
- Month-over-month comparison engine
- Template-based insight generator

---

## 5. Multi-Statement Support (v2.0+)

Current state: one statement at a time (replace on upload).

Future: merge multiple statements:
- Upload ICICI Jan, Feb, Mar statements → combined timeline
- Detect and deduplicate overlapping transactions
- Persistent storage (MongoDB) to keep history across sessions
- Year-to-date view: full 12-month analysis

---

## 6. Implementation Priority (Next Phases)

### Phase 7.1 — Enhanced Charts (v1.8)
- [ ] Net flow waterfall bar chart (monthly, last 6 months)
- [ ] Running balance line chart (daily, from imported statement)
- [ ] Savings rate line chart (monthly trend)

### Phase 7.2 — Merchant & Pattern Analysis (v1.9)
- [ ] Merchant name extractor (clean UPI/NEFT descriptions → display names)
- [ ] Top merchants table (name, count, total, % of spend)
- [ ] Recurring transactions auto-detector (same amount ±5% on same date each month)
- [ ] Day-of-week spend heatmap

### Phase 7.3 — Budget & Goals (v2.0)
- [ ] Per-category budget input (user sets ₹X for Food, Transport, etc.)
- [ ] Budget vs actual progress bars
- [ ] Monthly savings goal with progress indicator
- [ ] Projected end-of-month spend (based on pace)

### Phase 7.4 — Narrative Insights (v2.1)
- [ ] Plain-language insight cards (top 3 insights per period)
- [ ] Spending anomaly detection
- [ ] "Best month" / "Worst month" highlights

### Phase 7.5 — Multi-bank + Persistence (v2.0 backend)
- [ ] HDFC parser
- [ ] Axis parser
- [ ] Multi-statement merge
- [ ] MongoDB persistence (see docs/db-persistence-analysis.md)
- [ ] User accounts + JWT auth

---

## 7. Design Principles for Analysis Features

1. **Show the story, not just numbers** — Every chart should have a one-line subtitle explaining what it means
2. **Color is semantic** — Green = good (income, savings), Red = bad (expense, deficit), Amber = caution
3. **Progressive disclosure** — Summary card first, click to drill down
4. **Mobile-first** — Charts must render cleanly on a phone screen (use responsive containers)
5. **No data, no noise** — Empty states should be helpful ("Upload 3 months of statements to see trends")
6. **Period-consistent** — All metrics on screen should always reflect the same selected period

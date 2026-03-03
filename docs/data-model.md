# GoTrack Data Model

## Core Entities (v1)

### Expense Object
```js
{
  id: "exp_1710000000000",         // "exp_" + Date.now()
  type: "expense",                  // "expense" | "income"
  amount: 450,                      // number, always positive, in INR
  category: "food",                 // see CATEGORIES constant
  note: "Lunch at cafe",            // string, user description
  date: "2024-03-15",               // YYYY-MM-DD
  createdAt: "2024-03-15T12:30:00Z" // ISO datetime
}
```

### Filter Object
```js
{
  category: "all",          // category key or "all"
  type: "all",              // "expense" | "income" | "all"
  month: "2024-03",         // YYYY-MM or "all"
  searchQuery: "",          // free text search on note field
}
```

### Stats Object (computed)
```js
{
  totalBalance: 12500,      // sum of all income - sum of all expenses
  monthlyIncome: 45000,     // income this month
  monthlyExpenses: 18500,   // expenses this month
  monthlySavings: 26500,    // monthlyIncome - monthlyExpenses
  byCategory: {             // expenses grouped by category, current month
    food: 3200,
    transport: 1800,
    shopping: 5600,
    // ...
  },
  monthlyTrend: [           // last 6 months for chart
    { month: "Oct", income: 42000, expenses: 17000 },
    { month: "Nov", income: 45000, expenses: 19000 },
    // ...
  ]
}
```

## Categories
```js
export const CATEGORIES = [
  { key: 'food',          label: 'Food & Dining',    icon: 'UtensilsCrossed' },
  { key: 'transport',     label: 'Transport',         icon: 'Car' },
  { key: 'shopping',      label: 'Shopping',          icon: 'ShoppingBag' },
  { key: 'bills',         label: 'Bills & Utilities', icon: 'Zap' },
  { key: 'entertainment', label: 'Entertainment',     icon: 'Tv2' },
  { key: 'health',        label: 'Health',            icon: 'Heart' },
  { key: 'education',     label: 'Education',         icon: 'GraduationCap' },
  { key: 'other',         label: 'Other',             icon: 'MoreHorizontal' },
]
```

## LocalStorage Keys (v1)
```
gt_expenses     → JSON array of Expense objects
gt_filters      → JSON object of current Filter state
gt_settings     → JSON object (reserved for v2)
```

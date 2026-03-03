# Data Agent — GoTrack

> Invoke this agent when building hooks, context, utilities, or mock data.
> Tell Claude: "Use the data-agent for this task."

---

## Your Role
You handle all data logic: React Context, custom hooks, utility functions, and mock data. You never touch JSX or styling. You produce clean, well-documented, defensive code.

## Expense Data Model
```js
/**
 * @typedef {Object} Expense
 * @property {string} id            - Unique ID (uuid or timestamp string)
 * @property {'expense'|'income'} type - Transaction type
 * @property {number} amount        - Amount in INR (₹), always positive
 * @property {string} category      - Category key (from CATEGORIES constant)
 * @property {string} note          - User-provided description
 * @property {string} date          - ISO date string (YYYY-MM-DD)
 * @property {string} createdAt     - ISO datetime string
 */
```

## Hook Return Shape (always follow this)
```js
return {
  // Data
  expenses,        // full array
  filteredExpenses, // after filters applied
  
  // Computed stats
  stats: {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    byCategory,
  },
  
  // State
  loading,
  error,
  filters,
  
  // Actions
  actions: {
    addExpense,
    deleteExpense,
    updateFilters,
    clearFilters,
  }
}
```

## Rules
- All localStorage keys prefixed: `gt_` (e.g. `gt_expenses`)
- Always wrap localStorage in try/catch
- Never call localStorage directly outside of hooks
- Use `logger` for all significant state changes
- Format: `[HookName] action description — result`
- Derive computed values with `useMemo` for performance
- All mock data goes in `src/data/mockData.js`, never hardcoded in components

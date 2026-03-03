# GT — GoTrack | Claude Master Briefing

## 🚀 Trigger Command
When the user says **"Lets start Claude"** → immediately read `.claude/commands/start.md` and follow it exactly before doing anything else.

---

## 📌 Project Overview

**Name:** GT — GoTrack  
**Type:** Personal Expense Tracker Web App  
**Goal:** A clean, minimalist expense tracking app that lets users log expenses, view stats, manage categories, and understand their spending at a glance.  
**Design Philosophy:** Clean, minimal, card-based UI. Soft shadows, neutral backgrounds, clear typography. No clutter. Every pixel has a purpose.

---

## 🖼️ Design References

Screenshots are stored in `/screenshots/` at the project root. Always check these before building any UI component.

| File | Description |
|------|-------------|
| `screenshots/home.png` | Home/Dashboard page — primary reference for v1 |
| `screenshots/expenses.png` | Expense list page |
| `screenshots/add-expense.png` | Add expense form/page |

> **Rule:** Before building any page or component, open the relevant screenshot and match it as closely as possible — layout, spacing, colors, font weights, card styles.

---

## 🛠️ Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | React 18 (Vite) | Fast, modern, component-based |
| Styling | Tailwind CSS | Utility-first, clean, no CSS files needed |
| Icons | lucide-react | Lightweight, consistent icon set |
| Charts | Recharts | Simple, composable chart library |
| Routing | React Router v6 | Standard SPA routing |
| Date Handling | date-fns | Lightweight date utility |
| State | React Context + useReducer | No external state lib for v1 |
| Storage | localStorage (v1) | No backend in v1, migrate in v2 |
| HTTP Client | axios (ready for v2) | Install now, use in v2 |

---

## 📁 Folder Structure

```
src/
  assets/           → Logo, images, static assets
  components/       → Reusable UI components (buttons, cards, modals)
    common/         → Truly generic: Button, Input, Badge, Modal, Skeleton
    layout/         → Sidebar, Navbar, PageWrapper
    dashboard/      → Stats cards, charts, summary widgets
    expenses/       → ExpenseList, ExpenseRow, ExpenseFilters
    forms/          → AddExpenseForm, CategorySelect, DatePicker
  pages/            → Page-level components (one per route)
    HomePage.jsx
    ExpensesPage.jsx
    AddExpensePage.jsx
    CategoriesPage.jsx  (v1: placeholder)
    SettingsPage.jsx    (v1: placeholder)
  hooks/            → Custom React hooks
  context/          → React Context providers
  utils/            → Pure helper functions
  constants/        → App-wide constants (categories, colors, routes)
  data/             → Dummy/mock data for v1
```

---

## ✍️ Coding Standards

### General
- **Functional components only** — no class components, ever
- **Named exports** for all components — no default exports except pages
- **JSDoc comments** on every component, hook, and utility function
- **Prop documentation** — always document expected props with types in JSDoc
- **No magic numbers** — use constants from `/src/constants/`
- **No hardcoded strings** — labels, messages go in constants or props

### Logging
- Use a custom `logger` utility (create in `/src/utils/logger.js`)
- Log format: `[ComponentName] action description`
- Log on: component mount, user actions, data changes, errors
- Example: `logger.info('[useExpenses] Loaded 12 expenses from localStorage')`
- Use `logger.warn` for non-critical issues, `logger.error` for failures
- **Never use raw `console.log`** — always use the logger utility

### Comments
- Every file starts with a **file-level comment** explaining its purpose
- Every function/component has a **JSDoc block** above it
- Complex logic gets **inline comments** explaining the why, not the what
- Mark incomplete sections with `// TODO: [description]` and `// FIXME: [description]`

### Component Structure (always follow this order)
```jsx
/**
 * @file ComponentName.jsx
 * @description What this component does and when to use it
 */

// 1. Imports (external → internal → assets)
// 2. Constants (local to this file)
// 3. JSDoc block
// 4. Component function
//    a. State declarations
//    b. Context/hooks
//    c. Derived values
//    d. Event handlers
//    e. useEffect hooks
//    f. Early returns (loading, error, empty)
//    g. JSX return
// 5. Export
```

### Tailwind Usage
- **Mobile-first** — base styles for mobile, `md:` and `lg:` for larger screens
- **No inline styles** — Tailwind classes only
- **No arbitrary values** unless absolutely necessary (e.g. `w-[340px]`)
- Extract repeated class combos into a `cn()` utility or component

---

## 🎨 Design System

### Colors (map to Tailwind classes)
```
Background:     bg-gray-50       (page background)
Surface:        bg-white         (cards, panels)
Border:         border-gray-200  (card borders, dividers)
Text Primary:   text-gray-900    (headings)
Text Secondary: text-gray-500    (subtitles, meta)
Text Muted:     text-gray-400    (placeholders, disabled)
Accent:         text-indigo-600  (primary actions, links)
Accent Bg:      bg-indigo-50     (icon backgrounds, highlights)
Success:        text-emerald-600 (income, positive delta)
Danger:         text-rose-500    (expenses, delete, negative delta)
Warning:        text-amber-500   (warnings, pending)
```

### Typography
```
Page Title:     text-2xl font-bold text-gray-900
Section Title:  text-lg font-semibold text-gray-800
Card Title:     text-sm font-semibold text-gray-700
Body:           text-sm text-gray-600
Meta/Label:     text-xs text-gray-400 uppercase tracking-wide
Amount Large:   text-3xl font-bold
Amount Small:   text-base font-semibold
```

### Spacing & Layout
```
Page padding:   px-6 py-8 (desktop), px-4 py-6 (mobile)
Card padding:   p-6
Card radius:    rounded-2xl
Card shadow:    shadow-sm hover:shadow-md transition-shadow
Gap between cards: gap-4 (mobile), gap-6 (desktop)
Sidebar width:  w-64
```

### Logo / Brand
- **Name:** GT — GoTrack
- **Logo:** Two-letter monogram "GT" in a rounded square with indigo background (`bg-indigo-600`)
- **Font weight:** Bold, white text
- **Tagline** (optional, small): "Track every rupee"
- Always shown in the sidebar header

---

## 📋 Current Version

**Active:** v1.0 — Static UI with dummy data  
**Plan:** `docs/v1-plan.md`  
**Status:** Track progress using checkboxes in the plan file

---

## ⚠️ Rules Claude Must Always Follow

1. **Read the relevant screenshot** before building any page component
2. **Check the plan** (`docs/v1-plan.md`) for the current phase before starting work
3. **Never skip phases** — complete and confirm each phase before moving to the next
4. **Always mark tasks `[x]`** in the plan after completing them
5. **Report after every task:** "✅ Completed: [task]. Next: [next task]. Proceed?"
6. **No backend code in v1** — all data comes from `/src/data/` mock files
7. **No placeholder pages** should be blank — they must have a "Coming Soon" UI
8. **Every component** must have JSDoc, logger calls, and Tailwind-only styles
9. **Never break existing components** when adding new ones — test integration
10. **Ask before adding any new library** not in the approved tech stack

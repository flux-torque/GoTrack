# GoTrack Design System

## Brand Identity
- **Product Name:** GT — GoTrack
- **Logo Mark:** Rounded square, `bg-indigo-600`, white bold "GT" text, `rounded-xl`
- **Tagline:** Track every rupee
- **Tone:** Professional, minimal, trustworthy

## Color Palette

### Semantic Colors (use these names in code comments)
| Role | Tailwind Class | Hex |
|------|---------------|-----|
| Page BG | `bg-gray-50` | #F9FAFB |
| Surface (cards) | `bg-white` | #FFFFFF |
| Border | `border-gray-100` / `border-gray-200` | #F3F4F6 |
| Text – Primary | `text-gray-900` | #111827 |
| Text – Secondary | `text-gray-600` | #4B5563 |
| Text – Muted | `text-gray-400` | #9CA3AF |
| Accent | `text-indigo-600` / `bg-indigo-600` | #4F46E5 |
| Accent Light | `bg-indigo-50` / `text-indigo-600` | #EEF2FF |
| Income / Positive | `text-emerald-600` / `bg-emerald-50` | #059669 |
| Expense / Negative | `text-rose-500` / `bg-rose-50` | #F43F5E |
| Warning | `text-amber-500` / `bg-amber-50` | #F59E0B |

## Category Colors
```js
export const CATEGORY_COLORS = {
  food:          { bg: 'bg-orange-50',  text: 'text-orange-600',  dot: '#F97316' },
  transport:     { bg: 'bg-blue-50',    text: 'text-blue-600',    dot: '#3B82F6' },
  shopping:      { bg: 'bg-purple-50',  text: 'text-purple-600',  dot: '#9333EA' },
  bills:         { bg: 'bg-red-50',     text: 'text-red-600',     dot: '#EF4444' },
  entertainment: { bg: 'bg-pink-50',    text: 'text-pink-600',    dot: '#EC4899' },
  health:        { bg: 'bg-teal-50',    text: 'text-teal-600',    dot: '#14B8A6' },
  education:     { bg: 'bg-cyan-50',    text: 'text-cyan-600',    dot: '#06B6D4' },
  other:         { bg: 'bg-gray-100',   text: 'text-gray-600',    dot: '#6B7280' },
  income:        { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: '#10B981' },
}
```

## Typography Scale
```
Display:     text-3xl font-bold tracking-tight   → Page hero numbers (balance)
Heading 1:   text-2xl font-bold                  → Page titles
Heading 2:   text-lg font-semibold               → Section titles, card headings
Heading 3:   text-base font-semibold             → Sub-sections
Body:        text-sm text-gray-600               → General content
Caption:     text-xs text-gray-400               → Timestamps, meta info
Label:       text-xs font-medium uppercase tracking-wide text-gray-400  → Form labels
Amount+:     text-emerald-600 font-semibold      → Positive amounts
Amount-:     text-rose-500 font-semibold         → Negative amounts
```

## Spacing & Sizing
```
Sidebar width:        w-64 (256px)
Navbar height:        h-16
Page padding (lg):    px-8 py-8
Page padding (sm):    px-4 py-6
Card padding:         p-6
Card border radius:   rounded-2xl
Button border radius: rounded-lg
Input border radius:  rounded-lg
Icon container:       p-2 rounded-lg (small), p-3 rounded-xl (large)
Gap between cards:    gap-6 (desktop), gap-4 (mobile)
```

## Component Patterns

### Stat Card
```
bg-white rounded-2xl shadow-sm border border-gray-100 p-6
Title: text-sm font-medium text-gray-500
Value: text-2xl font-bold text-gray-900 mt-1
Delta: text-xs font-medium (emerald if positive, rose if negative)
Icon: p-2 rounded-lg bg-{color}-50 text-{color}-600
```

### Transaction Row
```
flex items-center gap-4 py-3 border-b border-gray-50 last:border-0
Icon zone: p-2 rounded-xl bg-{category}-50
Name: text-sm font-medium text-gray-800
Date: text-xs text-gray-400
Amount: text-sm font-semibold (rose for expense, emerald for income)
```

### Navigation Item
```
Active:   bg-indigo-50 text-indigo-600 font-medium rounded-xl
Inactive: text-gray-500 hover:bg-gray-100 rounded-xl
Disabled: text-gray-300 cursor-not-allowed (with tooltip)
```

/**
 * @file constants/index.js
 * @description App-wide constants for GoTrack: routes, categories, colors,
 * expense types, and UI config. Import from here — never hardcode these values.
 */

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} All app route paths */
export const ROUTES = {
  HOME: '/',
  ANALYSIS: '/analysis',
  EXPENSES: '/expenses',
  ADD_EXPENSE: '/add-expense',
  BUDGET: '/budget',
  CATEGORIES: '/categories',
  SETTINGS: '/settings',
  LOGIN: '/login',
};

// ---------------------------------------------------------------------------
// Expense Categories
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Category
 * @property {string} id - Unique category identifier
 * @property {string} label - Display name
 * @property {string} icon - Lucide icon name
 * @property {string} color - Tailwind text color class
 * @property {string} bgColor - Tailwind background color class
 * @property {string} hex - Hex color for charts
 */

/** @type {Category[]} All available expense categories */
export const CATEGORIES = [
  {
    id: 'food',
    label: 'Food & Dining',
    icon: 'UtensilsCrossed',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    hex: '#ea580c',
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'Car',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hex: '#2563eb',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'ShoppingBag',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    hex: '#db2777',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'Tv2',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hex: '#9333ea',
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'HeartPulse',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    hex: '#e11d48',
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: 'Zap',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    hex: '#ca8a04',
  },
  {
    id: 'rent',
    label: 'Rent & Housing',
    icon: 'Home',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    hex: '#0d9488',
  },
  {
    id: 'education',
    label: 'Education',
    icon: 'BookOpen',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    hex: '#4f46e5',
  },
  {
    id: 'savings',
    label: 'Savings',
    icon: 'PiggyBank',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    hex: '#059669',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'MoreHorizontal',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    hex: '#4b5563',
  },
];

/** @type {Record<string, Category>} Categories keyed by id for fast lookup */
export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat])
);

// ---------------------------------------------------------------------------
// Expense Types
// ---------------------------------------------------------------------------

/** @type {'expense' | 'income'} */
export const EXPENSE_TYPE = {
  EXPENSE: 'expense',
  INCOME: 'income',
};

// ---------------------------------------------------------------------------
// UI Config
// ---------------------------------------------------------------------------

/** App name and brand constants */
export const APP_CONFIG = {
  NAME: 'GoTrack',
  TAGLINE: 'Track every rupee',
  MONOGRAM: 'GT',
  CURRENCY_SYMBOL: '₹',
  LOCALE: 'en-IN',
};

/** Number of recent transactions shown on the dashboard */
export const RECENT_TRANSACTIONS_LIMIT = 5;

/** Nav links shown in the Sidebar */
export const NAV_LINKS = [
  { label: 'Dashboard',    route: ROUTES.HOME,        icon: 'LayoutDashboard', enabled: true },
  { label: 'Analysis',     route: ROUTES.ANALYSIS,    icon: 'BarChart2',       enabled: true },
  { label: 'Transactions', route: ROUTES.EXPENSES,    icon: 'Receipt',         enabled: true },
  { label: 'Add Expense',  route: ROUTES.ADD_EXPENSE, icon: 'PlusCircle',      enabled: true },
  { label: 'Budget',       route: ROUTES.BUDGET,      icon: 'PiggyBank',       enabled: true },
  { label: 'Categories',   route: ROUTES.CATEGORIES,  icon: 'Tag',             enabled: false },
  { label: 'Settings',     route: ROUTES.SETTINGS,    icon: 'Settings',        enabled: false },
];

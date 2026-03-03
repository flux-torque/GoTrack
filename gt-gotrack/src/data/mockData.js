/**
 * @file mockData.js
 * @description Realistic dummy expense data for GoTrack v1.
 * Contains 25+ entries spanning 3 months (Jan–Mar 2026) across multiple categories.
 * All amounts are in INR (₹). Used by ExpenseContext in v1 before backend is ready.
 */

import { EXPENSE_TYPE } from '../constants';

/**
 * @typedef {Object} Expense
 * @property {string} id - Unique identifier
 * @property {string} title - Short display name
 * @property {string} note - Optional longer description
 * @property {string} category - Category id (see CATEGORIES in constants)
 * @property {'expense' | 'income'} type - Whether this is spending or income
 * @property {number} amount - Amount in INR
 * @property {string} date - ISO date string (YYYY-MM-DD)
 */

/** @type {Expense[]} Mock expense data — 25 entries, 3 months */
export const MOCK_EXPENSES = [
  // --- March 2026 ---
  {
    id: 'exp-001',
    title: 'Grocery Run',
    note: 'BigBasket monthly order',
    category: 'food',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 3240,
    date: '2026-03-01',
  },
  {
    id: 'exp-002',
    title: 'Monthly Salary',
    note: 'March salary credit',
    category: 'savings',
    type: EXPENSE_TYPE.INCOME,
    amount: 85000,
    date: '2026-03-01',
  },
  {
    id: 'exp-003',
    title: 'Uber to Office',
    note: 'Morning cab',
    category: 'transport',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 340,
    date: '2026-03-03',
  },
  {
    id: 'exp-004',
    title: 'Netflix Subscription',
    note: 'Monthly streaming plan',
    category: 'entertainment',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 649,
    date: '2026-03-05',
  },
  {
    id: 'exp-005',
    title: 'Electricity Bill',
    note: 'BESCOM — February bill',
    category: 'utilities',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 1850,
    date: '2026-03-06',
  },
  {
    id: 'exp-006',
    title: 'Dinner — Toit',
    note: 'Team outing',
    category: 'food',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 2800,
    date: '2026-03-08',
  },
  {
    id: 'exp-007',
    title: 'New Shoes',
    note: 'Nike running shoes — Myntra',
    category: 'shopping',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 4999,
    date: '2026-03-10',
  },
  {
    id: 'exp-008',
    title: 'Freelance Project',
    note: 'UI design for client',
    category: 'savings',
    type: EXPENSE_TYPE.INCOME,
    amount: 15000,
    date: '2026-03-12',
  },
  {
    id: 'exp-009',
    title: 'Doctor Visit',
    note: 'General checkup + medicines',
    category: 'health',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 1200,
    date: '2026-03-14',
  },
  {
    id: 'exp-010',
    title: 'Metro Card Recharge',
    note: 'Namma Metro monthly pass',
    category: 'transport',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 500,
    date: '2026-03-15',
  },

  // --- February 2026 ---
  {
    id: 'exp-011',
    title: 'Monthly Salary',
    note: 'February salary credit',
    category: 'savings',
    type: EXPENSE_TYPE.INCOME,
    amount: 85000,
    date: '2026-02-01',
  },
  {
    id: 'exp-012',
    title: 'Rent',
    note: 'February apartment rent',
    category: 'rent',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 22000,
    date: '2026-02-02',
  },
  {
    id: 'exp-013',
    title: 'Zomato Orders',
    note: 'Multiple food deliveries',
    category: 'food',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 1980,
    date: '2026-02-07',
  },
  {
    id: 'exp-014',
    title: 'Gym Membership',
    note: 'Cult.fit 3-month plan',
    category: 'health',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 3000,
    date: '2026-02-10',
  },
  {
    id: 'exp-015',
    title: 'React Course',
    note: 'Udemy — React + TypeScript',
    category: 'education',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 499,
    date: '2026-02-12',
  },
  {
    id: 'exp-016',
    title: 'Spotify Premium',
    note: 'Monthly music subscription',
    category: 'entertainment',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 119,
    date: '2026-02-15',
  },
  {
    id: 'exp-017',
    title: 'Weekend Trip — Coorg',
    note: 'Fuel + stay + food',
    category: 'transport',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 7500,
    date: '2026-02-20',
  },
  {
    id: 'exp-018',
    title: 'Internet Bill',
    note: 'ACT Fibernet — 150 Mbps',
    category: 'utilities',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 1099,
    date: '2026-02-22',
  },
  {
    id: 'exp-019',
    title: 'Jacket — H&M',
    note: 'Winter jacket sale',
    category: 'shopping',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 2799,
    date: '2026-02-25',
  },

  // --- January 2026 ---
  {
    id: 'exp-020',
    title: 'Monthly Salary',
    note: 'January salary credit',
    category: 'savings',
    type: EXPENSE_TYPE.INCOME,
    amount: 82000,
    date: '2026-01-01',
  },
  {
    id: 'exp-021',
    title: 'Rent',
    note: 'January apartment rent',
    category: 'rent',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 22000,
    date: '2026-01-02',
  },
  {
    id: 'exp-022',
    title: 'New Year Dinner',
    note: 'Restaurant celebration',
    category: 'food',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 3600,
    date: '2026-01-01',
  },
  {
    id: 'exp-023',
    title: 'Mobile Recharge',
    note: 'Jio yearly plan',
    category: 'utilities',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 2999,
    date: '2026-01-05',
  },
  {
    id: 'exp-024',
    title: 'Books — Amazon',
    note: 'System Design + DSA books',
    category: 'education',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 1298,
    date: '2026-01-10',
  },
  {
    id: 'exp-025',
    title: 'Movie Tickets',
    note: 'PVR — weekend show',
    category: 'entertainment',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 600,
    date: '2026-01-18',
  },
  {
    id: 'exp-026',
    title: 'Freelance Bonus',
    note: 'Extra project payment',
    category: 'savings',
    type: EXPENSE_TYPE.INCOME,
    amount: 8000,
    date: '2026-01-25',
  },
  {
    id: 'exp-027',
    title: 'Pharmacy',
    note: 'Vitamins and supplements',
    category: 'health',
    type: EXPENSE_TYPE.EXPENSE,
    amount: 890,
    date: '2026-01-28',
  },
];

/**
 * @file AddExpensePage.jsx
 * @description Page for manually recording a credit or debit transaction.
 * Wraps AddExpenseForm in a centered card layout with a page title.
 */

import { useEffect } from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { AddExpenseForm } from '../components/forms/AddExpenseForm';
import logger from '../utils/logger';

/**
 * AddExpensePage — renders the manual transaction entry form.
 * @returns {JSX.Element}
 */
export default function AddExpensePage() {
  useEffect(() => {
    logger.info('[AddExpensePage] Mounted');
  }, []);

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto">
        {/* ── Page Header ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Record Transaction</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manually log a debit or credit transaction to your tracker.
          </p>
        </div>

        {/* ── Form Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <AddExpenseForm />
        </div>
      </div>
    </PageWrapper>
  );
}

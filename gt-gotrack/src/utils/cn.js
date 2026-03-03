/**
 * @file cn.js
 * @description Utility for conditionally joining Tailwind CSS class names.
 * Wraps `clsx` to provide a consistent className helper across the app.
 * Use this instead of string concatenation or template literals for class names.
 *
 * @example
 * cn('text-sm font-bold', isActive && 'text-indigo-600', className)
 */

import { clsx } from 'clsx';

/**
 * Merges and conditionally applies Tailwind CSS class names.
 * @param {...(string | string[] | Record<string, boolean> | undefined | null | false)} inputs - Class values to merge
 * @returns {string} Merged class string
 */
export function cn(...inputs) {
  return clsx(...inputs);
}

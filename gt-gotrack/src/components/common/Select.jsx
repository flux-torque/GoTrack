/**
 * @file Select.jsx
 * @description Reusable labeled select/dropdown with optional error state.
 * Follows the GoTrack design system: soft borders, indigo focus ring, consistent typography.
 */

import { cn } from '../../utils/cn';

/**
 * Option shape expected by Select.
 * @typedef {Object} SelectOption
 * @property {string} value - The option value
 * @property {string} label - The display label
 */

/**
 * Labeled select dropdown with optional error state.
 *
 * @param {Object} props
 * @param {string} props.id - Select id (used to link label)
 * @param {string} props.label - Label text shown above the select
 * @param {SelectOption[]} props.options - List of selectable options
 * @param {string} [props.value] - Controlled value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.placeholder] - Placeholder option label (shown when no value selected)
 * @param {string} [props.error] - Error message to display below the select
 * @param {string} [props.helper] - Helper text (hidden when error is shown)
 * @param {boolean} [props.required] - Whether the field is required
 * @param {boolean} [props.disabled] - Whether the field is disabled
 * @param {string} [props.className] - Extra classes for the wrapper div
 * @returns {JSX.Element}
 */
export function Select({
  id,
  label,
  options = [],
  value,
  onChange,
  placeholder,
  error,
  helper,
  required = false,
  disabled = false,
  className,
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
        >
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}

      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 outline-none transition-all appearance-none',
          'bg-white border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
          disabled && 'bg-gray-50 text-gray-500 cursor-default',
          error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-100',
          !value && 'text-gray-400'
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-gray-900">
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-400">{helper}</p>
      ) : null}
    </div>
  );
}

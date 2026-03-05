/**
 * @file Input.jsx
 * @description Reusable labeled text/number input with optional error and helper text.
 * Follows the GoTrack design system: soft borders, indigo focus ring, gray-50 background.
 */

import { cn } from '../../utils/cn';

/**
 * Labeled input field with optional error state.
 *
 * @param {Object} props
 * @param {string} props.id - Input id (used to link label)
 * @param {string} props.label - Label text shown above the input
 * @param {string} [props.type='text'] - Input type (text, number, date, email, etc.)
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string|number} [props.value] - Controlled value
 * @param {Function} [props.onChange] - Change handler
 * @param {string} [props.error] - Error message to display below the input
 * @param {string} [props.helper] - Helper text shown below input (hidden when error is shown)
 * @param {boolean} [props.required] - Whether the field is required
 * @param {boolean} [props.readOnly] - Whether the field is read-only
 * @param {boolean} [props.disabled] - Whether the field is disabled
 * @param {string} [props.className] - Extra classes for the wrapper div
 * @param {string} [props.inputClassName] - Extra classes for the input element itself
 * @returns {JSX.Element}
 */
export function Input({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helper,
  required = false,
  readOnly = false,
  disabled = false,
  className,
  inputClassName,
  ...rest
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

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(
          'w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 outline-none transition-all',
          'placeholder:text-gray-400',
          readOnly || disabled
            ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-default'
            : 'bg-white border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
          error && 'border-rose-400 focus:border-rose-400 focus:ring-rose-100',
          inputClassName
        )}
        {...rest}
      />

      {error ? (
        <p className="text-xs text-rose-500">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-400">{helper}</p>
      ) : null}
    </div>
  );
}

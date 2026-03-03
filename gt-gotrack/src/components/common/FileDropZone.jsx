/**
 * @file FileDropZone.jsx
 * @description Reusable drag-and-drop file input component.
 * Shows a dashed drop zone with drag-over highlight.
 * Displays the selected file name as a badge after selection.
 * Accepts a single file matching the specified MIME type / extension.
 */

import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

/**
 * FileDropZone — drag-and-drop or click-to-browse file picker.
 *
 * @param {Object} props
 * @param {string} [props.accept='.pdf']         - File input accept attribute (e.g. ".pdf")
 * @param {string} [props.acceptLabel='PDF']     - Human-readable format label shown in UI
 * @param {function(File): void} props.onFile    - Called when a valid file is selected
 * @param {File|null} [props.file]               - Currently selected file (controlled)
 * @param {function(): void} [props.onClear]     - Called when the user clears the file
 * @returns {JSX.Element}
 */
export function FileDropZone({
  accept = '.pdf',
  acceptLabel = 'PDF',
  onFile,
  file = null,
  onClear,
}) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const inputRef = useRef(null);

  /** @param {File} f */
  const handleFile = useCallback(
    (f) => {
      logger.info('[FileDropZone] File selected:', f.name, `(${(f.size / 1024).toFixed(1)} KB)`);
      onFile(f);
    },
    [onFile]
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const onDragLeave = () => setIsDraggingOver(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  // ── Input change ───────────────────────────────────────────────────────────

  const onInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  const openBrowser = () => inputRef.current?.click();

  // ── Selected state ─────────────────────────────────────────────────────────

  if (file) {
    return (
      <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
        <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-lg shrink-0">
          <FileText size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-indigo-200 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Remove file"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  // ── Drop zone ──────────────────────────────────────────────────────────────

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openBrowser}
      onKeyDown={(e) => e.key === 'Enter' && openBrowser()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed',
        'cursor-pointer transition-all duration-150 select-none',
        isDraggingOver
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-full transition-colors',
          isDraggingOver ? 'bg-indigo-100' : 'bg-gray-100'
        )}
      >
        <UploadCloud
          size={24}
          className={isDraggingOver ? 'text-indigo-600' : 'text-gray-400'}
        />
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-gray-700">
          {isDraggingOver ? 'Drop it here!' : 'Drag & drop your statement'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          or{' '}
          <span className="text-indigo-600 font-medium underline underline-offset-2">
            browse to upload
          </span>
        </p>
      </div>

      <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
        {acceptLabel} only
      </span>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onInputChange}
        aria-label="Upload file"
      />
    </div>
  );
}

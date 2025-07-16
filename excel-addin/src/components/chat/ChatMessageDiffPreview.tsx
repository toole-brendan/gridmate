import React from 'react';
import { DiffHunk } from '../../types/diff';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ChatMessageDiffPreviewProps {
  messageId: string;
  hunks: DiffHunk[];
  onAccept?: () => void;
  onReject?: () => void;
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
}

export const ChatMessageDiffPreview: React.FC<ChatMessageDiffPreviewProps> = ({
  hunks,
  onAccept,
  onReject,
  status
}) => {
  // Calculate summary statistics based on DiffKind
  const stats = hunks.reduce((acc, hunk) => {
    if (hunk.kind === 'Added') acc.added++;
    else if (hunk.kind === 'Deleted') acc.removed++;
    else acc.modified++;
    return acc;
  }, { added: 0, removed: 0, modified: 0 });

  // Generate summary text
  const summaryParts = [];
  if (stats.added > 0) summaryParts.push(`+${stats.added} cells`);
  if (stats.removed > 0) summaryParts.push(`-${stats.removed} cells`);
  if (stats.modified > 0) summaryParts.push(`~${stats.modified} changes`);
  const summary = summaryParts.join(', ');

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            📊 {status === 'previewing' ? 'Preview' : status === 'rejected' ? 'Changes Rejected' : 'Changes Applied'}: {summary}
          </span>
          {status === 'applying' && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Applying...
            </span>
          )}
          {status === 'rejected' && (
            <span className="text-xs text-red-600 dark:text-red-400">
              ✗ Rejected
            </span>
          )}
          {status === 'accepted' && (
            <span className="text-xs text-green-600 dark:text-green-400">
              ✓ Applied
            </span>
          )}
        </div>
        
        {status === 'previewing' && onAccept && onReject && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onAccept}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              aria-label="Accept changes"
            >
              <CheckIcon className="w-3.5 h-3.5 mr-1" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors"
              aria-label="Reject changes"
            >
              <XMarkIcon className="w-3.5 h-3.5 mr-1" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Optional: Show first change for context */}
      {hunks.length > 0 && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          {hunks[0].kind !== 'Deleted' && (
            <div>
              Cell {hunks[0].key.sheet}!{String.fromCharCode(65 + hunks[0].key.col)}{hunks[0].key.row + 1}: {
                hunks[0].after?.f ? `=${hunks[0].after.f}` : (hunks[0].after?.v || 'new value')
              }
            </div>
          )}
          {hunks[0].kind === 'Deleted' && (
            <div>
              Cell {hunks[0].key.sheet}!{String.fromCharCode(65 + hunks[0].key.col)}{hunks[0].key.row + 1}: (deleted)
            </div>
          )}
          {hunks.length > 1 && (
            <div className="mt-1 text-gray-500">
              ...and {hunks.length - 1} more change{hunks.length > 2 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
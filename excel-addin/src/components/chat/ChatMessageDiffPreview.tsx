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
    <div className="mt-2 ml-8 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm font-mono text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-800 dark:text-gray-300">
            {status === 'previewing' ? 'Preview:' : status === 'rejected' ? 'Changes Rejected:' : 'Changes Applied:'} {summary}
          </span>
          {status === 'applying' && (
            <span className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
              <span>Applying...</span>
            </span>
          )}
          {status === 'rejected' && (
            <span className="flex items-center space-x-1 text-red-600 dark:text-red-400">
              <span>✗</span>
            </span>
          )}
          {status === 'accepted' && (
            <span className="flex items-center space-x-1 text-green-600 dark:text-green-400">
              <span>✓</span>
            </span>
          )}
        </div>
        
        {status === 'previewing' && onAccept && onReject && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onAccept}
              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              aria-label="Accept changes"
            >
              <CheckIcon className="w-3 h-3 mr-1" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
              aria-label="Reject changes"
            >
              <XMarkIcon className="w-3 h-3 mr-1" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Show up to 3 changes for context */}
      {hunks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
          {hunks.slice(0, 3).map((hunk, index) => {
            const cellAddr = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`;
            return (
              <div key={index} className="flex items-start space-x-1">
                <span className={`font-medium w-3 text-center ${
                  hunk.kind === 'Added' ? 'text-green-600' : 
                  hunk.kind === 'Deleted' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {hunk.kind === 'Added' ? '+' : hunk.kind === 'Deleted' ? '-' : '~'}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-300 min-w-[4rem]">{cellAddr}</span>
                <span className="text-gray-500 dark:text-gray-400 flex-1">
                  {hunk.kind === 'Deleted' ? (
                    '(deleted)'
                  ) : (hunk.kind === 'ValueChanged' || hunk.kind === 'FormulaChanged') && hunk.before ? (
                    <>
                      <span className="text-gray-500">{hunk.before.f ? `=${hunk.before.f}` : hunk.before.v}</span>
                      {' → '}
                      <span className="text-gray-800 dark:text-gray-300">{hunk.after?.f ? `=${hunk.after.f}` : hunk.after?.v}</span>
                    </>
                  ) : (
                    <span className="text-gray-800 dark:text-gray-300">{hunk.after?.f ? `=${hunk.after.f}` : hunk.after?.v || 'new value'}</span>
                  )}
                </span>
              </div>
            );
          })}
          {hunks.length > 3 && (
            <div className="text-gray-500 dark:text-gray-400 pl-5">
              ...and {hunks.length - 3} more change{hunks.length > 4 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
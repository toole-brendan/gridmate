import React from 'react';
import { DiffHunk } from '../../types/diff';
import { CheckIcon, XMarkIcon, ChevronDownIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { LoaderIcon } from 'lucide-react';

interface ChatMessageDiffPreviewProps {
  messageId: string;
  hunks: DiffHunk[];
  onAccept?: () => void;
  onReject?: () => void;
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
}

export const ChatMessageDiffPreview: React.FC<ChatMessageDiffPreviewProps> = ({
  messageId,
  hunks,
  onAccept,
  onReject,
  status
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(status !== 'previewing');
  
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

  // Get status-specific styling and icons
  const getStatusIcon = () => {
    switch (status) {
      case 'accepted':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="w-4 h-4 text-red-600" />;
      case 'applying':
        return <LoaderIcon className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'previewing':
        return 'Preview:';
      case 'applying':
        return 'Applying...';
      case 'accepted':
        return 'Changes Applied:';
      case 'rejected':
        return 'Changes Rejected:';
      default:
        return 'Changes:';
    }
  };

  const getStatusClass = () => {
    switch (status) {
      case 'accepted':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'rejected':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      case 'applying':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  return (
    <div className={`mt-2 ml-8 p-2 rounded border shadow-sm font-mono text-xs transition-all ${getStatusClass()}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-800 dark:text-gray-300">
            {getStatusText()} {summary}
          </span>
          {status === 'accepted' && (
            <span className="text-xs text-gray-500">
              {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {status === 'previewing' && onAccept && onReject && (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await onAccept();
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-2 py-0.5 font-caption text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded transition-colors"
                aria-label="Accept changes"
              >
                <CheckIcon className="w-3 h-3" />
                {isProcessing ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await onReject();
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-2 py-0.5 font-caption text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 rounded transition-colors"
                aria-label="Reject changes"
              >
                <XMarkIcon className="w-3 h-3" />
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </div>
      </div>

      {/* Collapsible diff details */}
      {!isCollapsed && hunks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
          {hunks.slice(0, 5).map((hunk, index) => {
            const cellAddr = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`;
            return (
              <div key={index} className="flex items-start space-x-1 text-xs">
                <span className={`font-medium w-3 text-center ${
                  hunk.kind === 'Added' ? 'text-green-600' : 
                  hunk.kind === 'Deleted' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {hunk.kind === 'Added' ? '+' : hunk.kind === 'Deleted' ? '-' : '~'}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-300 min-w-[4rem]">{cellAddr}</span>
                <span className="text-gray-500 dark:text-gray-400 flex-1 truncate">
                  {/* Show value preview */}
                  {hunk.kind === 'Deleted' ? (
                    '(deleted)'
                  ) : hunk.after?.f ? (
                    `=${hunk.after.f}`
                  ) : (
                    hunk.after?.v || 'new value'
                  )}
                </span>
              </div>
            );
          })}
          {hunks.length > 5 && (
            <div className="text-gray-500 dark:text-gray-400 pl-5">
              ...and {hunks.length - 5} more change{hunks.length > 6 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
import React, { useState } from 'react';
import { DiffHunk } from '../../types/diff';
import { X } from 'lucide-react';

interface FullDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  hunks: DiffHunk[];
  onAccept: (selectedHunks: DiffHunk[]) => void;
  onReject: () => void;
}

export const FullDiffModal: React.FC<FullDiffModalProps> = ({
  isOpen,
  onClose,
  hunks,
  onAccept,
  onReject
}) => {
  const [selectedHunks, setSelectedHunks] = useState<Set<string>>(
    new Set(hunks.map(h => `${h.key.sheet}!${h.key.row}:${h.key.col}`))
  );

  if (!isOpen) return null;

  const toggleHunk = (hunkId: string) => {
    const newSelected = new Set(selectedHunks);
    if (newSelected.has(hunkId)) {
      newSelected.delete(hunkId);
    } else {
      newSelected.add(hunkId);
    }
    setSelectedHunks(newSelected);
  };

  const handleAcceptSelected = () => {
    const selected = hunks.filter(h => 
      selectedHunks.has(`${h.key.sheet}!${h.key.row}:${h.key.col}`)
    );
    onAccept(selected);
  };

  // Group hunks by type for better organization
  const hunksByType = hunks.reduce((acc, hunk) => {
    const type = hunk.kind;
    if (!acc[type]) acc[type] = [];
    acc[type].push(hunk);
    return acc;
  }, {} as Record<string, DiffHunk[]>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="modal-header p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Review All Changes</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {hunks.length} total changes across {Object.keys(hunksByType).length} types
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body p-4 overflow-y-auto flex-1">
          {Object.entries(hunksByType).map(([type, typeHunks]) => (
            <div key={type} className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  type === 'Added' ? 'bg-green-500' :
                  type === 'Deleted' ? 'bg-red-500' :
                  type === 'ValueChanged' ? 'bg-yellow-500' :
                  type === 'FormulaChanged' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`} />
                {type} ({typeHunks.length})
              </h3>
              
              <div className="space-y-2">
                {typeHunks.map((hunk, idx) => {
                  const hunkId = `${hunk.key.sheet}!${hunk.key.row}:${hunk.key.col}`;
                  const cellAddr = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`;
                  
                  return (
                    <div 
                      key={idx} 
                      className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHunks.has(hunkId)}
                        onChange={() => toggleHunk(hunkId)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-mono text-sm font-medium">{cellAddr}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {hunk.before && (
                            <span className="line-through">
                              {hunk.before.f ? `=${hunk.before.f}` : hunk.before.v}
                            </span>
                          )}
                          {hunk.before && hunk.after && ' → '}
                          {hunk.after && (
                            <span className="text-gray-900 dark:text-gray-100">
                              {hunk.after.f ? `=${hunk.after.f}` : hunk.after.v}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-footer p-4 border-t dark:border-gray-700 flex justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedHunks.size} of {hunks.length} changes selected
          </div>
          <div className="space-x-2">
            <button
              onClick={onReject}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Reject All
            </button>
            <button
              onClick={handleAcceptSelected}
              disabled={selectedHunks.size === 0}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Accept Selected ({selectedHunks.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
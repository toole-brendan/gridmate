import React, { useState, useMemo } from 'react';
import { PendingAction, OperationSummary } from '../../types/operations';

interface EnhancedPendingActionsPanelProps {
  actions: PendingAction[];
  summary: OperationSummary; // From backend GetOperationSummary
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onApproveAll: () => void;
  onApproveAllInOrder: () => void;
  onUndo: () => void;
  onRedo: () => void;
  dependencies: Record<string, string[]>;
  hasUndo: boolean;
  hasRedo: boolean;
}

export const EnhancedPendingActionsPanel: React.FC<EnhancedPendingActionsPanelProps> = ({
  actions,
  summary,
  onApprove,
  onReject,
  onApproveAll,
  onApproveAllInOrder,
  onUndo,
  onRedo,
  dependencies,
  hasUndo,
  hasRedo,
}) => {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // Group actions by batch and calculate dependencies
  const organizedActions = useMemo(() => {
    const batches = new Map<string, PendingAction[]>();
    const standalone: PendingAction[] = [];

    actions.forEach(action => {
      if (action.batchId) {
        const batch = batches.get(action.batchId) || [];
        batch.push(action);
        batches.set(action.batchId, batch);
      } else {
        standalone.push(action);
      }
    });

    return { batches, standalone };
  }, [actions]);

  // Check if action can be approved based on dependencies
  const canApprove = (actionId: string): boolean => {
    const action = actions.find(a => a.id === actionId);
    return action?.canApprove || false; // Use backend's canApprove flag
  };

  // Get visual indicator for action status
  const getStatusIcon = (action: PendingAction): React.ReactNode => {
    if (!canApprove(action.id)) {
      return <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Waiting for dependencies" />;
    }
    if (action.batchId) {
      return <div className="w-2 h-2 bg-blue-500 rounded-full" title="Part of batch" />;
    }
    if (action.priority && action.priority > 50) {
      return <div className="w-2 h-2 bg-purple-500 rounded-full" title="High priority" />;
    }
    return <div className="w-2 h-2 bg-green-500 rounded-full" title="Ready to approve" />;
  };

  // Get operation type display name
  const getOperationTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      'write_range': 'Write Data',
      'apply_formula': 'Apply Formula',
      'format_range': 'Format Cells',
      'create_chart': 'Create Chart',
      'insert_rows_columns': 'Insert Rows/Columns',
      'create_named_range': 'Create Named Range',
      'undo_write_range': 'Undo Write',
      'undo_apply_formula': 'Undo Formula',
      'undo_format_range': 'Undo Format',
    };
    return typeMap[type] || type;
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(batchId)) {
        newSet.delete(batchId);
      } else {
        newSet.add(batchId);
      }
      return newSet;
    });
  };

  return (
    <div className="pending-actions-panel p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Pending Operations
          </h3>
          {summary.total > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.counts.queued} queued, {summary.counts.completed} completed
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Undo/Redo buttons */}
          <button
            onClick={onUndo}
            className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 
                     disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed 
                     transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={!hasUndo}
            title="Undo last operation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={onRedo}
            className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 
                     disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed 
                     transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            disabled={!hasRedo}
            title="Redo last undone operation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
          </button>
          <div className="w-px bg-gray-300" />
          <button
            onClick={onApproveAllInOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                     flex items-center gap-2 text-sm font-semibold shadow-sm
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={actions.length === 0 || summary.has_blocked}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve All in Order
          </button>
          <button
            onClick={onApproveAll}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 
                     text-sm font-medium disabled:bg-gray-50 disabled:text-gray-400 
                     disabled:cursor-not-allowed transition-colors"
            disabled={actions.length === 0 || summary.has_blocked}
          >
            Approve All
          </button>
        </div>
      </div>

      {/* Warning if operations are blocked */}
      {summary.has_blocked && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800 flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Some operations are blocked by dependencies. They will execute once their dependencies complete.</span>
        </div>
      )}

      {/* Batch summary if available */}
      {summary.batches && summary.batches.length > 0 && (
        <div className="mb-3 text-sm text-gray-600">
          {summary.batches.map(batch => (
            <div key={batch.id}>
              Batch: {batch.ready_count}/{batch.size} ready
              {batch.can_approve_all && ' ✓'}
            </div>
          ))}
        </div>
      )}

      {/* Batched Operations */}
      {Array.from(organizedActions.batches.entries()).map(([batchId, batchActions]) => (
        <BatchedOperations
          key={batchId}
          batchId={batchId}
          actions={batchActions}
          expanded={expandedBatches.has(batchId)}
          onToggle={() => toggleBatch(batchId)}
          onApprove={onApprove}
          onReject={onReject}
          canApprove={canApprove}
          getStatusIcon={getStatusIcon}
          getOperationTypeDisplay={getOperationTypeDisplay}
        />
      ))}

      {/* Standalone Operations */}
      {organizedActions.standalone.map(action => (
        <OperationCard
          key={action.id}
          action={action}
          canApprove={canApprove(action.id)}
          statusIcon={getStatusIcon(action)}
          operationTypeDisplay={getOperationTypeDisplay(action.type)}
          onApprove={() => onApprove(action.id)}
          onReject={() => onReject(action.id)}
        />
      ))}

      {/* Dependency Visualization */}
      {actions.length > 3 && (
        <DependencyGraph
          actions={actions}
          dependencies={dependencies}
        />
      )}
    </div>
  );
};

// Individual Operation Card Component
const OperationCard: React.FC<{
  action: PendingAction;
  canApprove: boolean;
  statusIcon: React.ReactNode;
  operationTypeDisplay: string;
  onApprove: () => void;
  onReject: () => void;
}> = ({ action, canApprove, statusIcon, operationTypeDisplay, onApprove, onReject }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={`operation-card border rounded-lg p-3 mb-2 
                    ${canApprove ? 'bg-white' : 'bg-gray-100 opacity-75'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {statusIcon}
            <span className="font-medium text-sm text-gray-900">{operationTypeDisplay}</span>
            {action.context && (
              <span className="text-xs text-gray-500">• {action.context}</span>
            )}
          </div>
          
          <p className="text-sm text-gray-700">{action.description || action.preview}</p>
          
          {/* Preview Toggle */}
          {action.preview && action.preview !== action.description && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {showPreview ? 'Hide' : 'Show'} Details
            </button>
          )}
          
          {/* Preview Content */}
          {showPreview && action.preview && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
              {action.preview}
            </div>
          )}

          {/* Show input details for debugging */}
          {showPreview && action.input && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
              <strong>Range:</strong> {action.input.range || action.input.range_address}<br/>
              {action.input.formula && <><strong>Formula:</strong> {action.input.formula}<br/></>}
              {action.input.values && <><strong>Values:</strong> {JSON.stringify(action.input.values)}<br/></>}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 ml-2">
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              canApprove
                ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
            }`}
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-md text-sm font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Dependency Info */}
      {!canApprove && action.dependencies && action.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Waiting for {action.dependencies.length} dependent operation{action.dependencies.length > 1 ? 's' : ''} to complete
        </div>
      )}

      {/* Error display if operation failed */}
      {action.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          <strong>Error:</strong> {action.error}
        </div>
      )}
    </div>
  );
};

// Batched Operations Component
const BatchedOperations: React.FC<{
  batchId: string;
  actions: PendingAction[];
  expanded: boolean;
  onToggle: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  canApprove: (id: string) => boolean;
  getStatusIcon: (action: PendingAction) => React.ReactNode;
  getOperationTypeDisplay: (type: string) => string;
}> = ({ batchId, actions, expanded, onToggle, onApprove, onReject, canApprove, getStatusIcon, getOperationTypeDisplay }) => {
  return (
    <div className="batch-group mb-4">
      <button
        onClick={onToggle}
        className="w-full text-left p-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm flex items-center gap-2">
            <svg className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-gray-900">Batch: {batchId.slice(0, 8)}...</span>
            <span className="text-xs text-gray-500">({actions.length} operations)</span>
          </span>
          <span className="text-xs text-blue-600 font-medium">
            {actions.filter(a => canApprove(a.id)).length}/{actions.length} ready
          </span>
        </div>
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-2 pl-4">
          {actions.map((action, index) => (
            <OperationCard
              key={action.id}
              action={action}
              canApprove={canApprove(action.id)}
              statusIcon={getStatusIcon(action)}
              operationTypeDisplay={getOperationTypeDisplay(action.type)}
              onApprove={() => onApprove(action.id)}
              onReject={() => onReject(action.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Dependency Graph Component
const DependencyGraph: React.FC<{
  actions: PendingAction[];
  dependencies: Record<string, string[]>;
}> = ({ actions, dependencies }) => {
  const renderGraph = () => {
    const actionMap = new Map(actions.map(a => [a.id, a]));
    const lines: string[] = [];

    actions.forEach(action => {
      const deps = dependencies[action.id] || [];
      if (deps.length > 0) {
        deps.forEach(depId => {
          const depAction = actionMap.get(depId);
          if (depAction) {
            lines.push(`${getShortType(depAction.type)} → ${getShortType(action.type)}`);
          }
        });
      }
    });

    return lines;
  };

  const getShortType = (type: string): string => {
    const shortTypes: Record<string, string> = {
      'write_range': 'Write',
      'apply_formula': 'Formula',
      'format_range': 'Format',
      'create_chart': 'Chart',
      'insert_rows_columns': 'Insert',
      'create_named_range': 'Named Range',
    };
    return shortTypes[type] || type;
  };

  return (
    <div className="dependency-graph mt-4 p-3 bg-gray-100 rounded text-xs">
      <h4 className="font-semibold mb-2">Operation Dependencies:</h4>
      <div className="font-mono space-y-1">
        {renderGraph().map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      {dependencies && Object.keys(dependencies).length === 0 && (
        <div className="text-gray-500">No dependencies - operations can run in parallel</div>
      )}
    </div>
  );
}; 
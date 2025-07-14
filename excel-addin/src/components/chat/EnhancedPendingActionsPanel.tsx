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
  const getStatusIcon = (action: PendingAction): string => {
    if (!canApprove(action.id)) return '⏸️'; // Waiting for dependencies
    if (action.batchId) return '🔗'; // Part of batch
    if (action.priority && action.priority > 50) return '⚡'; // High priority
    return '✅'; // Ready to approve
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
    <div className="pending-actions-panel p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Pending Operations 
          {summary.total > 0 && (
            <span className="text-sm font-normal text-gray-600 ml-2">
              ({summary.counts.queued} queued, {summary.counts.completed} completed)
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {/* Undo/Redo buttons */}
          <button
            onClick={onUndo}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            disabled={!hasUndo}
            title="Undo last operation"
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 
                     disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            disabled={!hasRedo}
            title="Redo last undone operation"
          >
            ↷
          </button>
          <div className="w-px bg-gray-300" />
          <button
            onClick={onApproveAllInOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                     flex items-center gap-2 text-sm font-medium
                     disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={actions.length === 0 || summary.has_blocked}
          >
            <span>✓</span> Approve All in Order
          </button>
          <button
            onClick={onApproveAll}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 
                     text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={actions.length === 0 || summary.has_blocked}
          >
            Approve All
          </button>
        </div>
      </div>

      {/* Warning if operations are blocked */}
      {summary.has_blocked && (
        <div className="mb-3 p-2 bg-orange-100 border border-orange-300 rounded text-sm text-orange-800">
          ⚠️ Some operations are blocked by dependencies. They will execute once their dependencies complete.
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
  statusIcon: string;
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
            <span className="text-lg">{statusIcon}</span>
            <span className="font-medium text-sm">{operationTypeDisplay}</span>
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
        <div className="flex gap-1 ml-2">
          <button
            onClick={onApprove}
            disabled={!canApprove}
            className={`px-3 py-1 rounded text-sm ${
              canApprove
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            ✓
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            ✗
          </button>
        </div>
      </div>

      {/* Dependency Info */}
      {!canApprove && action.dependencies && action.dependencies.length > 0 && (
        <div className="mt-2 text-xs text-orange-600">
          ⚠️ Waiting for {action.dependencies.length} dependent operation{action.dependencies.length > 1 ? 's' : ''} to complete
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
  getStatusIcon: (action: PendingAction) => string;
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
            <span>{expanded ? '▼' : '▶'}</span>
            🔗 Batch: {batchId.slice(0, 8)}...
            <span className="text-xs text-gray-600">({actions.length} operations)</span>
          </span>
          <span className="text-xs text-blue-600">
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
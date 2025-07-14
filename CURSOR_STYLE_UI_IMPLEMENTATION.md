# Cursor-Style UI Implementation Guide

## Overview
This guide details the frontend implementation for Cursor-inspired UI features in the Excel add-in, focusing on the "Approve All in Order" functionality and intelligent operation management.

## Task List
### UI Enhancements
- [ ] Update PendingActionsPanel with dependency visualization
- [ ] Add "Approve All in Order" functionality
- [ ] Implement operation preview UI
- [ ] Add undo/redo buttons
- [ ] Display operation counts and status summary
- [ ] Show batch completion progress

## 1. Enhanced Pending Actions Panel

### File: `excel-addin/src/components/chat/PendingActionsPanel.tsx`

```tsx
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
```

## 2. Approve All in Order Implementation

### File: `excel-addin/src/hooks/useOperationQueue.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { PendingAction, OperationSummary } from '../types/operations';

export const useOperationQueue = (sessionId: string) => {
  const [queue, setQueue] = useState<PendingAction[]>([]);
  const [summary, setSummary] = useState<OperationSummary | null>(null);
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [processing, setProcessing] = useState(false);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // Update from backend operation summary
  const updateFromBackendSummary = useCallback((backendSummary: any) => {
    const pendingOps: PendingAction[] = backendSummary.pending?.map((op: any) => ({
      id: op.id,
      type: op.type,
      description: op.preview || op.description,
      preview: op.preview,
      input: op.input || {},
      status: op.status === 'queued' ? 'pending' : op.status,
      canApprove: op.can_approve,
      dependencies: op.dependencies || [],
      batchId: op.batch_id,
      priority: op.priority,
      context: op.context,
      createdAt: new Date().toISOString(),
    })) || [];

    setQueue(pendingOps);
    setSummary({
      counts: backendSummary.counts || {},
      pending: pendingOps,
      total: backendSummary.total || pendingOps.length,
      has_blocked: backendSummary.has_blocked || false,
      batches: backendSummary.batches || [],
    });

    // Build dependencies map
    const depMap: Record<string, string[]> = {};
    pendingOps.forEach(op => {
      if (op.dependencies && op.dependencies.length > 0) {
        depMap[op.id] = op.dependencies;
      }
    });
    setDependencies(depMap);
  }, []);

  // Get execution order based on dependencies and can_approve flags
  const getExecutionOrder = useCallback((actions: PendingAction[]): string[] => {
    // Simply filter and sort by those that can be approved
    const approvable = actions.filter(a => a.canApprove);
    
    // Sort by priority (higher first) and batch grouping
    approvable.sort((a, b) => {
      // Group by batch first
      if (a.batchId && b.batchId && a.batchId === b.batchId) {
        // Within same batch, use original order
        return 0;
      }
      // Then by priority
      return (b.priority || 0) - (a.priority || 0);
    });

    return approvable.map(a => a.id);
  }, []);

  // Approve all operations in order
  const approveAllInOrder = useCallback(async (
    actions: PendingAction[],
    onApprove: (id: string) => Promise<void>
  ) => {
    setProcessing(true);
    const order = getExecutionOrder(actions);
    
    console.log('Approving operations in order:', order);
    
    for (const actionId of order) {
      try {
        await onApprove(actionId);
        // Add small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to approve action ${actionId}:`, error);
        // Continue with next operations even if one fails
      }
    }
    
    setProcessing(false);
  }, [getExecutionOrder]);

  return {
    queue,
    summary,
    dependencies,
    processing,
    undoStack,
    redoStack,
    approveAllInOrder,
    getExecutionOrder,
    updateFromBackendSummary,
  };
};
```

## 3. Visual Dependency Graph

### File: `excel-addin/src/components/chat/DependencyGraph.tsx`

```tsx
import React from 'react';
import { PendingAction } from '../../types/operations';

interface DependencyGraphProps {
  actions: PendingAction[];
  dependencies: Record<string, string[]>;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  actions,
  dependencies,
}) => {
  // Simple ASCII-art style dependency visualization
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
```

## 4. Integration with ChatInterface

### File: `excel-addin/src/components/chat/ChatInterfaceWithSignalR.tsx`

Update the existing component to use the new enhanced panel:

```tsx
// Add to imports
import { EnhancedPendingActionsPanel } from './EnhancedPendingActionsPanel';
import { useOperationQueue } from '../../hooks/useOperationQueue';

// Inside component
const { 
  queue,
  summary,
  approveAllInOrder, 
  dependencies,
  undoStack,
  redoStack,
  updateFromBackendSummary 
} = useOperationQueue(sessionId);

// Update pending actions when receiving from backend
useEffect(() => {
  signalRClient.on('pendingOperations', (operationSummary: any) => {
    updateFromBackendSummary(operationSummary);
  });
}, [signalRClient, updateFromBackendSummary]);

// Handle approve all in order
const handleApproveAllInOrder = async () => {
  await approveAllInOrder(queue, async (actionId) => {
    await handleActionApproval(actionId);
  });
};

// Handle undo/redo
const handleUndo = async () => {
  await signalRClient.send('undoLastOperation', { sessionId });
};

const handleRedo = async () => {
  await signalRClient.send('redoLastOperation', { sessionId });
};

// Replace existing PendingActionsPanel with:
<EnhancedPendingActionsPanel
  actions={queue}
  summary={summary || { counts: {}, pending: [], total: 0, has_blocked: false, batches: [] }}
  onApprove={handleActionApproval}
  onReject={handleActionRejection}
  onApproveAll={handleApproveAll}
  onApproveAllInOrder={handleApproveAllInOrder}
  onUndo={handleUndo}
  onRedo={handleRedo}
  dependencies={dependencies}
  hasUndo={undoStack.length > 0}
  hasRedo={redoStack.length > 0}
/>
```

## 5. Type Definitions

### File: `excel-addin/src/types/operations.ts`

```typescript
export interface PendingAction {
  id: string;
  type: string;
  description: string;
  input: Record<string, any>;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  batchId?: string;
  dependencies?: string[];
  priority?: number;
  preview?: string;
  context?: string;
  canApprove?: boolean; // From backend's CanExecute check
  error?: string; // Error message if failed
  result?: any; // Result of completed operation
}

export interface OperationBatch {
  id: string;
  size: number;
  ready_count: number;
  can_approve_all: boolean;
}

export interface OperationSummary {
  counts: {
    queued?: number;
    in_progress?: number;
    completed?: number;
    failed?: number;
    cancelled?: number;
  };
  pending: PendingAction[];
  total: number;
  has_blocked: boolean;
  batches?: OperationBatch[];
}

export interface OperationDependency {
  from: string;
  to: string;
  type: 'requires' | 'blocks' | 'related';
}

// Backend operation status enum
export enum OperationStatus {
  Queued = 'queued',
  InProgress = 'in_progress',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}
```

## 6. Styling for Cursor-like Experience

### File: `excel-addin/src/styles/cursor-theme.css`

```css
/* Cursor-inspired theme */
.pending-actions-panel {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  background: linear-gradient(to bottom, #f8f9fa, #f3f4f6);
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.operation-card {
  transition: all 0.15s ease;
  border: 1px solid #e5e7eb;
}

.operation-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

/* Batch grouping visual */
.batch-group {
  position: relative;
  padding-left: 12px;
  margin-bottom: 8px;
}

.batch-group::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #3b82f6;
  border-radius: 2px;
}

/* Status indicators */
.status-waiting { color: #f59e0b; }
.status-ready { color: #10b981; }
.status-error { color: #ef4444; }
.status-batch { color: #3b82f6; }

/* Undo/Redo buttons */
button[title*="Undo"], button[title*="Redo"] {
  font-family: 'SF Mono', Monaco, monospace;
  font-weight: bold;
}

/* Operation type badges */
.operation-type-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.operation-type-write { background: #dbeafe; color: #1e40af; }
.operation-type-formula { background: #d1fae5; color: #065f46; }
.operation-type-format { background: #fef3c7; color: #92400e; }
.operation-type-undo { background: #e0e7ff; color: #4338ca; }

/* Smooth animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.operation-card {
  animation: slideIn 0.3s ease;
}

/* Progress indicator for batch operations */
.batch-progress {
  height: 3px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.batch-progress-bar {
  height: 100%;
  background: #3b82f6;
  transition: width 0.3s ease;
}
```

## Implementation Benefits

1. **Clear Visual Hierarchy**: Users can immediately see which operations can be approved
2. **Batch Awareness**: Related operations are grouped visually
3. **Dependency Clarity**: Clear indication of why operations are waiting
4. **One-Click Approval**: "Approve All in Order" handles complex sequences
5. **Preview Capability**: Users can see what will happen before approving
6. **Responsive Feedback**: Smooth animations and status updates
7. **Undo/Redo Support**: Easy reversal of operations
8. **Backend Alignment**: Properly uses backend's operation summary and status flags

## Testing Checklist

- [ ] Test with complex dependency chains
- [ ] Verify batch grouping works correctly
- [ ] Ensure "Approve All in Order" respects dependencies
- [ ] Test error handling when operations fail
- [ ] Verify UI updates in real-time from backend summary
- [ ] Test with 50+ pending operations for performance 
- [ ] Verify undo/redo functionality works
- [ ] Test operation status transitions (queued → in_progress → completed)
- [ ] Ensure proper handling of cancelled operations due to failed dependencies 
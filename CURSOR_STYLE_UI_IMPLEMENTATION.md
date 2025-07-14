# Cursor-Style UI Implementation Guide

## Overview
This guide details the frontend implementation for Cursor-inspired UI features in the Excel add-in, focusing on the "Approve All in Order" functionality and intelligent operation management.

## 1. Enhanced Pending Actions Panel

### File: `excel-addin/src/components/chat/PendingActionsPanel.tsx`

```tsx
import React, { useState, useMemo } from 'react';
import { PendingAction, OperationDependency } from '../../types/operations';

interface EnhancedPendingActionsPanelProps {
  actions: PendingAction[];
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onApproveAll: () => void;
  onApproveAllInOrder: () => void;
  dependencies: Record<string, string[]>;
}

export const EnhancedPendingActionsPanel: React.FC<EnhancedPendingActionsPanelProps> = ({
  actions,
  onApprove,
  onReject,
  onApproveAll,
  onApproveAllInOrder,
  dependencies,
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
    const deps = dependencies[actionId] || [];
    return deps.every(depId => {
      const depAction = actions.find(a => a.id === depId);
      return !depAction || depAction.status === 'completed';
    });
  };

  // Get visual indicator for action status
  const getStatusIcon = (action: PendingAction): string => {
    if (!canApprove(action.id)) return '⏸️'; // Waiting for dependencies
    if (action.batchId) return '🔗'; // Part of batch
    if (action.priority > 50) return '⚡'; // High priority
    return '✅'; // Ready to approve
  };

  return (
    <div className="pending-actions-panel p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Pending Operations</h3>
        <div className="flex gap-2">
          <button
            onClick={onApproveAllInOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 
                     flex items-center gap-2 text-sm font-medium"
            disabled={actions.length === 0}
          >
            <span>✓</span> Approve All in Order
          </button>
          <button
            onClick={onApproveAll}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 
                     text-sm"
            disabled={actions.length === 0}
          >
            Approve All
          </button>
        </div>
      </div>

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
        />
      ))}

      {/* Standalone Operations */}
      {organizedActions.standalone.map(action => (
        <OperationCard
          key={action.id}
          action={action}
          canApprove={canApprove(action.id)}
          statusIcon={getStatusIcon(action)}
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
  onApprove: () => void;
  onReject: () => void;
}> = ({ action, canApprove, statusIcon, onApprove, onReject }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={`operation-card border rounded-lg p-3 mb-2 
                    ${canApprove ? 'bg-white' : 'bg-gray-100 opacity-75'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{statusIcon}</span>
            <span className="font-medium text-sm">{action.type}</span>
            {action.context && (
              <span className="text-xs text-gray-500">• {action.context}</span>
            )}
          </div>
          
          <p className="text-sm text-gray-700">{action.description}</p>
          
          {/* Preview Toggle */}
          {action.preview && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs text-blue-600 hover:underline mt-1"
            >
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          )}
          
          {/* Preview Content */}
          {showPreview && action.preview && (
            <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
              {action.preview}
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
      {!canApprove && (
        <div className="mt-2 text-xs text-orange-600">
          ⚠️ Waiting for dependent operations to complete
        </div>
      )}
    </div>
  );
};
```

## 2. Approve All in Order Implementation

### File: `excel-addin/src/hooks/useOperationQueue.ts`

```typescript
import { useState, useCallback } from 'react';
import { PendingAction } from '../types/operations';

export const useOperationQueue = () => {
  const [queue, setQueue] = useState<PendingAction[]>([]);
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [processing, setProcessing] = useState(false);

  // Topological sort to determine execution order
  const getExecutionOrder = useCallback((actions: PendingAction[]): string[] => {
    const inDegree: Record<string, number> = {};
    const adjList: Record<string, string[]> = {};
    const actionMap = new Map(actions.map(a => [a.id, a]));

    // Initialize graph
    actions.forEach(action => {
      inDegree[action.id] = 0;
      adjList[action.id] = [];
    });

    // Build graph
    Object.entries(dependencies).forEach(([actionId, deps]) => {
      if (actionMap.has(actionId)) {
        deps.forEach(depId => {
          if (actionMap.has(depId)) {
            adjList[depId].push(actionId);
            inDegree[actionId]++;
          }
        });
      }
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with no incoming edges
    Object.entries(inDegree).forEach(([id, degree]) => {
      if (degree === 0) queue.push(id);
    });

    while (queue.length > 0) {
      // Sort by priority within same level
      queue.sort((a, b) => {
        const actionA = actionMap.get(a)!;
        const actionB = actionMap.get(b)!;
        return (actionB.priority || 0) - (actionA.priority || 0);
      });

      const current = queue.shift()!;
      result.push(current);

      // Update neighbors
      adjList[current].forEach(neighbor => {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      });
    }

    return result;
  }, [dependencies]);

  // Approve all operations in dependency order
  const approveAllInOrder = useCallback(async (
    actions: PendingAction[],
    onApprove: (id: string) => Promise<void>
  ) => {
    setProcessing(true);
    const order = getExecutionOrder(actions);
    
    for (const actionId of order) {
      try {
        await onApprove(actionId);
        // Add small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to approve action ${actionId}:`, error);
        // Stop on first error
        break;
      }
    }
    
    setProcessing(false);
  }, [getExecutionOrder]);

  return {
    queue,
    dependencies,
    processing,
    approveAllInOrder,
    getExecutionOrder,
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
            lines.push(`${depAction.type} → ${action.type}`);
          }
        });
      }
    });

    return lines;
  };

  return (
    <div className="dependency-graph mt-4 p-3 bg-gray-100 rounded text-xs">
      <h4 className="font-semibold mb-2">Operation Dependencies:</h4>
      <div className="font-mono space-y-1">
        {renderGraph().map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
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
const { approveAllInOrder, dependencies } = useOperationQueue();

// Handle approve all in order
const handleApproveAllInOrder = async () => {
  await approveAllInOrder(pendingActions, async (actionId) => {
    await handleActionApproval(actionId);
  });
};

// Replace existing PendingActionsPanel with:
<EnhancedPendingActionsPanel
  actions={pendingActions}
  onApprove={handleActionApproval}
  onReject={handleActionRejection}
  onApproveAll={handleApproveAll}
  onApproveAllInOrder={handleApproveAllInOrder}
  dependencies={dependencies}
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
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  createdAt: string;
  batchId?: string;
  dependencies?: string[];
  priority?: number;
  preview?: string;
  context?: string;
}

export interface OperationBatch {
  id: string;
  name: string;
  operations: PendingAction[];
  canMerge: boolean;
}

export interface OperationDependency {
  from: string;
  to: string;
  type: 'requires' | 'blocks' | 'related';
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
```

## Implementation Benefits

1. **Clear Visual Hierarchy**: Users can immediately see which operations can be approved
2. **Batch Awareness**: Related operations are grouped visually
3. **Dependency Clarity**: Clear indication of why operations are waiting
4. **One-Click Approval**: "Approve All in Order" handles complex sequences
5. **Preview Capability**: Users can see what will happen before approving
6. **Responsive Feedback**: Smooth animations and status updates

## Testing Checklist

- [ ] Test with complex dependency chains
- [ ] Verify batch grouping works correctly
- [ ] Ensure "Approve All in Order" respects dependencies
- [ ] Test error handling when operations fail
- [ ] Verify UI updates in real-time
- [ ] Test with 50+ pending operations for performance 
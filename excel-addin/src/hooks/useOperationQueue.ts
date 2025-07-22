import { useState, useCallback } from 'react';
import { PendingAction, OperationSummary } from '../types/operations';

export const useOperationQueue = (_sessionId: string) => {
  const [queue, setQueue] = useState<PendingAction[]>([]);
  const [summary, setSummary] = useState<OperationSummary | null>(null);
  const [dependencies, setDependencies] = useState<Record<string, string[]>>({});
  const [processing, setProcessing] = useState(false);
  const [undoStack] = useState<string[]>([]);
  const [redoStack] = useState<string[]>([]);

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

  // Accept all operations in order
  const acceptAllInOrder = useCallback(async (
    actions: PendingAction[],
    onAccept: (id: string) => Promise<void>
  ) => {
    setProcessing(true);
    const order = getExecutionOrder(actions);
    
    console.log('Accepting operations in order:', order);
    
    for (const actionId of order) {
      try {
        await onAccept(actionId);
        // Add small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to accept action ${actionId}:`, error);
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
    acceptAllInOrder,
    getExecutionOrder,
    updateFromBackendSummary,
  };
}; 
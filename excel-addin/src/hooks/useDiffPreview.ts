import { useCallback, useMemo } from 'react';
import { useDiffSessionStore } from '../store/useDiffSessionStore';
import { ExcelService } from '../services/excel/ExcelService';
import { GridVisualizer } from '../services/diff/GridVisualizer';
import { AISuggestedOperation, WorkbookSnapshot } from '../types/diff';
import { simulateOperation } from '../utils/diffSimulator';
import { getDiffCalculator } from '../utils/clientDiff';
import { createDebouncedValidator } from '../utils/debouncedValidation';

export const useDiffPreview = () => {
  const { actions, ...state } = useDiffSessionStore();
  const excelService = ExcelService.getInstance();
  
  // Debounced backend validation
  const debouncedValidation = useMemo(
    () => createDebouncedValidator(async (operations: AISuggestedOperation[]) => {
      try {
        actions.addLog('info', `[Diff Preview] Validating ${operations.length} operations with backend`);
        // Backend validation logic here
        console.log('Validating operations with backend:', operations.length);
      } catch (error) {
        actions.addLog('error', `[Diff Preview] Backend validation failed: ${(error as Error).message}`);
        actions.handleError(error as Error);
      }
    }, 500),
    [actions]
  );

  const startPreviewSession = useCallback(async (initialOperation: AISuggestedOperation, messageId: string) => {
    const sessionId = `session_${Date.now()}`;
    actions.addLog('info', `[Diff Preview] Starting new preview session ${sessionId} for message ${messageId}`);
    
    try {
      actions.setStatus('calculating');
      const targetRange = extractTargetRange(initialOperation);
      actions.addLog('info', `[Diff Preview] Taking workbook snapshot for range: ${targetRange || 'A1:Z100'}`);
      
      const snapshot = await excelService.createWorkbookSnapshot({ 
        rangeAddress: targetRange || 'A1:Z100',
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      });
      
      if (snapshot) {
        actions.addLog('success', '[Diff Preview] Snapshot created successfully', { 
          cellCount: Object.keys(snapshot.cells || {}).length 
        });
      } else {
        actions.addLog('error', '[Diff Preview] Failed to create workbook snapshot');
        throw new Error('Failed to create workbook snapshot');
      }
      
      actions.startSession(sessionId, snapshot);
      await updatePreview(initialOperation, messageId, snapshot);
    } catch (error) {
      actions.addLog('error', `[Diff Preview] Error starting preview session: ${(error as Error).message}`);
      actions.handleError(error as Error);
    }
  }, [actions, excelService]);

  const updatePreview = useCallback(async (
    newOperation: AISuggestedOperation, 
    messageId: string,
    baseSnapshot?: WorkbookSnapshot
  ) => {
    const currentSnapshot = baseSnapshot ?? useDiffSessionStore.getState().liveSnapshot;
    if (!currentSnapshot) {
      actions.addLog('warning', '[Diff Preview] No snapshot available for preview update');
      return;
    }

    actions.addLog('info', `[Diff Preview] Updating preview with operation: ${newOperation.tool}`, {
      messageId,
      tool: newOperation.tool,
      input: newOperation.input
    });

    try {
      actions.setStatus('calculating');
      
      // 1. Simulate the new operation to get the next state
      actions.addLog('info', `[Diff Preview] Simulating operation ${newOperation.tool}...`);
      const startSimTime = performance.now();
      const newLiveSnapshot = await simulateOperation(currentSnapshot, newOperation, actions.addLog);
      const simTime = Math.round(performance.now() - startSimTime);
      actions.addLog('info', `[Diff Preview] Simulation completed in ${simTime}ms`);
      
      // 2. Calculate a quick client-side diff for immediate feedback
      actions.addLog('info', '[Diff Preview] Calculating diff...');
      const startDiffTime = performance.now();
      const diffCalculator = getDiffCalculator({
        maxDiffs: 10000,
        includeStyles: true,
        chunkSize: 1000
      });
      const hunks = diffCalculator.calculateDiff(currentSnapshot, newLiveSnapshot);
      const diffTime = Math.round(performance.now() - startDiffTime);
      actions.addLog('info', `[Diff Preview] Diff calculated in ${diffTime}ms`, { hunkCount: hunks.length });
      
      // 3. Apply visual highlights immediately (batched for performance)
      const isBatched = hunks.length > 100;
      actions.addLog('info', `[Diff Preview] Applying ${hunks.length} highlights${isBatched ? ' (batched)' : ''}`);
      const startHighlightTime = performance.now();
      
      if (isBatched) {
        await GridVisualizer.applyHighlightsBatched(hunks, 50, actions.addLog);
      } else {
        await GridVisualizer.applyHighlights(hunks, actions.addLog);
      }
      
      const highlightTime = Math.round(performance.now() - startHighlightTime);
      actions.addLog('success', `[Diff Preview] Highlights applied in ${highlightTime}ms`);
      
      // 4. Update the central store
      actions.addOperation(newOperation, messageId, newLiveSnapshot, hunks);
      
      // 5. Queue for debounced backend validation
      const allOps = [...useDiffSessionStore.getState().pendingOperations.map(op => ({
        tool: op.tool,
        input: op.input,
        description: op.description
      })), newOperation];
      actions.addLog('info', `[Diff Preview] Queueing ${allOps.length} operations for backend validation`);
      debouncedValidation(allOps);
      
    } catch (error) {
      actions.addLog('error', `[Diff Preview] Error updating preview: ${(error as Error).message}`, { error: error as Error });
      actions.handleError(error as Error);
    }
  }, [actions, debouncedValidation]);

  const applyChanges = useCallback(async () => {
    const { pendingOperations, hunks, sessionId } = useDiffSessionStore.getState();
    actions.addLog('info', `[Diff Preview] User clicked Apply for session ${sessionId} with ${pendingOperations.length} operations`);
    
    try {
      actions.setStatus('applying');
      
      // Clear highlights
      if (hunks && hunks.length > 0) {
        actions.addLog('info', `[Diff Preview] Clearing ${hunks.length} highlights`);
        await GridVisualizer.clearHighlights(hunks, actions.addLog);
      }
      
      // Execute operations with progress tracking
      actions.addLog('info', `[Diff Preview] Executing ${pendingOperations.length} operations...`);
      for (let i = 0; i < pendingOperations.length; i++) {
        const op = pendingOperations[i];
        actions.addLog('info', `[Diff Preview] Executing operation ${i + 1}/${pendingOperations.length}: ${op.tool}`);
        await excelService.executeToolRequest(op.tool, op.input);
      }
      
      actions.addLog('success', '[Diff Preview] All operations applied successfully');
      actions.endSession();
    } catch (error) {
      actions.addLog('error', `[Diff Preview] Error applying changes: ${(error as Error).message}`, { error: error as Error });
      actions.handleError(error as Error);
    }
  }, [actions, excelService]);

  const cancelPreview = useCallback(async () => {
    const { hunks, sessionId, pendingOperations } = useDiffSessionStore.getState();
    actions.addLog('info', `[Diff Preview] User clicked Cancel for session ${sessionId} with ${pendingOperations.length} pending operations`);
    
    // Clear highlights
    if (hunks && hunks.length > 0) {
      actions.addLog('info', `[Diff Preview] Clearing ${hunks.length} highlights`);
      await GridVisualizer.clearHighlights(hunks, actions.addLog);
    }
    
    actions.addLog('info', '[Diff Preview] Preview cancelled and session ended');
    actions.endSession();
  }, [actions]);

  return {
    status: state.status,
    hunks: state.hunks,
    error: state.error,
    retryCount: state.retryCount,
    pendingOperationsCount: state.pendingOperations.length,
    startPreviewSession,
    updatePreview,
    applyChanges,
    cancelPreview,
    retry: actions.retry,
  };
};

// Helper function
function extractTargetRange(operation: AISuggestedOperation): string | null {
  // Implementation from existing code
  return operation.input?.range || null;
}
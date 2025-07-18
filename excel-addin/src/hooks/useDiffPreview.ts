import { useCallback, useState } from 'react';
import { useDiffSessionStore } from '../store/useDiffSessionStore';
import { ExcelService, WorkbookSnapshot } from '../services/excel/ExcelService';
import { GridVisualizer } from '../services/diff/GridVisualizer';
import { AISuggestedOperation, ValidationError } from '../types/diff';
import { simulateOperation } from '../utils/diffSimulator';
import { getDiffCalculator } from '../utils/clientDiff';
import { useChatManager } from './useChatManager';

interface UseDiffPreviewReturn {
  // Simplified actions
  generatePreview: (messageId: string, operations: AISuggestedOperation[]) => Promise<void>;
  generateBatchedPreview: (messageId: string, operations: AISuggestedOperation[]) => void;
  acceptCurrentPreview: (sendResponse?: (requestId: string, result: any, error: string | null) => Promise<void>) => Promise<void>;
  rejectCurrentPreview: () => Promise<void>;
  
  // State
  activePreviewMessageId: string | null;
  isCalculating: boolean;
  validationErrors: ValidationError[];
}

export const useDiffPreview = (chatManager: ReturnType<typeof useChatManager>): UseDiffPreviewReturn => {
  const store = useDiffSessionStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const excelService = ExcelService.getInstance();

  // Helper to extract combined range from multiple operations
  const extractCombinedRange = useCallback((operations: AISuggestedOperation[]): string | undefined => {
    const ranges = operations
      .map(op => extractTargetRange([op]))
      .filter(Boolean) as string[];
    
    if (ranges.length === 0) return undefined;
    if (ranges.length === 1) return ranges[0];
    
    // TODO: Implement logic to combine multiple ranges into a single encompassing range
    // For now, just return the first range
    return ranges[0];
  }, []);

  // Optimized batched preview generation that doesn't block
  const generateBatchedPreview = useCallback(async (
    messageId: string, 
    operations: AISuggestedOperation[]
  ) => {
    // Don't block on preview generation
    requestAnimationFrame(async () => {
      try {
        setIsCalculating(true);
        setValidationErrors([]);
        
        // Check if this is a new session
        const isNewSession = !store.activePreview || store.activePreview.messageId !== messageId;
        
        if (isNewSession && store.activePreview) {
          // Auto-accept existing preview
          console.log('[Diff Preview] Auto-accepting existing preview for new message');
          for (const op of store.activePreview.operations) {
            await excelService.executeToolRequest(op.tool, op.input);
          }
          await GridVisualizer.clearHighlights(store.activePreview.hunks, undefined, true);
          chatManager.updateMessageDiff(store.activePreview.messageId, {
            operations: store.activePreview.operations,
            hunks: store.activePreview.hunks,
            status: 'accepted',
            timestamp: Date.now(),
          });
          store.clearPreview();
        }
        
        // Generate preview for all operations at once
        const snapshot = await excelService.createWorkbookSnapshot({
          rangeAddress: extractCombinedRange(operations) || 'UsedRange',
          includeFormulas: true,
          includeStyles: false,
          maxCells: 50000
        });
        
        if (!snapshot) {
          throw new Error('Failed to create workbook snapshot');
        }
        
        // Store original snapshot if new session
        if (isNewSession) {
          useDiffSessionStore.setState({ originalSnapshot: snapshot });
        }
        
        // Simulate all operations
        let simulatedSnapshot = snapshot;
        for (const op of operations) {
          simulatedSnapshot = await simulateOperation(simulatedSnapshot, op);
        }
        
        // Calculate and display diff
        const originalSnapshot = useDiffSessionStore.getState().originalSnapshot || snapshot;
        const diffCalculator = getDiffCalculator({
          maxDiffs: 10000,
          includeStyles: true,
          chunkSize: 1000
        });
        const hunks = diffCalculator.calculateDiff(originalSnapshot, simulatedSnapshot);
        
        // Two-phase preview approach
        // Phase 1: Apply visual highlights (colors, borders, italic)
        await GridVisualizer.clearHighlights();
        const isBatched = hunks.length > 100;
        if (isBatched) {
          await GridVisualizer.applyHighlightsBatched(hunks, 50);
        } else {
          await GridVisualizer.applyHighlights(hunks);
        }
        
        // Phase 2: Apply preview values in separate Excel context
        try {
          await GridVisualizer.applyPreviewValues(hunks);
          console.log('[Diff Preview] Preview values applied successfully');
        } catch (error) {
          console.error('[Diff Preview] Failed to apply preview values:', error);
          // Continue even if preview values fail - formatting is still useful
        }
        
        // Store preview
        store.setActivePreview(messageId, operations, hunks);
        
        // Persist to message history
        chatManager.updateMessageDiff(messageId, {
          operations,
          hunks,
          status: 'previewing',
          timestamp: Date.now(),
        });
        
      } catch (error) {
        console.error('[Diff Preview] Batch preview generation failed:', error);
        setValidationErrors([{ 
          message: error instanceof Error ? error.message : 'Failed to generate preview',
          severity: 'error' 
        }]);
        store.clearPreview();
      } finally {
        setIsCalculating(false);
      }
    });
  }, [store, excelService, chatManager, extractCombinedRange]);

  const generatePreview = useCallback(async (messageId: string, operations: AISuggestedOperation[]) => {
    try {
      setIsCalculating(true);
      setValidationErrors([]);

      let baseSnapshot: WorkbookSnapshot;
      let isNewPreviewSession = !store.activePreview || store.activePreview.messageId !== messageId;

      // --- START NEW LOGIC ---
      if (isNewPreviewSession) {
        // 1A. New message, so auto-accept any old preview.
        if (store.activePreview) {
          console.log('[Diff Preview] New message, auto-accepting existing preview');
          // Apply the existing preview operations to Excel
          for (const op of store.activePreview.operations) {
            await excelService.executeToolRequest(op.tool, op.input);
          }
          // Clear existing highlights (preserve values since we're accepting)
          await GridVisualizer.clearHighlights(store.activePreview.hunks, undefined, true);
          
          // Persist the accepted state to the message
          chatManager.updateMessageDiff(store.activePreview.messageId, {
            operations: store.activePreview.operations,
            hunks: store.activePreview.hunks,
            status: 'accepted',
            timestamp: Date.now(),
          });
          
          // Clear the active preview
          store.clearPreview();
        }
        
        // 1B. Take a single, fresh snapshot for this new session.
        console.log('[Diff Preview] Starting new preview session, creating initial snapshot.');
        const targetRange = extractTargetRange(operations);
        baseSnapshot = await excelService.createWorkbookSnapshot({
          rangeAddress: targetRange || 'UsedRange',
          includeFormulas: true,
          includeStyles: false,
          maxCells: 50000
        });
        
        if (!baseSnapshot) {
          throw new Error('Failed to create workbook snapshot');
        }
        
        useDiffSessionStore.setState({ originalSnapshot: baseSnapshot });

      } else {
        // 2. Same message, so continue the existing session.
        console.log('[Diff Preview] Continuing existing preview session.');
        // Use the original snapshot as our starting point.
        const tempSnapshot = store.originalSnapshot;
        if (!tempSnapshot) throw new Error('Snapshot missing in active session');
        baseSnapshot = tempSnapshot;
      }
      // --- END NEW LOGIC ---

      // 3. Simulate new operations on the appropriate base snapshot.
      let newSimulatedSnapshot = baseSnapshot;
      for (const operation of operations) {
        newSimulatedSnapshot = await simulateOperation(newSimulatedSnapshot, operation);
      }

      // 4. Calculate diff against the *original* snapshot of the session.
      const originalSnapshot = useDiffSessionStore.getState().originalSnapshot;
      if (!originalSnapshot) {
        throw new Error('Original snapshot missing');
      }
      
      const diffCalculator = getDiffCalculator({
        maxDiffs: 10000,
        includeStyles: true,
        chunkSize: 1000
      });
      const hunks = diffCalculator.calculateDiff(originalSnapshot, newSimulatedSnapshot);

      // 5. Two-phase preview approach
      // Phase 1: Apply visual highlights (clear old ones first).
      await GridVisualizer.clearHighlights();
      const isBatched = hunks.length > 100;
      if (isBatched) {
        await GridVisualizer.applyHighlightsBatched(hunks, 50);
      } else {
        await GridVisualizer.applyHighlights(hunks);
      }
      
      // Phase 2: Apply preview values in separate Excel context
      try {
        await GridVisualizer.applyPreviewValues(hunks);
        console.log('[Diff Preview] Preview values applied successfully during re-calculation');
      } catch (error) {
        console.error('[Diff Preview] Failed to apply preview values during re-calculation:', error);
        // Continue even if preview values fail
      }

      // 6. Set the new active preview, saving the latest simulated state.
      store.setActivePreview(messageId, operations, hunks);
      
      // Also persist to the message for history
      chatManager.updateMessageDiff(messageId, {
        operations,
        hunks,
        status: 'previewing',
        timestamp: Date.now(),
      });

    } catch (error) {
      console.error('[Diff Preview] Error generating preview:', error);
      setValidationErrors([{ 
        message: error instanceof Error ? error.message : 'Failed to generate preview',
        severity: 'error' 
      }]);
      store.clearPreview();
    } finally {
      setIsCalculating(false);
    }
  }, [store, excelService, chatManager]);

  const acceptCurrentPreview = useCallback(async (sendResponse?: (requestId: string, result: any, error: string | null) => Promise<void>) => {
    if (!store.activePreview || isAccepting) return;
    
    const { messageId, operations, hunks } = store.activePreview;
    
    // Set accepting flag to prevent duplicate executions
    setIsAccepting(true);

    try {
      // Execute all operations and collect results
      const results: Array<{ requestId: string; result: any; error: string | null }> = [];
      
      for (const op of operations) {
        try {
          console.log('[Diff Preview] Executing operation:', op.tool, 'with request_id:', op.input.request_id);
          const result = await excelService.executeToolRequest(op.tool, op.input);
          results.push({ 
            requestId: op.input.request_id, 
            result: result || { status: 'success', message: `${op.tool} executed successfully` }, 
            error: null 
          });
        } catch (error) {
          console.error('[Diff Preview] Operation failed:', op.tool, error);
          results.push({ 
            requestId: op.input.request_id, 
            result: null, 
            error: error instanceof Error ? error.message : 'Operation failed' 
          });
        }
      }

      // Send responses only if sendResponse callback is provided
      if (sendResponse) {
        console.log('[Diff Preview] Sending responses for', results.length, 'operations');
        for (const { requestId, result, error } of results) {
          console.log('[Diff Preview] Sending final response for requestId:', requestId, 'result:', result, 'error:', error);
          try {
            await sendResponse(requestId, result, error);
            console.log('[Diff Preview] Response sent successfully for requestId:', requestId);
          } catch (err) {
            console.error('[Diff Preview] Failed to send response for requestId:', requestId, err);
          }
        }
      }

      // Persist the final state to the message
      chatManager.updateMessageDiff(messageId, {
        operations,
        hunks,
        status: 'accepted',
        timestamp: Date.now(),
      });

      // Clear the live preview session
      store.clearPreview();
      await GridVisualizer.clearHighlights(hunks, undefined, true);

    } catch (error) {
      console.error('[Diff Preview] Error accepting preview:', error);
      setValidationErrors([{ 
        message: error instanceof Error ? error.message : 'Failed to accept preview',
        severity: 'error' 
      }]);
    } finally {
      // Reset accepting flag
      setIsAccepting(false);
    }
  }, [store, excelService, chatManager, isAccepting]);

  const rejectCurrentPreview = useCallback(async () => {
    if (!store.activePreview) return;
    const { messageId, operations, hunks } = store.activePreview;

    try {
      // Persist the final state to the message
      chatManager.updateMessageDiff(messageId, {
        operations,
        hunks,
        status: 'rejected',
        timestamp: Date.now(),
      });

      // Clear the live preview session
      store.clearPreview();
      await GridVisualizer.clearHighlights(hunks);

      // Note: In a real implementation, we might need to revert Excel to originalSnapshot
      // For now, we just clear the preview state

    } catch (error) {
      console.error('[Diff Preview] Error rejecting preview:', error);
      setValidationErrors([{ 
        message: error instanceof Error ? error.message : 'Failed to reject preview',
        severity: 'error' 
      }]);
    }
  }, [store, chatManager]);

  return {
    generatePreview,
    generateBatchedPreview,
    acceptCurrentPreview,
    rejectCurrentPreview,
    activePreviewMessageId: store.activePreview?.messageId || null,
    isCalculating,
    validationErrors
  };
};

// Helper function with smart range detection
function extractTargetRange(operations: AISuggestedOperation[]): string | null {
  const ranges: string[] = [];
  
  // Collect all ranges from operations
  for (const op of operations) {
    if (op.input?.range) {
      ranges.push(op.input.range);
    }
  }
  
  if (ranges.length === 0) {
    return null; // Will default to UsedRange
  }
  
  // If single range, add a small buffer around it
  if (ranges.length === 1) {
    const range = ranges[0];
    // Simple heuristic: if it's a specific cell or small range, 
    // expand it slightly to catch nearby dependencies
    if (range.match(/^[A-Z]+\d+$/)) {
      // Single cell like "A1", expand to include neighbors
      const match = range.match(/^([A-Z]+)(\d+)$/);
      if (match) {
        const col = match[1];
        const row = parseInt(match[2]);
        const prevCol = col === 'A' ? 'A' : String.fromCharCode(col.charCodeAt(0) - 1);
        const nextCol = String.fromCharCode(col.charCodeAt(0) + 1);
        return `${prevCol}${Math.max(1, row - 1)}:${nextCol}${row + 1}`;
      }
    }
    return range;
  }
  
  // Multiple ranges - for now, return null to use UsedRange
  // Future enhancement: calculate bounding box of all ranges
  return null;
}
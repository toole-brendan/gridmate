import { useCallback, useState } from 'react';
import { useDiffSessionStore } from '../store/useDiffSessionStore';
import { ExcelService } from '../services/excel/ExcelService';
import { GridVisualizer } from '../services/diff/GridVisualizer';
import { AISuggestedOperation, ValidationError } from '../types/diff';
import { simulateOperation } from '../utils/diffSimulator';
import { getDiffCalculator } from '../utils/clientDiff';

interface UseDiffPreviewReturn {
  // Simplified actions
  generatePreview: (messageId: string, operations: AISuggestedOperation[]) => Promise<void>;
  acceptCurrentPreview: () => Promise<void>;
  rejectCurrentPreview: () => Promise<void>;
  
  // State
  activePreviewMessageId: string | null;
  isCalculating: boolean;
  validationErrors: ValidationError[];
}

export const useDiffPreview = (): UseDiffPreviewReturn => {
  const store = useDiffSessionStore();
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const excelService = ExcelService.getInstance();

  const generatePreview = useCallback(async (messageId: string, operations: AISuggestedOperation[]) => {
    try {
      setIsCalculating(true);
      setValidationErrors([]);

      // 1. Auto-accept any existing preview
      if (store.activePreview) {
        console.log('[Diff Preview] Auto-accepting existing preview');
        // Apply the existing preview operations to Excel
        for (const op of store.activePreview.operations) {
          await excelService.executeToolRequest(op.tool, op.input);
        }
        // Clear existing highlights
        await GridVisualizer.clearHighlights(store.activePreview.hunks);
        // IMPORTANT: Update the state to clear the activePreview
        await store.acceptActivePreview();
      }

      // 2. Capture current workbook state as originalSnapshot
      const targetRange = extractTargetRange(operations);
      const snapshot = await excelService.createWorkbookSnapshot({ 
        rangeAddress: targetRange || 'A1:Z100',
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      });

      if (!snapshot) {
        throw new Error('Failed to create workbook snapshot');
      }

      // Store the original snapshot
      useDiffSessionStore.setState({ originalSnapshot: snapshot });

      // 3. Simulate new operations
      let currentSnapshot = snapshot;
      for (const operation of operations) {
        currentSnapshot = await simulateOperation(currentSnapshot, operation);
      }

      // 4. Calculate diff
      const diffCalculator = getDiffCalculator({
        maxDiffs: 10000,
        includeStyles: true,
        chunkSize: 1000
      });
      const hunks = diffCalculator.calculateDiff(snapshot, currentSnapshot);

      // 5. Apply visual highlights
      const isBatched = hunks.length > 100;
      if (isBatched) {
        await GridVisualizer.applyHighlightsBatched(hunks, 50);
      } else {
        await GridVisualizer.applyHighlights(hunks);
      }

      // 6. Set as active preview
      store.setActivePreview(messageId, operations, hunks);

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
  }, [store, excelService]);

  const acceptCurrentPreview = useCallback(async () => {
    if (!store.activePreview) return;

    try {
      await store.acceptActivePreview();

      // Apply the operations to Excel
      for (const op of store.activePreview.operations) {
        await excelService.executeToolRequest(op.tool, op.input);
      }

      // Clear highlights
      await GridVisualizer.clearHighlights(store.activePreview.hunks);

    } catch (error) {
      console.error('[Diff Preview] Error accepting preview:', error);
      setValidationErrors([{ 
        message: error instanceof Error ? error.message : 'Failed to accept preview',
        severity: 'error' 
      }]);
    }
  }, [store, excelService]);

  const rejectCurrentPreview = useCallback(async () => {
    if (!store.activePreview || !store.originalSnapshot) return;

    try {
      // Revert to original snapshot
      const hunks = store.activePreview.hunks;
      
      // Clear highlights first
      await GridVisualizer.clearHighlights(hunks);

      // Mark as rejected
      store.rejectActivePreview();

      // Note: In a real implementation, we might need to revert Excel to originalSnapshot
      // For now, we just clear the preview state

    } catch (error) {
      console.error('[Diff Preview] Error rejecting preview:', error);
      setValidationErrors([{ 
        message: error instanceof Error ? error.message : 'Failed to reject preview',
        severity: 'error' 
      }]);
    }
  }, [store]);

  return {
    generatePreview,
    acceptCurrentPreview,
    rejectCurrentPreview,
    activePreviewMessageId: store.activePreview?.messageId || null,
    isCalculating,
    validationErrors
  };
};

// Helper function
function extractTargetRange(operations: AISuggestedOperation[]): string | null {
  // Look for range in operations
  for (const op of operations) {
    if (op.input?.range) {
      return op.input.range;
    }
  }
  return null;
}
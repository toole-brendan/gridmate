import { useState, useCallback, useEffect } from 'react'
import { useDiffStore } from '../store/diffStore'
import { ExcelService, WorkbookSnapshot } from '../services/excel/ExcelService'
import { GridVisualizer } from '../services/diff/GridVisualizer'
import { AISuggestedOperation, DiffPayload, DiffMessage, DiffKind, CellKey } from '../types/diff'
import { SignalRClient } from '../services/signalr/SignalRClient'
import axios from 'axios'

import { log } from '../store/logStore'

// Helper function to parse Excel-style key into CellKey
function parseKey(key: string): CellKey {
  // Expected format: "Sheet1!A1" or "Sheet1!B10"
  const [sheet, cellRef] = key.split('!');
  if (!cellRef) {
    throw new Error(`Invalid cell key format: ${key}`);
  }
  
  // Parse column letters and row number
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cellRef}`);
  }
  
  const [, colLetters, rowStr] = match;
  
  // Convert column letters to number (A=0, B=1, Z=25, AA=26, etc.)
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 65 + 1);
  }
  col--; // Make it 0-based
  
  const row = parseInt(rowStr) - 1; // Convert to 0-based
  
  return { sheet, row, col };
}

interface UseDiffPreviewReturn {
  initiatePreview: (operations: AISuggestedOperation[]) => Promise<void>
  applyChanges: () => Promise<void>
  cancelPreview: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useDiffPreview(
  signalRClient: SignalRClient | null,
  workbookId: string
): UseDiffPreviewReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { 
    setPreview, 
    clearPreview, 
    setStatus, 
    setError: setStoreError,
    hunks,
    pendingOperations,
    status
  } = useDiffStore()

  // Listen for diff messages from SignalR
  useEffect(() => {
    if (!signalRClient) return

    const handleDiffMessage = (message: DiffMessage) => {
      log('visual-diff', `[📡 Diff Backend Call] Received diff message from SignalR.`, { message });
      if (message.workbookId === workbookId && pendingOperations) {
        log('visual-diff', `[🎨 Diff Apply] Setting ${message.hunks.length} diffs for rendering.`);
        // Update store with received diff
        setPreview(message.hunks, pendingOperations, workbookId)
        
        // Apply visual highlights
        log('visual-diff', `[🎨 Diff Apply] Applying visual highlights to grid...`);
        GridVisualizer.applyHighlights(message.hunks).catch(err => {
          log('visual-diff', `[❌ Diff Error] Failed to apply highlights:`, err)
          setError('Failed to visualize changes')
        })
      } else {
        log('visual-diff', `[📡 Diff Backend Call] Ignoring diff message (workbookId mismatch or no pending operations).`);
      }
    }

    // Subscribe to workbook diff messages
    signalRClient.on('workbookDiff', handleDiffMessage)

    return () => {
      signalRClient.off('workbookDiff', handleDiffMessage)
    }
  }, [signalRClient, workbookId, pendingOperations, setPreview])

  // Initiate diff preview
  const initiatePreview = useCallback(async (operations: AISuggestedOperation[]) => {
    // Log to visual-diff so it appears in the UI
    log('visual-diff', `[🔍 DEBUG] initiatePreview called with ${operations.length} operations`, { operations });
    log('visual-diff', `[🚀 Diff Start]`, { operations });
    setIsLoading(true);
    setError(null);
    setStatus('computing');

    try {
      log('visual-diff', `[🔍 DEBUG] Getting Excel service instance...`);
      const excelService = ExcelService.getInstance();
      
      log('visual-diff', `[🔍 DEBUG] Getting active context...`);
      const activeSheetName = (await excelService.getContext()).worksheet;
      log('visual-diff', `[🚀 Diff Start] Active sheet context acquired: ${activeSheetName}`);

      const before = await excelService.createWorkbookSnapshot({
        rangeAddress: 'UsedRange',
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      });
      log('visual-diff', `[🔬 Diff Simulate] "Before" snapshot created.`, { before: JSON.parse(JSON.stringify(before)) });

      const after = await simulateOperations(before, operations, activeSheetName);
      log('visual-diff', `[🔬 Diff Simulate] "After" snapshot created.`, { after: JSON.parse(JSON.stringify(after)) });

      const beforeCellCount = Object.keys(before).length;
      const afterCellCount = Object.keys(after).length;
      log('visual-diff', `[🔬 Diff Simulate] Snapshot cell counts: Before=${beforeCellCount}, After=${afterCellCount}`);

      if (JSON.stringify(before) === JSON.stringify(after)) {
        log('visual-diff', `[❌ Diff Error] Simulation resulted in no changes. "Before" and "After" snapshots are identical.`);
        setError("Simulation failed to produce any changes.");
        setIsLoading(false);
        setStatus('idle');
        return;
      }

      useDiffStore.setState({ pendingOperations: operations });
      log('visual-diff', `[📡 Diff Backend Call] Stored pending operations. Invoking 'GetVisualDiff' on backend.`);

      // TODO: Replace with actual backend call once SignalR method is implemented
      // For now, compute diff client-side
      log('visual-diff', `[📡 Diff Backend Call] Using client-side diff calculation (backend not yet implemented)`);
      
      let diffResult;
      try {
        // Generate diff hunks client-side
        diffResult = [];
        
        // Check for added/modified cells
        for (const [key, afterCell] of Object.entries(after)) {
          const beforeCell = before[key];
          if (!beforeCell) {
            // New cell
            diffResult.push({
              key: parseKey(key),
              kind: DiffKind.Added,
              after: afterCell
            });
          } else if (JSON.stringify(beforeCell) !== JSON.stringify(afterCell)) {
            // Modified cell
            const kind = beforeCell.f !== afterCell.f ? DiffKind.FormulaChanged : DiffKind.ValueChanged;
            diffResult.push({
              key: parseKey(key),
              kind,
              before: beforeCell,
              after: afterCell
            });
          }
        }
        
        // Check for deleted cells
        for (const [key, beforeCell] of Object.entries(before)) {
          if (!after[key]) {
            diffResult.push({
              key: parseKey(key),
              kind: DiffKind.Deleted,
              before: beforeCell
            });
          }
        }
        
        log('visual-diff', `[📡 Diff Backend Call] Client-side diff computed ${diffResult.length} changes`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log('visual-diff', `[❌ Diff Error] Failed to compute diff: ${errorMsg}`);
        throw new Error(`Diff calculation failed: ${errorMsg}`);
      }

      log('visual-diff', `[📡 Diff Backend Call] Received response from 'GetVisualDiff'.`, { diffResult });

      if (!diffResult || diffResult.length === 0) {
        log('visual-diff', `[❌ Diff Error] Backend returned no differences.`);
        setError("Backend analysis found no changes to preview.");
      } else {
        log('visual-diff', `[🎨 Diff Apply] Setting ${diffResult.length} diffs for rendering.`);
        setPreview(diffResult, operations, workbookId);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log('visual-diff', `[❌ Diff Error] An error occurred in initiatePreview: ${errorMessage}`, { error: err });
      setError(errorMessage);
    } finally {
      log('visual-diff', `[🚀 Diff End] Process finished.`);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [signalRClient, workbookId]);

  // Apply the previewed changes
  const applyChanges = useCallback(async () => {
    if (!pendingOperations || status !== 'previewing') {
      setError('No changes to apply')
      return
    }

    setIsLoading(true)
    setError(null)
    setStatus('applying')

    try {
      // Execute each operation
      for (const operation of pendingOperations) {
        await ExcelService.getInstance().executeToolRequest(
          operation.tool,
          operation.input
        )
      }

      // Clear highlights
      if (hunks) {
        await GridVisualizer.clearHighlights(hunks)
      }

      setStatus('applied')
      clearPreview()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to apply changes'
      setError(errorMessage)
      setStoreError(errorMessage)
      setStatus('previewing') // Stay in preview mode
    } finally {
      setIsLoading(false)
    }
  }, [pendingOperations, status, hunks, setStatus, clearPreview, setStoreError])

  // Cancel preview and clear highlights
  const cancelPreview = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Clear visual highlights
      if (hunks) {
        await GridVisualizer.clearHighlights(hunks)
      }
      
      clearPreview()
      setError(null)
    } catch (err) {
      log('visual-diff', 'Failed to clear highlights:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hunks, clearPreview])

  return {
    initiatePreview,
    applyChanges,
    cancelPreview,
    isLoading,
    error
  }
}

// Simulate operations on a workbook snapshot to create the "after" state
async function simulateOperations(
  before: WorkbookSnapshot,
  operations: AISuggestedOperation[],
  activeSheetName: string // Pass down active sheet context
): Promise<WorkbookSnapshot> {
  // Create a deep copy of the before state
  const after: WorkbookSnapshot = JSON.parse(JSON.stringify(before))
  
  for (const op of operations) {
    switch (op.tool) {
      case 'write_range':
        simulateWriteRange(after, op.input, activeSheetName)
        break
      case 'apply_formula':
        simulateApplyFormula(after, op.input, activeSheetName)
        break
      case 'clear_range':
        simulateClearRange(after, op.input, activeSheetName)
        break
      // Add more tools as needed
    }
  }
  
  return after
}

// Enhanced range parsing function
function parseRange(rangeStr: string, activeSheetName: string): { sheet: string, startRow: number, startCol: number, endRow?: number, endCol?: number } | null {
    let sheet = activeSheetName;
    let rangePart = rangeStr;

    // Handle sheet prefix (including quoted sheet names like 'Sheet Name'!A1)
    if (rangeStr.includes('!')) {
        const parts = rangeStr.split('!');
        sheet = parts[0].replace(/^'|'$/g, ''); // Remove surrounding quotes
        rangePart = parts[1];
    }

    // Enhanced regex to handle:
    // - Single cells: A1, $A$1
    // - Ranges: A1:B2, $A$1:$B$2
    // - Mixed references: $A1:B$2
    const match = rangePart.match(/^\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/);
    if (!match) return null;

    const startCol = columnToIndex(match[1]);
    const startRow = parseInt(match[2], 10) - 1;
    
    let result: any = { sheet, startRow, startCol };
    
    // If it's a range (has end cell)
    if (match[3] && match[4]) {
        result.endRow = parseInt(match[4], 10) - 1;
        result.endCol = columnToIndex(match[3]);
    }

    return result;
}

function simulateWriteRange(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
  const { range, values } = input
  if (!range || !values) return

  const parsedRange = parseRange(range, activeSheetName);
  if (!parsedRange) return;

  const { sheet, startRow, startCol } = parsedRange;
  
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const cellValue = values[i][j];
      // Skip empty values to avoid overwriting existing data with blanks
      if (cellValue === null || cellValue === undefined || cellValue === '') continue;

      const key = `${sheet}!${indexToColumn(startCol + j)}${startRow + i + 1}`
      
      // Ensure the cell snapshot exists
      if (!snapshot[key]) {
        snapshot[key] = {};
      }
      snapshot[key]!.v = cellValue;
    }
  }
}

function simulateApplyFormula(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
  const { range, formula } = input
  if (!range || !formula) return

  const parsedRange = parseRange(range, activeSheetName);
  if (!parsedRange) return;

  const { sheet, startRow, startCol, endRow, endCol } = parsedRange;
  
  // For single cell
  if (!endRow || !endCol) {
    const key = `${sheet}!${indexToColumn(startCol)}${startRow + 1}`;
    if (!snapshot[key]) {
      snapshot[key] = {};
    }
    snapshot[key]!.f = formula;
  } else {
    // For multi-cell ranges (array formulas)
    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const key = `${sheet}!${indexToColumn(col)}${row + 1}`;
        if (!snapshot[key]) {
          snapshot[key] = {};
        }
        // Excel array formulas are typically surrounded by {} in the UI
        // but stored without them in the formula property
        snapshot[key]!.f = formula;
      }
    }
  }
}

function simulateClearRange(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
  const { range } = input;
  if (!range) return;

  const parsedRange = parseRange(range, activeSheetName);
  if (!parsedRange) return;

  const { sheet, startRow, startCol, endRow, endCol } = parsedRange;
  
  // Determine the range bounds
  const rowStart = startRow;
  const rowEnd = endRow ?? startRow;
  const colStart = startCol;
  const colEnd = endCol ?? startCol;
  
  // Clear all cells in the range
  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      const key = `${sheet}!${indexToColumn(col)}${row + 1}`;
      delete snapshot[key];
    }
  }
}

// Helper functions for column conversion
function columnToIndex(col: string): number {
  let index = 0
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1)
  }
  return index - 1
}

function indexToColumn(index: number): string {
  let col = ''
  index++ // Convert to 1-based
  while (index > 0) {
    const remainder = (index - 1) % 26
    col = String.fromCharCode(remainder + 'A'.charCodeAt(0)) + col
    index = Math.floor((index - 1) / 26)
  }
  return col
}
import { AISuggestedOperation, WorkbookSnapshot, CellSnapshot } from '../types/diff';

/**
 * Simulates applying an operation to a workbook snapshot without actually modifying Excel
 * This creates a new snapshot representing the state after the operation
 */
export async function simulateOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<WorkbookSnapshot> {
  const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
  
  log('info', `[Simulator] Starting simulation for ${operation.tool}`, { 
    tool: operation.tool,
    input: operation.input 
  });
  
  // Create a deep copy of the snapshot to avoid mutations
  const newSnapshot: WorkbookSnapshot = JSON.parse(JSON.stringify(snapshot));
  const initialCellCount = Object.keys(snapshot).length;
  
  // Apply the operation based on its tool type
  switch (operation.tool) {
    case 'write_range':
    case 'write_cell':
      log('info', `[Simulator] Applying write operation to range: ${operation.input?.range}`);
      await simulateWriteOperation(newSnapshot, operation, log);
      break;
      
    case 'apply_formula':
      log('info', `[Simulator] Applying formula: ${operation.input?.formula} to range: ${operation.input?.range}`);
      await simulateFormulaOperation(newSnapshot, operation, log);
      break;
      
    case 'clear_range':
      log('info', `[Simulator] Clearing range: ${operation.input?.range}`);
      await simulateClearOperation(newSnapshot, operation, log);
      break;
      
    case 'format_range':
    case 'smart_format_cells':
      log('info', `[Simulator] Applying format to range: ${operation.input?.range}`);
      await simulateFormatOperation(newSnapshot, operation, log);
      break;
      
    default:
      log('warning', `[Simulator] Unknown operation type: ${operation.tool}`, { operation });
      console.warn(`[diffSimulator] Unknown operation type: ${operation.tool}`);
  }
  
  const finalCellCount = Object.keys(newSnapshot).length;
  const cellsModified = Math.abs(finalCellCount - initialCellCount);
  log('info', `[Simulator] Simulation complete. Cells modified: ${cellsModified}`, {
    initialCellCount,
    finalCellCount,
    operation: operation.tool
  });
  
  return newSnapshot;
}

async function simulateWriteOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range, values } = operation.input || {};
  if (!range || !values) {
    log('warning', '[Simulator] Write operation missing range or values', { input: operation.input });
    return;
  }
  
  // Convert range to cell keys and update values
  const cellKeys = rangeToCellKeys(range);
  log('info', `[Simulator] Writing to ${cellKeys.length} cells`);
  
  cellKeys.forEach((cellKey, index) => {
    const value = Array.isArray(values) ? values[index] : values;
    const key = cellKeyToString(cellKey);
    
    // Get existing cell or create new one
    const cell: CellSnapshot = snapshot[key] || {};
    cell.v = value;
    snapshot[key] = cell;
  });
}

async function simulateFormulaOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range, formula } = operation.input || {};
  if (!range || !formula) {
    log('warning', '[Simulator] Formula operation missing range or formula', { input: operation.input });
    return;
  }
  
  const cellKeys = rangeToCellKeys(range);
  log('info', `[Simulator] Applying formula to ${cellKeys.length} cells`);
  
  cellKeys.forEach(cellKey => {
    const key = cellKeyToString(cellKey);
    const cell: CellSnapshot = snapshot[key] || {};
    cell.f = formula;
    snapshot[key] = cell;
  });
}

async function simulateClearOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range } = operation.input || {};
  if (!range) {
    log('warning', '[Simulator] Clear operation missing range', { input: operation.input });
    return;
  }
  
  const cellKeys = rangeToCellKeys(range);
  log('info', `[Simulator] Clearing ${cellKeys.length} cells`);
  
  cellKeys.forEach(cellKey => {
    const key = cellKeyToString(cellKey);
    // Remove the cell from the snapshot
    delete snapshot[key];
  });
}

async function simulateFormatOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range, format } = operation.input || {};
  if (!range) {
    log('warning', '[Simulator] Format operation missing range', { input: operation.input });
    return;
  }
  
  const cellKeys = rangeToCellKeys(range);
  log('info', `[Simulator] Formatting ${cellKeys.length} cells`);
  
  cellKeys.forEach(cellKey => {
    const key = cellKeyToString(cellKey);
    const cell: CellSnapshot = snapshot[key] || {};
    // Store format as JSON string
    cell.s = JSON.stringify(format);
    snapshot[key] = cell;
  });
}

// Helper functions

interface CellKey {
  sheet: string;
  row: number;
  col: number;
}

function rangeToCellKeys(range: string): CellKey[] {
  // Parse the range (e.g., "Sheet1!A1:B2" or "A1:B2")
  let sheetName = 'Sheet1'; // Default sheet
  let cellRange = range;
  
  if (range.includes('!')) {
    [sheetName, cellRange] = range.split('!');
  }
  
  const cells: CellKey[] = [];
  
  if (cellRange.includes(':')) {
    // Range format: A1:B2
    const [start, end] = cellRange.split(':');
    const startCell = parseCell(start);
    const endCell = parseCell(end);
    
    for (let row = startCell.row; row <= endCell.row; row++) {
      for (let col = startCell.col; col <= endCell.col; col++) {
        cells.push({ sheet: sheetName, row, col });
      }
    }
  } else {
    // Single cell: A1
    const { row, col } = parseCell(cellRange);
    cells.push({ sheet: sheetName, row, col });
  }
  
  return cells;
}

function parseCell(cellRef: string): { row: number; col: number } {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cellRef}`);
  }
  
  const colStr = match[1];
  const rowStr = match[2];
  
  // Convert column letter(s) to number (A=1, B=2, ..., Z=26, AA=27, etc.)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  
  return { row: parseInt(rowStr, 10), col };
}

function cellKeyToString(cellKey: CellKey): string {
  // Convert to the format used in WorkbookSnapshot keys
  // The exact format might vary, but commonly it's "SheetName!RowCol"
  return `${cellKey.sheet}!${cellKey.row}:${cellKey.col}`;
} 
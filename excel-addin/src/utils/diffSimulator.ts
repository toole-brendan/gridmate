import { AISuggestedOperation, WorkbookSnapshot, CellSnapshot, CellKey } from '../types/diff';
import { cellKeyToA1 } from './cellUtils';

// Track applied operations to prevent duplicates
const appliedOperations = new Set<string>();

/**
 * Clear the applied operations tracking (call this when starting a new message/session)
 */
export function clearAppliedOperations(): void {
  appliedOperations.clear();
}

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
  
  // Validate operation structure
  if (!operation.tool || !operation.input) {
    log('error', '[Simulator] Invalid operation: missing tool or input', { operation });
    throw new Error('Invalid operation structure');
  }
  
  // Check for duplicate operations
  const operationKey = `${operation.tool}_${operation.input.range || ''}_${JSON.stringify(operation.input.values || operation.input.formula || '')}`;
  if (appliedOperations.has(operationKey)) {
    log('warning', '[Simulator] Skipping duplicate operation', { operationKey });
    return snapshot;
  }
  
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
      
    case 'apply_layout':
      log('info', `[Simulator] Applying layout operation to range: ${operation.input?.range}`);
      await simulateLayoutOperation(newSnapshot, operation, log);
      break;
      
    default:
      log('warning', `[Simulator] Unknown operation type: ${operation.tool}`, { operation });
      console.warn(`[diffSimulator] Unknown operation type: ${operation.tool}`);
  }
  
  // Mark operation as applied after successful simulation
  appliedOperations.add(operationKey);
  
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
  
  // Check if values is a 2D array (for write_range operations)
  if (Array.isArray(values) && Array.isArray(values[0])) {
    // Handle 2D array: values[row][col]
    let cellIndex = 0;
    const numRows = values.length;
    const numCols = values[0].length;
    
    // Parse range to get dimensions
    const rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (rangeMatch) {
      // const startCol = parseCell(rangeMatch[1] + rangeMatch[2]).col;
      // const startRow = parseInt(rangeMatch[2], 10) - 1;
      
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          if (cellIndex < cellKeys.length) {
            const cellKey = cellKeys[cellIndex];
            const key = cellKeyToString(cellKey);
            const cell: CellSnapshot = snapshot[key] || {};
            cell.v = values[row][col];
            snapshot[key] = cell;
            cellIndex++;
          }
        }
      }
    } else {
      // Single cell range with 2D array - use first value
      const key = cellKeyToString(cellKeys[0]);
      const cell: CellSnapshot = snapshot[key] || {};
      cell.v = values[0][0];
      snapshot[key] = cell;
    }
  } else if (Array.isArray(values)) {
    // Handle 1D array (legacy or simple case)
    cellKeys.forEach((cellKey, index) => {
      if (index < values.length) {
        const key = cellKeyToString(cellKey);
        const cell: CellSnapshot = snapshot[key] || {};
        cell.v = values[index];
        snapshot[key] = cell;
      }
    });
  } else {
    // Handle single value for all cells
    cellKeys.forEach(cellKey => {
      const key = cellKeyToString(cellKey);
      const cell: CellSnapshot = snapshot[key] || {};
      cell.v = values;
      snapshot[key] = cell;
    });
  }
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

async function simulateLayoutOperation(
  snapshot: WorkbookSnapshot,
  operation: AISuggestedOperation,
  log: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void
): Promise<void> {
  const { range, merge, preserve_content = true } = operation.input || {};
  if (!range) {
    log('warning', '[Simulator] Layout operation missing range', { input: operation.input });
    return;
  }
  
  const cellKeys = rangeToCellKeys(range);
  
  if (merge === 'all' || merge === 'across') {
    // For merge operations, we need to simulate the merge behavior
    // In a merge, only the top-left cell retains its value
    const anchorCell = cellKeys[0]; // First cell is the anchor
    const anchorKey = cellKeyToString(anchorCell);
    const anchorSnapshot = snapshot[anchorKey];
    
    // Get the active sheet from the first cell
    const sheetName = anchorCell.sheet;
    
    // Clear all cells except the anchor
    for (let i = 1; i < cellKeys.length; i++) {
      const cellKey = cellKeyToString(cellKeys[i]);
      if (snapshot[cellKey]) {
        // Mark cell as part of merged area (for diff visualization)
        snapshot[cellKey] = {
          ...snapshot[cellKey],
          isMerged: true,
          mergeAnchor: `${sheetName}!${colNumberToLetter(anchorCell.col)}${anchorCell.row + 1}`
        };
        
        // Clear value if not preserving content
        if (!preserve_content) {
          delete snapshot[cellKey].v;
          delete snapshot[cellKey].f;
        }
      }
    }
    
    // Mark anchor cell as merged
    if (anchorSnapshot) {
      snapshot[anchorKey] = {
        ...anchorSnapshot,
        isMerged: true,
        mergeArea: range
      };
    }
    
    log('info', `[Simulator] Simulated merge for range ${range} (${cellKeys.length} cells)`);
  } else if (merge === 'unmerge') {
    // For unmerge, restore individual cell states
    for (const cellKey of cellKeys) {
      const key = cellKeyToString(cellKey);
      if (snapshot[key] && snapshot[key].isMerged) {
        // Remove merge metadata
        delete snapshot[key].isMerged;
        delete snapshot[key].mergeAnchor;
        delete snapshot[key].mergeArea;
      }
    }
    
    log('info', `[Simulator] Simulated unmerge for range ${range}`);
  }
}

// Helper functions

function colNumberToLetter(col: number): string {
  let letter = '';
  let colNum = col + 1; // Convert to 1-based
  while (colNum > 0) {
    const remainder = (colNum - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colNum = Math.floor((colNum - 1) / 26);
  }
  return letter;
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
  
  // Convert column letter(s) to number (0-based: A=0, B=1, ..., Z=25, AA=26, etc.)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0));
  }
  
  return { row: parseInt(rowStr, 10) - 1, col }; // Return 0-indexed
}

function cellKeyToString(cellKey: CellKey): string {
  return cellKeyToA1(cellKey);
} 
// excel-addin/src/utils/cellUtils.ts

import { CellKey } from "../types/diff";

/**
 * Converts a 0-indexed column number to its A1 letter representation.
 * e.g., 0 -> A, 1 -> B, 26 -> AA
 */
export const colToLetter = (col: number): string => {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

/**
 * Converts a CellKey object to an A1-style string reference.
 * e.g., { sheet: 'Sheet1', row: 0, col: 0 } -> 'Sheet1!A1'
 */
export const cellKeyToA1 = (cellKey: CellKey): string => {
  const rowA1 = cellKey.row + 1; // Convert 0-indexed row to 1-indexed
  const colA1 = colToLetter(cellKey.col);
  return `${cellKey.sheet}!${colA1}${rowA1}`;
};

/**
 * Parses an A1-style cell reference back to sheet, row, and col.
 * e.g., 'Sheet1!A1' -> { sheet: 'Sheet1', row: 0, col: 0 }
 */
export const parseA1Reference = (cellRef: string): CellKey => {
  const [sheetName, cellAddress] = cellRef.split('!');
  const match = cellAddress.match(/^([A-Z]+)(\d+)$/);
  
  if (!match) {
    throw new Error(`Invalid cell reference: ${cellRef}`);
  }
  
  const colStr = match[1];
  const rowStr = match[2];
  
  // Convert column letters to 0-based index
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0));
  }
  
  return {
    sheet: sheetName,
    row: parseInt(rowStr, 10) - 1, // Convert to 0-based index
    col: col
  };
}; 
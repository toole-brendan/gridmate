declare const Excel: any
import { cellKeyToA1, parseA1Reference } from '../../utils/cellUtils'

export enum DiffKind {
  Added = 'Added',
  Deleted = 'Deleted',
  ValueChanged = 'ValueChanged',
  FormulaChanged = 'FormulaChanged',
  StyleChanged = 'StyleChanged'
}

export interface CellKey {
  sheet: string
  row: number
  col: number
}

export interface DiffHunk {
  key: CellKey
  kind: DiffKind
  before?: any
  after?: any
}

// Store complete cell state for restoration
interface CellState {
  fillColor: string
  fontColor: string
  fontItalic: boolean
  fontStrikethrough: boolean
  numberFormat: string
  borders: {
    top: { style: string; color: string }
    bottom: { style: string; color: string }
    left: { style: string; color: string }
    right: { style: string; color: string }
  }
  value: any
  formula: string
  isMerged?: boolean
  mergeArea?: string // e.g., "A1:E1"
  mergeAnchor?: string // Top-left cell of merge area (e.g., "A1")
  originalMergeState?: 'merged' | 'unmerged' | 'partial'
}

export class GridVisualizer {
  // Enhanced color scheme for different diff types
  private static readonly COLORS = {
    [DiffKind.Added]: '#C6EFCE',        // Light Green
    [DiffKind.Deleted]: '#FFC7CE',      // Light Red
    [DiffKind.ValueChanged]: '#FFEB9C', // Light Yellow
    [DiffKind.FormulaChanged]: '#B8CCE4', // Light Blue
    [DiffKind.StyleChanged]: '#E4DFEC'  // Light Purple
  }


  // Track original cell state for complete restoration
  private static originalStates = new Map<string, CellState>()
  // Track preview state
  private static previewActive = false

  /**
   * Apply visual highlights to cells based on diff hunks with enhanced visualization
   */
  static async applyHighlights(hunks: DiffHunk[], addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    if (!hunks || hunks.length === 0) {
      log('info', '[Visualizer] No hunks to highlight')
      return
    }

    log('info', `[Visualizer] Applying highlights to ${hunks.length} cells`)
    const startTime = performance.now()

    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      this.previewActive = true
      
      // Group hunks by sheet for efficiency
      const hunksBySheet = this.groupHunksBySheet(hunks)
      
      // Batch operations: collect all ranges first
      const rangeOperations: Array<{
        range: any
        hunk: DiffHunk
        cellKey: string
        borders?: {
          top: any
          bottom: any
          left: any
          right: any
        }
      }> = []
      
      for (const [sheetName, sheetHunks] of hunksBySheet) {
        try {
          const worksheet = workbook.worksheets.getItem(sheetName)
          
          for (const hunk of sheetHunks) {
            // Get the specific cell range
            const range = worksheet.getCell(hunk.key.row, hunk.key.col);
            
            const cellKey = cellKeyToA1(hunk.key)
            
            // Load all properties we might need in one batch
            if (!this.originalStates.has(cellKey)) {
              // Load primary properties
              range.load([
                'format/fill/color',
                'format/font/color',
                'format/font/italic',
                'format/font/strikethrough',
                'numberFormat',
                'values',
                'formulas'
              ])
              
              // Create and store border proxy objects
              const borders = {
                top: range.format.borders.getItem('EdgeTop'),
                bottom: range.format.borders.getItem('EdgeBottom'),
                left: range.format.borders.getItem('EdgeLeft'),
                right: range.format.borders.getItem('EdgeRight')
              }
              
              // Load properties on these stored proxy objects
              borders.top.load(['style', 'color'])
              borders.bottom.load(['style', 'color'])
              borders.left.load(['style', 'color'])
              borders.right.load(['style', 'color'])
              
              rangeOperations.push({ range, hunk, cellKey, borders })
            } else {
              rangeOperations.push({ range, hunk, cellKey })
            }
          }
        } catch (error) {
          console.error(`Error preparing cells in sheet ${sheetName}:`, error)
        }
      }
      
      // Single sync for all property loading
      await context.sync()
      
      // Now apply all formatting in batch
      for (const { range, hunk, cellKey, borders } of rangeOperations) {
        try {
          // Store original state if not already stored
          if (!this.originalStates.has(cellKey) && borders) {
            const fillColor = range.format.fill.color
            const fontColor = range.format.font.color
            const fontItalic = range.format.font.italic
            const fontStrikethrough = range.format.font.strikethrough
            const numberFormat = range.numberFormat
            const value = range.values[0][0]
            const formula = range.formulas[0][0]
            
            // Enhanced merge detection
            const mergedAreas = range.getMergedAreasOrNullObject();
            mergedAreas.load(['areaCount', 'areas']);
            await context.sync();

            let isMerged = false;
            let mergeArea = null;
            let mergeAnchor = null;
            let originalMergeState: 'merged' | 'unmerged' | 'partial' = 'unmerged';

            if (!mergedAreas.isNullObject && mergedAreas.areaCount > 0) {
              // Load all merge areas
              for (let i = 0; i < mergedAreas.areas.items.length; i++) {
                const area = mergedAreas.areas.items[i];
                area.load(['address', 'rowIndex', 'columnIndex']);
              }
              await context.sync();
              
              // Check if this specific cell is in a merge area
              for (let i = 0; i < mergedAreas.areas.items.length; i++) {
                const area = mergedAreas.areas.items[i];
                const areaAddress = area.address;
                
                // Parse addresses to check if current cell is within this merge area
                const [areaStart, areaEnd] = areaAddress.split(':');
                if (this.cellIsWithinRange(cellKey, areaStart, areaEnd)) {
                  isMerged = true;
                  mergeArea = areaAddress;
                  mergeAnchor = areaStart;
                  originalMergeState = 'merged';
                  break;
                }
              }
              
              // Check if this is a partial merge situation
              if (mergedAreas.areaCount > 1 || (mergedAreas.areaCount === 1 && !isMerged)) {
                originalMergeState = 'partial';
              }
            }
            
            const originalState: CellState = {
              fillColor,
              fontColor,
              fontItalic,
              fontStrikethrough,
              numberFormat,
              borders: {
                top: { 
                  style: borders.top.style,
                  color: borders.top.color
                },
                bottom: { 
                  style: borders.bottom.style,
                  color: borders.bottom.color
                },
                left: { 
                  style: borders.left.style,
                  color: borders.left.color
                },
                right: { 
                  style: borders.right.style,
                  color: borders.right.color
                }
              },
              value,
              formula,
              isMerged,
              mergeArea,
              mergeAnchor,
              originalMergeState
            }
            
            this.originalStates.set(cellKey, originalState)
          }
          
          // Apply enhanced visualization based on diff type
          
          switch (hunk.kind) {
            case DiffKind.Added:
              // Light green background
              range.format.fill.color = this.COLORS[DiffKind.Added]
              // Italic font for new values
              range.format.font.italic = true
              // If we have the new value, show it with indicator
              if (hunk.after) {
                // Add green border to indicate addition
                range.format.borders.getItem('EdgeRight').style = 'Continuous'
                range.format.borders.getItem('EdgeRight').color = '#00B050'
              }
              break
              
            case DiffKind.Deleted:
              // Light red background
              range.format.fill.color = this.COLORS[DiffKind.Deleted]
              // Strikethrough for deleted content
              range.format.font.strikethrough = true
              // Red borders
              range.format.borders.getItem('EdgeTop').style = 'Continuous'
              range.format.borders.getItem('EdgeTop').color = '#FF0000'
              range.format.borders.getItem('EdgeBottom').style = 'Continuous'
              range.format.borders.getItem('EdgeBottom').color = '#FF0000'
              range.format.borders.getItem('EdgeLeft').style = 'Continuous'
              range.format.borders.getItem('EdgeLeft').color = '#FF0000'
              range.format.borders.getItem('EdgeRight').style = 'Continuous'
              range.format.borders.getItem('EdgeRight').color = '#FF0000'
              break
              
            case DiffKind.ValueChanged:
              // Light yellow background
              range.format.fill.color = this.COLORS[DiffKind.ValueChanged]
              // Italic font for preview values
              range.format.font.italic = true
              // Show new value (old value is shown with strikethrough ideally)
              if (hunk.after && hunk.after.v !== undefined) {
                // Note: We can't show both old and new in the same cell
                // but we highlight the change clearly
                range.format.borders.getItem('EdgeLeft').style = 'Continuous'
                range.format.borders.getItem('EdgeLeft').color = '#FFC000'
              }
              break
              
            case DiffKind.FormulaChanged:
              // Light blue background
              range.format.fill.color = this.COLORS[DiffKind.FormulaChanged]
              // Italic font for preview formulas
              range.format.font.italic = true
              // Blue border to indicate formula change
              range.format.borders.getItem('EdgeTop').style = 'Double'
              range.format.borders.getItem('EdgeTop').color = '#0070C0'
              range.format.borders.getItem('EdgeBottom').style = 'Double'
              range.format.borders.getItem('EdgeBottom').color = '#0070C0'
              break
              
            case DiffKind.StyleChanged:
              // Light purple background
              range.format.fill.color = this.COLORS[DiffKind.StyleChanged]
              // Italic font for preview
              range.format.font.italic = true
              // Purple dotted border for style changes
              range.format.borders.getItem('EdgeTop').style = 'Dot'
              range.format.borders.getItem('EdgeTop').color = '#7030A0'
              range.format.borders.getItem('EdgeBottom').style = 'Dot'
              range.format.borders.getItem('EdgeBottom').color = '#7030A0'
              range.format.borders.getItem('EdgeLeft').style = 'Dot'
              range.format.borders.getItem('EdgeLeft').color = '#7030A0'
              range.format.borders.getItem('EdgeRight').style = 'Dot'
              range.format.borders.getItem('EdgeRight').color = '#7030A0'
              break
          }
        } catch (error) {
          console.error(`Error highlighting cell ${cellKey}:`, error)
        }
      }
      
      // Single final sync for all formatting changes
      await context.sync()
      
      const endTime = performance.now()
      log('success', `[Visualizer] Highlights applied successfully in ${Math.round(endTime - startTime)}ms`)
    }).catch((error: any) => {
      log('error', `[Visualizer] Error applying highlights: ${error.message}`, { error })
      throw error
    })
  }

  /**
   * Apply highlights in batches for better performance with large operations
   */
  static async applyHighlightsBatched(hunks: DiffHunk[], batchSize: number = 50, addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    log('info', `[Visualizer] Starting batched highlight application for ${hunks.length} hunks (batch size: ${batchSize})`)
    const startTime = performance.now()
    
    const batches: DiffHunk[][] = [];
    for (let i = 0; i < hunks.length; i += batchSize) {
      batches.push(hunks.slice(i, i + batchSize));
    }
    
    log('info', `[Visualizer] Processing ${batches.length} batches`)
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      log('info', `[Visualizer] Processing batch ${i + 1}/${batches.length} (${batch.length} hunks)`)
      await this.applyHighlights(batch, addLog);
      // Small delay between batches to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const endTime = performance.now()
    log('success', `[Visualizer] Batched highlighting completed in ${Math.round(endTime - startTime)}ms`)
  }

  /**
   * Apply status overlay to previously highlighted cells
   */
  static async applyStatusOverlay(hunks: DiffHunk[], status: 'accepted' | 'rejected', addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    if (!hunks || hunks.length === 0) return;
    
    log('info', `[Visualizer] Applying ${status} status overlay to ${hunks.length} cells`);
    
    return Excel.run(async (context: any) => {
      const workbook = context.workbook;
      const hunksBySheet = this.groupHunksBySheet(hunks);
      
      for (const [sheetName, sheetHunks] of hunksBySheet) {
        try {
          const worksheet = workbook.worksheets.getItem(sheetName);
          
          for (const hunk of sheetHunks) {
            const range = worksheet.getCell(hunk.key.row, hunk.key.col);
            
            if (status === 'accepted') {
              // Add subtle green checkmark indicator on the right edge
              range.format.borders.getItem('EdgeRight').style = 'Continuous';
              range.format.borders.getItem('EdgeRight').color = '#00B050';
              range.format.borders.getItem('EdgeRight').weight = 'Thick';
            } else if (status === 'rejected') {
              // Add subtle red X indicator on the left edge
              range.format.borders.getItem('EdgeLeft').style = 'Continuous';
              range.format.borders.getItem('EdgeLeft').color = '#FF0000';
              range.format.borders.getItem('EdgeLeft').weight = 'Thick';
            }
          }
        } catch (error) {
          log('error', `[Visualizer] Error applying status overlay to sheet ${sheetName}:`, error);
        }
      }
      
      await context.sync();
      log('success', `[Visualizer] Status overlay applied successfully`);
    }).catch((error: any) => {
      log('error', `[Visualizer] Error applying status overlay: ${error.message}`, { error });
      throw error;
    });
  }

  /**
   * Begin a preview session
   */
  static beginPreview(): void {
    this.previewActive = true
    console.log('[GridVisualizer] Beginning preview session')
  }

  /**
   * End a preview session and clean up
   */
  static async endPreview(): Promise<void> {
    this.previewActive = false
    await this.clearHighlights()
    console.log('[GridVisualizer] Ended preview session')
  }

  /**
   * Check if a preview is currently active
   */
  static isPreviewActive(): boolean {
    return this.previewActive
  }

  /**
   * Clear visual highlights from cells with full restoration
   * @param hunks - Optional specific hunks to clear
   * @param addLog - Optional logging function
   * @param preserveValues - If true, only clear formatting but preserve cell values (used when accepting changes)
   */
  static async clearHighlights(hunks?: DiffHunk[], addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void, preserveValues: boolean = false): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    const hunkCount = hunks?.length || this.originalStates.size
    log('info', `[Visualizer] Clearing ${hunkCount} highlights`)
    
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      this.previewActive = false
      
      if (hunks && hunks.length > 0) {
        // Clear specific hunks
        const hunksBySheet = this.groupHunksBySheet(hunks)
        
        for (const [sheetName, sheetHunks] of hunksBySheet) {
          try {
            const worksheet = workbook.worksheets.getItem(sheetName)
            
            for (const hunk of sheetHunks) {
              const cellKey = cellKeyToA1(hunk.key)
              const originalState = this.originalStates.get(cellKey)
              
              const range = worksheet.getCell(
                hunk.key.row,
                hunk.key.col
              );
              
              if (originalState) {
                // Selective clearing - only clear preview-specific formatting
                
                // Clear preview background color
                if (originalState.fillColor === null) {
                  range.format.fill.clear()
                } else {
                  range.format.fill.color = originalState.fillColor
                }
                
                // Restore original font properties
                if (originalState.fontColor !== null) {
                  range.format.font.color = originalState.fontColor
                }
                range.format.font.italic = originalState.fontItalic
                range.format.font.strikethrough = originalState.fontStrikethrough
                
                // IMPORTANT: Don't touch number format - keep it as is
                // This prevents the destructive clearing that causes values to disappear
                
                // Restore original values and formulas only if not preserving values
                if (!preserveValues) {
                  // REJECTION case: restore original values
                  if (originalState.formula) {
                    range.formulas = [[originalState.formula]]
                  } else if (originalState.value !== null && originalState.value !== undefined) {
                    range.values = [[originalState.value]]
                  }
                  log('info', `[Visualizer] Restored original value for cell ${cellKey}`)
                } else {
                  // ACCEPTANCE case: keep the new values
                  log('info', `[Visualizer] Preserving new value for cell ${cellKey}`)
                }
                
                // Handle merge restoration
                if (originalState.originalMergeState && !preserveValues) {
                  // Handle different merge restoration scenarios
                  if (originalState.originalMergeState === 'merged') {
                    // Cell was originally part of a merged range
                    if (!originalState.isMerged) {
                      // Cell is no longer merged - need to restore merge
                      try {
                        const mergeRange = worksheet.getRange(originalState.mergeArea);
                        mergeRange.merge(false); // Merge without across option
                        await context.sync();
                        log('info', `[Visualizer] Restored merge for area ${originalState.mergeArea}`);
                      } catch (e) {
                        log('warning', `[Visualizer] Could not restore merge for ${originalState.mergeArea}:`, e);
                      }
                    }
                  } else if (originalState.originalMergeState === 'unmerged') {
                    // Cell was originally not merged
                    if (originalState.isMerged) {
                      // Cell is now merged - need to unmerge
                      try {
                        range.unmerge();
                        await context.sync();
                        log('info', `[Visualizer] Unmerged cell ${cellKey} to restore original state`);
                      } catch (e) {
                        log('warning', `[Visualizer] Could not unmerge cell ${cellKey}:`, e);
                      }
                    }
                  }
                }
                
                // Enhanced value restoration for merged cells
                if (!preserveValues && originalState.mergeArea) {
                  // For merged cells, only restore value to the anchor cell
                  if (cellKey === originalState.mergeAnchor || cellKey === originalState.mergeArea.split(':')[0]) {
                    if (originalState.formula) {
                      range.formulas = [[originalState.formula]];
                    } else if (originalState.value !== null && originalState.value !== undefined) {
                      range.values = [[originalState.value]];
                    }
                  }
                  // Other cells in the merge area should be cleared
                  else if (this.cellIsWithinRange(cellKey, originalState.mergeArea.split(':')[0], originalState.mergeArea.split(':')[1])) {
                    range.clear(Excel.ClearApplyTo.contents);
                  }
                }
                
                // Restore original borders
                const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
                for (const border of borders) {
                  const borderKey = border.replace('Edge', '').toLowerCase() as keyof CellState['borders']
                  const borderObj = range.format.borders.getItem(border)
                  borderObj.style = originalState.borders[borderKey].style || 'None'
                  if (originalState.borders[borderKey].color && originalState.borders[borderKey].color !== null) {
                    borderObj.color = originalState.borders[borderKey].color
                  }
                }
                
                this.originalStates.delete(cellKey)
              } else {
                // No original state - just clear preview formatting
                range.format.fill.clear()
                range.format.font.italic = false
                // Don't change font color or other properties that weren't part of preview
                
                // Clear preview borders
                const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
                for (const border of borders) {
                  range.format.borders.getItem(border).style = 'None'
                }
                
                log('info', `[Visualizer] No original state for ${cellKey}, cleared preview formatting only`)
              }
            }
          } catch (error) {
            console.error(`Error clearing highlights in sheet ${sheetName}:`, error)
          }
        }
      } else {
        // Clear all stored highlights
        for (const [cellKey, originalState] of this.originalStates) {
          const parsedKey = parseA1Reference(cellKey)
          const { sheet: sheetName, row, col } = parsedKey
          
          try {
            const worksheet = workbook.worksheets.getItem(sheetName)
            const range = worksheet.getCell(row, col);
            
            // Selective clearing - only clear preview-specific formatting
            
            // Clear preview background color
            if (originalState.fillColor === null) {
              range.format.fill.clear()
            } else {
              range.format.fill.color = originalState.fillColor
            }
            
            // Restore original font properties
            if (originalState.fontColor !== null) {
              range.format.font.color = originalState.fontColor
            }
            range.format.font.italic = originalState.fontItalic
            range.format.font.strikethrough = originalState.fontStrikethrough
            
            // IMPORTANT: Don't touch number format - keep it as is
            
            // Restore original values and formulas only if not preserving values
            if (!preserveValues) {
              // REJECTION case: restore original values
              if (originalState.formula) {
                range.formulas = [[originalState.formula]]
              } else if (originalState.value !== null && originalState.value !== undefined) {
                range.values = [[originalState.value]]
              }
              console.log(`[Visualizer] Restored original value for cell ${cellKey}`)
            } else {
              // ACCEPTANCE case: keep the new values
              console.log(`[Visualizer] Preserving new value for cell ${cellKey}`)
            }
            
            // Restore all borders
            const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
            for (const border of borders) {
              const borderKey = border.replace('Edge', '').toLowerCase() as keyof CellState['borders']
              const borderObj = range.format.borders.getItem(border)
              borderObj.style = originalState.borders[borderKey].style || 'None'
              if (originalState.borders[borderKey].color && originalState.borders[borderKey].color !== null) {
                borderObj.color = originalState.borders[borderKey].color
              }
            }
          } catch (error) {
            console.error(`Error restoring format for ${cellKey}:`, error)
          }
        }
        
        this.originalStates.clear()
      }
      
      await context.sync()
      
      log('success', `[Visualizer] Highlights cleared successfully`)
    }).catch((error: any) => {
      log('error', `[Visualizer] Error clearing highlights: ${error.message}`, { error })
      throw error
    })
  }

  /**
   * Helper function to check if a cell is within a range
   */
  private static cellIsWithinRange(cellKey: string, rangeStart: string, rangeEnd: string): boolean {
    try {
      // Parse cell addresses
      const cell = parseA1Reference(cellKey);
      const start = parseA1Reference(rangeStart);
      const end = parseA1Reference(rangeEnd);
      
      if (!cell || !start || !end) return false;
      
      // Check if cell is within the range boundaries
      return cell.row >= start.row && cell.row <= end.row &&
             cell.col >= start.col && cell.col <= end.col;
    } catch {
      return false;
    }
  }

  /**
   * Group hunks by sheet name for efficient processing
   */
  private static groupHunksBySheet(hunks: DiffHunk[]): Map<string, DiffHunk[]> {
    const grouped = new Map<string, DiffHunk[]>()
    
    for (const hunk of hunks) {
      const sheet = hunk.key.sheet
      if (!grouped.has(sheet)) {
        grouped.set(sheet, [])
      }
      grouped.get(sheet)!.push(hunk)
    }
    
    return grouped
  }

  /**
   * Apply preview values to cells (Phase 2 of preview)
   * This is separate from applyHighlights to avoid Excel internal errors
   */
  static async applyPreviewValues(hunks: DiffHunk[], addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    if (!hunks || hunks.length === 0) {
      log('info', '[Visualizer] No preview values to apply')
      return
    }

    log('info', `[Visualizer] Applying preview values to ${hunks.length} cells`)
    const startTime = performance.now()

    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      
      // Group hunks by sheet for efficiency
      const hunksBySheet = this.groupHunksBySheet(hunks)
      
      // Batch all operations for efficiency
      const rangeOperations: Array<{
        range: any
        hunk: DiffHunk
        cellKey: string
      }> = []
      
      for (const [sheetName, sheetHunks] of hunksBySheet) {
        try {
          const worksheet = workbook.worksheets.getItem(sheetName)
          
          for (const hunk of sheetHunks) {
            try {
              const cellKey = cellKeyToA1(hunk.key)
              
              // Only set values for Added, ValueChanged, and FormulaChanged
              if ((hunk.kind === DiffKind.Added || hunk.kind === DiffKind.ValueChanged) && 
                  hunk.after && hunk.after.v !== undefined) {
                const range = worksheet.getCell(hunk.key.row, hunk.key.col)
                rangeOperations.push({ range, hunk, cellKey })
              } else if (hunk.kind === DiffKind.FormulaChanged && 
                         hunk.after && hunk.after.f !== undefined) {
                const range = worksheet.getCell(hunk.key.row, hunk.key.col)
                rangeOperations.push({ range, hunk, cellKey })
              }
            } catch (cellError) {
              log('error', `[Visualizer] Error preparing cell ${cellKeyToA1(hunk.key)}: ${cellError}`)
            }
          }
        } catch (error) {
          log('error', `[Visualizer] Error processing sheet ${sheetName}: ${error}`)
        }
      }
      
      // Now apply all values in batch
      for (const { range, hunk, cellKey } of rangeOperations) {
        try {
          // Load the font property for italic formatting
          await range.load(['format/font/italic'])
          await context.sync()
          
          if (hunk.kind === DiffKind.FormulaChanged && hunk.after && hunk.after.f) {
            range.formulas = [[hunk.after.f]]
            range.format.font.italic = true  // Make preview formulas italic
            log('info', `[Visualizer] Set preview formula for ${cellKey}: ${hunk.after.f}`)
          } else if (hunk.after && hunk.after.v !== undefined) {
            // The value should be a single cell value, not an array
            // If it's somehow an array, skip it as it's likely a bug
            if (Array.isArray(hunk.after.v)) {
              log('warning', `[Visualizer] Skipping array value for single cell ${cellKey}: ${JSON.stringify(hunk.after.v)}`)
              continue
            }
            range.values = [[hunk.after.v]]
            range.format.font.italic = true  // Make preview values italic
            log('info', `[Visualizer] Set preview value for ${cellKey}: ${hunk.after.v}`)
          }
        } catch (error) {
          log('error', `[Visualizer] Error setting value for ${cellKey}: ${error}`)
        }
      }
      
      await context.sync()
      
      const endTime = performance.now()
      log('success', `[Visualizer] Preview values applied successfully in ${Math.round(endTime - startTime)}ms`)
    }).catch((error: any) => {
      log('error', `[Visualizer] Error applying preview values: ${error.message}`, { error })
      throw error
    })
  }

  /**
   * Get a summary of the current highlights
   */
  static getHighlightSummary(): { totalCells: number; byType: Record<DiffKind, number> } {
    const summary = {
      totalCells: this.originalStates.size,
      byType: {
        [DiffKind.Added]: 0,
        [DiffKind.Deleted]: 0,
        [DiffKind.ValueChanged]: 0,
        [DiffKind.FormulaChanged]: 0,
        [DiffKind.StyleChanged]: 0
      }
    }
    
    // In a real implementation, we'd track which cells have which diff type
    return summary
  }
}
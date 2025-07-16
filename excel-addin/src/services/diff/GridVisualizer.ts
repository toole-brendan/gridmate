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

  // Visual indicators for diff types
  private static readonly INDICATORS = {
    [DiffKind.Added]: '+',
    [DiffKind.Deleted]: '✖',
    [DiffKind.ValueChanged]: '✏️',
    [DiffKind.FormulaChanged]: 'ƒ',
    [DiffKind.StyleChanged]: '🎨'
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
      log('info', `[Visualizer] Processing ${hunksBySheet.size} sheets`)
      
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
            const range = worksheet.getRangeByIndexes(
              hunk.key.row,
              hunk.key.col,
              1, // height
              1  // width
            )
            
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
            const originalState: CellState = {
              fillColor: range.format.fill.color,
              fontColor: range.format.font.color,
              fontItalic: range.format.font.italic,
              fontStrikethrough: range.format.font.strikethrough,
              numberFormat: range.numberFormat,
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
              value: range.values[0][0],
              formula: range.formulas[0][0]
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
                const newValue = hunk.after.v !== undefined ? hunk.after.v : 
                                 hunk.after.f ? `=${hunk.after.f}` : ''
                // Note: We can't add badges directly, but we can use creative formatting
                // Add green border to indicate addition
                range.format.borders.getItem('EdgeRight').style = 'Thick'
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
              // Show new value (old value is shown with strikethrough ideally)
              if (hunk.after && hunk.after.v !== undefined) {
                // Note: We can't show both old and new in the same cell
                // but we highlight the change clearly
                range.format.borders.getItem('EdgeLeft').style = 'Thick'
                range.format.borders.getItem('EdgeLeft').color = '#FFC000'
              }
              break
              
            case DiffKind.FormulaChanged:
              // Light blue background
              range.format.fill.color = this.COLORS[DiffKind.FormulaChanged]
              // Blue border to indicate formula change
              range.format.borders.getItem('EdgeTop').style = 'Double'
              range.format.borders.getItem('EdgeTop').color = '#0070C0'
              range.format.borders.getItem('EdgeBottom').style = 'Double'
              range.format.borders.getItem('EdgeBottom').color = '#0070C0'
              break
              
            case DiffKind.StyleChanged:
              // Light purple background
              range.format.fill.color = this.COLORS[DiffKind.StyleChanged]
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
      console.log(`[GridVisualizer] Applied highlights to ${rangeOperations.length} cells with 2 sync operations`)
      const endTime = performance.now()
      log('success', `[Visualizer] Highlights applied successfully in ${Math.round(endTime - startTime)}ms`, {
        totalCells: hunks.length,
        sheetsProcessed: hunksBySheet.size
      })
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
   */
  static async clearHighlights(hunks?: DiffHunk[], addLog?: (type: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => void): Promise<void> {
    const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
    
    const hunkCount = hunks?.length || this.originalStates.size
    log('info', `[Visualizer] Clearing ${hunkCount} highlights`)
    const startTime = performance.now()
    
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
              
              const range = worksheet.getRangeByIndexes(
                hunk.key.row,
                hunk.key.col,
                1,
                1
              )
              
              if (originalState) {
                // Complete restoration of original state
                range.format.fill.color = originalState.fillColor || '#FFFFFF'
                range.format.font.color = originalState.fontColor || '#000000'
                range.format.font.italic = originalState.fontItalic
                range.format.font.strikethrough = originalState.fontStrikethrough
                range.numberFormat = originalState.numberFormat
                
                // Restore all borders to original state
                const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
                for (const border of borders) {
                  const borderKey = border.replace('Edge', '').toLowerCase() as keyof CellState['borders']
                  const borderObj = range.format.borders.getItem(border)
                  borderObj.style = originalState.borders[borderKey].style || 'None'
                  if (originalState.borders[borderKey].color) {
                    borderObj.color = originalState.borders[borderKey].color
                  }
                }
                
                this.originalStates.delete(cellKey)
              } else {
                // Default restoration if no original state
                range.format.fill.color = '#FFFFFF'
                range.format.font.color = '#000000'
                range.format.font.italic = false
                range.format.font.strikethrough = false
                
                // Clear all borders
                const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
                for (const border of borders) {
                  range.format.borders.getItem(border).style = 'None'
                }
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
            const range = worksheet.getRangeByIndexes(row, col, 1, 1)
            
            // Complete restoration
            range.format.fill.color = originalState.fillColor || '#FFFFFF'
            range.format.font.color = originalState.fontColor || '#000000'
            range.format.font.italic = originalState.fontItalic
            range.format.font.strikethrough = originalState.fontStrikethrough
            range.numberFormat = originalState.numberFormat
            
            // Restore all borders
            const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'] as const
            for (const border of borders) {
              const borderKey = border.replace('Edge', '').toLowerCase() as keyof CellState['borders']
              const borderObj = range.format.borders.getItem(border)
              borderObj.style = originalState.borders[borderKey].style || 'None'
              if (originalState.borders[borderKey].color) {
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
      
      const endTime = performance.now()
      log('success', `[Visualizer] Highlights cleared successfully in ${Math.round(endTime - startTime)}ms`, {
        clearedCount: hunkCount,
        remainingStates: this.originalStates.size
      })
    }).catch((error: any) => {
      log('error', `[Visualizer] Error clearing highlights: ${error.message}`, { error })
      throw error
    })
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
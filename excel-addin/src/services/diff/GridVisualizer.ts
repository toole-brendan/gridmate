declare const Excel: any

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
  static async applyHighlights(hunks: DiffHunk[]): Promise<void> {
    if (!hunks || hunks.length === 0) return

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
            
            const cellKey = `${sheetName}!${hunk.key.row},${hunk.key.col}`
            rangeOperations.push({ range, hunk, cellKey })
            
            // Load all properties we might need in one batch
            if (!this.originalStates.has(cellKey)) {
              range.load([
                'format/fill/color',
                'format/font/color',
                'format/font/italic',
                'format/font/strikethrough',
                'format/borders',
                'numberFormat',
                'values',
                'formulas'
              ])
            }
          }
        } catch (error) {
          console.error(`Error preparing cells in sheet ${sheetName}:`, error)
        }
      }
      
      // Single sync for all property loading
      await context.sync()
      
      // Now apply all formatting in batch
      for (const { range, hunk, cellKey } of rangeOperations) {
        try {
          // Store original state if not already stored
          if (!this.originalStates.has(cellKey)) {
            const originalState: CellState = {
              fillColor: range.format.fill.color,
              fontColor: range.format.font.color,
              fontItalic: range.format.font.italic,
              fontStrikethrough: range.format.font.strikethrough,
              numberFormat: range.numberFormat,
              borders: {
                top: { 
                  style: range.format.borders.getItem('EdgeTop').style,
                  color: range.format.borders.getItem('EdgeTop').color
                },
                bottom: { 
                  style: range.format.borders.getItem('EdgeBottom').style,
                  color: range.format.borders.getItem('EdgeBottom').color
                },
                left: { 
                  style: range.format.borders.getItem('EdgeLeft').style,
                  color: range.format.borders.getItem('EdgeLeft').color
                },
                right: { 
                  style: range.format.borders.getItem('EdgeRight').style,
                  color: range.format.borders.getItem('EdgeRight').color
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
    })
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
   * Clear highlights and restore original formatting with enhanced restoration
   */
  static async clearHighlights(hunks?: DiffHunk[]): Promise<void> {
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
              const cellKey = `${sheetName}!${hunk.key.row},${hunk.key.col}`
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
          const [sheetName, position] = cellKey.split('!')
          const [row, col] = position.split(',').map(Number)
          
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
      console.log(`[GridVisualizer] Cleared ${this.originalStates.size} cell highlights`)
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
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

export class GridVisualizer {
  // Color scheme for different diff types
  private static readonly COLORS = {
    [DiffKind.Added]: '#C6EFCE',        // Light Green
    [DiffKind.Deleted]: '#FFC7CE',      // Light Red
    [DiffKind.ValueChanged]: '#FFEB9C', // Light Yellow
    [DiffKind.FormulaChanged]: '#B8CCE4', // Light Blue
    [DiffKind.StyleChanged]: '#E4DFEC'  // Light Purple
  }

  // Track original formats to restore later
  private static originalFormats = new Map<string, any>()

  /**
   * Apply visual highlights to cells based on diff hunks
   */
  static async applyHighlights(hunks: DiffHunk[]): Promise<void> {
    if (!hunks || hunks.length === 0) return

    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      
      // Group hunks by sheet for efficiency
      const hunksBySheet = this.groupHunksBySheet(hunks)
      
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
            
            // Store original format if not already stored
            const cellKey = `${sheetName}!${hunk.key.row},${hunk.key.col}`
            if (!this.originalFormats.has(cellKey)) {
              range.load(['format/fill/color', 'format/borders'])
              await context.sync()
              
              this.originalFormats.set(cellKey, {
                fillColor: range.format.fill.color,
                // Store border info if needed
              })
            }
            
            // Apply highlighting based on diff type
            switch (hunk.kind) {
              case DiffKind.Added:
                range.format.fill.color = this.COLORS[DiffKind.Added]
                break
                
              case DiffKind.Deleted:
                // For deleted cells, we can't highlight the cell itself
                // Instead, add a red border or strikethrough effect
                range.format.fill.color = this.COLORS[DiffKind.Deleted]
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
                range.format.fill.color = this.COLORS[DiffKind.ValueChanged]
                break
                
              case DiffKind.FormulaChanged:
                range.format.fill.color = this.COLORS[DiffKind.FormulaChanged]
                break
                
              case DiffKind.StyleChanged:
                range.format.fill.color = this.COLORS[DiffKind.StyleChanged]
                break
            }
          }
        } catch (error) {
          console.error(`Error highlighting cells in sheet ${sheetName}:`, error)
          // Continue with other sheets even if one fails
        }
      }
      
      await context.sync()
    })
  }

  /**
   * Clear highlights and restore original formatting
   */
  static async clearHighlights(hunks?: DiffHunk[]): Promise<void> {
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      
      if (hunks && hunks.length > 0) {
        // Clear specific hunks
        const hunksBySheet = this.groupHunksBySheet(hunks)
        
        for (const [sheetName, sheetHunks] of hunksBySheet) {
          try {
            const worksheet = workbook.worksheets.getItem(sheetName)
            
            for (const hunk of sheetHunks) {
              const cellKey = `${sheetName}!${hunk.key.row},${hunk.key.col}`
              const originalFormat = this.originalFormats.get(cellKey)
              
              const range = worksheet.getRangeByIndexes(
                hunk.key.row,
                hunk.key.col,
                1,
                1
              )
              
              if (originalFormat) {
                // Restore original formatting
                range.format.fill.color = originalFormat.fillColor || '#FFFFFF'
                this.originalFormats.delete(cellKey)
              } else {
                // Default to white background
                range.format.fill.color = '#FFFFFF'
              }
              
              // Clear any borders we added
              range.format.borders.getItem('EdgeTop').style = 'None'
              range.format.borders.getItem('EdgeBottom').style = 'None'
              range.format.borders.getItem('EdgeLeft').style = 'None'
              range.format.borders.getItem('EdgeRight').style = 'None'
            }
          } catch (error) {
            console.error(`Error clearing highlights in sheet ${sheetName}:`, error)
          }
        }
      } else {
        // Clear all stored highlights
        for (const [cellKey, originalFormat] of this.originalFormats) {
          const [sheetName, position] = cellKey.split('!')
          const [row, col] = position.split(',').map(Number)
          
          try {
            const worksheet = workbook.worksheets.getItem(sheetName)
            const range = worksheet.getRangeByIndexes(row, col, 1, 1)
            
            range.format.fill.color = originalFormat.fillColor || '#FFFFFF'
            
            // Clear borders
            range.format.borders.getItem('EdgeTop').style = 'None'
            range.format.borders.getItem('EdgeBottom').style = 'None'
            range.format.borders.getItem('EdgeLeft').style = 'None'
            range.format.borders.getItem('EdgeRight').style = 'None'
          } catch (error) {
            console.error(`Error restoring format for ${cellKey}:`, error)
          }
        }
        
        this.originalFormats.clear()
      }
      
      await context.sync()
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
      totalCells: this.originalFormats.size,
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
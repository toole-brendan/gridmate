import { WorkbookSnapshot } from '../services/excel/ExcelService'
import { DiffHunk, DiffKind, CellKey } from '../types/diff'

export interface DiffOptions {
  maxDiffs?: number
  includeStyles?: boolean
  chunkSize?: number
}

/**
 * Optimized diff calculator for large workbook snapshots
 */
export class ClientDiffCalculator {
  private readonly maxDiffs: number
  private readonly includeStyles: boolean
  private readonly chunkSize: number

  constructor(options: DiffOptions = {}) {
    this.maxDiffs = options.maxDiffs || 10000
    this.includeStyles = options.includeStyles ?? true
    this.chunkSize = options.chunkSize || 1000
  }

  /**
   * Calculate diff between two workbook snapshots with optimizations
   */
  calculateDiff(before: WorkbookSnapshot, after: WorkbookSnapshot): DiffHunk[] {
    const startTime = performance.now()
    const diffs: DiffHunk[] = []
    
    // Create key sets for efficient lookup
    const beforeKeys = new Set(Object.keys(before))
    const afterKeys = new Set(Object.keys(after))
    
    // Process in chunks to avoid blocking
    const allKeys = new Set([...beforeKeys, ...afterKeys])
    const keysArray = Array.from(allKeys)
    
    // Sort keys for better cache locality
    keysArray.sort()
    
    for (let i = 0; i < keysArray.length && diffs.length < this.maxDiffs; i++) {
      const key = keysArray[i]
      
      try {
        const cellKey = this.parseKey(key)
        const beforeCell = before[key]
        const afterCell = after[key]
        
        if (!beforeCell && afterCell) {
          // Added cell
          diffs.push({
            key: cellKey,
            kind: DiffKind.Added,
            after: afterCell
          })
        } else if (beforeCell && !afterCell) {
          // Deleted cell
          diffs.push({
            key: cellKey,
            kind: DiffKind.Deleted,
            before: beforeCell
          })
        } else if (beforeCell && afterCell) {
          // Check for changes
          const diffKind = this.detectChangeType(beforeCell, afterCell)
          if (diffKind) {
            diffs.push({
              key: cellKey,
              kind: diffKind,
              before: beforeCell,
              after: afterCell
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to process cell ${key}:`, error)
      }
    }
    
    const endTime = performance.now()
    console.log(`[ClientDiff] Calculated ${diffs.length} diffs in ${(endTime - startTime).toFixed(2)}ms`)
    
    return diffs
  }

  /**
   * Detect the type of change between two cells
   */
  private detectChangeType(before: any, after: any): DiffKind | null {
    // Check formula changes first (highest priority)
    if (before.f !== after.f) {
      return DiffKind.FormulaChanged
    }
    
    // Check value changes
    if (before.v !== after.v) {
      return DiffKind.ValueChanged
    }
    
    // Check style changes if enabled
    if (this.includeStyles && before.s !== after.s) {
      // Quick string comparison first
      if (before.s !== after.s) {
        try {
          const beforeStyle = before.s ? JSON.parse(before.s) : {}
          const afterStyle = after.s ? JSON.parse(after.s) : {}
          
          if (!this.deepEqual(beforeStyle, afterStyle)) {
            return DiffKind.StyleChanged
          }
        } catch {
          // If parsing fails, assume styles are different
          return DiffKind.StyleChanged
        }
      }
    }
    
    return null
  }

  /**
   * Parse Excel-style key into CellKey
   */
  private parseKey(key: string): CellKey {
    const [sheet, cellRef] = key.split('!')
    if (!cellRef) {
      throw new Error(`Invalid cell key format: ${key}`)
    }
    
    const match = cellRef.match(/^([A-Z]+)(\d+)$/)
    if (!match) {
      throw new Error(`Invalid cell reference: ${cellRef}`)
    }
    
    const [, colLetters, rowStr] = match
    
    // Convert column letters to number (A=0, B=1, Z=25, AA=26, etc.)
    let col = 0
    for (let i = 0; i < colLetters.length; i++) {
      col = col * 26 + (colLetters.charCodeAt(i) - 65 + 1)
    }
    col-- // Make it 0-based
    
    const row = parseInt(rowStr) - 1 // Convert to 0-based
    
    return { sheet, row, col }
  }

  /**
   * Optimized deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true
    
    if (a == null || b == null) return false
    
    if (typeof a !== typeof b) return false
    
    if (typeof a !== 'object') return a === b
    
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    
    if (aKeys.length !== bKeys.length) return false
    
    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false
      if (!this.deepEqual(a[key], b[key])) return false
    }
    
    return true
  }

  /**
   * Calculate diff asynchronously in chunks to avoid blocking
   */
  async calculateDiffAsync(before: WorkbookSnapshot, after: WorkbookSnapshot): Promise<DiffHunk[]> {
    const diffs: DiffHunk[] = []
    const beforeKeys = new Set(Object.keys(before))
    const afterKeys = new Set(Object.keys(after))
    const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys]))
    
    // Sort for better performance
    allKeys.sort()
    
    // Process in chunks
    for (let i = 0; i < allKeys.length; i += this.chunkSize) {
      const chunk = allKeys.slice(i, i + this.chunkSize)
      
      // Process chunk
      const chunkDiffs = await this.processChunk(chunk, before, after)
      diffs.push(...chunkDiffs)
      
      // Check if we've hit the max
      if (diffs.length >= this.maxDiffs) {
        console.warn(`[ClientDiff] Hit max diff limit of ${this.maxDiffs}`)
        break
      }
      
      // Yield to browser
      await new Promise(resolve => setTimeout(resolve, 0))
    }
    
    return diffs
  }

  private async processChunk(keys: string[], before: WorkbookSnapshot, after: WorkbookSnapshot): Promise<DiffHunk[]> {
    const diffs: DiffHunk[] = []
    
    for (const key of keys) {
      try {
        const cellKey = this.parseKey(key)
        const beforeCell = before[key]
        const afterCell = after[key]
        
        if (!beforeCell && afterCell) {
          diffs.push({
            key: cellKey,
            kind: DiffKind.Added,
            after: afterCell
          })
        } else if (beforeCell && !afterCell) {
          diffs.push({
            key: cellKey,
            kind: DiffKind.Deleted,
            before: beforeCell
          })
        } else if (beforeCell && afterCell) {
          const diffKind = this.detectChangeType(beforeCell, afterCell)
          if (diffKind) {
            diffs.push({
              key: cellKey,
              kind: diffKind,
              before: beforeCell,
              after: afterCell
            })
          }
        }
      } catch (error) {
        console.warn(`Failed to process cell ${key}:`, error)
      }
    }
    
    return diffs
  }
}

// Export singleton instance
let diffCalculator: ClientDiffCalculator | null = null

export function getDiffCalculator(options?: DiffOptions): ClientDiffCalculator {
  if (!diffCalculator) {
    diffCalculator = new ClientDiffCalculator(options)
  }
  return diffCalculator
}

export function resetDiffCalculator(): void {
  diffCalculator = null
} 
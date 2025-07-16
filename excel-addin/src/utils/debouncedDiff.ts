import { AISuggestedOperation } from '../types/diff'

export interface DebouncedDiffOptions {
  delay?: number
  maxWait?: number
  onBatch?: (operations: AISuggestedOperation[]) => void
}

export class DebouncedDiffQueue {
  private operations: AISuggestedOperation[] = []
  private timer: NodeJS.Timeout | null = null
  private maxWaitTimer: NodeJS.Timeout | null = null
  private delay: number
  private maxWait: number
  private onBatch: (operations: AISuggestedOperation[]) => void
  private startTime: number | null = null

  constructor(options: DebouncedDiffOptions = {}) {
    this.delay = options.delay || 300 // Default 300ms debounce
    this.maxWait = options.maxWait || 2000 // Default 2s max wait
    this.onBatch = options.onBatch || (() => {})
  }

  add(operation: AISuggestedOperation): void {
    this.operations.push(operation)
    
    // Start max wait timer on first operation
    if (!this.startTime) {
      this.startTime = Date.now()
      this.maxWaitTimer = setTimeout(() => {
        this.flush()
      }, this.maxWait)
    }
    
    // Reset debounce timer
    if (this.timer) {
      clearTimeout(this.timer)
    }
    
    this.timer = setTimeout(() => {
      this.flush()
    }, this.delay)
  }

  addBatch(operations: AISuggestedOperation[]): void {
    operations.forEach(op => this.add(op))
  }

  flush(): void {
    if (this.operations.length === 0) return
    
    // Clear all timers
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer)
      this.maxWaitTimer = null
    }
    
    // Process batch
    const batch = [...this.operations]
    this.operations = []
    this.startTime = null
    
    // Optimize batch by merging adjacent operations
    const optimizedBatch = this.optimizeBatch(batch)
    
    // Call handler
    this.onBatch(optimizedBatch)
  }

  private optimizeBatch(operations: AISuggestedOperation[]): AISuggestedOperation[] {
    const optimized: AISuggestedOperation[] = []
    const rangeMap = new Map<string, AISuggestedOperation[]>()
    
    // Group operations by type and adjacent ranges
    operations.forEach(op => {
      if (op.tool === 'write_range' || op.tool === 'format_range') {
        const range = op.input?.range
        if (range) {
          const key = `${op.tool}:${this.getSheetFromRange(range)}`
          if (!rangeMap.has(key)) {
            rangeMap.set(key, [])
          }
          rangeMap.get(key)!.push(op)
        } else {
          optimized.push(op)
        }
      } else {
        optimized.push(op)
      }
    })
    
    // Merge adjacent operations where possible
    rangeMap.forEach((ops) => {
      if (ops.length === 1) {
        optimized.push(ops[0])
      } else {
        // For now, just add them individually
        // TODO: Implement actual range merging logic
        optimized.push(...ops)
      }
    })
    
    return optimized
  }

  private getSheetFromRange(range: string): string {
    const match = range.match(/^(.+)!/)
    return match ? match[1] : 'Sheet1'
  }

  clear(): void {
    this.operations = []
    
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer)
      this.maxWaitTimer = null
    }
    
    this.startTime = null
  }

  get pending(): number {
    return this.operations.length
  }

  get isEmpty(): boolean {
    return this.operations.length === 0
  }
}

// Singleton instance for the app
let globalDebouncedQueue: DebouncedDiffQueue | null = null

export function getDebouncedDiffQueue(options?: DebouncedDiffOptions): DebouncedDiffQueue {
  if (!globalDebouncedQueue) {
    globalDebouncedQueue = new DebouncedDiffQueue(options)
  }
  return globalDebouncedQueue
}

export function resetDebouncedDiffQueue(): void {
  if (globalDebouncedQueue) {
    globalDebouncedQueue.clear()
  }
  globalDebouncedQueue = null
} 
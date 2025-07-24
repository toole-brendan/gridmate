export interface ExcelOperation {
  id: string;
  type: 'read' | 'write' | 'format' | 'formula';
  worksheet?: string;
  range: string;
  data?: any;
  priority?: number; // Higher = more important
  timestamp: number;
}

export interface BatchedOperation {
  worksheet: string;
  operations: ExcelOperation[];
  combinedRange?: string; // For adjacent operations
}

export class ExcelOperationQueue {
  private queue: ExcelOperation[] = [];
  private processing = false;
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // ms
  private readonly MAX_BATCH_SIZE = 100;

  async enqueue(operation: ExcelOperation): Promise<void> {
    // Add to queue with priority sorting
    this.queue.push(operation);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Schedule batch processing
    if (!this.batchTimer && !this.processing) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    this.batchTimer = null;
    
    try {
      // Take up to MAX_BATCH_SIZE operations
      const batch = this.queue.splice(0, this.MAX_BATCH_SIZE);
      
      // Group by worksheet and detect adjacent ranges
      const grouped = this.groupOperations(batch);
      
      // Execute batched operations
      await Excel.run(async (context) => {
        for (const group of grouped) {
          await this.executeBatchedOperations(context, group);
        }
        
        // Single sync for all operations
        await context.sync();
      });
      
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.processing = false;
      
      // Process next batch if queue not empty
      if (this.queue.length > 0) {
        this.batchTimer = setTimeout(() => this.processBatch(), this.BATCH_DELAY);
      }
    }
  }

  private groupOperations(operations: ExcelOperation[]): BatchedOperation[] {
    const groups = new Map<string, ExcelOperation[]>();
    
    // Group by worksheet
    for (const op of operations) {
      const worksheet = op.worksheet || 'active';
      if (!groups.has(worksheet)) {
        groups.set(worksheet, []);
      }
      groups.get(worksheet)!.push(op);
    }
    
    // Convert to batched operations and detect adjacent ranges
    return Array.from(groups.entries()).map(([worksheet, ops]) => {
      const batched: BatchedOperation = { worksheet, operations: ops };
      
      // Try to combine adjacent write operations
      if (ops.every(op => op.type === 'write')) {
        const combined = this.tryMergeAdjacentRanges(ops);
        if (combined) {
          batched.combinedRange = combined.range;
          batched.operations = [combined];
        }
      }
      
      return batched;
    });
  }

  private tryMergeAdjacentRanges(operations: ExcelOperation[]): ExcelOperation | null {
    // Simple implementation - can be enhanced
    // Check if all operations are on consecutive rows/columns
    // and merge them into a single operation
    
    // For now, return null to process individually
    return null;
  }

  private async executeBatchedOperations(
    context: Excel.RequestContext,
    batch: BatchedOperation
  ): Promise<void> {
    const worksheet = batch.worksheet === 'active' 
      ? context.workbook.worksheets.getActiveWorksheet()
      : context.workbook.worksheets.getItem(batch.worksheet);
    
    for (const op of batch.operations) {
      const range = worksheet.getRange(op.range);
      
      switch (op.type) {
        case 'write':
          range.values = op.data;
          break;
        case 'format':
          Object.assign(range.format, op.data);
          break;
        case 'formula':
          range.formulas = op.data;
          break;
        case 'read':
          range.load(['values', 'formulas']);
          break;
      }
    }
  }
}

// Singleton instance
export const excelQueue = new ExcelOperationQueue();
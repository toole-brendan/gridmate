import { SignalRToolRequest } from '../../types/signalr';
import { AISuggestedOperation } from '../../types/diff';
import { ExcelService } from './ExcelService';

interface QueuedRequest extends SignalRToolRequest {
  callback?: (result: any, error: string | null) => void;
}

export class WriteOperationQueue {
  private static instance: WriteOperationQueue;
  private previewQueue: Map<string, QueuedRequest[]> = new Map();
  private executionQueue: QueuedRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private previewTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly BATCH_DELAY = 100; // ms
  private readonly PREVIEW_DELAY = 200; // ms
  
  // Callbacks for external handlers
  private onPreviewReady?: (messageId: string, operations: AISuggestedOperation[]) => void;
  private onBatchComplete?: (requestId: string, result: any, error: string | null) => void;

  private constructor() {}

  public static getInstance(): WriteOperationQueue {
    if (!WriteOperationQueue.instance) {
      WriteOperationQueue.instance = new WriteOperationQueue();
    }
    return WriteOperationQueue.instance;
  }

  public setCallbacks(callbacks: {
    onPreviewReady?: (messageId: string, operations: AISuggestedOperation[]) => void;
    onBatchComplete?: (requestId: string, result: any, error: string | null) => void;
  }) {
    this.onPreviewReady = callbacks.onPreviewReady;
    this.onBatchComplete = callbacks.onBatchComplete;
  }

  public queueForPreview(messageId: string, request: QueuedRequest): void {
    const queue = this.previewQueue.get(messageId) || [];
    queue.push(request);
    this.previewQueue.set(messageId, queue);
    
    // Debounce preview generation
    this.schedulePreviewGeneration(messageId);
  }

  public queueForExecution(request: QueuedRequest): void {
    this.executionQueue.push(request);
    this.scheduleBatchExecution();
  }

  private schedulePreviewGeneration(messageId: string): void {
    // Clear existing timer for this message
    const existingTimer = this.previewTimers.get(messageId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.generatePreview(messageId);
      this.previewTimers.delete(messageId);
    }, this.PREVIEW_DELAY);
    
    this.previewTimers.set(messageId, timer);
  }

  private generatePreview(messageId: string): void {
    const requests = this.previewQueue.get(messageId);
    if (!requests || requests.length === 0) return;

    // Clear the queue for this message
    this.previewQueue.delete(messageId);

    // Convert to operations
    const operations: AISuggestedOperation[] = requests.map(req => ({
      tool: req.tool,
      input: req,
      description: `Execute ${req.tool}`
    }));

    // Notify handler
    if (this.onPreviewReady) {
      this.onPreviewReady(messageId, operations);
    }
  }

  private scheduleBatchExecution(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.executeBatch();
    }, this.BATCH_DELAY);
  }

  private async executeBatch(): Promise<void> {
    const batch = [...this.executionQueue];
    this.executionQueue = [];
    this.batchTimer = null;
    
    if (batch.length === 0) return;

    console.log(`[WriteOperationQueue] Executing batch of ${batch.length} operations`);
    
    try {
      const results = await ExcelService.getInstance().batchExecuteToolRequests(batch);
      
      // Send results back via callbacks
      for (let i = 0; i < batch.length; i++) {
        const request = batch[i];
        const result = results[i];
        
        if (this.onBatchComplete) {
          this.onBatchComplete(request.request_id, result, null);
        }
        if (request.callback) {
          request.callback(result, null);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch execution failed';
      console.error('[WriteOperationQueue] Batch execution failed:', error);
      
      // Send error responses
      for (const request of batch) {
        if (this.onBatchComplete) {
          this.onBatchComplete(request.request_id, null, errorMessage);
        }
        if (request.callback) {
          request.callback(null, errorMessage);
        }
      }
    }
  }

  private groupByType(requests: QueuedRequest[]): Map<string, QueuedRequest[]> {
    const grouped = new Map<string, QueuedRequest[]>();
    
    for (const request of requests) {
      const tool = request.tool;
      if (!grouped.has(tool)) {
        grouped.set(tool, []);
      }
      grouped.get(tool)!.push(request);
    }
    
    return grouped;
  }

  // Get status information
  public getQueueStatus(): {
    previewQueueSize: number;
    executionQueueSize: number;
    pendingPreviews: string[];
  } {
    return {
      previewQueueSize: Array.from(this.previewQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      executionQueueSize: this.executionQueue.length,
      pendingPreviews: Array.from(this.previewQueue.keys())
    };
  }

  // Clear all queues (useful for cleanup)
  public clearQueues(): void {
    this.previewQueue.clear();
    this.executionQueue = [];
    
    // Clear all timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    for (const timer of this.previewTimers.values()) {
      clearTimeout(timer);
    }
    this.previewTimers.clear();
  }
} 
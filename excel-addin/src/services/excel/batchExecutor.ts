import { ExcelService } from './ExcelService';

export type BatchableRequest = {
  requestId: string;
  tool: string;
  input: any;
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
};

export class BatchExecutor {
  private static instance: BatchExecutor;
  private queue: BatchableRequest[] = [];
  private timeout: NodeJS.Timeout | null = null;

  public static getInstance(): BatchExecutor {
    if (!BatchExecutor.instance) {
      BatchExecutor.instance = new BatchExecutor();
    }
    return BatchExecutor.instance;
  }

  public queueRequest(request: Omit<BatchableRequest, 'resolve' | 'reject'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const extendedRequest = { ...request, resolve, reject };
      this.queue.push(extendedRequest);
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => this.processQueue(), 50);
    });
  }

  private async processQueue(): Promise<void> {
    const requests = this.queue;
    this.queue = [];
    this.timeout = null;

    if (requests.length === 0) return;

    console.log(`[BatchExecutor] Processing batch of ${requests.length} requests`);

    try {
      const results = await ExcelService.getInstance().batchExecute(requests);
      results.forEach((result, i) => {
        requests[i].resolve?.(result);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject?.(error);
      });
    }
  }
} 
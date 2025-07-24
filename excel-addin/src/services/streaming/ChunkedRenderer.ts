export interface ChunkedRendererOptions {
  flushInterval?: number; // Default: 100ms
  maxBufferSize?: number; // Default: 1000 chars
  onUpdate: (content: string) => void;
}

export class ChunkedRenderer {
  private buffer: string[] = [];
  private updateTimer: NodeJS.Timeout | null = null;
  private lastFlushTime: number = Date.now();
  private options: Required<ChunkedRendererOptions>;

  constructor(options: ChunkedRendererOptions) {
    this.options = {
      flushInterval: 100,
      maxBufferSize: 1000,
      ...options
    };
  }

  addChunk(chunk: string): void {
    this.buffer.push(chunk);
    
    // Force flush if buffer is too large
    const bufferSize = this.buffer.join('').length;
    if (bufferSize >= this.options.maxBufferSize) {
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => this.flush(), this.options.flushInterval);
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    
    const content = this.buffer.join('');
    this.options.onUpdate(content);
    
    // Reset state
    this.buffer = [];
    this.updateTimer = null;
    this.lastFlushTime = Date.now();
  }

  // Force immediate flush
  forceFlush(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.flush();
  }

  // Clean up on unmount
  destroy(): void {
    this.forceFlush();
  }
}
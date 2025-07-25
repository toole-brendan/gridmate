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
  private chunkCount: number = 0;
  private totalCharsProcessed: number = 0;
  private flushCount: number = 0;
  private instanceId: string = Math.random().toString(36).substring(7);

  constructor(options: ChunkedRendererOptions) {
    this.options = {
      flushInterval: 100,
      maxBufferSize: 1000,
      ...options
    };
    
    console.log(`[ChunkedRenderer ${this.instanceId}] Created`, {
      timestamp: new Date().toISOString(),
      flushInterval: this.options.flushInterval,
      maxBufferSize: this.options.maxBufferSize
    });
  }

  addChunk(chunk: string): void {
    this.chunkCount++;
    this.totalCharsProcessed += chunk.length;
    
    console.log(`[ChunkedRenderer ${this.instanceId}] addChunk`, {
      timestamp: new Date().toISOString(),
      chunkNumber: this.chunkCount,
      chunkLength: chunk.length,
      bufferLength: this.buffer.length,
      chunkPreview: chunk.substring(0, 50),
      totalCharsProcessed: this.totalCharsProcessed
    });
    
    this.buffer.push(chunk);
    
    // Force flush if buffer is too large
    const bufferSize = this.buffer.join('').length;
    if (bufferSize >= this.options.maxBufferSize) {
      console.log(`[ChunkedRenderer ${this.instanceId}] Buffer size exceeded, forcing flush`, {
        timestamp: new Date().toISOString(),
        bufferSize,
        maxBufferSize: this.options.maxBufferSize,
        bufferItems: this.buffer.length
      });
      this.flush();
      return;
    }
    
    // Schedule flush if not already scheduled
    if (!this.updateTimer) {
      console.log(`[ChunkedRenderer ${this.instanceId}] Scheduling flush`, {
        timestamp: new Date().toISOString(),
        flushInterval: this.options.flushInterval,
        currentBufferSize: bufferSize
      });
      this.updateTimer = setTimeout(() => {
        console.log(`[ChunkedRenderer ${this.instanceId}] Timer triggered flush`, {
          timestamp: new Date().toISOString()
        });
        this.flush();
      }, this.options.flushInterval);
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      console.log(`[ChunkedRenderer ${this.instanceId}] Flush called but buffer is empty`, {
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    this.flushCount++;
    const content = this.buffer.join('');
    const timeSinceLastFlush = Date.now() - this.lastFlushTime;
    
    console.log(`[ChunkedRenderer ${this.instanceId}] Flushing buffer`, {
      timestamp: new Date().toISOString(),
      flushNumber: this.flushCount,
      bufferItems: this.buffer.length,
      contentLength: content.length,
      timeSinceLastFlush,
      contentPreview: content.substring(0, 100)
    });
    
    this.options.onUpdate(content);
    
    // Reset state
    this.buffer = [];
    this.updateTimer = null;
    this.lastFlushTime = Date.now();
    
    console.log(`[ChunkedRenderer ${this.instanceId}] Flush completed`, {
      timestamp: new Date().toISOString(),
      totalFlushes: this.flushCount
    });
  }

  // Force immediate flush
  forceFlush(): void {
    console.log(`[ChunkedRenderer ${this.instanceId}] Force flush requested`, {
      timestamp: new Date().toISOString(),
      hasScheduledTimer: !!this.updateTimer,
      bufferLength: this.buffer.length
    });
    
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
      console.log(`[ChunkedRenderer ${this.instanceId}] Cleared scheduled timer`, {
        timestamp: new Date().toISOString()
      });
    }
    this.flush();
  }

  // Clean up on unmount
  destroy(): void {
    console.log(`[ChunkedRenderer ${this.instanceId}] Destroying renderer`, {
      timestamp: new Date().toISOString(),
      totalChunks: this.chunkCount,
      totalChars: this.totalCharsProcessed,
      totalFlushes: this.flushCount,
      remainingBufferItems: this.buffer.length
    });
    
    this.forceFlush();
    
    console.log(`[ChunkedRenderer ${this.instanceId}] Destroyed`, {
      timestamp: new Date().toISOString()
    });
  }
}
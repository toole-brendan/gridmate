# Phase 1: Streamlined UI Updates & Batched Rendering - Implementation Guide

## Overview

This guide provides detailed implementation steps for Phase 1 of the GridMate performance optimization plan, focusing on optimizing UI rendering to prevent stalls during large updates.

## Task 1: Implement Chunked Message Rendering (Days 1-2)

### 1.1 Create ChunkedRenderer Service

**File**: `excel-addin/src/services/streaming/ChunkedRenderer.ts`

```typescript
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
```

### 1.2 Update StreamingMessage Component

**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx`

```typescript
import React, { useEffect, useRef } from 'react';
import { StreamingMessage as StreamingMessageType } from '../../../types/streaming';
import { ChunkedRenderer } from '../../../services/streaming/ChunkedRenderer';
// ... other imports

interface Props {
    message: StreamingMessageType;
}

export const StreamingMessage: React.FC<Props> = ({ message }) => {
    const [displayContent, setDisplayContent] = React.useState('');
    const rendererRef = useRef<ChunkedRenderer | null>(null);
    
    useEffect(() => {
        // Create renderer on mount
        rendererRef.current = new ChunkedRenderer({
            onUpdate: (content) => setDisplayContent(prev => prev + content),
            flushInterval: 100, // 10Hz update rate
            maxBufferSize: 500  // Force update every 500 chars
        });
        
        return () => {
            // Cleanup on unmount
            rendererRef.current?.destroy();
        };
    }, []);
    
    useEffect(() => {
        // Handle new content chunks
        if (message.content && rendererRef.current) {
            const newContent = message.content.substring(displayContent.length);
            if (newContent) {
                rendererRef.current.addChunk(newContent);
            }
        }
        
        // Force flush when streaming completes
        if (!message.isStreaming && rendererRef.current) {
            rendererRef.current.forceFlush();
        }
    }, [message.content, message.isStreaming]);
    
    return (
        <div className="flex items-start space-x-3 p-4 animate-fadeIn">
            {/* ... existing avatar code ... */}
            
            <div className="flex-1 space-y-2 min-w-0">
                <div className="font-callout text-text-primary whitespace-pre-wrap">
                    <ReactMarkdown>
                        {displayContent}
                    </ReactMarkdown>
                    
                    {/* Improved typing indicator */}
                    {message.isStreaming && (
                        <span className="inline-block ml-1">
                            <span className="animate-pulse text-blue-500">▊</span>
                        </span>
                    )}
                </div>
                
                {/* ... existing tool indicators ... */}
            </div>
        </div>
    );
};
```

### 1.3 Add Performance Monitoring

**File**: `excel-addin/src/hooks/useStreamingPerformance.ts`

```typescript
import { useEffect, useRef } from 'react';

export interface StreamingMetrics {
  chunksReceived: number;
  updatesRendered: number;
  averageChunkSize: number;
  droppedFrames: number;
  renderTime: number;
}

export function useStreamingPerformance() {
  const metricsRef = useRef<StreamingMetrics>({
    chunksReceived: 0,
    updatesRendered: 0,
    averageChunkSize: 0,
    droppedFrames: 0,
    renderTime: 0
  });
  
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  
  useEffect(() => {
    let animationFrameId: number;
    
    const checkFrameRate = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      
      // Check if we dropped frames (> 16.67ms for 60fps)
      if (delta > 17) {
        metricsRef.current.droppedFrames++;
      }
      
      lastFrameTimeRef.current = now;
      frameCountRef.current++;
      
      animationFrameId = requestAnimationFrame(checkFrameRate);
    };
    
    animationFrameId = requestAnimationFrame(checkFrameRate);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  const recordChunk = (size: number) => {
    const metrics = metricsRef.current;
    metrics.chunksReceived++;
    metrics.averageChunkSize = 
      (metrics.averageChunkSize * (metrics.chunksReceived - 1) + size) / 
      metrics.chunksReceived;
  };
  
  const recordRender = (renderTime: number) => {
    const metrics = metricsRef.current;
    metrics.updatesRendered++;
    metrics.renderTime = 
      (metrics.renderTime * (metrics.updatesRendered - 1) + renderTime) / 
      metrics.updatesRendered;
  };
  
  const getMetrics = () => ({ ...metricsRef.current });
  
  return { recordChunk, recordRender, getMetrics };
}
```

## Task 2: Optimize Excel Range Operations (Days 3-5)

### 2.1 Create Excel Operation Queue

**File**: `excel-addin/src/services/excel/ExcelOperationQueue.ts`

```typescript
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
```

### 2.2 Update Excel Service to Use Queue

**File**: `excel-addin/src/services/excel/ExcelService.ts`

```typescript
import { excelQueue } from './ExcelOperationQueue';
import { v4 as uuidv4 } from 'uuid';

export class ExcelService {
  // ... existing code ...
  
  async writeRange(
    range: string, 
    values: any[][], 
    worksheet?: string,
    priority?: number
  ): Promise<void> {
    await excelQueue.enqueue({
      id: uuidv4(),
      type: 'write',
      worksheet,
      range,
      data: values,
      priority: priority || 5,
      timestamp: Date.now()
    });
  }
  
  async applyFormula(
    range: string,
    formula: string | string[][],
    worksheet?: string,
    priority?: number
  ): Promise<void> {
    const formulas = typeof formula === 'string' 
      ? [[formula]] 
      : formula;
      
    await excelQueue.enqueue({
      id: uuidv4(),
      type: 'formula',
      worksheet,
      range,
      data: formulas,
      priority: priority || 5,
      timestamp: Date.now()
    });
  }
  
  // ... similar updates for other methods ...
}
```

## Task 3: Add Rendering Performance Monitoring (Day 6)

### 3.1 Create Performance Dashboard Component

**File**: `excel-addin/src/components/debug/PerformanceDashboard.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { useStreamingPerformance } from '../../hooks/useStreamingPerformance';

interface PerformanceStats {
  fps: number;
  memoryUsage: number;
  excelOpsQueued: number;
  streamingActive: boolean;
}

export const PerformanceDashboard: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 60,
    memoryUsage: 0,
    excelOpsQueued: 0,
    streamingActive: false
  });
  
  const streaming = useStreamingPerformance();
  const [showDetails, setShowDetails] = useState(false);
  
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        setStats(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    animationId = requestAnimationFrame(measureFPS);
    
    // Memory usage monitoring (if available)
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setStats(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1048576) // MB
        }));
      }
    }, 1000);
    
    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(memoryInterval);
    };
  }, []);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const metrics = streaming.getMetrics();
  const fpsColor = stats.fps >= 50 ? 'text-green-500' : 
                   stats.fps >= 30 ? 'text-yellow-500' : 'text-red-500';
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono">
      <div 
        className="cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        <span className={fpsColor}>{stats.fps} FPS</span>
        {stats.memoryUsage > 0 && (
          <span className="ml-2">{stats.memoryUsage}MB</span>
        )}
      </div>
      
      {showDetails && (
        <div className="mt-2 space-y-1">
          <div>Chunks: {metrics.chunksReceived}</div>
          <div>Updates: {metrics.updatesRendered}</div>
          <div>Avg chunk: {Math.round(metrics.averageChunkSize)}b</div>
          <div>Dropped frames: {metrics.droppedFrames}</div>
          <div>Render time: {metrics.renderTime.toFixed(2)}ms</div>
        </div>
      )}
    </div>
  );
};
```

### 3.2 Add Performance Marks

**File**: `excel-addin/src/utils/performance.ts`

```typescript
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) {
      console.warn(`Start mark ${startMark} not found`);
      return 0;
    }
    
    const duration = (end || performance.now()) - start;
    
    // Log to console in dev mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    // Also use Performance API if available
    if ('measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        // Ignore if marks don't exist
      }
    }
    
    return duration;
  }
  
  clearMarks(): void {
    this.marks.clear();
  }
}

export const perfTracker = new PerformanceTracker();
```

## Integration Steps

### 1. Update Main App Component

**File**: `excel-addin/src/app.tsx`

```typescript
import { PerformanceDashboard } from './components/debug/PerformanceDashboard';

// In your main App component
export function App() {
  return (
    <>
      {/* ... existing app content ... */}
      <PerformanceDashboard />
    </>
  );
}
```

### 2. Update Store for Performance Monitoring

**File**: `excel-addin/src/stores/performanceStore.ts`

```typescript
import { create } from 'zustand';

interface PerformanceState {
  isHighLoad: boolean;
  streamingOptimized: boolean;
  batchingEnabled: boolean;
  setHighLoad: (value: boolean) => void;
  setStreamingOptimized: (value: boolean) => void;
  setBatchingEnabled: (value: boolean) => void;
}

export const usePerformanceStore = create<PerformanceState>((set) => ({
  isHighLoad: false,
  streamingOptimized: true,
  batchingEnabled: true,
  setHighLoad: (value) => set({ isHighLoad: value }),
  setStreamingOptimized: (value) => set({ streamingOptimized: value }),
  setBatchingEnabled: (value) => set({ batchingEnabled: value })
}));
```

## Testing Plan

### 1. Unit Tests

```typescript
// __tests__/ChunkedRenderer.test.ts
describe('ChunkedRenderer', () => {
  it('should batch updates at specified interval', async () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ onUpdate, flushInterval: 50 });
    
    renderer.addChunk('Hello ');
    renderer.addChunk('World');
    
    expect(onUpdate).not.toHaveBeenCalled();
    
    await new Promise(resolve => setTimeout(resolve, 60));
    
    expect(onUpdate).toHaveBeenCalledWith('Hello World');
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
  
  it('should force flush on large buffer', () => {
    const onUpdate = jest.fn();
    const renderer = new ChunkedRenderer({ 
      onUpdate, 
      maxBufferSize: 10 
    });
    
    renderer.addChunk('This is a long message');
    
    expect(onUpdate).toHaveBeenCalledWith('This is a long message');
  });
});
```

### 2. Performance Tests

```typescript
// __tests__/performance/streaming.perf.ts
describe('Streaming Performance', () => {
  it('should maintain 60fps during streaming', async () => {
    // Simulate rapid streaming updates
    const messageCount = 1000;
    const startTime = performance.now();
    
    for (let i = 0; i < messageCount; i++) {
      // Simulate streaming update
      await updateStreamingMessage(`Token ${i} `);
    }
    
    const endTime = performance.now();
    const avgUpdateTime = (endTime - startTime) / messageCount;
    
    expect(avgUpdateTime).toBeLessThan(16.67); // 60fps threshold
  });
});
```

## Rollout Strategy

1. **Development Testing** (Day 1)
   - Enable in development builds only
   - Monitor performance metrics
   - Gather baseline measurements

2. **Staging Deployment** (Day 2)
   - Deploy to internal testing group
   - A/B test with/without optimizations
   - Collect performance data

3. **Production Rollout** (Day 3-5)
   - Gradual rollout to 10%, 50%, 100% of users
   - Monitor for any regressions
   - Have rollback plan ready

## Success Metrics

1. **Streaming Performance**
   - 60fps maintained during streaming
   - < 100ms latency for message updates
   - No dropped frames during normal operation

2. **Excel Operations**
   - 70% reduction in Excel API calls
   - < 50ms for batched operations
   - No UI freezes during bulk updates

3. **User Experience**
   - Smooth scrolling during updates
   - Responsive UI during AI generation
   - No perceived lag in interactions
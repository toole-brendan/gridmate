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
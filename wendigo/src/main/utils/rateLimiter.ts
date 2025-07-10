export class RateLimiter {
  private readonly maxRequests: number
  private readonly windowMs: number
  private requests: number[] = []
  
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }
  
  async acquire(): Promise<void> {
    const now = Date.now()
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    // Check if we're at the limit
    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time
      const oldestRequest = this.requests[0]
      const waitTime = oldestRequest + this.windowMs - now
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.acquire() // Retry after waiting
      }
    }
    
    // Add current request
    this.requests.push(now)
  }
  
  reset(): void {
    this.requests = []
  }
}
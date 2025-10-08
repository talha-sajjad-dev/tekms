/**
 * BigCommerce API Rate Limiter
 * 
 * BigCommerce Plus Plan Limits:
 * - 20,000 calls per hour
 * - 150 calls per 30-second window
 * - ~5 calls per second maximum
 */

interface ApiCall {
  timestamp: number
  resolve: () => void
  reject: (error: Error) => void
}

class BigCommerceRateLimiter {
  private callHistory: number[] = []
  private queue: ApiCall[] = []
  private processing = false
  
  // Rate limits
  private readonly MAX_CALLS_PER_30_SECONDS = 150
  private readonly MAX_CALLS_PER_HOUR = 20000
  private readonly WINDOW_30_SECONDS = 30 * 1000
  private readonly WINDOW_1_HOUR = 60 * 60 * 1000
  
  // Safety margins (use 80% of limits to be safe)
  private readonly SAFE_CALLS_PER_30_SECONDS = Math.floor(this.MAX_CALLS_PER_30_SECONDS * 0.8) // 120
  private readonly SAFE_CALLS_PER_HOUR = Math.floor(this.MAX_CALLS_PER_HOUR * 0.8) // 16000

  /**
   * Clean up old call history entries
   */
  private cleanupHistory(): void {
    const now = Date.now()
    this.callHistory = this.callHistory.filter(timestamp => 
      now - timestamp < this.WINDOW_1_HOUR
    )
  }

  /**
   * Check if we can make a call now
   */
  private canMakeCall(): boolean {
    const now = Date.now()
    this.cleanupHistory()

    // Check 30-second window
    const recent30s = this.callHistory.filter(timestamp => 
      now - timestamp < this.WINDOW_30_SECONDS
    ).length

    // Check 1-hour window
    const recent1h = this.callHistory.length

    return recent30s < this.SAFE_CALLS_PER_30_SECONDS && 
           recent1h < this.SAFE_CALLS_PER_HOUR
  }

  /**
   * Get time until next available slot
   */
  private getWaitTime(): number {
    const now = Date.now()
    
    // Check 30-second window
    const recent30s = this.callHistory.filter(timestamp => 
      now - timestamp < this.WINDOW_30_SECONDS
    )
    
    if (recent30s.length >= this.SAFE_CALLS_PER_30_SECONDS) {
      // Wait until oldest call in 30s window expires
      const oldestIn30s = Math.min(...recent30s)
      return (oldestIn30s + this.WINDOW_30_SECONDS) - now + 100 // +100ms buffer
    }

    // Check 1-hour window
    if (this.callHistory.length >= this.SAFE_CALLS_PER_HOUR) {
      // Wait until oldest call in 1h window expires
      const oldest = Math.min(...this.callHistory)
      return (oldest + this.WINDOW_1_HOUR) - now + 100 // +100ms buffer
    }

    return 0
  }

  /**
   * Process the queue of pending API calls
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      if (this.canMakeCall()) {
        const call = this.queue.shift()!
        this.callHistory.push(Date.now())
        call.resolve()
      } else {
        const waitTime = this.getWaitTime()
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms before next API call`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    this.processing = false
  }

  /**
   * Wait for permission to make an API call
   */
  async waitForSlot(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.canMakeCall()) {
        this.callHistory.push(Date.now())
        resolve()
        return
      }

      // Add to queue
      this.queue.push({
        timestamp: Date.now(),
        resolve,
        reject
      })

      // Start processing queue
      this.processQueue()
    })
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    callsIn30s: number
    callsIn1h: number
    maxCallsIn30s: number
    maxCallsIn1h: number
    queueLength: number
    canMakeCall: boolean
    nextAvailableIn: number
  } {
    const now = Date.now()
    this.cleanupHistory()

    const callsIn30s = this.callHistory.filter(timestamp => 
      now - timestamp < this.WINDOW_30_SECONDS
    ).length

    return {
      callsIn30s,
      callsIn1h: this.callHistory.length,
      maxCallsIn30s: this.SAFE_CALLS_PER_30_SECONDS,
      maxCallsIn1h: this.SAFE_CALLS_PER_HOUR,
      queueLength: this.queue.length,
      canMakeCall: this.canMakeCall(),
      nextAvailableIn: this.getWaitTime()
    }
  }

  /**
   * Clear all history and queue (for testing/reset)
   */
  reset(): void {
    this.callHistory = []
    this.queue = []
    this.processing = false
  }
}

// Global rate limiter instance
export const rateLimiter = new BigCommerceRateLimiter()

/**
 * Wrapper for fetch with automatic rate limiting and retry logic
 */
export async function rateLimitedFetch(
  url: string, 
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit permission
      await rateLimiter.waitForSlot()

      // Make the API call
      const response = await fetch(url, options)

      // Handle rate limit responses
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * attempt
        
        console.warn(`🚫 Rate limited (429), waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }

      // Return successful response (even if not 2xx, let caller handle)
      return response

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt < maxRetries) {
        const waitTime = 1000 * Math.pow(2, attempt - 1) // Exponential backoff
        console.warn(`🔄 API call failed (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms:`, lastError.message)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Utility to track API call metrics
 */
export function logRateLimitStatus(): void {
  const status = rateLimiter.getStatus()
  console.log('📊 BigCommerce API Rate Limit Status:', {
    '30s Window': `${status.callsIn30s}/${status.maxCallsIn30s}`,
    '1h Window': `${status.callsIn1h}/${status.maxCallsIn1h}`,
    'Queue Length': status.queueLength,
    'Next Available': status.nextAvailableIn > 0 ? `${status.nextAvailableIn}ms` : 'Now'
  })
}

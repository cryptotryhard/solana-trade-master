/**
 * RPC Rate Limiter - Prevent 429 errors
 */

class RateLimiter {
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly maxRequests = 10; // Max requests per minute
  private readonly resetInterval = 60000; // 1 minute

  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Reset counter if interval passed
    if (now - this.lastResetTime >= this.resetInterval) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    if (this.requestCount >= this.maxRequests) {
      return false;
    }
    
    this.requestCount++;
    return true;
  }

  async waitForAvailability(): Promise<void> {
    while (!this.canMakeRequest()) {
      const waitTime = Math.max(1000, this.resetInterval - (Date.now() - this.lastResetTime));
      console.log(`⏳ Rate limited, waiting ${Math.round(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, Math.min(waitTime, 5000)));
    }
  }

  getStatus() {
    return {
      requestCount: this.requestCount,
      maxRequests: this.maxRequests,
      timeUntilReset: Math.max(0, this.resetInterval - (Date.now() - this.lastResetTime))
    };
  }
}

export const rateLimiter = new RateLimiter();
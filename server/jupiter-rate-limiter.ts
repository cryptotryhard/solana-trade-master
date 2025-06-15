/**
 * JUPITER RATE LIMITER - Manage API request throttling
 * Prevents 429 errors and implements exponential backoff
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  requestQueue: Array<{ timestamp: number; resolve: Function; reject: Function }>;
  isProcessing: boolean;
  currentDelay: number;
  maxDelay: number;
}

class JupiterRateLimiter {
  private config: RateLimitConfig = {
    maxRequestsPerMinute: 30, // Conservative limit
    requestQueue: [],
    isProcessing: false,
    currentDelay: 1000, // Start with 1 second
    maxDelay: 30000 // Max 30 seconds
  };

  async executeWithRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.config.requestQueue.push({
        timestamp: Date.now(),
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.config.isProcessing) return;
    this.config.isProcessing = true;

    while (this.config.requestQueue.length > 0) {
      const now = Date.now();
      
      // Clean old requests (older than 1 minute)
      this.config.requestQueue = this.config.requestQueue.filter(
        req => now - req.timestamp < 60000
      );

      // Check if we're under rate limit
      const recentRequests = this.config.requestQueue.filter(
        req => now - req.timestamp < 60000
      ).length;

      if (recentRequests >= this.config.maxRequestsPerMinute) {
        console.log(`🔄 Rate limit reached, waiting ${this.config.currentDelay}ms...`);
        await this.delay(this.config.currentDelay);
        continue;
      }

      const request = this.config.requestQueue.shift();
      if (!request) break;

      try {
        // Execute the request with retry logic
        const result = await this.executeWithRetry(request);
        request.resolve(result);
        
        // Reset delay on success
        this.config.currentDelay = 1000;
        
        // Add small delay between requests
        await this.delay(200);
        
      } catch (error: any) {
        if (error.message.includes('Too Many Requests') || error.message.includes('429')) {
          console.log(`⚠️ Rate limited, backing off for ${this.config.currentDelay}ms`);
          
          // Exponential backoff
          this.config.currentDelay = Math.min(
            this.config.currentDelay * 2,
            this.config.maxDelay
          );
          
          // Put request back in queue
          this.config.requestQueue.unshift(request);
          await this.delay(this.config.currentDelay);
        } else {
          request.reject(error);
        }
      }
    }

    this.config.isProcessing = false;
  }

  async executeJupiterRequest<T>(operation: () => Promise<T>): Promise<T> {
    return this.executeWithRateLimit(operation);
  }

  private async executeWithRetry(operation: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        if (error.message.includes('Too Many Requests') || error.message.includes('429')) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`🔄 Rate limit hit, attempt ${attempt}/${maxRetries}, waiting ${delay}ms`);
          await this.delay(delay);
          continue;
        }
        
        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }
    
    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      queueLength: this.config.requestQueue.length,
      currentDelay: this.config.currentDelay,
      isProcessing: this.config.isProcessing
    };
  }
}

export const jupiterRateLimiter = new JupiterRateLimiter();
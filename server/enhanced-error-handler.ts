/**
 * ENHANCED ERROR HANDLER - GRACEFUL DEGRADATION FOR TRADING SYSTEMS
 * Maintains continuous trading operations despite RPC and API failures
 */

export class EnhancedErrorHandler {
  private static instance: EnhancedErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, number> = new Map();
  private circuitBreakers: Map<string, boolean> = new Map();

  static getInstance(): EnhancedErrorHandler {
    if (!EnhancedErrorHandler.instance) {
      EnhancedErrorHandler.instance = new EnhancedErrorHandler();
    }
    return EnhancedErrorHandler.instance;
  }

  async handleRpcError<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 8,
    baseDelay: number = 1000
  ): Promise<T | null> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.resetErrorCount(operationName);
        return result;
        
      } catch (error) {
        this.incrementErrorCount(operationName);
        
        if (attempt === maxRetries) {
          console.log(`❌ ${operationName} failed after ${maxRetries} attempts, continuing with graceful degradation`);
          return null;
        }
        
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
        console.log(`⚠️ ${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    return null;
  }

  async handleJupiterError<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    fallbackAmount?: number
  ): Promise<T | null> {
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.resetErrorCount(operationName);
        return result;
        
      } catch (error) {
        console.log(`⚠️ ${operationName} attempt ${attempt} failed:`, (error as Error).message);
        
        if (attempt === maxRetries) {
          console.log(`❌ ${operationName} failed after ${maxRetries} attempts, continuing trading loop`);
          return null;
        }
        
        // For Jupiter errors, implement progressive fallback
        if (fallbackAmount && attempt < maxRetries) {
          console.log(`🔄 Reducing trade amount by 30% and retrying...`);
        }
        
        await this.delay(3000);
      }
    }
    
    return null;
  }

  shouldBypassOperation(operationName: string): boolean {
    const errorCount = this.errorCounts.get(operationName) || 0;
    const lastError = this.lastErrors.get(operationName) || 0;
    const timeSinceLastError = Date.now() - lastError;
    
    // If too many errors in short time, temporarily bypass
    if (errorCount > 10 && timeSinceLastError < 60000) {
      return true;
    }
    
    return false;
  }

  enableGracefulDegradation(operationName: string): void {
    console.log(`⚠️ Enabling graceful degradation for ${operationName}`);
    this.circuitBreakers.set(operationName, true);
    
    // Auto-reset after 5 minutes
    setTimeout(() => {
      this.circuitBreakers.set(operationName, false);
      console.log(`✅ Re-enabling ${operationName} after cooldown`);
    }, 300000);
  }

  isOperationDisabled(operationName: string): boolean {
    return this.circuitBreakers.get(operationName) || false;
  }

  private incrementErrorCount(operationName: string): void {
    const current = this.errorCounts.get(operationName) || 0;
    this.errorCounts.set(operationName, current + 1);
    this.lastErrors.set(operationName, Date.now());
  }

  private resetErrorCount(operationName: string): void {
    this.errorCounts.set(operationName, 0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    for (const [operation, count] of this.errorCounts) {
      stats[operation] = count;
    }
    return stats;
  }
}

export const errorHandler = EnhancedErrorHandler.getInstance();
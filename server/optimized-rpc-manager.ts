/**
 * OPTIMIZED RPC MANAGER
 * Manages multiple RPC endpoints with intelligent fallback and rate limiting
 */

import { Connection, PublicKey } from '@solana/web3.js';

interface RPCEndpoint {
  url: string;
  name: string;
  isHealthy: boolean;
  lastUsed: number;
  errorCount: number;
  maxRequestsPerSecond: number;
  currentRequests: number;
  resetTime: number;
}

class OptimizedRPCManager {
  private endpoints: RPCEndpoint[];
  private currentEndpointIndex: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.endpoints = [
      {
        url: 'https://api.mainnet-beta.solana.com',
        name: 'Official Mainnet',
        isHealthy: true,
        lastUsed: 0,
        errorCount: 0,
        maxRequestsPerSecond: 10,
        currentRequests: 0,
        resetTime: Date.now()
      },
      {
        url: 'https://solana-api.projectserum.com',
        name: 'Serum RPC',
        isHealthy: true,
        lastUsed: 0,
        errorCount: 0,
        maxRequestsPerSecond: 15,
        currentRequests: 0,
        resetTime: Date.now()
      },
      {
        url: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        name: 'Helius RPC',
        isHealthy: true,
        lastUsed: 0,
        errorCount: 0,
        maxRequestsPerSecond: 50,
        currentRequests: 0,
        resetTime: Date.now()
      }
    ];

    this.startHealthChecking();
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkEndpointHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkEndpointHealth(): Promise<void> {
    for (const endpoint of this.endpoints) {
      try {
        const connection = new Connection(endpoint.url, 'confirmed');
        await connection.getSlot();
        endpoint.isHealthy = true;
        endpoint.errorCount = 0;
      } catch (error) {
        endpoint.errorCount++;
        if (endpoint.errorCount > 3) {
          endpoint.isHealthy = false;
        }
      }
    }
  }

  private getOptimalEndpoint(): RPCEndpoint {
    const now = Date.now();
    
    // Reset request counters every second
    for (const endpoint of this.endpoints) {
      if (now - endpoint.resetTime > 1000) {
        endpoint.currentRequests = 0;
        endpoint.resetTime = now;
      }
    }

    // Find healthy endpoint with capacity
    const availableEndpoints = this.endpoints.filter(
      endpoint => endpoint.isHealthy && endpoint.currentRequests < endpoint.maxRequestsPerSecond
    );

    if (availableEndpoints.length === 0) {
      // If no endpoint available, wait and use least loaded
      const leastLoaded = this.endpoints.reduce((prev, current) => 
        prev.currentRequests < current.currentRequests ? prev : current
      );
      return leastLoaded;
    }

    // Use round-robin among available endpoints
    const endpoint = availableEndpoints[this.currentEndpointIndex % availableEndpoints.length];
    this.currentEndpointIndex++;
    
    return endpoint;
  }

  public getConnection(): Connection {
    const endpoint = this.getOptimalEndpoint();
    endpoint.currentRequests++;
    endpoint.lastUsed = Date.now();
    
    console.log(`🔗 Using RPC: ${endpoint.name} (${endpoint.currentRequests}/${endpoint.maxRequestsPerSecond} requests)`);
    
    return new Connection(endpoint.url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'User-Agent': 'Victoria-Trading-Bot/1.0'
      }
    });
  }

  public async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connection = this.getConnection();
        const result = await operation(connection);
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          console.log(`⚠️ Rate limit hit, retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})`);
          await this.delay(delayMs);
          delayMs *= 2; // Exponential backoff
          continue;
        }
        
        // For non-rate-limit errors, mark endpoint as problematic
        const endpoint = this.getOptimalEndpoint();
        endpoint.errorCount++;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        await this.delay(delayMs);
      }
    }

    throw lastError || new Error('Maximum retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getEndpointStatus(): any {
    return this.endpoints.map(endpoint => ({
      name: endpoint.name,
      isHealthy: endpoint.isHealthy,
      errorCount: endpoint.errorCount,
      currentRequests: endpoint.currentRequests,
      maxRequests: endpoint.maxRequestsPerSecond
    }));
  }

  public stop(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const optimizedRPCManager = new OptimizedRPCManager();
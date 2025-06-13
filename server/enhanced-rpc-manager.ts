/**
 * ENHANCED RPC MANAGER
 * Advanced RPC endpoint rotation with intelligent rate limit handling
 */

import { Connection } from '@solana/web3.js';

interface RPCEndpoint {
  url: string;
  priority: number;
  lastUsed: number;
  failures: number;
  maxRequests: number;
  requestWindow: number;
  requestCount: number;
  windowStart: number;
}

export class EnhancedRPCManager {
  private endpoints: RPCEndpoint[];
  private currentIndex: number = 0;
  private blacklistedUntil: Map<string, number> = new Map();

  constructor() {
    this.endpoints = [
      {
        url: 'https://mainnet.helius-rpc.com/?api-key=80a5abeb-622a-4fdf-905a-ac5b5842a167',
        priority: 1,
        lastUsed: 0,
        failures: 0,
        maxRequests: 100,
        requestWindow: 60000, // 1 minute
        requestCount: 0,
        windowStart: Date.now()
      },
      {
        url: 'https://api.mainnet-beta.solana.com',
        priority: 2,
        lastUsed: 0,
        failures: 0,
        maxRequests: 40,
        requestWindow: 60000,
        requestCount: 0,
        windowStart: Date.now()
      },
      {
        url: 'https://solana-api.projectserum.com',
        priority: 3,
        lastUsed: 0,
        failures: 0,
        maxRequests: 30,
        requestWindow: 60000,
        requestCount: 0,
        windowStart: Date.now()
      },
      {
        url: 'https://rpc.ankr.com/solana',
        priority: 4,
        lastUsed: 0,
        failures: 0,
        maxRequests: 50,
        requestWindow: 60000,
        requestCount: 0,
        windowStart: Date.now()
      },
      {
        url: 'https://solana.public-rpc.com',
        priority: 5,
        lastUsed: 0,
        failures: 0,
        maxRequests: 25,
        requestWindow: 60000,
        requestCount: 0,
        windowStart: Date.now()
      }
    ];
  }

  getOptimalConnection(): Connection {
    const availableEndpoint = this.selectBestEndpoint();
    console.log(`🔗 Using RPC endpoint: ${availableEndpoint.url.split('?')[0]}`);
    
    this.trackUsage(availableEndpoint);
    return new Connection(availableEndpoint.url, 'confirmed');
  }

  private selectBestEndpoint(): RPCEndpoint {
    const now = Date.now();
    
    // Filter out blacklisted endpoints
    const available = this.endpoints.filter(endpoint => {
      const blacklistedUntil = this.blacklistedUntil.get(endpoint.url);
      return !blacklistedUntil || now > blacklistedUntil;
    });

    if (available.length === 0) {
      // Clear blacklist if all endpoints are blocked
      this.blacklistedUntil.clear();
      console.log('⚠️ All endpoints were blacklisted, clearing blacklist');
      return this.endpoints[0];
    }

    // Reset request windows if needed
    available.forEach(endpoint => {
      if (now - endpoint.windowStart > endpoint.requestWindow) {
        endpoint.requestCount = 0;
        endpoint.windowStart = now;
      }
    });

    // Find endpoint with available capacity
    const withCapacity = available.filter(endpoint => 
      endpoint.requestCount < endpoint.maxRequests
    );

    if (withCapacity.length === 0) {
      // All endpoints at capacity, use least recently used
      const leastRecentlyUsed = available.reduce((min, endpoint) => 
        endpoint.lastUsed < min.lastUsed ? endpoint : min
      );
      
      console.log(`⏰ All endpoints at capacity, using LRU: ${leastRecentlyUsed.url.split('?')[0]}`);
      return leastRecentlyUsed;
    }

    // Select best endpoint by priority and usage
    const best = withCapacity.reduce((best, endpoint) => {
      if (endpoint.priority < best.priority) return endpoint;
      if (endpoint.priority === best.priority && endpoint.failures < best.failures) return endpoint;
      return best;
    });

    return best;
  }

  private trackUsage(endpoint: RPCEndpoint): void {
    endpoint.lastUsed = Date.now();
    endpoint.requestCount++;
  }

  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = this.getOptimalConnection();
        const result = await operation(connection);
        
        // Reset failure count on success
        const currentEndpoint = this.getCurrentEndpoint();
        if (currentEndpoint) {
          currentEndpoint.failures = 0;
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.log(`🔄 RPC attempt ${attempt + 1} failed: ${error.message}`);
        
        const currentEndpoint = this.getCurrentEndpoint();
        if (currentEndpoint) {
          currentEndpoint.failures++;
          
          // Blacklist endpoint if too many failures
          if (currentEndpoint.failures >= 3) {
            const blacklistDuration = 60000; // 1 minute
            this.blacklistedUntil.set(currentEndpoint.url, Date.now() + blacklistDuration);
            console.log(`❌ Blacklisted endpoint: ${currentEndpoint.url.split('?')[0]} for ${blacklistDuration/1000}s`);
          }
        }
        
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('All RPC attempts failed');
  }

  private getCurrentEndpoint(): RPCEndpoint | undefined {
    return this.endpoints[this.currentIndex];
  }

  async healthCheck(): Promise<void> {
    console.log('🔍 Performing RPC health check...');
    
    for (const endpoint of this.endpoints) {
      try {
        const connection = new Connection(endpoint.url, 'confirmed');
        const slot = await connection.getSlot();
        console.log(`✅ ${endpoint.url.split('?')[0]}: slot ${slot}`);
        endpoint.failures = 0;
      } catch (error: any) {
        console.log(`❌ ${endpoint.url.split('?')[0]}: ${error.message}`);
        endpoint.failures++;
      }
    }
  }

  getStatus(): any {
    const now = Date.now();
    return {
      endpoints: this.endpoints.map(endpoint => ({
        url: endpoint.url.split('?')[0],
        priority: endpoint.priority,
        failures: endpoint.failures,
        requestCount: endpoint.requestCount,
        available: endpoint.requestCount < endpoint.maxRequests,
        blacklisted: this.blacklistedUntil.has(endpoint.url) && 
                    now < (this.blacklistedUntil.get(endpoint.url) || 0)
      })),
      totalEndpoints: this.endpoints.length,
      activeEndpoints: this.endpoints.filter(e => 
        !this.blacklistedUntil.has(e.url) || 
        now > (this.blacklistedUntil.get(e.url) || 0)
      ).length
    };
  }
}

export const enhancedRPCManager = new EnhancedRPCManager();
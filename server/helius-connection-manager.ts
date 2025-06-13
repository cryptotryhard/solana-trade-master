/**
 * HELIUS CONNECTION MANAGER
 * Advanced rate limiting bypass and connection pooling
 */

import { Connection } from '@solana/web3.js';

class HeliusConnectionManager {
  private connections: Connection[] = [];
  private currentIndex: number = 0;
  private requestCounts: Map<number, number> = new Map();
  private resetTimes: Map<number, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly CONNECTIONS_COUNT = 3;

  constructor() {
    this.initializeConnections();
  }

  private initializeConnections(): void {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    
    if (!heliusApiKey) {
      console.log('⚠️ No HELIUS_API_KEY found, using fallback connections');
      this.connections = [
        new Connection('https://api.mainnet-beta.solana.com', 'confirmed'),
        new Connection('https://solana-mainnet.g.alchemy.com/v2/demo', 'confirmed'),
        new Connection('https://rpc.ankr.com/solana', 'confirmed')
      ];
    } else {
      // Create multiple Helius connections with different endpoints
      this.connections = [
        new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, 'confirmed'),
        new Connection(`https://rpc.helius.xyz/?api-key=${heliusApiKey}`, 'confirmed'),
        new Connection(`https://solana-mainnet.helius-rpc.com/?api-key=${heliusApiKey}`, 'confirmed')
      ];
    }

    // Initialize request tracking
    for (let i = 0; i < this.connections.length; i++) {
      this.requestCounts.set(i, 0);
      this.resetTimes.set(i, Date.now() + 60000);
    }

    console.log(`🔗 Helius Connection Manager initialized with ${this.connections.length} connections`);
  }

  public getConnection(): Connection {
    const now = Date.now();
    
    // Find a connection that hasn't hit rate limits
    for (let i = 0; i < this.connections.length; i++) {
      const index = (this.currentIndex + i) % this.connections.length;
      const resetTime = this.resetTimes.get(index) || 0;
      const requestCount = this.requestCounts.get(index) || 0;
      
      // Reset counter if minute has passed
      if (now > resetTime) {
        this.requestCounts.set(index, 0);
        this.resetTimes.set(index, now + 60000);
      }
      
      // Use this connection if under limit
      if (requestCount < this.MAX_REQUESTS_PER_MINUTE) {
        this.requestCounts.set(index, requestCount + 1);
        this.currentIndex = (index + 1) % this.connections.length;
        return this.connections[index];
      }
    }
    
    // If all connections are rate limited, use round-robin anyway
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return connection;
  }

  public async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = this.getConnection();
        return await operation(connection);
      } catch (error: any) {
        lastError = error;
        
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          console.log(`🔄 Rate limit hit, switching connection (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(1000 * (attempt + 1)); // Exponential backoff
          continue;
        }
        
        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }
    
    throw lastError || new Error('Operation failed after retries');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getStatus() {
    const now = Date.now();
    return {
      totalConnections: this.connections.length,
      currentIndex: this.currentIndex,
      requestCounts: Array.from(this.requestCounts.entries()).map(([index, count]) => ({
        connection: index,
        requests: count,
        resetIn: Math.max(0, (this.resetTimes.get(index) || 0) - now)
      }))
    };
  }
}

export const heliusManager = new HeliusConnectionManager();
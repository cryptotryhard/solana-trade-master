/**
 * OPTIMIZED RPC MANAGER - Prevent 429 errors and API blocks
 */

import { Connection } from '@solana/web3.js';

class OptimizedRPCManager {
  private connections: Connection[] = [];
  private currentIndex = 0;
  private requestCounts: number[] = [];
  private lastResetTimes: number[] = [];
  private readonly maxRequestsPerMinute = 5;
  private readonly resetInterval = 60000;

  constructor() {
    this.initializeConnections();
    const privateRPCs = [];

if (process.env.QUICKNODE_RPC?.startsWith('https://')) {
  privateRPCs.push(process.env.QUICKNODE_RPC);
}
if (process.env.SOLANA_RPC?.startsWith('https://')) {
  privateRPCs.push(process.env.SOLANA_RPC);
}

const publicEndpoints = [
  ...privateRPCs,
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
  'https://solana.public-rpc.com'
];

  }

  private initializeConnections() {
    // Public RPC endpoints that don't require API keys
    const publicEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-api.projectserum.com',
      'https://rpc.ankr.com/solana',
      'https://solana.public-rpc.com'
    ];

    // Only add Helius if API key is available and valid
    if (process.env.HELIUS_API_KEY && process.env.HELIUS_API_KEY.length > 10) {
      publicEndpoints.unshift(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`);
    }

    this.connections = publicEndpoints.map(url => new Connection(url, 'confirmed'));
    this.requestCounts = new Array(this.connections.length).fill(0);
    this.lastResetTimes = new Array(this.connections.length).fill(Date.now());
  }

  getOptimizedConnection(): Connection {
    const now = Date.now();
    
    // Find connection with available quota
    for (let i = 0; i < this.connections.length; i++) {
      const index = (this.currentIndex + i) % this.connections.length;
      
      // Reset counter if interval passed
      if (now - this.lastResetTimes[index] >= this.resetInterval) {
        this.requestCounts[index] = 0;
        this.lastResetTimes[index] = now;
      }
      
      if (this.requestCounts[index] < this.maxRequestsPerMinute) {
        this.requestCounts[index]++;
        this.currentIndex = index;
        return this.connections[index];
      }
    }
    
    // If all connections are rate limited, use the one with least recent usage
    const oldestIndex = this.lastResetTimes
      .map((time, index) => ({ time, index }))
      .sort((a, b) => a.time - b.time)[0].index;
    
    this.currentIndex = oldestIndex;
    return this.connections[oldestIndex];
  }

  async executeWithRetry<T>(operation: (connection: Connection) => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const connection = this.getOptimizedConnection();
        return await operation(connection);
      } catch (error: any) {
        lastError = error;
        
        if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
          console.log(`⏳ Rate limited, switching RPC endpoint (attempt ${attempt + 1}/${maxRetries})`);
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          continue;
        }
        
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          console.log(`🔒 API access denied, switching to public RPC`);
          continue;
        }
        
        throw error;
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      totalConnections: this.connections.length,
      currentIndex: this.currentIndex,
      requestCounts: this.requestCounts,
      availableConnections: this.requestCounts.filter(count => count < this.maxRequestsPerMinute).length
    };
  }
}

export const optimizedRPCManager = new OptimizedRPCManager();


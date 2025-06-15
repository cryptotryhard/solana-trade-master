/**
 * RPC MANAGER - ENHANCED CONNECTION POOLING
 * Manages multiple RPC endpoints with intelligent failover and rate limiting
 */

import { Connection, clusterApiUrl } from '@solana/web3.js';

interface RpcEndpoint {
  url: string;
  name: string;
  weight: number;
  lastUsed: number;
  errorCount: number;
  isHealthy: boolean;
}

export class RpcManager {
  private endpoints: RpcEndpoint[] = [];
  private currentIndex = 0;
  private readonly maxErrorCount = 5;
  private readonly cooldownPeriod = 60000; // 1 minute

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints(): void {
    // Primary endpoints with authentication
    if (process.env.HELIUS_API_KEY) {
      this.endpoints.push({
        url: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
        name: 'Helius',
        weight: 100,
        lastUsed: 0,
        errorCount: 0,
        isHealthy: true
      });
    }

    if (process.env.QUICKNODE_RPC_URL) {
      this.endpoints.push({
        url: process.env.QUICKNODE_RPC_URL,
        name: 'QuickNode',
        weight: 90,
        lastUsed: 0,
        errorCount: 0,
        isHealthy: true
      });
    }

    // Fallback endpoints
    this.endpoints.push(
      {
        url: 'https://api.mainnet-beta.solana.com',
        name: 'Solana Official',
        weight: 70,
        lastUsed: 0,
        errorCount: 0,
        isHealthy: true
      },
      {
        url: 'https://solana-api.projectserum.com',
        name: 'Serum',
        weight: 60,
        lastUsed: 0,
        errorCount: 0,
        isHealthy: true
      },
      {
        url: clusterApiUrl('mainnet-beta'),
        name: 'Cluster API',
        weight: 50,
        lastUsed: 0,
        errorCount: 0,
        isHealthy: true
      }
    );

    console.log(`🔗 RPC Manager initialized with ${this.endpoints.length} endpoints`);
  }

  getConnection(): Connection {
    const endpoint = this.getNextHealthyEndpoint();
    
    if (!endpoint) {
      console.log('⚠️ All RPC endpoints unhealthy, using fallback');
      return new Connection(clusterApiUrl('mainnet-beta'), {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000
      });
    }

    endpoint.lastUsed = Date.now();
    
    return new Connection(endpoint.url, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      httpHeaders: {
        'User-Agent': 'VICTORIA-Trading-Bot/1.0'
      }
    });
  }

  private getNextHealthyEndpoint(): RpcEndpoint | null {
    // Reset error counts for endpoints that have cooled down
    this.endpoints.forEach(endpoint => {
      if (!endpoint.isHealthy && Date.now() - endpoint.lastUsed > this.cooldownPeriod) {
        endpoint.errorCount = 0;
        endpoint.isHealthy = true;
        console.log(`🔄 Endpoint ${endpoint.name} recovered`);
      }
    });

    // Get healthy endpoints sorted by weight
    const healthyEndpoints = this.endpoints
      .filter(ep => ep.isHealthy)
      .sort((a, b) => b.weight - a.weight);

    if (healthyEndpoints.length === 0) {
      return null;
    }

    // Round-robin through healthy endpoints
    const endpoint = healthyEndpoints[this.currentIndex % healthyEndpoints.length];
    this.currentIndex = (this.currentIndex + 1) % healthyEndpoints.length;

    return endpoint;
  }

  reportError(connection: Connection, error: any): void {
    const endpoint = this.endpoints.find(ep => 
      connection.rpcEndpoint.includes(ep.url.split('?')[0])
    );

    if (endpoint) {
      endpoint.errorCount++;
      
      if (endpoint.errorCount >= this.maxErrorCount) {
        endpoint.isHealthy = false;
        console.log(`❌ Endpoint ${endpoint.name} marked unhealthy (${endpoint.errorCount} errors)`);
      }

      // Specific handling for rate limits
      if (error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
        endpoint.isHealthy = false;
        endpoint.lastUsed = Date.now();
        console.log(`⏱️ Endpoint ${endpoint.name} rate limited, cooling down`);
      }
    }
  }

  getStatus(): any {
    return {
      endpoints: this.endpoints.map(ep => ({
        name: ep.name,
        isHealthy: ep.isHealthy,
        errorCount: ep.errorCount,
        weight: ep.weight
      })),
      healthyCount: this.endpoints.filter(ep => ep.isHealthy).length,
      totalCount: this.endpoints.length
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const connection = this.getConnection();
      const slot = await connection.getSlot();
      console.log(`✅ RPC test successful, current slot: ${slot}`);
      return true;
    } catch (error) {
      console.log(`❌ RPC test failed: ${error}`);
      return false;
    }
  }
}

export const rpcManager = new RpcManager();
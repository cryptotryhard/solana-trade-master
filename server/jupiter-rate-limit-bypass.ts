/**
 * JUPITER RATE LIMIT BYPASS
 * Advanced routing and retry mechanisms for continuous trading
 */

import fetch from 'node-fetch';

interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}

interface JupiterRoute {
  inAmount: string;
  outAmount: string;
  priceImpactPct: number;
  marketInfos: any[];
  routePlan: any[];
}

class JupiterRateLimitBypass {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing: boolean = false;
  private lastRequestTime: number = 0;
  private requestDelay: number = 2000; // 2 second delay between requests
  private retryDelays: number[] = [1000, 3000, 5000, 10000]; // Progressive backoff

  private jupiterEndpoints = [
    'https://quote-api.jup.ag/v6',
    'https://api.jup.ag/v6',
    'https://quote-api.jup.ag/v4' // Fallback to v4 if needed
  ];

  private currentEndpointIndex = 0;

  async getQuote(params: JupiterQuoteParams): Promise<JupiterRoute | null> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeQuoteWithRetry(params);
          resolve(result);
        } catch (error) {
          console.log('❌ Quote failed after all retries:', error.message);
          resolve(null);
        }
      });

      this.processQueue();
    });
  }

  private async executeQuoteWithRetry(params: JupiterQuoteParams): Promise<JupiterRoute | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
      try {
        // Try different endpoints
        for (let endpointIndex = 0; endpointIndex < this.jupiterEndpoints.length; endpointIndex++) {
          const endpoint = this.jupiterEndpoints[(this.currentEndpointIndex + endpointIndex) % this.jupiterEndpoints.length];
          
          try {
            const result = await this.executeQuote(endpoint, params);
            if (result) {
              // Success - rotate to next endpoint for load balancing
              this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.jupiterEndpoints.length;
              return result;
            }
          } catch (endpointError: any) {
            console.log(`⚠️ Endpoint ${endpoint} failed: ${endpointError.message.slice(0, 50)}`);
            continue;
          }
        }

        throw new Error('All endpoints failed');

      } catch (error: any) {
        lastError = error;
        
        if (attempt < this.retryDelays.length - 1) {
          const delay = this.retryDelays[attempt];
          console.log(`🔄 Retry ${attempt + 1} in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Quote failed after retries');
  }

  private async executeQuote(endpoint: string, params: JupiterQuoteParams): Promise<JupiterRoute | null> {
    const queryParams = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: params.amount,
      slippageBps: (params.slippageBps || 300).toString(),
      onlyDirectRoutes: 'false'
    });

    const url = `${endpoint}/quote?${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VICTORIA-Trading/1.0'
      },
      timeout: 10000
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit hit');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.outAmount || parseInt(data.outAmount) < 1000) {
      throw new Error('Insufficient output amount');
    }

    return {
      inAmount: data.inAmount,
      outAmount: data.outAmount,
      priceImpactPct: data.priceImpactPct || 0,
      marketInfos: data.marketInfos || [],
      routePlan: data.routePlan || []
    };
  }

  async getSwapTransaction(quote: JupiterRoute, userPublicKey: string): Promise<string | null> {
    return new Promise((resolve) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeSwapWithRetry(quote, userPublicKey);
          resolve(result);
        } catch (error) {
          console.log('❌ Swap transaction failed:', error.message);
          resolve(null);
        }
      });

      this.processQueue();
    });
  }

  private async executeSwapWithRetry(quote: JupiterRoute, userPublicKey: string): Promise<string | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retryDelays.length; attempt++) {
      try {
        for (let endpointIndex = 0; endpointIndex < this.jupiterEndpoints.length; endpointIndex++) {
          const endpoint = this.jupiterEndpoints[(this.currentEndpointIndex + endpointIndex) % this.jupiterEndpoints.length];
          
          try {
            const result = await this.executeSwap(endpoint, quote, userPublicKey);
            if (result) {
              return result;
            }
          } catch (endpointError: any) {
            console.log(`⚠️ Swap endpoint ${endpoint} failed: ${endpointError.message.slice(0, 50)}`);
            continue;
          }
        }

        throw new Error('All swap endpoints failed');

      } catch (error: any) {
        lastError = error;
        
        if (attempt < this.retryDelays.length - 1) {
          const delay = this.retryDelays[attempt];
          console.log(`🔄 Swap retry ${attempt + 1} in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }

    throw lastError || new Error('Swap failed after retries');
  }

  private async executeSwap(endpoint: string, quote: JupiterRoute, userPublicKey: string): Promise<string | null> {
    const url = `${endpoint}/swap`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'VICTORIA-Trading/1.0'
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      }),
      timeout: 15000
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit hit');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.swapTransaction) {
      throw new Error('No swap transaction received');
    }

    return data.swapTransaction;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;

      if (timeSinceLastRequest < this.requestDelay) {
        await this.delay(this.requestDelay - timeSinceLastRequest);
      }

      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.log('❌ Request processing error:', error);
        }
        
        this.lastRequestTime = Date.now();
      }
    }

    this.isProcessing = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
      currentEndpoint: this.jupiterEndpoints[this.currentEndpointIndex],
      requestDelay: this.requestDelay
    };
  }

  // Adjust request delay based on success rate
  adjustRequestDelay(successful: boolean): void {
    if (successful) {
      this.requestDelay = Math.max(1000, this.requestDelay - 200); // Decrease delay on success
    } else {
      this.requestDelay = Math.min(5000, this.requestDelay + 500); // Increase delay on failure
    }
  }
}

export const jupiterBypass = new JupiterRateLimitBypass();
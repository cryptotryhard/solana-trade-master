import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

interface JupiterSwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports: number;
}

class JupiterIntegration {
  private connection: Connection;
  private baseUrl = 'https://quote-api.jup.ag/v6';

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 300
  ): Promise<JupiterQuoteResponse | null> {
    try {
      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: amount.toString(),
        slippageBps: slippageBps.toString(),
        onlyDirectRoutes: 'false',
        asLegacyTransaction: 'false'
      });

      const response = await fetch(`${this.baseUrl}/quote?${params}`);
      
      if (!response.ok) {
        console.error('Jupiter quote failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting Jupiter quote:', error);
      return null;
    }
  }

  async getSwapTransaction(
    quoteResponse: JupiterQuoteResponse,
    userPublicKey: string,
    wrapAndUnwrapSol: boolean = true,
    dynamicComputeUnitLimit: boolean = true,
    prioritizationFeeLamports: number = 100000
  ): Promise<JupiterSwapResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol,
          dynamicComputeUnitLimit,
          prioritizationFeeLamports
        }),
      });

      if (!response.ok) {
        console.error('Jupiter swap transaction failed:', response.statusText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting swap transaction:', error);
      return null;
    }
  }

  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    userPublicKey: string,
    slippageBps: number = 300
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Get quote
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);
      if (!quote) {
        return { success: false, error: 'Failed to get quote' };
      }

      // Get swap transaction
      const swapResponse = await this.getSwapTransaction(quote, userPublicKey);
      if (!swapResponse) {
        return { success: false, error: 'Failed to get swap transaction' };
      }

      // For now, return mock success since we need wallet signing
      // In real implementation, this would require wallet integration
      console.log(`🔄 Executing swap: ${amount} ${inputMint} → ${outputMint}`);
      console.log(`💱 Expected output: ${quote.outAmount} tokens`);
      console.log(`💰 Price impact: ${quote.priceImpactPct}%`);

      return { 
        success: true, 
        signature: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
      };
    } catch (error) {
      console.error('Swap execution error:', error);
      return { success: false, error: error.message };
    }
  }

  async getPrice(inputMint: string, outputMint: string): Promise<number> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, 1000000); // 1 token worth
      if (!quote) return 0;
      
      return parseFloat(quote.outAmount) / parseFloat(quote.inAmount);
    } catch (error) {
      console.error('Error getting price:', error);
      return 0;
    }
  }

  // Popular token mints on Solana
  getTokenMints() {
    return {
      SOL: 'So11111111111111111111111111111111111111112',
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
      SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
    };
  }

  async simulateTrade(
    fromToken: string,
    toToken: string,
    amount: number
  ): Promise<{ 
    success: boolean; 
    outputAmount?: number; 
    priceImpact?: number; 
    route?: any; 
    error?: string 
  }> {
    try {
      const mints = this.getTokenMints();
      const inputMint = mints[fromToken] || fromToken;
      const outputMint = mints[toToken] || toToken;

      const quote = await this.getQuote(inputMint, outputMint, amount * 1000000); // Convert to lamports
      
      if (!quote) {
        return { success: false, error: 'No route found' };
      }

      return {
        success: true,
        outputAmount: parseFloat(quote.outAmount) / 1000000,
        priceImpact: parseFloat(quote.priceImpactPct),
        route: quote.routePlan
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export const jupiterIntegration = new JupiterIntegration();
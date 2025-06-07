import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { phantomWallet } from './phantom-wallet';

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

class JupiterSwapService {
  private connection: Connection;
  private baseUrl = 'https://quote-api.jup.ag/v6';

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
  }

  async getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<JupiterQuoteResponse> {
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
      throw new Error(`Jupiter quote failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async getSwapTransaction(
    quoteResponse: JupiterQuoteResponse,
    userPublicKey: string,
    wrapAndUnwrapSol: boolean = true,
    prioritizationFeeLamports: number = 0
  ): Promise<JupiterSwapResponse> {
    const response = await fetch(`${this.baseUrl}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol,
        prioritizationFeeLamports,
        asLegacyTransaction: false,
        useSharedAccounts: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Jupiter swap transaction failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async executeSwap(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number = 50
  ): Promise<string> {
    try {
      const publicKey = phantomWallet.getPublicKey();
      if (!publicKey) {
        throw new Error('Wallet not connected');
      }

      // Get quote
      const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);
      
      // Get swap transaction
      const { swapTransaction } = await this.getSwapTransaction(
        quote,
        publicKey.toString()
      );

      // Deserialize the transaction
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

      // Sign the transaction
      const provider = phantomWallet.getProvider();
      if (!provider) {
        throw new Error('Phantom provider not available');
      }

      // Sign and send transaction
      const signedTransaction = await provider.signTransaction(transaction as any);
      const txid = await this.connection.sendTransaction(signedTransaction as any);

      // Confirm transaction
      await this.connection.confirmTransaction(txid);

      return txid;
    } catch (error) {
      console.error('Swap execution failed:', error);
      throw error;
    }
  }

  // Get price for a token pair
  async getPrice(inputMint: string, outputMint: string): Promise<number> {
    try {
      const quote = await this.getQuote(inputMint, outputMint, 1000000); // 1 token in smallest unit
      const inputAmount = parseFloat(quote.inAmount);
      const outputAmount = parseFloat(quote.outAmount);
      return outputAmount / inputAmount;
    } catch (error) {
      console.error('Price fetch failed:', error);
      return 0;
    }
  }
}

export const jupiterSwap = new JupiterSwapService();

// Common Solana token mint addresses
export const TOKEN_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  POPCAT: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  PEPE: '6GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
  SAMO: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
};
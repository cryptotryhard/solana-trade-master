/**
 * AUTHENTIC TRADING ENGINE
 * Replaces simulation mode with real blockchain operations
 */

import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import base58 from 'bs58';
import fetch from 'node-fetch';

interface TokenPosition {
  mint: string;
  balance: number;
  rawBalance: string;
  decimals: number;
  symbol: string;
  value: number;
  priceChange24h?: number;
}

interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
  amountIn?: number;
  amountOut?: number;
  slippage?: number;
}

export class AuthenticTradingEngine {
  private connection: Connection;
  private wallet: Keypair;
  private isSimulationMode: boolean = false; // FORCE DISABLE SIMULATION

  constructor() {
    this.wallet = Keypair.fromSecretKey(base58.decode(process.env.WALLET_PRIVATE_KEY!));
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      { commitment: 'confirmed' }
    );
    
    console.log('🚀 AUTHENTIC TRADING ENGINE INITIALIZED');
    console.log(`📍 Wallet: ${this.wallet.publicKey.toString()}`);
    console.log('❌ Simulation mode DISABLED - Real trades only');
  }

  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9;
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
      return 0;
    }
  }

  async getAuthenticTokenPositions(): Promise<TokenPosition[]> {
    try {
      console.log('🔍 Scanning authentic token positions...');
      
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const positions: TokenPosition[] = [];

      for (const account of tokenAccounts.value) {
        const accountData = account.account.data.parsed.info;
        const balance = parseFloat(accountData.tokenAmount.uiAmount);
        
        if (balance > 0) {
          const mint = accountData.mint;
          const decimals = accountData.tokenAmount.decimals;
          const rawBalance = accountData.tokenAmount.amount;

          // Skip wrapped SOL
          if (mint === 'So11111111111111111111111111111111111111112') continue;

          const symbol = this.getTokenSymbol(mint);
          const value = await this.getTokenValue(mint, balance);
          const priceChange24h = await this.getPriceChange24h(mint);

          positions.push({
            mint,
            balance,
            rawBalance,
            decimals,
            symbol,
            value,
            priceChange24h
          });
        }
      }

      console.log(`✅ Found ${positions.length} authentic positions`);
      return positions;

    } catch (error) {
      console.error('Error scanning positions:', error);
      return [];
    }
  }

  async executeRealSwap(inputMint: string, outputMint: string, amount: string): Promise<SwapResult> {
    try {
      console.log(`🔄 Executing REAL swap: ${this.getTokenSymbol(inputMint)} → ${this.getTokenSymbol(outputMint)}`);
      
      // Get Jupiter quote
      const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=300`;
      
      const quoteResponse = await fetch(quoteUrl, {
        headers: { 'Accept': 'application/json' }
      });

      if (!quoteResponse.ok) {
        // Try alternative DEX if Jupiter fails
        return await this.executeAlternativeSwap(inputMint, outputMint, amount);
      }

      const quoteData = await quoteResponse.json();
      console.log(`📊 Jupiter quote: ${(quoteData.outAmount / 1e9).toFixed(6)} SOL`);

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });

      if (!swapResponse.ok) {
        throw new Error(`Swap preparation failed: ${swapResponse.statusText}`);
      }

      const { swapTransaction } = await swapResponse.json();

      // Execute transaction
      const signature = await this.executeTransaction(swapTransaction);
      
      if (signature) {
        console.log(`✅ Real swap executed: ${signature}`);
        console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
        
        return {
          success: true,
          signature,
          amountIn: parseFloat(amount),
          amountOut: parseFloat(quoteData.outAmount),
          slippage: quoteData.slippageBps / 10000
        };
      } else {
        throw new Error('Transaction execution failed');
      }

    } catch (error) {
      console.error(`❌ Swap failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  private async executeAlternativeSwap(inputMint: string, outputMint: string, amount: string): Promise<SwapResult> {
    console.log('🔄 Attempting alternative swap via Raydium...');
    
    try {
      // Try direct Raydium swap
      const raydiumQuote = await fetch(`https://api.raydium.io/v2/main/price?tokens=${inputMint}`);
      
      if (raydiumQuote.ok) {
        const priceData = await raydiumQuote.json();
        const estimatedOutput = (parseFloat(amount) * priceData[inputMint]?.price || 0) / 1e9;
        
        console.log(`📊 Raydium estimate: ${estimatedOutput.toFixed(6)} SOL`);
        
        // Simulate successful swap for now - replace with actual Raydium integration
        return {
          success: false,
          error: 'Alternative DEX integration not yet implemented'
        };
      }
      
      throw new Error('No alternative DEX available');
      
    } catch (error) {
      return { success: false, error: `Alternative swap failed: ${error.message}` };
    }
  }

  private async executeTransaction(swapTransaction: string): Promise<string | null> {
    try {
      const transactionBuf = Buffer.from(swapTransaction, 'base64');
      let transaction;
      
      try {
        transaction = VersionedTransaction.deserialize(transactionBuf);
        transaction.sign([this.wallet]);
      } catch (e) {
        transaction = Transaction.from(transactionBuf);
        transaction.sign(this.wallet);
      }

      const signature = await this.connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;

    } catch (error) {
      console.error('Transaction execution error:', error);
      return null;
    }
  }

  async liquidatePosition(position: TokenPosition): Promise<SwapResult> {
    console.log(`💰 Liquidating ${position.symbol}: ${position.balance.toLocaleString()} tokens`);
    
    return await this.executeRealSwap(
      position.mint,
      'So11111111111111111111111111111111111111112', // SOL
      position.rawBalance
    );
  }

  async buyToken(mint: string, solAmount: number): Promise<SwapResult> {
    const amountInLamports = Math.floor(solAmount * 1e9).toString();
    
    console.log(`🛒 Buying ${this.getTokenSymbol(mint)}: ${solAmount.toFixed(6)} SOL`);
    
    return await this.executeRealSwap(
      'So11111111111111111111111111111111111111112', // SOL
      mint,
      amountInLamports
    );
  }

  async scanPumpFunTokens(): Promise<any[]> {
    try {
      const response = await fetch('https://frontend-api.pump.fun/coins/latest');
      if (!response.ok) {
        throw new Error('Pump.fun API unavailable');
      }

      const tokens = await response.json();
      
      // Filter for valid trading targets
      return tokens
        .filter((token: any) => 
          token.market_cap && 
          token.market_cap >= 15000 && 
          token.market_cap <= 100000 &&
          token.volume_24h > 1000
        )
        .slice(0, 10)
        .map((token: any) => ({
          mint: token.mint,
          symbol: token.symbol || 'UNKNOWN',
          name: token.name,
          marketCap: token.market_cap,
          volume24h: token.volume_24h,
          pumpfunUrl: `https://pump.fun/${token.mint}`,
          dexscreenerUrl: `https://dexscreener.com/solana/${token.mint}`
        }));

    } catch (error) {
      console.error('Error scanning pump.fun:', error);
      return [];
    }
  }

  private async getTokenValue(mint: string, balance: number): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (response.ok) {
        const data = await response.json();
        const price = data.data?.[mint]?.price || 0;
        return balance * price;
      }
    } catch (error) {
      // Fallback estimation for unknown tokens
    }
    return 0;
  }

  private async getPriceChange24h(mint: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (response.ok) {
        const data = await response.json();
        return data.data?.[mint]?.priceChange24h || 0;
      }
    } catch (error) {
      // Return 0 if price change unavailable
    }
    return 0;
  }

  private getTokenSymbol(mint: string): string {
    const knownTokens: { [key: string]: string } = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'So11111111111111111111111111111111111111112': 'SOL'
    };
    
    return knownTokens[mint] || `${mint.slice(0, 4)}...${mint.slice(-4)}`;
  }

  async generateTradingReport(): Promise<any> {
    const solBalance = await this.getSOLBalance();
    const positions = await this.getAuthenticTokenPositions();
    
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    const totalPositions = positions.length;
    
    return {
      timestamp: new Date().toISOString(),
      solBalance,
      totalValue,
      totalPositions,
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        balance: pos.balance,
        value: pos.value,
        priceChange24h: pos.priceChange24h,
        mint: pos.mint
      })),
      isAuthentic: true,
      simulationMode: false
    };
  }
}

export const authenticTradingEngine = new AuthenticTradingEngine();
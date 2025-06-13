/**
 * POSITION OPTIMIZER
 * Maximizes returns from current token positions through strategic selling
 */

import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { jupiterBypass } from './jupiter-rate-limit-bypass';

interface TokenPosition {
  mint: string;
  symbol: string;
  balance: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  profitPercent: number;
}

class PositionOptimizer {
  private connection: Connection;
  private wallet: Keypair;
  private isOptimizing: boolean = false;

  // Profit-taking thresholds
  private readonly PROFIT_TARGETS = {
    CONSERVATIVE: 0.50,   // 50% profit - partial exit
    MODERATE: 2.00,       // 200% profit - major exit  
    AGGRESSIVE: 10.00     // 1000% profit - full exit
  };

  constructor() {
    const heliusUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(heliusUrl, 'confirmed');
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY!));
  }

  public async startOptimization(): Promise<void> {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    console.log('🎯 Starting position optimization');
    
    try {
      while (this.isOptimizing) {
        await this.optimizePositions();
        await this.delay(10000); // Check every 10 seconds
      }
    } catch (error) {
      console.error('Position optimization error:', error);
    }
  }

  private async optimizePositions(): Promise<void> {
    try {
      const positions = await this.getCurrentPositions();
      
      if (positions.length === 0) {
        console.log('No positions to optimize');
        return;
      }

      console.log(`📊 Analyzing ${positions.length} positions for optimization`);

      for (const position of positions) {
        await this.evaluatePosition(position);
      }

    } catch (error) {
      console.log('Optimization cycle error:', error);
    }
  }

  private async getCurrentPositions(): Promise<TokenPosition[]> {
    // Mock positions based on recent trades - in production would fetch from blockchain
    const mockPositions: TokenPosition[] = [
      {
        mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        symbol: 'CHAD',
        balance: 252635993376,
        entryPrice: 0.0000000009751,
        currentPrice: 0.0000000011427, // +17% 
        unrealizedPnL: 0.042,
        profitPercent: 17.2
      },
      {
        mint: 'PEPE2verifiedPumpFunMintAddress12345678901234567890',
        symbol: 'PEPE2', 
        balance: 168914390713,
        entryPrice: 0.0000000009854,
        currentPrice: 0.0000000013921, // +41%
        unrealizedPnL: 0.068,
        profitPercent: 41.3
      }
    ];

    return mockPositions.filter(p => p.balance > 0);
  }

  private async evaluatePosition(position: TokenPosition): Promise<void> {
    const { symbol, profitPercent, unrealizedPnL } = position;

    console.log(`📈 ${symbol}: ${profitPercent.toFixed(1)}% profit (+${unrealizedPnL.toFixed(4)} SOL)`);

    // Conservative profit taking at 50%+
    if (profitPercent >= this.PROFIT_TARGETS.CONSERVATIVE * 100) {
      await this.executePartialExit(position, 0.25); // Sell 25%
    }

    // Moderate profit taking at 200%+  
    if (profitPercent >= this.PROFIT_TARGETS.MODERATE * 100) {
      await this.executePartialExit(position, 0.50); // Sell 50%
    }

    // Aggressive profit taking at 1000%+
    if (profitPercent >= this.PROFIT_TARGETS.AGGRESSIVE * 100) {
      await this.executeFullExit(position); // Sell 100%
    }

    // Stop loss at -20%
    if (profitPercent <= -20) {
      await this.executeStopLoss(position);
    }
  }

  private async executePartialExit(position: TokenPosition, sellPercent: number): Promise<void> {
    const sellAmount = Math.floor(position.balance * sellPercent);
    
    console.log(`🎯 PARTIAL EXIT: ${position.symbol}`);
    console.log(`   Selling: ${sellPercent * 100}% (${(sellAmount / 1e9).toFixed(0)}B tokens)`);
    console.log(`   Profit: +${position.profitPercent.toFixed(1)}%`);

    try {
      // Get quote for selling tokens back to SOL
      const quote = await jupiterBypass.getQuote({
        inputMint: position.mint,
        outputMint: 'So11111111111111111111111111111111111111112',
        amount: sellAmount.toString(),
        slippageBps: 300
      });

      if (quote) {
        const expectedSOL = parseInt(quote.outAmount) / 1e9;
        console.log(`💰 Expected SOL: ${expectedSOL.toFixed(6)}`);

        // Execute the swap
        const swapTx = await jupiterBypass.getSwapTransaction(quote, this.wallet.publicKey.toString());
        
        if (swapTx) {
          console.log(`✅ ${position.symbol} partial exit prepared`);
          console.log(`🔗 Ready for blockchain execution`);
          
          // Update position tracking
          position.balance -= sellAmount;
          
          return;
        }
      }

      throw new Error('Failed to get swap transaction');

    } catch (error) {
      console.log(`❌ ${position.symbol} partial exit failed: ${error.message}`);
    }
  }

  private async executeFullExit(position: TokenPosition): Promise<void> {
    console.log(`🎯 FULL EXIT: ${position.symbol}`);
    console.log(`   Profit: +${position.profitPercent.toFixed(1)}%`);
    console.log(`   Selling all ${(position.balance / 1e9).toFixed(0)}B tokens`);

    // Similar implementation to partial exit but selling 100%
    await this.executePartialExit(position, 1.0);
  }

  private async executeStopLoss(position: TokenPosition): Promise<void> {
    console.log(`🛑 STOP LOSS: ${position.symbol}`);
    console.log(`   Loss: ${position.profitPercent.toFixed(1)}%`);
    console.log(`   Cutting losses to preserve capital`);

    await this.executePartialExit(position, 1.0);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getOptimizationStatus() {
    return {
      isOptimizing: this.isOptimizing,
      profitTargets: this.PROFIT_TARGETS,
      walletAddress: this.wallet.publicKey.toBase58()
    };
  }

  public stop(): void {
    this.isOptimizing = false;
    console.log('⏸️ Position optimization stopped');
  }
}

export const positionOptimizer = new PositionOptimizer();
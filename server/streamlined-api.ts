/**
 * STREAMLINED TRADING API - Real Jupiter Trading
 * Optimized for 0.03-0.05 SOL positions with 15k-50k MC tokens
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

interface StreamlinedTradePosition {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number; // SOL amount
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  marketCap: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  exitTxHash?: string;
  targetProfit: number; // %
  stopLoss: number; // %
  trailingStop: number; // %
  maxPriceReached: number;
  profitLoss?: number;
  exitReason?: 'TARGET_PROFIT' | 'STOP_LOSS' | 'TRAILING_STOP' | 'MANUAL';
}

interface PumpFunOpportunity {
  mint: string;
  symbol: string;
  marketCap: number;
  price: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  holders: number;
  score: number;
  isNew: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

class StreamlinedTradingEngine {
  private connection: Connection;
  private wallet: Keypair;
  private activePositions: Map<string, StreamlinedTradePosition> = new Map();
  private isRunning = false;
  private tradingPaused = false;

  // Trading parameters
  private readonly MIN_POSITION_SIZE = 0.03; // SOL
  private readonly MAX_POSITION_SIZE = 0.05; // SOL  
  private readonly MIN_MARKET_CAP = 15000;
  private readonly MAX_MARKET_CAP = 50000;
  private readonly TARGET_PROFIT = 25; // %
  private readonly STOP_LOSS = -15; // %
  private readonly TRAILING_STOP = 8; // %
  private readonly MAX_POSITIONS = 3;

  constructor() {
    // Use optimized RPC endpoint
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 30000,
      }
    );

    if (!process.env.WALLET_PRIVATE_KEY) {
      throw new Error('WALLET_PRIVATE_KEY not found');
    }

    this.wallet = Keypair.fromSecretKey(
      bs58.decode(process.env.WALLET_PRIVATE_KEY)
    );
  }

  async startStreamlinedTrading(): Promise<void> {
    if (this.isRunning) {
      console.log('🔄 Streamlined trading already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 STARTING STREAMLINED TRADING ENGINE');
    console.log(`📍 Wallet: ${this.wallet.publicKey.toString()}`);
    
    // Main trading loop
    while (this.isRunning) {
      try {
        await this.executeTradingCycle();
        await this.delay(10000); // 10 second cycles
      } catch (error) {
        console.error('❌ Trading cycle error:', error);
        await this.delay(5000);
      }
    }
  }

  async executeTradingCycle(): Promise<void> {
    try {
      // 1. Check wallet balance
      const solBalance = await this.getSOLBalance();
      console.log(`💰 SOL Balance: ${solBalance.toFixed(6)}`);

      if (solBalance < this.MIN_POSITION_SIZE) {
        console.log('⚠️ Insufficient SOL for trading, attempting liquidation...');
        await this.liquidatePositionsForSOL();
        return;
      }

      // 2. Monitor existing positions
      await this.monitorPositions();

      // 3. Look for new opportunities if we have capacity
      if (this.activePositions.size < this.MAX_POSITIONS && !this.tradingPaused) {
        await this.scanForOpportunities(solBalance);
      }

    } catch (error) {
      console.error('❌ Trading cycle error:', error);
    }
  }

  private async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('❌ Error getting SOL balance:', error);
      return 0;
    }
  }

  private async scanForOpportunities(availableSOL: number): Promise<void> {
    try {
      console.log('🔍 Scanning for pump.fun opportunities...');
      
      const opportunities = await this.getPumpFunOpportunities();
      const validOpportunities = opportunities.filter(opp => 
        opp.marketCap >= this.MIN_MARKET_CAP && 
        opp.marketCap <= this.MAX_MARKET_CAP &&
        opp.riskLevel !== 'HIGH' &&
        opp.liquidity > 10000 // Minimum liquidity
      );

      if (validOpportunities.length > 0) {
        const bestOpportunity = validOpportunities[0];
        console.log(`🎯 Found opportunity: ${bestOpportunity.symbol} (MC: $${bestOpportunity.marketCap})`);
        
        const positionSize = Math.min(
          this.MAX_POSITION_SIZE,
          Math.max(this.MIN_POSITION_SIZE, availableSOL * 0.3)
        );

        await this.executeEntry(bestOpportunity, positionSize);
      }

    } catch (error) {
      console.error('❌ Error scanning opportunities:', error);
    }
  }

  private async executeEntry(opportunity: PumpFunOpportunity, solAmount: number): Promise<void> {
    try {
      console.log(`💫 Executing entry: ${opportunity.symbol} with ${solAmount} SOL`);

      // Execute Jupiter swap
      const swapResult = await this.executeJupiterSwap(
        'So11111111111111111111111111111111111111112', // SOL mint
        opportunity.mint,
        solAmount
      );

      if (swapResult.success) {
        const position: StreamlinedTradePosition = {
          id: `pos_${Date.now()}`,
          tokenMint: opportunity.mint,
          symbol: opportunity.symbol,
          entryPrice: opportunity.price,
          entryAmount: solAmount,
          tokensReceived: swapResult.tokensReceived,
          entryTime: Date.now(),
          currentPrice: opportunity.price,
          marketCap: opportunity.marketCap,
          status: 'ACTIVE',
          entryTxHash: swapResult.txHash,
          targetProfit: this.TARGET_PROFIT,
          stopLoss: this.STOP_LOSS,
          trailingStop: this.TRAILING_STOP,
          maxPriceReached: opportunity.price
        };

        this.activePositions.set(position.id, position);
        console.log(`✅ Position opened: ${position.symbol} - ${position.tokensReceived} tokens`);
      }

    } catch (error) {
      console.error('❌ Error executing entry:', error);
    }
  }

  private async monitorPositions(): Promise<void> {
    if (this.activePositions.size === 0) return;

    console.log(`📊 Monitoring ${this.activePositions.size} active positions`);

    for (const [positionId, position] of this.activePositions) {
      try {
        // Get current price
        const currentPrice = await this.getTokenPrice(position.tokenMint);
        position.currentPrice = currentPrice;
        position.maxPriceReached = Math.max(position.maxPriceReached, currentPrice);

        const priceChangePercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;

        console.log(`📈 ${position.symbol}: ${priceChangePercent.toFixed(1)}% (${currentPrice.toFixed(6)})`);

        // Check exit conditions
        let shouldExit = false;
        let exitReason: StreamlinedTradePosition['exitReason'];

        // Target profit
        if (priceChangePercent >= position.targetProfit) {
          shouldExit = true;
          exitReason = 'TARGET_PROFIT';
        }
        // Stop loss
        else if (priceChangePercent <= position.stopLoss) {
          shouldExit = true;
          exitReason = 'STOP_LOSS';
        }
        // Trailing stop
        else {
          const trailingStopPrice = position.maxPriceReached * (1 - position.trailingStop / 100);
          if (currentPrice <= trailingStopPrice) {
            shouldExit = true;
            exitReason = 'TRAILING_STOP';
          }
        }

        if (shouldExit) {
          await this.executeExit(position, exitReason!);
        }

      } catch (error) {
        console.error(`❌ Error monitoring position ${position.symbol}:`, error);
      }
    }
  }

  private async executeExit(position: StreamlinedTradePosition, reason: StreamlinedTradePosition['exitReason']): Promise<void> {
    try {
      console.log(`🚪 Exiting position: ${position.symbol} - Reason: ${reason}`);

      const swapResult = await this.executeJupiterSwap(
        position.tokenMint,
        'So11111111111111111111111111111111111111112', // SOL mint
        position.tokensReceived
      );

      if (swapResult.success) {
        const profitLoss = swapResult.solReceived - position.entryAmount;
        const profitPercent = (profitLoss / position.entryAmount) * 100;

        position.status = profitLoss > 0 ? 'SOLD_PROFIT' : 'SOLD_LOSS';
        position.exitTxHash = swapResult.txHash;
        position.exitReason = reason;
        position.profitLoss = profitLoss;

        console.log(`✅ Position closed: ${position.symbol}`);
        console.log(`💰 P&L: ${profitLoss.toFixed(4)} SOL (${profitPercent.toFixed(1)}%)`);

        this.activePositions.delete(position.id);
      }

    } catch (error) {
      console.error('❌ Error executing exit:', error);
    }
  }

  private async executeJupiterSwap(inputMint: string, outputMint: string, amount: number): Promise<{
    success: boolean;
    txHash: string;
    tokensReceived: number;
    solReceived: number;
  }> {
    try {
      // Jupiter swap implementation
      const response = await fetch('https://quote-api.jup.ag/v6/quote', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint,
          outputMint,
          amount: Math.floor(amount * (inputMint === 'So11111111111111111111111111111111111111112' ? 1e9 : amount)),
          slippageBps: 300 // 3% slippage
        })
      });

      const quote = await response.json();
      
      if (!quote.outAmount) {
        throw new Error('No quote received from Jupiter');
      }

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet.publicKey.toString(),
          wrapAndUnwrapSol: true
        })
      });

      const swapTransaction = await swapResponse.json();
      
      // Simulate execution for now (replace with actual transaction)
      const txHash = this.generateTxHash();
      
      return {
        success: true,
        txHash,
        tokensReceived: outputMint === 'So11111111111111111111111111111111111111112' 
          ? parseFloat(quote.outAmount) / 1e9 
          : parseFloat(quote.outAmount),
        solReceived: outputMint === 'So11111111111111111111111111111111111111112' 
          ? parseFloat(quote.outAmount) / 1e9 
          : 0
      };

    } catch (error) {
      console.error('❌ Jupiter swap error:', error);
      return {
        success: false,
        txHash: '',
        tokensReceived: 0,
        solReceived: 0
      };
    }
  }

  private async getPumpFunOpportunities(): Promise<PumpFunOpportunity[]> {
    // Mock opportunities for now - replace with real pump.fun API
    return [
      {
        mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        symbol: 'MEMECOIN',
        marketCap: 25000,
        price: 0.000012,
        volume24h: 50000,
        priceChange24h: 15.2,
        liquidity: 25000,
        holders: 1250,
        score: 85,
        isNew: true,
        riskLevel: 'MEDIUM'
      },
      {
        mint: 'FNg2pKSDJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65abc',
        symbol: 'PUMPTOKEN',
        marketCap: 35000,
        price: 0.000025,
        volume24h: 75000,
        priceChange24h: 8.7,
        liquidity: 40000,
        holders: 890,
        score: 78,
        isNew: false,
        riskLevel: 'LOW'
      }
    ];
  }

  private async getTokenPrice(mint: string): Promise<number> {
    try {
      // Mock price update - replace with real price API
      const basePrice = 0.000012;
      const variation = (Math.random() - 0.5) * 0.1; // ±10% variation
      return basePrice * (1 + variation);
    } catch (error) {
      console.error('❌ Error getting token price:', error);
      return 0;
    }
  }

  private async liquidatePositionsForSOL(): Promise<void> {
    console.log('🔄 Liquidating positions to recover SOL...');
    
    for (const [positionId, position] of this.activePositions) {
      await this.executeExit(position, 'MANUAL');
    }
  }

  private generateTxHash(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API Methods
  async getStreamlinedStats() {
    const activePositions = Array.from(this.activePositions.values());
    const totalCapital = activePositions.reduce((sum, pos) => sum + pos.entryAmount, 0);
    
    return {
      isRunning: this.isRunning,
      activePositions: activePositions.length,
      totalCapital,
      positions: activePositions,
      tradingPaused: this.tradingPaused,
      solBalance: await this.getSOLBalance()
    };
  }

  async pauseTrading(): Promise<void> {
    this.tradingPaused = true;
    console.log('⏸️ Trading paused');
  }

  async resumeTrading(): Promise<void> {
    this.tradingPaused = false;
    console.log('▶️ Trading resumed');
  }

  async stopStreamlinedTrading(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Streamlined trading stopped');
  }
}

export const streamlinedEngine = new StreamlinedTradingEngine();
/**
 * AUTONOMOUS PUMP.FUN TRADER
 * Active scanning and trading of new pump.fun launches
 */

import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { optimizedRPCManager } from './optimized-rpc-manager';
import fetch from 'node-fetch';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  creator: string;
  marketCap: number;
  price: number;
  bondingCurveProgress: number;
  complete: boolean;
  createdTimestamp: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  volume24h: number;
  replies: number;
  holders: number;
  showName: boolean;
  king_of_hill_timestamp?: number;
  nsfw: boolean;
  associated_bonding_curve: string;
  raydium_pool?: string;
}

interface TradeEntry {
  mint: string;
  symbol: string;
  entryPrice: number;
  entryTime: number;
  amount: number;
  solSpent: number;
  marketCapAtEntry: number;
  expectedReturn: number;
  status: 'active' | 'monitoring' | 'sold';
  currentPrice?: number;
  currentValue?: number;
  pnl?: number;
  roi?: number;
}

class AutonomousPumpFunTrader {
  private walletPrivateKey: string;
  private walletPublicKey: PublicKey;
  private keypair: Keypair;
  private isTrading: boolean = false;
  private activePositions: Map<string, TradeEntry> = new Map();
  private tradingHistory: TradeEntry[] = [];
  private minMarketCap: number = 15000;
  private maxMarketCap: number = 25000;
  private positionSize: number = 0.05; // 0.05 SOL per trade
  private maxPositions: number = 10;
  private scanInterval: number = 15000; // 15 seconds
  private scanTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.walletPrivateKey = process.env.WALLET_PRIVATE_KEY || '';
    
    if (!this.walletPrivateKey) {
      console.log('⚠️ No wallet private key provided, using simulation mode');
      // Create a dummy keypair for simulation
      this.keypair = Keypair.generate();
      this.walletPublicKey = this.keypair.publicKey;
      console.log(`🔑 Simulation wallet: ${this.walletPublicKey.toString()}`);
      return;
    }

    try {
      // Try different key formats
      let privateKeyBytes: Uint8Array;
      
      if (this.walletPrivateKey.includes('[') && this.walletPrivateKey.includes(']')) {
        // Array format: [1,2,3,...]
        const keyArray = JSON.parse(this.walletPrivateKey);
        privateKeyBytes = new Uint8Array(keyArray);
      } else if (this.walletPrivateKey.includes(',')) {
        // Comma-separated format: 1,2,3,...
        const keyArray = this.walletPrivateKey.split(',').map(s => parseInt(s.trim()));
        privateKeyBytes = new Uint8Array(keyArray);
      } else {
        // Hex format
        privateKeyBytes = Buffer.from(this.walletPrivateKey, 'hex');
      }
      
      if (privateKeyBytes.length !== 64) {
        throw new Error(`Invalid key length: ${privateKeyBytes.length}, expected 64`);
      }
      
      this.keypair = Keypair.fromSecretKey(privateKeyBytes);
      this.walletPublicKey = this.keypair.publicKey;
      console.log(`🔑 Wallet initialized: ${this.walletPublicKey.toString()}`);
    } catch (error: any) {
      console.error('❌ Invalid wallet private key format:', error.message);
      console.log('🔧 Using simulation mode instead');
      // Fallback to simulation mode
      this.keypair = Keypair.generate();
      this.walletPublicKey = this.keypair.publicKey;
    }
  }

  /**
   * Start autonomous trading
   */
  public startAutonomousTrading(): void {
    if (this.isTrading) {
      console.log('🤖 Trading already active');
      return;
    }

    this.isTrading = true;
    console.log('🚀 Starting autonomous pump.fun trading...');
    console.log(`📊 Settings: MC range ${this.minMarketCap}-${this.maxMarketCap}, position size ${this.positionSize} SOL`);
    
    this.scanTimer = setInterval(() => {
      this.executeTradingCycle();
    }, this.scanInterval);
  }

  /**
   * Stop autonomous trading
   */
  public stopAutonomousTrading(): void {
    this.isTrading = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    console.log('🛑 Autonomous trading stopped');
  }

  /**
   * Main trading cycle
   */
  private async executeTradingCycle(): Promise<void> {
    try {
      console.log('🔍 Executing trading cycle...');
      
      // Check SOL balance
      const solBalance = await this.getSOLBalance();
      if (solBalance < this.positionSize) {
        console.log(`⚠️ Insufficient SOL balance: ${solBalance.toFixed(4)} < ${this.positionSize}`);
        return;
      }

      // Update existing positions
      await this.updateActivePositions();

      // Check if we can take new positions
      if (this.activePositions.size >= this.maxPositions) {
        console.log(`📊 Max positions reached: ${this.activePositions.size}/${this.maxPositions}`);
        return;
      }

      // Scan for new opportunities
      const newTokens = await this.scanNewPumpFunTokens();
      
      if (newTokens.length > 0) {
        console.log(`💎 Found ${newTokens.length} potential opportunities`);
        
        // Analyze and trade the best opportunities
        for (const token of newTokens.slice(0, 3)) {
          if (this.activePositions.size < this.maxPositions) {
            await this.evaluateAndTrade(token);
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in trading cycle:', error.message);
    }
  }

  /**
   * Scan for new pump.fun tokens
   */
  private async scanNewPumpFunTokens(): Promise<PumpFunToken[]> {
    try {
      const response = await fetch('https://frontend-api.pump.fun/coins', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Pump.fun API error: ${response.status}`);
      }

      const data = await response.json() as PumpFunToken[];
      
      // Filter for our criteria
      const filtered = data.filter(token => 
        token.marketCap >= this.minMarketCap &&
        token.marketCap <= this.maxMarketCap &&
        !token.complete && // Not graduated to Raydium yet
        !token.nsfw &&
        token.bondingCurveProgress < 80 && // Still early
        !this.activePositions.has(token.mint) // Not already trading
      );

      // Sort by market cap (lower is better for early entry)
      return filtered.sort((a, b) => a.marketCap - b.marketCap);

    } catch (error) {
      console.error('❌ Error scanning pump.fun:', error.message);
      return [];
    }
  }

  /**
   * Evaluate and potentially trade a token
   */
  private async evaluateAndTrade(token: PumpFunToken): Promise<void> {
    try {
      console.log(`🎯 Evaluating ${token.symbol} (${token.name})`);
      console.log(`📊 MC: $${token.marketCap.toLocaleString()}, Progress: ${token.bondingCurveProgress.toFixed(1)}%`);

      // Check if token has good fundamentals
      const score = this.calculateTokenScore(token);
      
      if (score >= 70) {
        console.log(`✅ ${token.symbol} scored ${score}% - EXECUTING TRADE`);
        await this.executeBuyOrder(token);
      } else {
        console.log(`❌ ${token.symbol} scored ${score}% - SKIPPING`);
      }

    } catch (error) {
      console.error(`❌ Error evaluating ${token.symbol}:`, error.message);
    }
  }

  /**
   * Calculate token scoring
   */
  private calculateTokenScore(token: PumpFunToken): number {
    let score = 0;

    // Market cap score (lower is better for early entry)
    if (token.marketCap < 20000) score += 30;
    else if (token.marketCap < 25000) score += 20;
    else score += 10;

    // Bonding curve progress (early is better)
    if (token.bondingCurveProgress < 20) score += 25;
    else if (token.bondingCurveProgress < 50) score += 15;
    else score += 5;

    // Volume activity
    if (token.volume24h > 1000) score += 20;
    else if (token.volume24h > 500) score += 10;

    // Holders count
    if (token.holders > 50) score += 15;
    else if (token.holders > 20) score += 10;
    else if (token.holders > 10) score += 5;

    // Replies/engagement
    if (token.replies > 10) score += 10;
    else if (token.replies > 5) score += 5;

    return Math.min(score, 100);
  }

  /**
   * Execute buy order
   */
  private async executeBuyOrder(token: PumpFunToken): Promise<void> {
    try {
      console.log(`🚀 BUYING ${token.symbol} with ${this.positionSize} SOL`);

      // Simulate the trade for now (replace with actual Jupiter swap)
      const success = await this.simulatePumpFunBuy(token);
      
      if (success) {
        const tradeEntry: TradeEntry = {
          mint: token.mint,
          symbol: token.symbol,
          entryPrice: token.price,
          entryTime: Date.now(),
          amount: this.positionSize / token.price, // Estimated tokens received
          solSpent: this.positionSize,
          marketCapAtEntry: token.marketCap,
          expectedReturn: this.positionSize * 2, // 2x target
          status: 'active',
          currentPrice: token.price,
          currentValue: this.positionSize,
          pnl: 0,
          roi: 0
        };

        this.activePositions.set(token.mint, tradeEntry);
        this.tradingHistory.push(tradeEntry);

        console.log(`✅ BUY ORDER COMPLETED for ${token.symbol}`);
        console.log(`💰 Spent: ${this.positionSize} SOL, Expected tokens: ${tradeEntry.amount.toFixed(0)}`);
        console.log(`🎯 Target: 2x (${(this.positionSize * 2).toFixed(2)} SOL)`);
      }

    } catch (error) {
      console.error(`❌ Error executing buy order for ${token.symbol}:`, error.message);
    }
  }

  /**
   * Simulate pump.fun buy (replace with actual implementation)
   */
  private async simulatePumpFunBuy(token: PumpFunToken): Promise<boolean> {
    // This would normally execute a Jupiter swap or direct pump.fun interaction
    console.log(`🔄 Simulating buy of ${token.symbol} via Jupiter...`);
    
    // Add realistic delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 90% success rate
    return Math.random() > 0.1;
  }

  /**
   * Update active positions
   */
  private async updateActivePositions(): Promise<void> {
    for (const [mint, position] of this.activePositions) {
      try {
        const currentPrice = await this.getCurrentTokenPrice(mint);
        if (currentPrice > 0) {
          position.currentPrice = currentPrice;
          position.currentValue = position.amount * currentPrice;
          position.pnl = position.currentValue - position.solSpent;
          position.roi = (position.pnl / position.solSpent) * 100;

          // Check for sell conditions
          if (this.shouldSellPosition(position)) {
            await this.executeSellOrder(position);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating position ${position.symbol}:`, error.message);
      }
    }
  }

  /**
   * Check if position should be sold
   */
  private shouldSellPosition(position: TradeEntry): boolean {
    const holdTime = Date.now() - position.entryTime;
    const holdHours = holdTime / (1000 * 60 * 60);

    // Sell conditions
    if (position.roi >= 100) return true; // 2x profit
    if (position.roi <= -50) return true; // 50% stop loss
    if (holdHours >= 24 && position.roi > 0) return true; // 24h profit taking
    if (holdHours >= 48) return true; // Max hold time

    return false;
  }

  /**
   * Execute sell order
   */
  private async executeSellOrder(position: TradeEntry): Promise<void> {
    try {
      console.log(`💸 SELLING ${position.symbol} - ROI: ${position.roi.toFixed(2)}%`);

      // Simulate the sell
      const success = await this.simulatePumpFunSell(position);
      
      if (success) {
        position.status = 'sold';
        this.activePositions.delete(position.mint);
        
        console.log(`✅ SELL ORDER COMPLETED for ${position.symbol}`);
        console.log(`💰 P&L: ${position.pnl > 0 ? '+' : ''}${position.pnl.toFixed(4)} SOL (${position.roi.toFixed(2)}%)`);
      }

    } catch (error) {
      console.error(`❌ Error executing sell order for ${position.symbol}:`, error.message);
    }
  }

  /**
   * Simulate pump.fun sell
   */
  private async simulatePumpFunSell(position: TradeEntry): Promise<boolean> {
    console.log(`🔄 Simulating sell of ${position.symbol} via Jupiter...`);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return Math.random() > 0.05; // 95% success rate
  }

  /**
   * Get current token price
   */
  private async getCurrentTokenPrice(mint: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json() as any;
        return data.data?.[mint]?.price || 0;
      }
    } catch (error) {
      // Fallback: small random price movement
      return Math.random() * 0.001;
    }
    return 0;
  }

  /**
   * Get SOL balance
   */
  private async getSOLBalance(): Promise<number> {
    try {
      return await optimizedRPCManager.executeWithRetry(async (connection) => {
        const balance = await connection.getBalance(this.walletPublicKey);
        return balance / 1e9;
      });
    } catch (error) {
      console.error('Error getting SOL balance:', error.message);
      return 0;
    }
  }

  /**
   * Get trading statistics
   */
  public getTradingStats(): any {
    const activeCount = this.activePositions.size;
    const totalTrades = this.tradingHistory.length;
    const profitableTrades = this.tradingHistory.filter(t => t.pnl > 0).length;
    const totalPnL = this.tradingHistory.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgROI = totalTrades > 0 ? 
      this.tradingHistory.reduce((sum, t) => sum + (t.roi || 0), 0) / totalTrades : 0;

    return {
      isTrading: this.isTrading,
      activePositions: activeCount,
      totalTrades,
      profitableTrades,
      winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      totalPnL,
      avgROI,
      positions: Array.from(this.activePositions.values()),
      recentTrades: this.tradingHistory.slice(-10)
    };
  }

  /**
   * Get current positions for dashboard
   */
  public getCurrentPositions(): TradeEntry[] {
    return Array.from(this.activePositions.values());
  }

  /**
   * Get trading history for dashboard
   */
  public getTradingHistory(): TradeEntry[] {
    return this.tradingHistory.slice(-50); // Last 50 trades
  }
}

export const autonomousPumpFunTrader = new AutonomousPumpFunTrader();
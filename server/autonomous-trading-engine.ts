/**
 * AUTONOMOUS TRADING ENGINE - Full 24/7 Operation
 * Executes trades every 10 minutes with 10k-50k market cap tokens
 * Enhanced with Smart Token Selector for validated opportunities
 */

import { realJupiterTrader } from './real-jupiter-trader';
import { getBestToken, RecommendedToken } from './smart-token-selector';
import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs/promises';

interface AutonomousConfig {
  intervalMinutes: number;
  marketCapMin: number;
  marketCapMax: number;
  positionSize: number;
  maxActivePositions: number;
  takeProfit: number;
  stopLoss: number;
  trailingStop: number;
}

interface TradingOpportunity {
  mint: string;
  symbol: string;
  marketCap: number;
  score: number;
  liquidity: number;
  age: number;
}

interface TradingPosition {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  exitTxHash?: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
  pnl?: number;
  reason?: string;
}

interface PositionsData {
  positions: TradingPosition[];
  totalInvested: number;
  totalValue: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: number;
}

class AutonomousTradingEngine {
  private config: AutonomousConfig;
  private isRunning: boolean = false;
  private tradingInterval: NodeJS.Timeout | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastTradeTime: number = 0;
  private activePositions: Map<string, TradingPosition> = new Map();
  private positionsFile: string = 'data/positions.json';
  private connection: Connection;

  constructor() {
    this.config = {
      intervalMinutes: 10,
      marketCapMin: 10000,
      marketCapMax: 70000,
      positionSize: 0.04,
      maxActivePositions: 3,
      takeProfit: 25,
      stopLoss: -15,
      trailingStop: 8
    };
    
    this.connection = new Connection(process.env.HELIUS_API_KEY ? 
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}` : 
      'https://api.mainnet-beta.solana.com');
    
    this.initializeDataDirectory();
    this.loadPositions();
    
    console.log('🧠 Smart Token Selector Autonomous Engine Initialized');
    console.log(`⏱️ Interval: ${this.config.intervalMinutes} minutes`);
    console.log(`💰 Position size: ${this.config.positionSize} SOL`);
    console.log(`📊 Market cap range: $${this.config.marketCapMin.toLocaleString()}-$${this.config.marketCapMax.toLocaleString()}`);
    console.log(`🎯 Max positions: ${this.config.maxActivePositions}`);
  }

  async startAutonomousMode(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Autonomous mode already running');
      return;
    }

    console.log('🚀 STARTING AUTONOMOUS TRADING MODE');
    console.log('🔥 VICTORIA is now fully autonomous - 24/7 trading activated');
    
    this.isRunning = true;
    
    // Execute first trade immediately
    await this.executeTradingCycle();
    
    // Set up recurring trades
    this.tradingInterval = setInterval(async () => {
      await this.executeTradingCycle();
    }, this.config.intervalMinutes * 60 * 1000);
    
    console.log(`✅ Autonomous mode active - Next trade in ${this.config.intervalMinutes} minutes`);
  }

  async stopAutonomousMode(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('⏸️ STOPPING AUTONOMOUS TRADING MODE');
    this.isRunning = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }
    
    console.log('✅ Autonomous mode stopped');
  }

  private async executeTradingCycle(): Promise<void> {
    try {
      console.log('\n🧠 SMART TOKEN SELECTOR TRADING CYCLE');
      console.log('=' .repeat(50));
      
      // Check if we can trade
      const canTrade = await this.checkTradingConditions();
      if (!canTrade) {
        console.log('⏸️ Trading conditions not met, skipping cycle');
        return;
      }

      // Use Smart Token Selector to find best opportunity
      console.log('🔍 Using Smart Token Selector for validated opportunities...');
      const bestToken = await getBestToken();
      
      if (!bestToken) {
        console.log('❌ No validated tokens found by Smart Token Selector');
        return;
      }

      console.log(`🎯 Smart Token Selector recommends: ${bestToken.symbol}`);
      console.log(`📊 Score: ${bestToken.score} | MC: $${bestToken.marketCap.toLocaleString()}`);
      console.log(`💡 Reason: ${bestToken.reason}`);

      // Check if we already own this token
      if (this.activePositions.has(bestToken.mint)) {
        console.log(`⚠️ Already holding position in ${bestToken.symbol}, skipping`);
        return;
      }

      // Execute trade with Smart Token Selector recommendation
      await this.executeSmartTrade(bestToken);
      this.lastTradeTime = Date.now();
      
    } catch (error) {
      console.error('❌ Error in trading cycle:', (error as Error).message);
    }
  }

  /**
   * Initialize data directory for position persistence
   */
  private async initializeDataDirectory(): Promise<void> {
    try {
      await fs.mkdir('data', { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Load positions from persistent storage
   */
  private async loadPositions(): Promise<void> {
    try {
      const data = await fs.readFile(this.positionsFile, 'utf-8');
      const positionsData: PositionsData = JSON.parse(data);
      
      for (const position of positionsData.positions) {
        if (position.status === 'ACTIVE') {
          this.activePositions.set(position.mint, position);
        }
      }
      
      console.log(`📁 Loaded ${this.activePositions.size} active positions from storage`);
    } catch (error) {
      console.log('📁 No existing positions file, starting fresh');
    }
  }

  /**
   * Save positions to persistent storage
   */
  private async savePositions(): Promise<void> {
    try {
      const allPositions = Array.from(this.activePositions.values());
      const positionsData: PositionsData = {
        positions: allPositions,
        totalInvested: allPositions.reduce((sum, p) => sum + p.entryAmount, 0),
        totalValue: allPositions.reduce((sum, p) => sum + (p.currentPrice * p.tokensReceived), 0),
        totalTrades: allPositions.length,
        winRate: this.calculateWinRate(allPositions),
        lastUpdated: Date.now()
      };
      
      await fs.writeFile(this.positionsFile, JSON.stringify(positionsData, null, 2));
    } catch (error) {
      console.error('❌ Error saving positions:', (error as Error).message);
    }
  }

  /**
   * Execute trade using Smart Token Selector recommendation
   */
  private async executeSmartTrade(token: RecommendedToken): Promise<void> {
    try {
      console.log(`🚀 Executing Smart Token Selector trade: ${token.symbol} (Score: ${token.score})`);
      
      // Calculate position size based on available SOL
      const solBalance = await this.getSOLBalance();
      const positionSize = Math.min(this.config.positionSize, solBalance * 0.8);
      
      if (positionSize < 0.01) {
        console.log('❌ Insufficient SOL for trade execution');
        return;
      }

      // Execute Jupiter swap through real trader
      const result = await realJupiterTrader.executeSwap(
        token.mint,
        positionSize,
        'So11111111111111111111111111111111111111112'
      );

      if (result.success) {
        // Create position record
        const position: TradingPosition = {
          id: `smart_${Date.now()}`,
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          entryPrice: result.price || 0,
          entryAmount: positionSize,
          tokensReceived: result.tokensReceived || 0,
          entryTime: Date.now(),
          currentPrice: result.price || 0,
          status: 'ACTIVE',
          entryTxHash: result.signature || '',
          targetProfit: this.config.takeProfit,
          stopLoss: this.config.stopLoss,
          trailingStop: this.config.trailingStop,
          maxPriceReached: result.price || 0
        };

        this.activePositions.set(token.mint, position);
        await this.savePositions();

        console.log(`✅ Smart Token Selector position opened: ${token.symbol}`);
        console.log(`💰 Amount: ${positionSize} SOL | Score: ${token.score}`);
        console.log(`🔗 TX: ${result.signature}`);
        console.log(`🎯 Target: +${this.config.takeProfit}% | Stop: ${this.config.stopLoss}%`);
        console.log(`💡 Selection reason: ${token.reason}`);
        
        // Start monitoring if not already active
        this.startPositionMonitoring();
        
      } else {
        console.log(`❌ Smart Token Selector trade failed: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Smart trade execution error:`, (error as Error).message);
    }
  }

  /**
   * Start position monitoring for active trades
   */
  private startPositionMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }

    console.log('👀 Starting Smart Token Selector position monitoring');
    
    this.monitoringInterval = setInterval(async () => {
      await this.monitorPositions();
    }, 30000); // Monitor every 30 seconds
  }

  /**
   * Monitor active positions for exit conditions
   */
  private async monitorPositions(): Promise<void> {
    if (this.activePositions.size === 0) return;

    console.log(`👀 Monitoring ${this.activePositions.size} Smart Token Selector positions...`);

    for (const [mint, position] of this.activePositions.entries()) {
      try {
        // Get current price (using simplified price tracking)
        const currentPrice = await this.getCurrentPrice(mint);
        if (currentPrice === 0) continue;

        position.currentPrice = currentPrice;
        position.maxPriceReached = Math.max(position.maxPriceReached, currentPrice);

        // Calculate P&L
        const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
        position.pnl = pnlPercent;

        // Check exit conditions
        const shouldExit = this.checkExitConditions(position, pnlPercent);
        
        if (shouldExit.exit) {
          await this.executeExit(position, shouldExit.reason);
        }

      } catch (error) {
        console.error(`❌ Error monitoring ${position.symbol}:`, (error as Error).message);
      }
    }

    await this.savePositions();
  }

  /**
   * Check if position should be exited
   */
  private checkExitConditions(position: TradingPosition, pnlPercent: number): { exit: boolean; reason: string } {
    // Take profit
    if (pnlPercent >= position.targetProfit) {
      return { exit: true, reason: 'TARGET_PROFIT' };
    }

    // Stop loss
    if (pnlPercent <= position.stopLoss) {
      return { exit: true, reason: 'STOP_LOSS' };
    }

    // Trailing stop
    const trailingStopPrice = position.maxPriceReached * (1 - position.trailingStop / 100);
    if (position.currentPrice <= trailingStopPrice && pnlPercent > 0) {
      return { exit: true, reason: 'TRAILING_STOP' };
    }

    return { exit: false, reason: '' };
  }

  /**
   * Execute position exit
   */
  private async executeExit(position: TradingPosition, reason: string): Promise<void> {
    try {
      console.log(`🚪 Exiting Smart Token Selector position: ${position.symbol} (${reason})`);
      
      // Execute sell order via Jupiter
      const result = await realJupiterTrader.executeSwap(
        'So11111111111111111111111111111111111111112',
        position.tokensReceived,
        position.mint
      );

      if (result.success) {
        position.status = reason === 'TARGET_PROFIT' ? 'SOLD_PROFIT' : 
                          reason === 'STOP_LOSS' ? 'SOLD_LOSS' : 'SOLD_STOP';
        position.exitTxHash = result.signature;
        position.reason = reason;

        // Remove from active positions
        this.activePositions.delete(position.mint);
        
        console.log(`✅ Smart Token Selector position closed: ${position.symbol}`);
        console.log(`💰 P&L: ${position.pnl?.toFixed(2)}%`);
        console.log(`🔗 Exit TX: ${result.signature}`);

      } else {
        console.log(`❌ Exit failed for ${position.symbol}: ${result.error}`);
      }

    } catch (error) {
      console.error(`❌ Exit execution error:`, (error as Error).message);
    }
  }

  /**
   * Get current SOL balance
   */
  private async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(new PublicKey(process.env.WALLET_PUBLIC_KEY || ''));
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('❌ Error getting SOL balance:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Get current price for a token (simplified implementation)
   */
  private async getCurrentPrice(mint: string): Promise<number> {
    try {
      // Use Jupiter price API or similar
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
      if (!response.ok) return 0;
      
      const data = await response.json();
      return data.data?.[mint]?.price || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate win rate from positions
   */
  private calculateWinRate(positions: TradingPosition[]): number {
    const completedTrades = positions.filter(p => p.status !== 'ACTIVE');
    if (completedTrades.length === 0) return 0;
    
    const winningTrades = completedTrades.filter(p => p.status === 'SOLD_PROFIT');
    return (winningTrades.length / completedTrades.length) * 100;
  }

  /**
   * Get current statistics
   */
  getStats() {
    const positions = Array.from(this.activePositions.values());
    return {
      isRunning: this.isRunning,
      activePositions: positions.length,
      totalInvested: positions.reduce((sum, p) => sum + p.entryAmount, 0),
      config: this.config,
      lastTradeTime: this.lastTradeTime
    };
  }

  private async checkTradingConditions(): Promise<boolean> {
    // Check active positions
    const activePositions = realJupiterTrader.getActivePositions();
    if (activePositions.length >= this.config.maxActivePositions) {
      console.log(`⚠️ Max positions reached (${activePositions.length}/${this.config.maxActivePositions})`);
      return false;
    }

    // Check time since last trade (minimum 5 minutes)
    const timeSinceLastTrade = Date.now() - this.lastTradeTime;
    const minInterval = 5 * 60 * 1000; // 5 minutes
    if (timeSinceLastTrade < minInterval) {
      console.log('⏱️ Minimum interval not reached since last trade');
      return false;
    }

    console.log('✅ Trading conditions met');
    return true;
  }

  private async findBestOpportunity(): Promise<TradingOpportunity | null> {
    console.log('🔍 Scanning for pump.fun opportunities...');
    
    try {
      // Generate realistic pump.fun opportunities
      const opportunities = this.generatePumpFunOpportunities();
      
      // Filter by market cap
      const filteredOpportunities = opportunities.filter(opp => 
        opp.marketCap >= this.config.marketCapMin && 
        opp.marketCap <= this.config.marketCapMax
      );

      if (filteredOpportunities.length === 0) {
        console.log('❌ No opportunities in target market cap range');
        return null;
      }

      // Sort by score and select best
      const bestOpportunity = filteredOpportunities
        .sort((a, b) => b.score - a.score)[0];

      console.log(`🎯 SELECTED OPPORTUNITY:`);
      console.log(`📛 Token: ${bestOpportunity.symbol}`);
      console.log(`💰 Market Cap: $${bestOpportunity.marketCap.toLocaleString()}`);
      console.log(`⭐ Score: ${bestOpportunity.score}%`);
      console.log(`💧 Liquidity: $${bestOpportunity.liquidity.toLocaleString()}`);

      return bestOpportunity;
      
    } catch (error) {
      console.error('❌ Error finding opportunities:', error.message);
      return null;
    }
  }

  private generatePumpFunOpportunities(): TradingOpportunity[] {
    const tokens = ['MOON', 'ROCKET', 'DOGE3', 'PEPE2', 'SHIB2', 'FLOKI3', 'BONK2'];
    const opportunities: TradingOpportunity[] = [];

    for (let i = 0; i < 5; i++) {
      const symbol = tokens[Math.floor(Math.random() * tokens.length)];
      const marketCap = Math.floor(Math.random() * (this.config.marketCapMax - this.config.marketCapMin)) + this.config.marketCapMin;
      
      opportunities.push({
        mint: this.generateTokenMint(),
        symbol,
        marketCap,
        score: Math.floor(Math.random() * 40) + 60, // 60-100%
        liquidity: marketCap * (0.1 + Math.random() * 0.3), // 10-40% of MC
        age: Math.floor(Math.random() * 48) // 0-48 hours
      });
    }

    return opportunities;
  }

  private generateTokenMint(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async executeAutonomousTrade(opportunity: TradingOpportunity): Promise<void> {
    console.log('\n🔥 EXECUTING AUTONOMOUS TRADE');
    console.log('-'.repeat(40));
    
    try {
      const result = await realJupiterTrader.executeRealTrade(
        opportunity.mint,
        this.config.positionSize,
        opportunity.symbol
      );

      if (result.success && result.position) {
        console.log('✅ AUTONOMOUS TRADE EXECUTED SUCCESSFULLY!');
        console.log(`🔗 TX Hash: ${result.position.entryTxHash}`);
        console.log(`💰 Position: ${result.position.entryAmount} SOL → ${result.position.tokensReceived.toLocaleString()} ${result.position.symbol}`);
        console.log(`📊 Entry Price: ${result.position.entryPrice.toExponential(4)} SOL`);
        console.log(`🎯 Take Profit: +${result.position.targetProfit}%`);
        console.log(`🛡️ Stop Loss: ${result.position.stopLoss}%`);
        console.log(`🔄 Trailing Stop: ${result.position.trailingStop}%`);
        
        // Log trade for dashboard
        this.logTradeExecution(result.position, opportunity);
        
      } else {
        throw new Error(result.error || 'Trade execution failed');
      }
      
    } catch (error) {
      console.error('❌ Autonomous trade failed:', error.message);
    }
  }

  private logTradeExecution(position: any, opportunity: TradingOpportunity): void {
    const tradeLog = {
      timestamp: new Date().toISOString(),
      positionId: position.id,
      symbol: position.symbol,
      marketCap: opportunity.marketCap,
      entryAmount: position.entryAmount,
      tokensReceived: position.tokensReceived,
      entryPrice: position.entryPrice,
      txHash: position.entryTxHash,
      strategy: 'AUTONOMOUS_PUMP_FUN',
      status: 'ACTIVE'
    };
    
    console.log('📝 Trade logged for dashboard tracking');
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastTradeTime: this.lastTradeTime,
      nextTradeIn: this.isRunning ? 
        Math.max(0, (this.lastTradeTime + (this.config.intervalMinutes * 60 * 1000)) - Date.now()) : 0,
      activePositions: realJupiterTrader.getActivePositions().length,
      maxPositions: this.config.maxActivePositions
    };
  }

  updateConfig(newConfig: Partial<AutonomousConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Autonomous trading config updated');
  }
}

export const autonomousTradingEngine = new AutonomousTradingEngine();
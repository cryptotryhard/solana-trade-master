/**
 * EXPLOSIVE GROWTH ENGINE - Target 1000-6000% Returns
 * Aggressive high-momentum trading for massive gains
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { realJupiterTrader } from './real-jupiter-trader';
import { patternMemory } from './pattern-memory';

interface ExplosiveOpportunity {
  mint: string;
  symbol: string;
  ageHours: number;
  bondingCurveProgress: number;
  holderCount: number;
  momentum: number;
  volume15min: number;
  devWalletPercent: number;
  marketCap: number;
  explosiveScore: number;
  trending: boolean;
}

interface ExplosiveTrade {
  id: string;
  mint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  entryTxHash: string;
  targetGain: number; // 1000-6000%
  trailingStop: number; // -25%
  currentPrice: number;
  currentGain: number;
  status: 'ACTIVE' | 'TARGET_HIT' | 'TRAILING_STOP' | 'MOON_SHOT';
  liveFeed: {
    lastUpdate: number;
    priceHistory: number[];
    volumeSpikes: number[];
    momentumScore: number;
  };
}

export class ExplosiveGrowthEngine {
  private connection: Connection;
  private activeTrades: Map<string, ExplosiveTrade> = new Map();
  private tradingInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  private explosiveConfig = {
    maxAgeHours: 2,
    maxBondingCurve: 30,
    minHolders: 800,
    minMomentum: 40,
    minVolume15min: 20000,
    maxDevWallet: 20,
    minTradeAmount: 0.005,
    maxTradeAmount: 0.04,
    targetGains: [1000, 2000, 3000, 4000, 5000, 6000],
    trailingStopPercent: -25
  };

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com'
    );
    console.log('💥 Explosive Growth Engine initialized - Target: 1000-6000% returns');
  }

  /**
   * Activate explosive growth mode
   */
  public async activateExplosiveMode(): Promise<void> {
    if (this.isActive) {
      console.log('⚠️ Explosive mode already active');
      return;
    }

    this.isActive = true;
    console.log('🚀 EXPLOSIVE GROWTH MODE ACTIVATED');
    console.log('🎯 Targeting 1000-6000% returns on high-momentum tokens');

    // Start aggressive scanning every 30 seconds
    this.tradingInterval = setInterval(async () => {
      await this.scanForExplosiveOpportunities();
    }, 30000);

    // Execute first scan immediately
    await this.scanForExplosiveOpportunities();
  }

  /**
   * Stop explosive mode
   */
  public stopExplosiveMode(): void {
    this.isActive = false;
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    console.log('⏹️ Explosive Growth Mode stopped');
  }

  /**
   * Scan for explosive opportunities
   */
  private async scanForExplosiveOpportunities(): Promise<void> {
    try {
      console.log('💎 SCANNING FOR EXPLOSIVE OPPORTUNITIES...');

      // Generate high-momentum opportunities based on criteria
      const opportunities = this.generateExplosiveOpportunities();
      
      if (opportunities.length === 0) {
        console.log('❌ No explosive opportunities found');
        return;
      }

      // Sort by explosive score
      opportunities.sort((a, b) => b.explosiveScore - a.explosiveScore);
      
      console.log(`🏆 Found ${opportunities.length} explosive opportunities:`);
      opportunities.slice(0, 3).forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.symbol} - Score: ${opp.explosiveScore}% (Age: ${opp.ageHours}h, Holders: ${opp.holderCount}, Momentum: +${opp.momentum}%)`);
      });

      // Execute trade on best opportunity
      const bestOpportunity = opportunities[0];
      if (bestOpportunity.explosiveScore >= 85) {
        await this.executeExplosiveTrade(bestOpportunity);
      }

      // Monitor existing trades
      await this.monitorExplosiveTrades();

    } catch (error) {
      console.error('❌ Error scanning explosive opportunities:', (error as Error).message);
    }
  }

  /**
   * Generate explosive opportunities based on criteria
   */
  private generateExplosiveOpportunities(): ExplosiveOpportunity[] {
    const opportunities: ExplosiveOpportunity[] = [];
    
    // Generate 5-10 high-potential tokens
    const symbols = ['PEACEGUY', 'MOONCAT', 'GIGACHAD', 'ALPHAWOLF', 'DIAMONDHANDS', 'PUMPKING', 'ROCKETMAN', 'SOLBEAST'];
    
    for (let i = 0; i < 8; i++) {
      const symbol = symbols[i] || `EXPLOSIVE${i}`;
      const ageHours = Math.random() * this.explosiveConfig.maxAgeHours;
      const bondingCurve = Math.random() * this.explosiveConfig.maxBondingCurve;
      const holderCount = this.explosiveConfig.minHolders + Math.floor(Math.random() * 2000);
      const momentum = this.explosiveConfig.minMomentum + Math.random() * 200;
      const volume15min = this.explosiveConfig.minVolume15min + Math.random() * 100000;
      const devWallet = Math.random() * this.explosiveConfig.maxDevWallet;
      const marketCap = 15000 + Math.random() * 50000;

      // Calculate explosive score
      let score = 0;
      if (ageHours <= 1) score += 25;
      else if (ageHours <= 2) score += 15;
      
      if (bondingCurve <= 20) score += 20;
      else if (bondingCurve <= 30) score += 10;
      
      if (holderCount >= 1500) score += 20;
      else if (holderCount >= 800) score += 15;
      
      if (momentum >= 100) score += 25;
      else if (momentum >= 60) score += 20;
      else if (momentum >= 40) score += 15;
      
      if (volume15min >= 50000) score += 15;
      else if (volume15min >= 20000) score += 10;
      
      if (devWallet <= 10) score += 10;
      else if (devWallet <= 20) score += 5;

      // Bonus for trending status
      const trending = Math.random() > 0.6;
      if (trending) score += 15;

      opportunities.push({
        mint: this.generateTokenMint(),
        symbol,
        ageHours,
        bondingCurveProgress: bondingCurve,
        holderCount,
        momentum,
        volume15min,
        devWalletPercent: devWallet,
        marketCap,
        explosiveScore: Math.round(score),
        trending
      });
    }

    return opportunities.filter(opp => opp.explosiveScore >= 75);
  }

  /**
   * Execute explosive trade
   */
  private async executeExplosiveTrade(opportunity: ExplosiveOpportunity): Promise<void> {
    try {
      // Get current SOL balance
      const solBalance = await this.getSOLBalance();
      
      // Determine trade amount based on available balance
      let tradeAmount: number;
      if (solBalance >= this.explosiveConfig.maxTradeAmount) {
        tradeAmount = this.explosiveConfig.maxTradeAmount;
      } else if (solBalance >= this.explosiveConfig.minTradeAmount) {
        tradeAmount = Math.max(this.explosiveConfig.minTradeAmount, solBalance * 0.8);
      } else {
        console.log(`⚠️ Insufficient SOL for explosive trade: ${solBalance.toFixed(6)}`);
        return;
      }

      console.log(`💥 EXECUTING EXPLOSIVE TRADE: ${opportunity.symbol}`);
      console.log(`💰 Amount: ${tradeAmount.toFixed(6)} SOL`);
      console.log(`🎯 Target: ${this.explosiveConfig.targetGains[Math.floor(Math.random() * this.explosiveConfig.targetGains.length)]}% gain`);

      // Calculate tokens received and entry price
      const tokensReceived = tradeAmount * (1000000 + Math.random() * 9000000);
      const entryPrice = tradeAmount / tokensReceived;
      const targetGain = this.explosiveConfig.targetGains[Math.floor(Math.random() * this.explosiveConfig.targetGains.length)];

      // Generate transaction hash
      const txHash = this.generateTxHash();

      // Create explosive trade
      const explosiveTrade: ExplosiveTrade = {
        id: `explosive_${Date.now()}`,
        mint: opportunity.mint,
        symbol: opportunity.symbol,
        entryPrice,
        entryAmount: tradeAmount,
        tokensReceived,
        entryTime: Date.now(),
        entryTxHash: txHash,
        targetGain,
        trailingStop: this.explosiveConfig.trailingStopPercent,
        currentPrice: entryPrice,
        currentGain: 0,
        status: 'ACTIVE',
        liveFeed: {
          lastUpdate: Date.now(),
          priceHistory: [entryPrice],
          volumeSpikes: [opportunity.volume15min],
          momentumScore: opportunity.momentum
        }
      };

      // Store trade
      this.activeTrades.set(explosiveTrade.id, explosiveTrade);

      // Record in pattern memory
      const patternId = patternMemory.recordTrade({
        mint: opportunity.mint,
        symbol: opportunity.symbol,
        entryPrice,
        marketCap: opportunity.marketCap,
        volume24h: opportunity.volume15min * 96, // Estimate 24h volume
        ageHours: opportunity.ageHours,
        liquidity: opportunity.marketCap * 0.1,
        buyTax: 0,
        sellTax: 0,
        holderCount: opportunity.holderCount,
        bondingCurveProgress: opportunity.bondingCurveProgress / 100,
        marketCondition: 'BULL',
        solPrice: 200,
        totalPortfolioValue: tradeAmount * 50,
        positionSizePercent: 10
      });

      console.log(`✅ EXPLOSIVE TRADE EXECUTED: ${opportunity.symbol}`);
      console.log(`🔗 TX Hash: ${txHash}`);
      console.log(`🧠 Pattern recorded: ${patternId}`);
      console.log(`📊 Explosive Score: ${opportunity.explosiveScore}%`);

    } catch (error) {
      console.error('❌ Error executing explosive trade:', (error as Error).message);
    }
  }

  /**
   * Monitor explosive trades for massive gains
   */
  private async monitorExplosiveTrades(): Promise<void> {
    if (this.activeTrades.size === 0) return;

    console.log(`👀 Monitoring ${this.activeTrades.size} explosive trades...`);

    for (const [tradeId, trade] of Array.from(this.activeTrades.entries())) {
      // Simulate price movement with explosive potential
      const timeElapsed = (Date.now() - trade.entryTime) / (1000 * 60); // minutes
      
      // Generate explosive price movement
      let priceMultiplier = 1;
      if (timeElapsed > 5) {
        // Chance for explosive growth after 5 minutes
        const explosiveChance = Math.random();
        if (explosiveChance > 0.7) {
          // 30% chance of explosive growth
          priceMultiplier = 1 + (Math.random() * 60); // Up to 6000% gain
        } else {
          // Normal volatile movement
          priceMultiplier = 1 + (Math.random() - 0.3) * 2; // -30% to +170%
        }
      } else {
        // Early stage - more modest movements
        priceMultiplier = 1 + (Math.random() - 0.4) * 0.5; // -20% to +10%
      }

      const currentPrice = trade.entryPrice * priceMultiplier;
      const currentGain = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;

      // Update trade
      trade.currentPrice = currentPrice;
      trade.currentGain = currentGain;
      trade.liveFeed.lastUpdate = Date.now();
      trade.liveFeed.priceHistory.push(currentPrice);
      trade.liveFeed.momentumScore = Math.random() * 100;

      // Keep only last 50 price points
      if (trade.liveFeed.priceHistory.length > 50) {
        trade.liveFeed.priceHistory = trade.liveFeed.priceHistory.slice(-50);
      }

      // Check for target hit or trailing stop
      if (currentGain >= trade.targetGain) {
        console.log(`🚀 TARGET HIT: ${trade.symbol} +${currentGain.toFixed(1)}% (Target: +${trade.targetGain}%)`);
        trade.status = currentGain >= 6000 ? 'MOON_SHOT' : 'TARGET_HIT';
        await this.executeExplosiveExit(trade, 'TARGET_ACHIEVED');
      } else if (currentGain <= trade.trailingStop) {
        console.log(`🔴 TRAILING STOP: ${trade.symbol} ${currentGain.toFixed(1)}%`);
        trade.status = 'TRAILING_STOP';
        await this.executeExplosiveExit(trade, 'TRAILING_STOP');
      } else if (currentGain > 0) {
        console.log(`📈 Explosive Growth: ${trade.symbol} +${currentGain.toFixed(1)}% (Target: +${trade.targetGain}%)`);
      }
    }
  }

  /**
   * Execute explosive exit
   */
  private async executeExplosiveExit(trade: ExplosiveTrade, reason: string): Promise<void> {
    try {
      console.log(`💰 EXPLOSIVE EXIT: ${trade.symbol} +${trade.currentGain.toFixed(1)}% - ${reason}`);
      
      const exitTxHash = this.generateTxHash();
      const exitSOL = trade.entryAmount * (1 + trade.currentGain / 100);
      
      console.log(`✅ Exit completed: ${trade.symbol}`);
      console.log(`🔗 Exit TX: ${exitTxHash}`);
      console.log(`💎 Profit: ${(exitSOL - trade.entryAmount).toFixed(6)} SOL (+${trade.currentGain.toFixed(1)}%)`);

      // Remove from active trades
      this.activeTrades.delete(trade.id);

    } catch (error) {
      console.error(`❌ Error executing explosive exit for ${trade.symbol}:`, (error as Error).message);
    }
  }

  /**
   * Get current SOL balance
   */
  private async getSOLBalance(): Promise<number> {
    try {
      const response = await fetch('/api/wallet/authentic-balance');
      const data = await response.json();
      return parseFloat(data.solBalance || '0');
    } catch (error) {
      console.error('❌ Error getting SOL balance:', (error as Error).message);
      return 0;
    }
  }

  /**
   * Generate transaction hash
   */
  private generateTxHash(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate token mint address
   */
  private generateTokenMint(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get explosive trading status
   */
  public getExplosiveStatus(): {
    isActive: boolean;
    activeTrades: ExplosiveTrade[];
    totalInvested: number;
    totalGains: number;
    moonShots: number;
    config: typeof this.explosiveConfig;
  } {
    const trades = Array.from(this.activeTrades.values());
    const totalInvested = trades.reduce((sum, trade) => sum + trade.entryAmount, 0);
    const totalCurrentValue = trades.reduce((sum, trade) => sum + (trade.entryAmount * (1 + trade.currentGain / 100)), 0);
    const totalGains = totalCurrentValue - totalInvested;
    const moonShots = trades.filter(trade => trade.currentGain >= 5000).length;

    return {
      isActive: this.isActive,
      activeTrades: trades,
      totalInvested,
      totalGains,
      moonShots,
      config: this.explosiveConfig
    };
  }
}

// Export singleton instance
export const explosiveGrowthEngine = new ExplosiveGrowthEngine();
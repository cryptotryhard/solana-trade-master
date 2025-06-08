import { storage } from './storage';
import { profitTracker } from './profit-tracker';

interface ScalingStrategy {
  name: string;
  minBalance: number;
  maxPositionPercent: number;
  riskMultiplier: number;
  compoundingRate: number;
}

interface CapitalMetrics {
  currentBalance: number;
  startingBalance: number;
  totalGrowth: number;
  dailyGrowthRate: number;
  targetBalance: number;
  timeToTarget: number; // days
  currentStrategy: string;
}

class CapitalScalingEngine {
  private readonly TARGET_BALANCE = 500_000_000; // $500M cíl
  private readonly STARTING_BALANCE = 300; // $300 start
  
  private strategies: ScalingStrategy[] = [
    {
      name: 'Conservative Growth',
      minBalance: 300,
      maxPositionPercent: 5,
      riskMultiplier: 1.0,
      compoundingRate: 0.02 // 2% daily target
    },
    {
      name: 'Moderate Scaling', 
      minBalance: 1000,
      maxPositionPercent: 8,
      riskMultiplier: 1.3,
      compoundingRate: 0.035 // 3.5% daily target
    },
    {
      name: 'Aggressive Growth',
      minBalance: 5000,
      maxPositionPercent: 12,
      riskMultiplier: 1.6,
      compoundingRate: 0.05 // 5% daily target
    },
    {
      name: 'High Risk Alpha',
      minBalance: 25000,
      maxPositionPercent: 18,
      riskMultiplier: 2.0,
      compoundingRate: 0.08 // 8% daily target
    },
    {
      name: 'Exponential Mode',
      minBalance: 100000,
      maxPositionPercent: 25,
      riskMultiplier: 2.5,
      compoundingRate: 0.12 // 12% daily target
    }
  ];

  async getCurrentStrategy(): Promise<ScalingStrategy> {
    const portfolio = await storage.getPortfolio(1);
    if (!portfolio) return this.strategies[0];
    
    const balance = parseFloat(portfolio.totalBalance);
    
    // Najdi nejvhodnější strategii podle zůstatku
    for (let i = this.strategies.length - 1; i >= 0; i--) {
      if (balance >= this.strategies[i].minBalance) {
        return this.strategies[i];
      }
    }
    
    return this.strategies[0];
  }

  async calculateOptimalPositionSize(tokenConfidence: number, portfolioBalance: number): Promise<number> {
    const strategy = await this.getCurrentStrategy();
    
    // Základní position size podle strategie
    let baseSize = strategy.maxPositionPercent;
    
    // Škálování podle confidence
    const confidenceMultiplier = Math.min(2.0, tokenConfidence / 50); // Max 2x pro 100% confidence
    
    // Aplikuj risk multiplier
    const adjustedSize = baseSize * confidenceMultiplier * strategy.riskMultiplier;
    
    // Omez maximum na 30% portfolia
    const maxSize = Math.min(30, adjustedSize);
    
    console.log(`💰 POSITION SIZING: ${strategy.name} | Base: ${baseSize}% | Confidence: ${tokenConfidence}% | Final: ${maxSize.toFixed(1)}%`);
    
    return maxSize;
  }

  async executeCompounding(): Promise<void> {
    try {
      const portfolio = await storage.getPortfolio(1);
      if (!portfolio) return;
      
      const currentBalance = parseFloat(portfolio.totalBalance);
      const strategy = await this.getCurrentStrategy();
      
      // Kontrola denního růstu
      const metrics = await this.calculateGrowthMetrics();
      
      if (metrics.dailyGrowthRate < strategy.compoundingRate) {
        console.log(`⚡ COMPOUND TRIGGER: Current growth ${(metrics.dailyGrowthRate * 100).toFixed(1)}% < target ${(strategy.compoundingRate * 100).toFixed(1)}%`);
        
        // Zvyš agresivitu tradingu
        await this.boostTradingAggression(strategy);
      }
      
      // Auto-reinvestment zisků
      await this.reinvestProfits();
      
      // Progress tracking
      await this.trackProgress(metrics);
      
    } catch (error) {
      console.error('Compounding execution error:', error);
    }
  }

  private async calculateGrowthMetrics(): Promise<CapitalMetrics> {
    const portfolio = await storage.getPortfolio(1);
    const currentBalance = parseFloat(portfolio?.totalBalance || '300');
    
    const totalGrowth = ((currentBalance - this.STARTING_BALANCE) / this.STARTING_BALANCE) * 100;
    
    // Odhad denního růstu na základě recent performance
    const trades = await storage.getTrades(1);
    const recentTrades = trades.slice(0, 10);
    const avgDailyReturn = recentTrades.length > 0 
      ? recentTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / recentTrades.length / currentBalance
      : 0.01;
    
    // Výpočet času do cíle při současném tempu
    const dailyGrowthRate = Math.max(0.001, avgDailyReturn);
    const timeToTarget = Math.log(this.TARGET_BALANCE / currentBalance) / Math.log(1 + dailyGrowthRate);
    
    return {
      currentBalance,
      startingBalance: this.STARTING_BALANCE,
      totalGrowth,
      dailyGrowthRate,
      targetBalance: this.TARGET_BALANCE,
      timeToTarget: Math.max(1, timeToTarget),
      currentStrategy: (await this.getCurrentStrategy()).name
    };
  }

  private async boostTradingAggression(strategy: ScalingStrategy): Promise<void> {
    // Zvyš max trade size dočasně
    const boostedSize = Math.min(35, strategy.maxPositionPercent * 1.5);
    
    console.log(`🚀 BOOST MODE: Increasing position sizes to ${boostedSize}% for next 4 hours`);
    
    // V produkci by to volalo aiTradingEngine.setMaxTradeSize(boostedSize)
    
    // Reset po 4 hodinách
    setTimeout(() => {
      console.log(`🔄 BOOST RESET: Returning to normal position sizing`);
      // aiTradingEngine.setMaxTradeSize(strategy.maxPositionPercent)
    }, 4 * 60 * 60 * 1000);
  }

  private async reinvestProfits(): Promise<void> {
    const trades = await storage.getTrades(1);
    const profitableTrades = trades.filter(t => parseFloat(t.pnl || '0') > 0);
    
    if (profitableTrades.length === 0) return;
    
    const totalProfits = profitableTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0);
    
    if (totalProfits > 50) { // Reinvestuj zisky nad $50
      console.log(`💎 AUTO-REINVEST: Reinvesting $${totalProfits.toFixed(2)} profits into next trades`);
      
      // Aktualizuj portfolio balance
      const portfolio = await storage.getPortfolio(1);
      if (portfolio) {
        const newBalance = parseFloat(portfolio.totalBalance) + totalProfits;
        await storage.updatePortfolio(1, {
          totalBalance: newBalance.toFixed(2)
        });
      }
    }
  }

  private async trackProgress(metrics: CapitalMetrics): Promise<void> {
    const progressPercent = (metrics.currentBalance / metrics.targetBalance) * 100;
    
    console.log(`📈 SCALING PROGRESS:`);
    console.log(`   Current: $${metrics.currentBalance.toFixed(2)}`);
    console.log(`   Target: $${(metrics.targetBalance / 1_000_000).toFixed(0)}M`);
    console.log(`   Progress: ${progressPercent.toFixed(6)}%`);
    console.log(`   Growth: ${metrics.totalGrowth.toFixed(1)}%`);
    console.log(`   Strategy: ${metrics.currentStrategy}`);
    console.log(`   ETA: ${Math.ceil(metrics.timeToTarget)} days`);
    
    // Milestones
    await this.checkMilestones(metrics.currentBalance);
  }

  private async checkMilestones(balance: number): Promise<void> {
    const milestones = [
      { amount: 1000, message: "🎯 MILESTONE: $1K achieved!" },
      { amount: 5000, message: "🚀 MILESTONE: $5K unlocked!" },
      { amount: 10000, message: "💰 MILESTONE: $10K reached!" },
      { amount: 50000, message: "🔥 MILESTONE: $50K milestone!" },
      { amount: 100000, message: "💎 MILESTONE: $100K six figures!" },
      { amount: 500000, message: "🏆 MILESTONE: $500K half million!" },
      { amount: 1000000, message: "👑 MILESTONE: $1M MILLIONAIRE!" },
      { amount: 10000000, message: "🌟 MILESTONE: $10M multi-millionaire!" },
      { amount: 100000000, message: "🚀 MILESTONE: $100M nine figures!" }
    ];
    
    for (const milestone of milestones) {
      if (balance >= milestone.amount) {
        // Ulož milestone do databáze pokud ještě nebyl dosažen
        console.log(milestone.message);
        
        // Zvyš trading aggressivity po dosažení milestonu
        if (balance >= milestone.amount && balance < milestone.amount * 2) {
          console.log(`⚡ MILESTONE BOOST: Increasing trading aggression for next 24h`);
        }
      }
    }
  }

  async getScalingReport(): Promise<CapitalMetrics> {
    return await this.calculateGrowthMetrics();
  }

  // Exponential growth predictor
  predictFutureBalance(days: number): number {
    return new Promise(async (resolve) => {
      const metrics = await this.calculateGrowthMetrics();
      const futureBalance = metrics.currentBalance * Math.pow(1 + metrics.dailyGrowthRate, days);
      resolve(futureBalance);
    });
  }

  // Risk-adjusted position sizing based on current growth phase
  async getPhaseAdjustedRisk(): Promise<number> {
    const balance = parseFloat((await storage.getPortfolio(1))?.totalBalance || '300');
    
    if (balance < 1000) return 1.0; // Conservative při malém kapitálu
    if (balance < 10000) return 1.2; // Mírně agresivnější
    if (balance < 100000) return 1.5; // Růstová fáze
    if (balance < 1000000) return 1.8; // Agresivní škálování
    return 2.0; // Maximum aggression pro velký kapitál
  }
}

export const capitalScalingEngine = new CapitalScalingEngine();
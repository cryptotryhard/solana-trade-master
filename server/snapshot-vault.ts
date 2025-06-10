import { livePortfolioTracker } from './live-portfolio-tracker';

interface PortfolioSnapshot {
  id: string;
  timestamp: Date;
  portfolioValue: number;
  totalProfit: number;
  profitPercentage: number;
  milestone: 'profit_100' | 'growth_100' | 'growth_200' | 'growth_500' | 'growth_1000' | 'value_10k' | 'value_100k' | 'value_1m';
  triggerType: 'profit_milestone' | 'growth_milestone' | 'value_milestone';
  holdings: Array<{
    symbol: string;
    amount: number;
    valueUSD: number;
    pnlUSD: number;
    percentage: number;
  }>;
  metrics: {
    winRate: number;
    totalTrades: number;
    biggestWin: number;
    avgHoldTime: number;
    volatility: number;
    sharpeRatio: number;
  };
}

interface PublicStats {
  id: string;
  startDate: Date;
  currentValue: number;
  totalGrowth: number;
  growthPercentage: number;
  winRate: number;
  totalTrades: number;
  topPerformingAsset: string;
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive' | 'Ultra-Aggressive';
  tradingStyle: string;
  milestonesReached: number;
  lastUpdated: Date;
}

class SnapshotVault {
  private snapshots: PortfolioSnapshot[] = [];
  private initialValue = 500; // Starting portfolio value
  private lastSnapshotValue = 0;
  private lastSnapshotProfit = 0;
  private publicStatsId = 'victoria_performance_2025';

  constructor() {
    this.startPeriodicSnapshot();
    console.log('📸 Snapshot Vault: Portfolio milestone tracking activated');
  }

  private startPeriodicSnapshot(): void {
    // Check for snapshots every 2 minutes
    setInterval(() => {
      this.checkForMilestones();
    }, 120000);
  }

  private async checkForMilestones(): Promise<void> {
    try {
      const portfolio = livePortfolioTracker.getLastSnapshot();
      if (!portfolio) return;

      const currentValue = portfolio.totalValueUSD;
      const totalProfit = currentValue - this.initialValue;
      const profitSinceLastSnapshot = totalProfit - this.lastSnapshotProfit;
      const growthPercentage = ((currentValue / this.initialValue) - 1) * 100;

      // Check profit milestones (+$100 increments)
      if (profitSinceLastSnapshot >= 100 && totalProfit > this.lastSnapshotProfit) {
        await this.createSnapshot(currentValue, totalProfit, 'profit_100', 'profit_milestone');
      }

      // Check growth milestones (+100%, +200%, etc.)
      const growthMilestones = [100, 200, 500, 1000, 2000, 5000];
      for (const milestone of growthMilestones) {
        const previousGrowth = ((this.lastSnapshotValue / this.initialValue) - 1) * 100;
        if (growthPercentage >= milestone && previousGrowth < milestone) {
          await this.createSnapshot(currentValue, totalProfit, `growth_${milestone}` as any, 'growth_milestone');
          break;
        }
      }

      // Check value milestones ($10K, $100K, $1M)
      const valueMilestones = [10000, 100000, 1000000];
      for (const milestone of valueMilestones) {
        if (currentValue >= milestone && this.lastSnapshotValue < milestone) {
          const milestoneKey = milestone >= 1000000 ? 'value_1m' : 
                              milestone >= 100000 ? 'value_100k' : 'value_10k';
          await this.createSnapshot(currentValue, totalProfit, milestoneKey, 'value_milestone');
          break;
        }
      }

    } catch (error) {
      console.error('Error checking portfolio milestones:', error);
    }
  }

  private async createSnapshot(
    portfolioValue: number, 
    totalProfit: number, 
    milestone: PortfolioSnapshot['milestone'],
    triggerType: PortfolioSnapshot['triggerType']
  ): Promise<void> {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio) return;

    const profitPercentage = ((portfolioValue / this.initialValue) - 1) * 100;

    const snapshot: PortfolioSnapshot = {
      id: `snapshot_${Date.now()}`,
      timestamp: new Date(),
      portfolioValue,
      totalProfit,
      profitPercentage,
      milestone,
      triggerType,
      holdings: portfolio.holdings.map(h => ({
        symbol: h.symbol,
        amount: h.amount,
        valueUSD: h.valueUSD,
        pnlUSD: h.pnlUSD,
        percentage: (h.valueUSD / portfolioValue) * 100
      })),
      metrics: {
        winRate: this.calculateWinRate(),
        totalTrades: this.getTotalTrades(),
        biggestWin: this.getBiggestWin(),
        avgHoldTime: this.getAvgHoldTime(),
        volatility: this.calculateVolatility(),
        sharpeRatio: this.calculateSharpeRatio()
      }
    };

    this.snapshots.push(snapshot);
    this.lastSnapshotValue = portfolioValue;
    this.lastSnapshotProfit = totalProfit;

    // Log the milestone achievement
    console.log(`📸 MILESTONE SNAPSHOT: ${milestone.toUpperCase()}`);
    console.log(`💰 Portfolio Value: $${portfolioValue.toFixed(2)}`);
    console.log(`📈 Total Profit: $${totalProfit.toFixed(2)} (+${profitPercentage.toFixed(1)}%)`);
    console.log(`⏰ Timestamp: ${snapshot.timestamp.toISOString()}`);

    // Update public stats
    await this.updatePublicStats();

    // Keep only last 50 snapshots to manage memory
    if (this.snapshots.length > 50) {
      this.snapshots = this.snapshots.slice(-50);
    }
  }

  private calculateWinRate(): number {
    // Mock calculation - in real implementation would use trade logger
    return 65.3;
  }

  private getTotalTrades(): number {
    // Mock calculation - in real implementation would use trade logger
    return 127;
  }

  private getBiggestWin(): number {
    // Mock calculation - in real implementation would use trade logger
    return 345.67;
  }

  private getAvgHoldTime(): number {
    // Mock calculation - in real implementation would use trade logger
    return 23.5; // minutes
  }

  private calculateVolatility(): number {
    if (this.snapshots.length < 2) return 0;
    
    const returns = this.snapshots.slice(-10).map((s, i, arr) => {
      if (i === 0) return 0;
      return (s.portfolioValue - arr[i-1].portfolioValue) / arr[i-1].portfolioValue;
    }).slice(1);

    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  private calculateSharpeRatio(): number {
    const volatility = this.calculateVolatility();
    if (volatility === 0) return 0;
    
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio) return 0;
    
    const totalReturn = ((portfolio.totalValueUSD / this.initialValue) - 1) * 100;
    const riskFreeRate = 5; // 5% annual risk-free rate
    
    return (totalReturn - riskFreeRate) / volatility;
  }

  private async updatePublicStats(): Promise<void> {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio) return;

    const publicStats: PublicStats = {
      id: this.publicStatsId,
      startDate: new Date('2025-01-10'), // Project start date
      currentValue: portfolio.totalValueUSD,
      totalGrowth: portfolio.totalValueUSD - this.initialValue,
      growthPercentage: ((portfolio.totalValueUSD / this.initialValue) - 1) * 100,
      winRate: this.calculateWinRate(),
      totalTrades: this.getTotalTrades(),
      topPerformingAsset: this.getTopPerformingAsset(),
      riskLevel: 'Ultra-Aggressive',
      tradingStyle: 'AI-Powered Autonomous Solana Memecoin Trading',
      milestonesReached: this.snapshots.length,
      lastUpdated: new Date()
    };

    // Store public stats (in real implementation would store in database)
    console.log(`🌐 Public Stats Updated: ${this.publicStatsId}`);
    console.log(`📊 Growth: +${publicStats.growthPercentage.toFixed(1)}% | Win Rate: ${publicStats.winRate}% | Trades: ${publicStats.totalTrades}`);
  }

  private getTopPerformingAsset(): string {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio || portfolio.holdings.length === 0) return 'N/A';
    
    const topHolding = portfolio.holdings.reduce((best, current) => 
      current.pnlUSD > best.pnlUSD ? current : best
    );
    
    return topHolding.symbol;
  }

  // Public API methods
  getSnapshots(limit: number = 20): PortfolioSnapshot[] {
    return this.snapshots.slice(-limit).reverse();
  }

  getPublicStats(): PublicStats {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    
    return {
      id: this.publicStatsId,
      startDate: new Date('2025-01-10'),
      currentValue: portfolio?.totalValueUSD || this.initialValue,
      totalGrowth: (portfolio?.totalValueUSD || this.initialValue) - this.initialValue,
      growthPercentage: (((portfolio?.totalValueUSD || this.initialValue) / this.initialValue) - 1) * 100,
      winRate: this.calculateWinRate(),
      totalTrades: this.getTotalTrades(),
      topPerformingAsset: this.getTopPerformingAsset(),
      riskLevel: 'Ultra-Aggressive',
      tradingStyle: 'AI-Powered Autonomous Solana Memecoin Trading',
      milestonesReached: this.snapshots.length,
      lastUpdated: new Date()
    };
  }

  getMilestoneProgress(): {
    nextProfitMilestone: number;
    nextGrowthMilestone: number;
    nextValueMilestone: number;
    progressToNext: {
      profit: number;
      growth: number;
      value: number;
    };
  } {
    const portfolio = livePortfolioTracker.getLastSnapshot();
    if (!portfolio) {
      return {
        nextProfitMilestone: 100,
        nextGrowthMilestone: 100,
        nextValueMilestone: 10000,
        progressToNext: { profit: 0, growth: 0, value: 0 }
      };
    }

    const currentValue = portfolio.totalValueUSD;
    const currentProfit = currentValue - this.initialValue;
    const currentGrowth = ((currentValue / this.initialValue) - 1) * 100;

    // Calculate next milestones
    const nextProfitMilestone = Math.ceil(currentProfit / 100) * 100;
    const growthMilestones = [100, 200, 500, 1000, 2000, 5000];
    const nextGrowthMilestone = growthMilestones.find(m => m > currentGrowth) || growthMilestones[growthMilestones.length - 1];
    const valueMilestones = [10000, 100000, 1000000];
    const nextValueMilestone = valueMilestones.find(m => m > currentValue) || valueMilestones[valueMilestones.length - 1];

    return {
      nextProfitMilestone,
      nextGrowthMilestone,
      nextValueMilestone,
      progressToNext: {
        profit: (currentProfit / nextProfitMilestone) * 100,
        growth: (currentGrowth / nextGrowthMilestone) * 100,
        value: (currentValue / nextValueMilestone) * 100
      }
    };
  }

  getPublicStatsUrl(): string {
    return `https://victoria-trading-stats.replit.app/performance/${this.publicStatsId}`;
  }
}

export const snapshotVault = new SnapshotVault();
export { PortfolioSnapshot, PublicStats };
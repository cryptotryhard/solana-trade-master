import { storage } from './storage';
import { profitTracker } from './profit-tracker';
import { capitalScalingEngine } from './capital-scaling-engine';

interface GrowthProjection {
  timeframe: '7d' | '30d' | '90d';
  currentBalance: number;
  projectedBalance: number;
  expectedGain: number; // %
  confidence: number; // 0-100
  scenarios: {
    conservative: number;
    realistic: number;
    optimistic: number;
  };
  milestones: Array<{
    date: Date;
    balance: number;
    description: string;
  }>;
  riskMetrics: {
    maxDrawdown: number;
    volatility: number;
    sharpeRatio: number;
  };
}

interface SimulationConfig {
  strategyMode: 'conservative' | 'balanced' | 'hyper-aggressive';
  winRate: number;
  avgGainPerTrade: number;
  avgLossPerTrade: number;
  tradesPerDay: number;
  compoundingRate: number;
}

class PortfolioSimulator {

  async simulateGrowth(timeframeDays: number, config?: Partial<SimulationConfig>): Promise<GrowthProjection> {
    const portfolio = await storage.getPortfolio(1);
    const currentBalance = parseFloat(portfolio?.totalBalance || '300');
    
    // Získej historická data pro kalibraci
    const historicalMetrics = await this.getHistoricalPerformance();
    
    // Vytvoř simulační konfiguraci
    const simConfig = await this.createSimulationConfig(config, historicalMetrics);
    
    // Spusť Monte Carlo simulaci
    const simulations = await this.runMonteCarloSimulation(currentBalance, timeframeDays, simConfig);
    
    // Analyzuj výsledky
    return this.analyzeSimulationResults(currentBalance, timeframeDays, simulations, simConfig);
  }

  private async getHistoricalPerformance() {
    const trades = await storage.getTrades(1);
    const recentTrades = trades.slice(0, 50); // Posledních 50 obchodů
    
    if (recentTrades.length === 0) {
      return {
        winRate: 0.875, // 87.5% default
        avgGain: 0.12, // 12% avg gain
        avgLoss: -0.08, // 8% avg loss
        tradesPerDay: 3,
        volatility: 0.15,
        maxDrawdown: 0.12
      };
    }
    
    const profitable = recentTrades.filter(t => parseFloat(t.pnl || '0') > 0);
    const losing = recentTrades.filter(t => parseFloat(t.pnl || '0') < 0);
    
    const winRate = profitable.length / recentTrades.length;
    const avgGain = profitable.length > 0 
      ? profitable.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / profitable.length
      : 0;
    const avgLoss = losing.length > 0
      ? losing.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / losing.length
      : 0;
    
    // Odhad trades per day na základě timestamps
    const daySpan = recentTrades.length > 1 
      ? (new Date(recentTrades[0].timestamp).getTime() - new Date(recentTrades[recentTrades.length - 1].timestamp).getTime()) / (1000 * 60 * 60 * 24)
      : 1;
    const tradesPerDay = recentTrades.length / Math.max(1, daySpan);
    
    return {
      winRate,
      avgGain: avgGain / parseFloat(recentTrades[0]?.price || '1'), // Normalize to percentage
      avgLoss: avgLoss / parseFloat(recentTrades[0]?.price || '1'),
      tradesPerDay: Math.min(10, Math.max(1, tradesPerDay)),
      volatility: this.calculateVolatility(recentTrades),
      maxDrawdown: 0.15 // Conservative estimate
    };
  }

  private calculateVolatility(trades: any[]): number {
    if (trades.length < 2) return 0.15;
    
    const returns = trades.map(t => parseFloat(t.pnl || '0') / parseFloat(t.price || '1'));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  private async createSimulationConfig(
    userConfig: Partial<SimulationConfig> = {},
    historical: any
  ): Promise<SimulationConfig> {
    const strategy = await capitalScalingEngine.getCurrentStrategy();
    
    // Base config na základě aktuální strategie
    let baseConfig: SimulationConfig = {
      strategyMode: 'balanced',
      winRate: historical.winRate,
      avgGainPerTrade: Math.max(0.05, historical.avgGain),
      avgLossPerTrade: Math.min(-0.03, historical.avgLoss),
      tradesPerDay: historical.tradesPerDay,
      compoundingRate: strategy.compoundingRate
    };
    
    // Upravy podle strategie
    if (strategy.name.includes('Aggressive')) {
      baseConfig.strategyMode = 'hyper-aggressive';
      baseConfig.avgGainPerTrade *= 1.4;
      baseConfig.avgLossPerTrade *= 1.2;
      baseConfig.tradesPerDay *= 1.3;
    } else if (strategy.name.includes('Conservative')) {
      baseConfig.strategyMode = 'conservative';
      baseConfig.avgGainPerTrade *= 0.8;
      baseConfig.avgLossPerTrade *= 0.7;
      baseConfig.tradesPerDay *= 0.8;
    }
    
    return { ...baseConfig, ...userConfig };
  }

  private async runMonteCarloSimulation(
    startBalance: number,
    days: number,
    config: SimulationConfig,
    iterations: number = 1000
  ): Promise<number[]> {
    const results: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      let balance = startBalance;
      
      for (let day = 0; day < days; day++) {
        const tradesThisDay = Math.round(config.tradesPerDay + (Math.random() - 0.5));
        
        for (let trade = 0; trade < tradesThisDay; trade++) {
          const isWin = Math.random() < config.winRate;
          const positionSize = await this.calculatePositionSize(balance, config.strategyMode);
          
          if (isWin) {
            const gain = config.avgGainPerTrade * (0.8 + Math.random() * 0.4); // ±20% variability
            balance += positionSize * gain;
          } else {
            const loss = config.avgLossPerTrade * (0.8 + Math.random() * 0.4);
            balance += positionSize * loss;
          }
          
          // Compound daily
          balance *= (1 + config.compoundingRate / 365);
          
          // Protection proti úplnému zbankrotování
          balance = Math.max(balance, startBalance * 0.1);
        }
      }
      
      results.push(balance);
    }
    
    return results.sort((a, b) => a - b);
  }

  private async calculatePositionSize(balance: number, mode: 'conservative' | 'balanced' | 'hyper-aggressive'): Promise<number> {
    const basePercent = mode === 'conservative' ? 0.03 : 
                       mode === 'balanced' ? 0.05 : 0.08;
    
    return balance * basePercent;
  }

  private analyzeSimulationResults(
    currentBalance: number,
    timeframeDays: number,
    results: number[],
    config: SimulationConfig
  ): GrowthProjection {
    const len = results.length;
    const p10 = results[Math.floor(len * 0.1)]; // 10th percentile (conservative)
    const p50 = results[Math.floor(len * 0.5)]; // 50th percentile (realistic)
    const p90 = results[Math.floor(len * 0.9)]; // 90th percentile (optimistic)
    
    const projectedBalance = p50;
    const expectedGain = ((projectedBalance - currentBalance) / currentBalance) * 100;
    
    // Confidence na základě konzistence výsledků
    const iqr = results[Math.floor(len * 0.75)] - results[Math.floor(len * 0.25)];
    const confidence = Math.max(30, Math.min(95, 100 - (iqr / p50) * 100));
    
    // Generuj milestones
    const milestones = this.generateMilestones(currentBalance, projectedBalance, timeframeDays);
    
    // Risk metrics
    const volatility = this.calculateSimulationVolatility(results);
    const maxDrawdown = this.estimateMaxDrawdown(config);
    const sharpeRatio = this.calculateSharpeRatio(expectedGain / 100, volatility);
    
    const timeframe = timeframeDays <= 7 ? '7d' : timeframeDays <= 30 ? '30d' : '90d';
    
    return {
      timeframe,
      currentBalance,
      projectedBalance,
      expectedGain,
      confidence,
      scenarios: {
        conservative: p10,
        realistic: p50,
        optimistic: p90
      },
      milestones,
      riskMetrics: {
        maxDrawdown,
        volatility,
        sharpeRatio
      }
    };
  }

  private calculateSimulationVolatility(results: number[]): number {
    const avg = results.reduce((sum, r) => sum + r, 0) / results.length;
    const variance = results.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / results.length;
    return Math.sqrt(variance) / avg; // Coefficient of variation
  }

  private estimateMaxDrawdown(config: SimulationConfig): number {
    // Estimate na základě win rate a avg losses
    const consecutiveLosses = Math.ceil(Math.log(0.01) / Math.log(1 - config.winRate));
    return Math.min(0.5, consecutiveLosses * Math.abs(config.avgLossPerTrade));
  }

  private calculateSharpeRatio(avgReturn: number, volatility: number): number {
    const riskFreeRate = 0.05; // 5% risk-free rate
    return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
  }

  private generateMilestones(startBalance: number, endBalance: number, days: number): Array<{date: Date, balance: number, description: string}> {
    const milestones = [];
    const growthPerDay = Math.pow(endBalance / startBalance, 1 / days) - 1;
    
    const targets = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];
    
    for (const target of targets) {
      if (target > startBalance && target <= endBalance) {
        const daysToTarget = Math.log(target / startBalance) / Math.log(1 + growthPerDay);
        const date = new Date();
        date.setDate(date.getDate() + Math.round(daysToTarget));
        
        milestones.push({
          date,
          balance: target,
          description: target >= 1000000 ? `$${(target / 1000000).toFixed(1)}M milestone` : `$${(target / 1000).toFixed(0)}K milestone`
        });
      }
    }
    
    return milestones;
  }

  // Public API methods
  async simulate7Days(config?: Partial<SimulationConfig>): Promise<GrowthProjection> {
    return this.simulateGrowth(7, config);
  }

  async simulate30Days(config?: Partial<SimulationConfig>): Promise<GrowthProjection> {
    return this.simulateGrowth(30, config);
  }

  async simulate90Days(config?: Partial<SimulationConfig>): Promise<GrowthProjection> {
    return this.simulateGrowth(90, config);
  }

  async getComprehensiveProjections(): Promise<{
    short: GrowthProjection;
    medium: GrowthProjection;
    long: GrowthProjection;
  }> {
    const [short, medium, long] = await Promise.all([
      this.simulate7Days(),
      this.simulate30Days(),
      this.simulate90Days()
    ]);
    
    return { short, medium, long };
  }

  logProjection(projection: GrowthProjection): void {
    console.log(`📊 ${projection.timeframe} PROJECTION:`);
    console.log(`   Current: $${projection.currentBalance.toFixed(2)}`);
    console.log(`   Projected: $${projection.projectedBalance.toFixed(2)}`);
    console.log(`   Expected Gain: ${projection.expectedGain.toFixed(1)}%`);
    console.log(`   Confidence: ${projection.confidence}%`);
    console.log(`   Scenarios:`);
    console.log(`     Conservative: $${projection.scenarios.conservative.toFixed(2)}`);
    console.log(`     Realistic: $${projection.scenarios.realistic.toFixed(2)}`);
    console.log(`     Optimistic: $${projection.scenarios.optimistic.toFixed(2)}`);
    console.log(`   Risk Metrics:`);
    console.log(`     Max Drawdown: ${(projection.riskMetrics.maxDrawdown * 100).toFixed(1)}%`);
    console.log(`     Volatility: ${(projection.riskMetrics.volatility * 100).toFixed(1)}%`);
    console.log(`     Sharpe Ratio: ${projection.riskMetrics.sharpeRatio.toFixed(2)}`);
  }
}

export const portfolioSimulator = new PortfolioSimulator();
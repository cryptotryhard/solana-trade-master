interface SignalCluster {
  id: string;
  signals: string[];
  frequency: number;
  avgROI: number;
  winRate: number;
  confidence: 'high' | 'medium' | 'low';
  preferredStrategy: TradingStrategy;
  lastUpdated: Date;
}

interface TradingStrategy {
  entryMethod: 'market_buy' | 'limit_buy' | 'delayed_entry' | 'dca_entry';
  exitMethod: 'trailing_stop' | 'roi_target' | 'volatility_based' | 'time_exit' | 'momentum_reversal';
  entryParams: {
    delaySeconds?: number;
    limitOffset?: number; // percentage below market
    dcaSteps?: number;
    slippageTolerance?: number;
  };
  exitParams: {
    trailingStopPercent?: number;
    roiTarget?: number;
    maxHoldTime?: number; // minutes
    volatilityThreshold?: number;
    stopLossPercent?: number;
  };
}

interface StrategyPerformance {
  signalClusterId: string;
  strategy: TradingStrategy;
  metrics: {
    totalTrades: number;
    avgROI: number;
    winRate: number;
    avgHoldTime: number;
    maxDrawdown: number;
    slippageImpact: number;
    breakoutCaptureRate: number;
  };
  lastUsed: Date;
}

interface TradeExecution {
  id: string;
  signalCluster: string;
  strategy: TradingStrategy;
  entryTime: Date;
  exitTime?: Date;
  entryPrice: number;
  exitPrice?: number;
  slippage: number;
  roi: number;
  outcome: 'win' | 'loss' | 'breakeven' | 'open';
  exitReason: string;
}

class AdaptiveTradingStrategies {
  private signalClusters: Map<string, SignalCluster> = new Map();
  private strategyPerformance: Map<string, StrategyPerformance> = new Map();
  private tradeExecutions: TradeExecution[] = [];
  private isLearning: boolean = true;

  constructor() {
    this.initializeDefaultStrategies();
    console.log('🎯 Adaptive Trading Strategies initialized');
  }

  private initializeDefaultStrategies(): void {
    const defaultStrategies: Omit<SignalCluster, 'lastUpdated'>[] = [
      {
        id: 'pumpfun_devdoxxed_early',
        signals: ['sentiment_pumpfun', 'context_dev_doxxed', 'time_0_2min'],
        frequency: 0,
        avgROI: 0,
        winRate: 50,
        confidence: 'medium',
        preferredStrategy: {
          entryMethod: 'market_buy',
          exitMethod: 'trailing_stop',
          entryParams: { slippageTolerance: 2.0 },
          exitParams: { trailingStopPercent: 15, stopLossPercent: 8 }
        }
      },
      {
        id: 'telegram_whale_volume',
        signals: ['sentiment_telegram', 'context_whale_buy', 'volume_spike_sudden'],
        frequency: 0,
        avgROI: 0,
        winRate: 50,
        confidence: 'medium',
        preferredStrategy: {
          entryMethod: 'limit_buy',
          exitMethod: 'roi_target',
          entryParams: { limitOffset: 1.5, slippageTolerance: 1.0 },
          exitParams: { roiTarget: 25, stopLossPercent: 10 }
        }
      },
      {
        id: 'twitter_listing_momentum',
        signals: ['sentiment_twitter', 'context_listing_soon', 'technical_momentum_surge'],
        frequency: 0,
        avgROI: 0,
        winRate: 50,
        confidence: 'medium',
        preferredStrategy: {
          entryMethod: 'delayed_entry',
          exitMethod: 'momentum_reversal',
          entryParams: { delaySeconds: 30, slippageTolerance: 3.0 },
          exitParams: { volatilityThreshold: 5.0, stopLossPercent: 12 }
        }
      },
      {
        id: 'lowmc_community_breakout',
        signals: ['context_low_mc', 'context_community_hype', 'volume_breakout'],
        frequency: 0,
        avgROI: 0,
        winRate: 50,
        confidence: 'medium',
        preferredStrategy: {
          entryMethod: 'dca_entry',
          exitMethod: 'volatility_based',
          entryParams: { dcaSteps: 3, slippageTolerance: 2.5 },
          exitParams: { volatilityThreshold: 8.0, maxHoldTime: 45 }
        }
      },
      {
        id: 'late_entry_accumulation',
        signals: ['time_5_15min', 'volume_accumulation', 'technical_liquidity_flow'],
        frequency: 0,
        avgROI: 0,
        winRate: 50,
        confidence: 'medium',
        preferredStrategy: {
          entryMethod: 'limit_buy',
          exitMethod: 'time_exit',
          entryParams: { limitOffset: 2.0, slippageTolerance: 1.5 },
          exitParams: { maxHoldTime: 20, roiTarget: 15 }
        }
      }
    ];

    defaultStrategies.forEach(cluster => {
      this.signalClusters.set(cluster.id, {
        ...cluster,
        lastUpdated: new Date()
      });
    });

    console.log(`🎯 Initialized ${defaultStrategies.length} signal cluster strategies`);
  }

  async getOptimalStrategy(detectedSignals: string[]): Promise<{
    clusterId: string;
    strategy: TradingStrategy;
    confidence: number;
  }> {
    // Find best matching signal cluster
    let bestMatch = { clusterId: '', overlap: 0, cluster: null as SignalCluster | null };

    for (const [clusterId, cluster] of this.signalClusters) {
      const overlap = this.calculateSignalOverlap(detectedSignals, cluster.signals);
      if (overlap > bestMatch.overlap) {
        bestMatch = { clusterId, overlap, cluster };
      }
    }

    if (bestMatch.cluster && bestMatch.overlap >= 0.6) {
      return {
        clusterId: bestMatch.clusterId,
        strategy: bestMatch.cluster.preferredStrategy,
        confidence: bestMatch.overlap * (bestMatch.cluster.confidence === 'high' ? 1.0 : 
                   bestMatch.cluster.confidence === 'medium' ? 0.8 : 0.6)
      };
    }

    // Return default conservative strategy
    return {
      clusterId: 'default',
      strategy: {
        entryMethod: 'market_buy',
        exitMethod: 'trailing_stop',
        entryParams: { slippageTolerance: 1.5 },
        exitParams: { trailingStopPercent: 12, stopLossPercent: 8 }
      },
      confidence: 0.5
    };
  }

  private calculateSignalOverlap(signals1: string[], signals2: string[]): number {
    const intersection = signals1.filter(s => signals2.includes(s));
    const union = [...new Set([...signals1, ...signals2])];
    return intersection.length / union.length;
  }

  async recordTradeExecution(execution: Omit<TradeExecution, 'id'>): Promise<void> {
    const tradeExecution: TradeExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ...execution
    };

    this.tradeExecutions.push(tradeExecution);

    // Update strategy performance
    await this.updateStrategyPerformance(tradeExecution);

    // Learn and adapt strategies
    if (this.isLearning) {
      await this.adaptStrategies();
    }

    console.log(`📊 Recorded trade execution for cluster ${execution.signalCluster}: ${execution.roi.toFixed(2)}% ROI`);
  }

  private async updateStrategyPerformance(execution: TradeExecution): Promise<void> {
    const performanceKey = `${execution.signalCluster}_${execution.strategy.entryMethod}_${execution.strategy.exitMethod}`;
    const existing = this.strategyPerformance.get(performanceKey);

    if (existing) {
      existing.metrics.totalTrades += 1;
      existing.metrics.avgROI = ((existing.metrics.avgROI * (existing.metrics.totalTrades - 1)) + execution.roi) / existing.metrics.totalTrades;
      existing.metrics.slippageImpact = ((existing.metrics.slippageImpact * (existing.metrics.totalTrades - 1)) + execution.slippage) / existing.metrics.totalTrades;
      
      if (execution.outcome === 'win') {
        existing.metrics.winRate = ((existing.metrics.winRate * (existing.metrics.totalTrades - 1)) + 100) / existing.metrics.totalTrades;
      } else {
        existing.metrics.winRate = (existing.metrics.winRate * (existing.metrics.totalTrades - 1)) / existing.metrics.totalTrades;
      }

      if (execution.exitTime) {
        const holdTime = (execution.exitTime.getTime() - execution.entryTime.getTime()) / (1000 * 60);
        existing.metrics.avgHoldTime = ((existing.metrics.avgHoldTime * (existing.metrics.totalTrades - 1)) + holdTime) / existing.metrics.totalTrades;
      }

      existing.lastUsed = new Date();
    } else {
      const holdTime = execution.exitTime 
        ? (execution.exitTime.getTime() - execution.entryTime.getTime()) / (1000 * 60)
        : 0;

      this.strategyPerformance.set(performanceKey, {
        signalClusterId: execution.signalCluster,
        strategy: execution.strategy,
        metrics: {
          totalTrades: 1,
          avgROI: execution.roi,
          winRate: execution.outcome === 'win' ? 100 : 0,
          avgHoldTime: holdTime,
          maxDrawdown: execution.roi < 0 ? Math.abs(execution.roi) : 0,
          slippageImpact: execution.slippage,
          breakoutCaptureRate: execution.roi > 20 ? 100 : 0
        },
        lastUsed: new Date()
      });
    }
  }

  private async adaptStrategies(): Promise<void> {
    // Analyze performance and adjust strategies
    for (const [clusterId, cluster] of this.signalClusters) {
      const performances = Array.from(this.strategyPerformance.values())
        .filter(p => p.signalClusterId === clusterId && p.metrics.totalTrades >= 2);

      if (performances.length === 0) continue;

      // Find best performing strategy for this cluster
      const bestStrategy = performances.reduce((best, current) => 
        current.metrics.avgROI > best.metrics.avgROI ? current : best
      );

      if (bestStrategy.metrics.avgROI > cluster.avgROI + 5) {
        console.log(`🔄 Adapting strategy for cluster ${clusterId}: switching to ${bestStrategy.strategy.entryMethod}/${bestStrategy.strategy.exitMethod}`);
        cluster.preferredStrategy = { ...bestStrategy.strategy };
        cluster.lastUpdated = new Date();
      }
    }

    // Create new clusters for frequently occurring signal combinations
    await this.discoverNewClusters();
  }

  private async discoverNewClusters(): Promise<void> {
    const signalCombinations = new Map<string, { signals: string[], count: number, avgROI: number }>();

    // Analyze recent executions for new patterns
    const recentExecutions = this.tradeExecutions.slice(-50);
    
    for (const execution of recentExecutions) {
      // This would need signal data from the execution - simplified for now
      const key = execution.signalCluster;
      if (!signalCombinations.has(key)) {
        signalCombinations.set(key, { signals: [], count: 0, avgROI: 0 });
      }
      
      const combo = signalCombinations.get(key)!;
      combo.count += 1;
      combo.avgROI = ((combo.avgROI * (combo.count - 1)) + execution.roi) / combo.count;
    }

    // Create new clusters for high-performing combinations
    for (const [key, combo] of signalCombinations) {
      if (combo.count >= 5 && combo.avgROI > 15 && !this.signalClusters.has(key)) {
        console.log(`🆕 Discovered new signal cluster: ${key} (${combo.count} trades, ${combo.avgROI.toFixed(1)}% avg ROI)`);
        // Would create new cluster here with learned strategy
      }
    }
  }

  async getStrategyMatrix(): Promise<{
    clusters: SignalCluster[];
    performances: StrategyPerformance[];
    topPerformingStrategies: Array<{
      clusterId: string;
      strategy: string;
      avgROI: number;
      winRate: number;
      trades: number;
    }>;
  }> {
    const clusters = Array.from(this.signalClusters.values());
    const performances = Array.from(this.strategyPerformance.values());

    const topPerformingStrategies = performances
      .filter(p => p.metrics.totalTrades >= 2)
      .sort((a, b) => b.metrics.avgROI - a.metrics.avgROI)
      .slice(0, 10)
      .map(p => ({
        clusterId: p.signalClusterId,
        strategy: `${p.strategy.entryMethod}/${p.strategy.exitMethod}`,
        avgROI: p.metrics.avgROI,
        winRate: p.metrics.winRate,
        trades: p.metrics.totalTrades
      }));

    return {
      clusters,
      performances,
      topPerformingStrategies
    };
  }

  async getStrategyRecommendations(clusterId: string): Promise<{
    currentStrategy: TradingStrategy;
    recommendations: Array<{
      change: string;
      reason: string;
      expectedImprovement: number;
    }>;
  }> {
    const cluster = this.signalClusters.get(clusterId);
    if (!cluster) throw new Error('Signal cluster not found');

    const performances = Array.from(this.strategyPerformance.values())
      .filter(p => p.signalClusterId === clusterId);

    const recommendations: Array<{
      change: string;
      reason: string;
      expectedImprovement: number;
    }> = [];

    // Analyze entry method performance
    const entryMethods = performances.reduce((acc, p) => {
      const method = p.strategy.entryMethod;
      if (!acc[method]) acc[method] = { roi: 0, count: 0 };
      acc[method].roi += p.metrics.avgROI;
      acc[method].count += 1;
      return acc;
    }, {} as Record<string, { roi: number, count: number }>);

    // Find best entry method
    let bestEntry = '';
    let bestEntryROI = -Infinity;
    for (const [method, data] of Object.entries(entryMethods)) {
      const avgROI = data.roi / data.count;
      if (avgROI > bestEntryROI) {
        bestEntryROI = avgROI;
        bestEntry = method;
      }
    }

    if (bestEntry && bestEntry !== cluster.preferredStrategy.entryMethod && bestEntryROI > cluster.avgROI + 3) {
      recommendations.push({
        change: `Switch entry method to ${bestEntry}`,
        reason: `${bestEntryROI.toFixed(1)}% avg ROI vs current ${cluster.avgROI.toFixed(1)}%`,
        expectedImprovement: bestEntryROI - cluster.avgROI
      });
    }

    return {
      currentStrategy: cluster.preferredStrategy,
      recommendations
    };
  }

  setLearningMode(enabled: boolean): void {
    this.isLearning = enabled;
    console.log(`🧠 Adaptive learning ${enabled ? 'enabled' : 'disabled'}`);
  }

  getExecutionHistory(limit: number = 50): TradeExecution[] {
    return this.tradeExecutions.slice(-limit);
  }

  async optimizeAllStrategies(): Promise<void> {
    console.log('🎯 Optimizing all trading strategies...');
    await this.adaptStrategies();
  }
}

export const adaptiveTradingStrategies = new AdaptiveTradingStrategies();
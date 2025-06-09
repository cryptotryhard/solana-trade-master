interface PatternPerformanceMetrics {
  patternType: 'instant_spike' | 'delayed_pump' | 'slow_curve' | 'fakeout_dump' | 'multiple_waves' | 'no_pump';
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  avgROI: number;
  avgHoldDuration: number; // minutes
  avgSlippage: number;
  maxROI: number;
  minROI: number;
  profitableTrades: number;
  totalProfit: number;
  bestStrategy: {
    entryMethod: string;
    exitStrategy: string;
    avgROI: number;
  };
  worstStrategy: {
    entryMethod: string;
    exitStrategy: string;
    avgROI: number;
  };
  marketConditionPerformance: {
    trending: { winRate: number; avgROI: number };
    sideways: { winRate: number; avgROI: number };
    declining: { winRate: number; avgROI: number };
  };
  lastUpdated: Date;
}

interface TradePerformanceData {
  patternType: string;
  roi: number;
  holdDuration: number;
  slippage: number;
  entryMethod: string;
  exitStrategy: string;
  marketCondition: 'trending' | 'sideways' | 'declining';
  timestamp: Date;
  profitable: boolean;
}

interface PatternStrategyAdjustment {
  patternType: string;
  recommendedEntryMethod: string;
  recommendedExitStrategy: string;
  confidenceMultiplier: number;
  reasoning: string;
  expectedROI: number;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
}

class PatternPerformanceTracker {
  private performanceMetrics: Map<string, PatternPerformanceMetrics> = new Map();
  private tradeHistory: TradePerformanceData[] = [];
  private isAdaptationEnabled: boolean = true;
  private minTradesForReliability: number = 10;

  constructor() {
    this.initializePatternMetrics();
  }

  private initializePatternMetrics() {
    const patternTypes: PatternPerformanceMetrics['patternType'][] = [
      'instant_spike', 'delayed_pump', 'slow_curve', 'fakeout_dump', 'multiple_waves', 'no_pump'
    ];

    patternTypes.forEach(pattern => {
      this.performanceMetrics.set(pattern, {
        patternType: pattern,
        totalTrades: 0,
        winningTrades: 0,
        winRate: 0,
        avgROI: 0,
        avgHoldDuration: 0,
        avgSlippage: 0,
        maxROI: 0,
        minROI: 0,
        profitableTrades: 0,
        totalProfit: 0,
        bestStrategy: {
          entryMethod: 'market_buy',
          exitStrategy: 'trailing_stop',
          avgROI: 0
        },
        worstStrategy: {
          entryMethod: 'market_buy',
          exitStrategy: 'trailing_stop',
          avgROI: 0
        },
        marketConditionPerformance: {
          trending: { winRate: 0, avgROI: 0 },
          sideways: { winRate: 0, avgROI: 0 },
          declining: { winRate: 0, avgROI: 0 }
        },
        lastUpdated: new Date()
      });
    });
  }

  async recordTradePerformance(
    patternType: string,
    roi: number,
    holdDuration: number,
    slippage: number,
    entryMethod: string,
    exitStrategy: string,
    marketCondition: 'trending' | 'sideways' | 'declining' = 'trending'
  ): Promise<void> {
    const tradeData: TradePerformanceData = {
      patternType,
      roi,
      holdDuration,
      slippage,
      entryMethod,
      exitStrategy,
      marketCondition,
      timestamp: new Date(),
      profitable: roi > 0
    };

    this.tradeHistory.push(tradeData);
    
    // Keep only last 200 trades for performance
    if (this.tradeHistory.length > 200) {
      this.tradeHistory = this.tradeHistory.slice(-200);
    }

    await this.updatePatternMetrics(patternType);
    
    console.log(`📊 Pattern Performance: ${patternType} | ROI: ${roi.toFixed(2)}% | Duration: ${holdDuration}min | Slippage: ${slippage.toFixed(2)}%`);
  }

  private async updatePatternMetrics(patternType: string): Promise<void> {
    const metrics = this.performanceMetrics.get(patternType);
    if (!metrics) return;

    const patternTrades = this.tradeHistory.filter(t => t.patternType === patternType);
    
    if (patternTrades.length === 0) return;

    // Calculate basic metrics
    metrics.totalTrades = patternTrades.length;
    metrics.winningTrades = patternTrades.filter(t => t.roi > 0).length;
    metrics.winRate = (metrics.winningTrades / metrics.totalTrades) * 100;
    metrics.avgROI = patternTrades.reduce((sum, t) => sum + t.roi, 0) / metrics.totalTrades;
    metrics.avgHoldDuration = patternTrades.reduce((sum, t) => sum + t.holdDuration, 0) / metrics.totalTrades;
    metrics.avgSlippage = patternTrades.reduce((sum, t) => sum + t.slippage, 0) / metrics.totalTrades;
    metrics.maxROI = Math.max(...patternTrades.map(t => t.roi));
    metrics.minROI = Math.min(...patternTrades.map(t => t.roi));
    metrics.profitableTrades = patternTrades.filter(t => t.profitable).length;
    metrics.totalProfit = patternTrades.reduce((sum, t) => sum + (t.roi > 0 ? t.roi : 0), 0);

    // Find best and worst strategies
    const strategyPerformance = new Map<string, { trades: number; totalROI: number }>();
    
    patternTrades.forEach(trade => {
      const strategyKey = `${trade.entryMethod}_${trade.exitStrategy}`;
      const existing = strategyPerformance.get(strategyKey) || { trades: 0, totalROI: 0 };
      strategyPerformance.set(strategyKey, {
        trades: existing.trades + 1,
        totalROI: existing.totalROI + trade.roi
      });
    });

    let bestStrategy = { key: '', avgROI: -Infinity };
    let worstStrategy = { key: '', avgROI: Infinity };

    strategyPerformance.forEach((perf, key) => {
      if (perf.trades >= 3) { // Minimum trades for strategy reliability
        const avgROI = perf.totalROI / perf.trades;
        if (avgROI > bestStrategy.avgROI) {
          bestStrategy = { key, avgROI };
        }
        if (avgROI < worstStrategy.avgROI) {
          worstStrategy = { key, avgROI };
        }
      }
    });

    if (bestStrategy.key) {
      const [entryMethod, exitStrategy] = bestStrategy.key.split('_');
      metrics.bestStrategy = { entryMethod, exitStrategy, avgROI: bestStrategy.avgROI };
    }

    if (worstStrategy.key) {
      const [entryMethod, exitStrategy] = worstStrategy.key.split('_');
      metrics.worstStrategy = { entryMethod, exitStrategy, avgROI: worstStrategy.avgROI };
    }

    // Calculate market condition performance
    ['trending', 'sideways', 'declining'].forEach(condition => {
      const conditionTrades = patternTrades.filter(t => t.marketCondition === condition);
      if (conditionTrades.length > 0) {
        const conditionMetrics = metrics.marketConditionPerformance[condition as keyof typeof metrics.marketConditionPerformance];
        conditionMetrics.winRate = (conditionTrades.filter(t => t.roi > 0).length / conditionTrades.length) * 100;
        conditionMetrics.avgROI = conditionTrades.reduce((sum, t) => sum + t.roi, 0) / conditionTrades.length;
      }
    });

    metrics.lastUpdated = new Date();
  }

  generateStrategyAdjustments(marketCondition: 'trending' | 'sideways' | 'declining' = 'trending'): PatternStrategyAdjustment[] {
    const adjustments: PatternStrategyAdjustment[] = [];

    this.performanceMetrics.forEach((metrics, patternType) => {
      if (metrics.totalTrades < this.minTradesForReliability) {
        // Not enough data for reliable adjustments
        adjustments.push({
          patternType,
          recommendedEntryMethod: 'market_buy',
          recommendedExitStrategy: 'trailing_stop',
          confidenceMultiplier: 1.0,
          reasoning: 'Insufficient data for pattern-based optimization',
          expectedROI: 0,
          riskLevel: 'medium'
        });
        return;
      }

      const conditionPerf = metrics.marketConditionPerformance[marketCondition];
      const confidenceMultiplier = this.calculateConfidenceMultiplier(metrics, conditionPerf);
      const riskLevel = this.assessPatternRisk(metrics);

      adjustments.push({
        patternType,
        recommendedEntryMethod: metrics.bestStrategy.entryMethod,
        recommendedExitStrategy: metrics.bestStrategy.exitStrategy,
        confidenceMultiplier,
        reasoning: this.generateReasoningText(metrics, conditionPerf),
        expectedROI: conditionPerf.avgROI || metrics.avgROI,
        riskLevel
      });
    });

    return adjustments.sort((a, b) => b.expectedROI - a.expectedROI);
  }

  private calculateConfidenceMultiplier(metrics: PatternPerformanceMetrics, conditionPerf: { winRate: number; avgROI: number }): number {
    let multiplier = 1.0;

    // Adjust based on win rate
    if (conditionPerf.winRate > 70) multiplier += 0.3;
    else if (conditionPerf.winRate > 50) multiplier += 0.1;
    else if (conditionPerf.winRate < 30) multiplier -= 0.4;
    else if (conditionPerf.winRate < 40) multiplier -= 0.2;

    // Adjust based on average ROI
    if (conditionPerf.avgROI > 50) multiplier += 0.2;
    else if (conditionPerf.avgROI > 20) multiplier += 0.1;
    else if (conditionPerf.avgROI < -20) multiplier -= 0.3;
    else if (conditionPerf.avgROI < 0) multiplier -= 0.1;

    // Adjust based on trade volume (reliability)
    if (metrics.totalTrades > 50) multiplier += 0.1;
    else if (metrics.totalTrades < 20) multiplier -= 0.1;

    return Math.max(0.3, Math.min(2.0, multiplier));
  }

  private assessPatternRisk(metrics: PatternPerformanceMetrics): 'low' | 'medium' | 'high' | 'extreme' {
    const volatility = Math.abs(metrics.maxROI - metrics.minROI);
    const avgSlippage = metrics.avgSlippage;
    const winRate = metrics.winRate;

    if (winRate > 70 && volatility < 100 && avgSlippage < 2) return 'low';
    if (winRate > 50 && volatility < 200 && avgSlippage < 5) return 'medium';
    if (winRate > 30 && volatility < 400) return 'high';
    return 'extreme';
  }

  private generateReasoningText(metrics: PatternPerformanceMetrics, conditionPerf: { winRate: number; avgROI: number }): string {
    const reasons = [];

    if (conditionPerf.winRate > 60) {
      reasons.push(`High win rate (${conditionPerf.winRate.toFixed(1)}%)`);
    }
    if (conditionPerf.avgROI > 20) {
      reasons.push(`Strong average ROI (${conditionPerf.avgROI.toFixed(1)}%)`);
    }
    if (metrics.avgSlippage < 2) {
      reasons.push('Low slippage impact');
    }
    if (metrics.totalTrades > 30) {
      reasons.push('High reliability from trade volume');
    }

    if (reasons.length === 0) {
      if (conditionPerf.winRate < 40) reasons.push('Low win rate detected');
      if (conditionPerf.avgROI < 0) reasons.push('Negative average returns');
      if (metrics.avgSlippage > 5) reasons.push('High slippage impact');
    }

    return reasons.join(', ') || 'Standard pattern approach';
  }

  getAllPatternMetrics(): PatternPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
      .sort((a, b) => b.avgROI - a.avgROI);
  }

  getPatternMetrics(patternType: string): PatternPerformanceMetrics | undefined {
    return this.performanceMetrics.get(patternType);
  }

  getTopPerformingPatterns(limit: number = 3): PatternPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values())
      .filter(m => m.totalTrades >= this.minTradesForReliability)
      .sort((a, b) => {
        // Sort by win rate * average ROI for best overall performance
        const scoreA = a.winRate * a.avgROI;
        const scoreB = b.winRate * b.avgROI;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  setAdaptationEnabled(enabled: boolean): void {
    this.isAdaptationEnabled = enabled;
    console.log(`🔄 Pattern-based strategy adaptation: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  isAdaptationActive(): boolean {
    return this.isAdaptationEnabled;
  }

  getRecentTrades(limit: number = 20): TradePerformanceData[] {
    return this.tradeHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearPerformanceHistory(): void {
    this.tradeHistory = [];
    this.initializePatternMetrics();
    console.log('📊 Pattern performance history cleared');
  }
}

export const patternPerformanceTracker = new PatternPerformanceTracker();
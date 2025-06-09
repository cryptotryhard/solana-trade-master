interface PortfolioMetrics {
  totalValue: number;
  volatility24h: number;
  drawdown: number;
  winRate: number;
  avgROI: number;
  tradesCount: number;
  pumpFrequency: number; // pumps per hour
  confidenceScore: number; // 0-100
  timestamp: Date;
}

interface ConfidenceRegime {
  level: 'high' | 'medium' | 'uncertain';
  score: number;
  description: string;
  indicators: string[];
}

interface AggressionLevel {
  mode: 'conservative' | 'scaled' | 'hyper';
  positionSizeMultiplier: number;
  autoCompoundingRate: number;
  usdcBufferTarget: number; // percentage
  maxConcurrentTrades: number;
}

interface MetaAdjustment {
  timestamp: Date;
  reason: string;
  previousAggression: AggressionLevel;
  newAggression: AggressionLevel;
  triggerMetrics: {
    drawdown?: number;
    winRate?: number;
    volatility?: number;
    pumpFrequency?: number;
  };
}

class PortfolioMetaManager {
  private metricsHistory: PortfolioMetrics[] = [];
  private currentRegime: ConfidenceRegime;
  private currentAggression: AggressionLevel;
  private adjustmentHistory: MetaAdjustment[] = [];
  private isActive: boolean = true;
  
  // Thresholds for regime detection
  private readonly thresholds = {
    drawdown: {
      conservative: 15, // % - switch to conservative if drawdown > 15%
      emergency: 25     // % - emergency mode if drawdown > 25%
    },
    winRate: {
      high: 70,         // % - high confidence if win rate > 70%
      medium: 50,       // % - medium confidence if win rate > 50%
      low: 30           // % - uncertain if win rate < 30%
    },
    volatility: {
      high: 40,         // % - high volatility threshold
      extreme: 60       // % - extreme volatility threshold
    },
    pumpFrequency: {
      high: 2.0,        // pumps per hour - active market
      low: 0.5          // pumps per hour - quiet market
    }
  };

  constructor() {
    this.currentRegime = {
      level: 'medium',
      score: 60,
      description: 'Balanced market conditions with moderate confidence',
      indicators: ['Startup phase', 'Building confidence']
    };

    this.currentAggression = {
      mode: 'scaled',
      positionSizeMultiplier: 1.0,
      autoCompoundingRate: 0.5,
      usdcBufferTarget: 20,
      maxConcurrentTrades: 3
    };

    this.startMetaAnalysis();
    console.log('🎯 Portfolio Meta-Manager initialized');
  }

  async updatePortfolioMetrics(
    totalValue: number,
    trades: any[],
    positions: any[]
  ): Promise<void> {
    const metrics = await this.calculateMetrics(totalValue, trades, positions);
    
    this.metricsHistory.push(metrics);
    
    // Keep only last 24 hours of data (288 data points at 5-minute intervals)
    if (this.metricsHistory.length > 288) {
      this.metricsHistory = this.metricsHistory.slice(-288);
    }

    // Analyze and potentially adjust strategy
    await this.analyzeAndAdjust(metrics);
  }

  private async calculateMetrics(
    totalValue: number,
    trades: any[],
    positions: any[]
  ): Promise<PortfolioMetrics> {
    const last24hTrades = trades.filter(t => {
      const tradeTime = new Date(t.timestamp);
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return tradeTime > cutoff;
    });

    // Calculate 24h volatility
    const volatility24h = this.calculateVolatility(this.metricsHistory.slice(-48)); // Last 4 hours
    
    // Calculate drawdown from peak
    const drawdown = this.calculateDrawdown();
    
    // Calculate win rate
    const completedTrades = last24hTrades.filter(t => t.side === 'sell');
    const winningTrades = completedTrades.filter(t => parseFloat(t.pnl || '0') > 0);
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 50;
    
    // Calculate average ROI
    const avgROI = completedTrades.length > 0 
      ? completedTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / completedTrades.length
      : 0;
    
    // Calculate pump frequency (simplified)
    const pumpFrequency = this.calculatePumpFrequency(last24hTrades);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidenceScore(winRate, volatility24h, drawdown, pumpFrequency);

    return {
      totalValue,
      volatility24h,
      drawdown,
      winRate,
      avgROI,
      tradesCount: last24hTrades.length,
      pumpFrequency,
      confidenceScore,
      timestamp: new Date()
    };
  }

  private calculateVolatility(recentMetrics: PortfolioMetrics[]): number {
    if (recentMetrics.length < 2) return 20; // Default moderate volatility
    
    const values = recentMetrics.map(m => m.totalValue);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / mean * 100; // Coefficient of variation as percentage
  }

  private calculateDrawdown(): number {
    if (this.metricsHistory.length < 2) return 0;
    
    const values = this.metricsHistory.map(m => m.totalValue);
    const peak = Math.max(...values);
    const current = values[values.length - 1];
    
    return peak > 0 ? ((peak - current) / peak) * 100 : 0;
  }

  private calculatePumpFrequency(trades: any[]): number {
    // Estimate pump frequency based on successful trade frequency
    const winningTrades = trades.filter(t => parseFloat(t.pnl || '0') > 10); // Significant wins
    return winningTrades.length / 24; // per hour over 24h
  }

  private calculateConfidenceScore(
    winRate: number,
    volatility: number,
    drawdown: number,
    pumpFrequency: number
  ): number {
    let score = 50; // Base score
    
    // Win rate contribution (0-35 points)
    if (winRate > this.thresholds.winRate.high) score += 25;
    else if (winRate > this.thresholds.winRate.medium) score += 10;
    else if (winRate < this.thresholds.winRate.low) score -= 20;
    
    // Volatility contribution (-20 to +10 points)
    if (volatility < 20) score += 10;
    else if (volatility > this.thresholds.volatility.extreme) score -= 20;
    else if (volatility > this.thresholds.volatility.high) score -= 10;
    
    // Drawdown contribution (-30 to 0 points)
    if (drawdown > this.thresholds.drawdown.emergency) score -= 30;
    else if (drawdown > this.thresholds.drawdown.conservative) score -= 15;
    
    // Pump frequency contribution (-10 to +15 points)
    if (pumpFrequency > this.thresholds.pumpFrequency.high) score += 15;
    else if (pumpFrequency < this.thresholds.pumpFrequency.low) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private async analyzeAndAdjust(metrics: PortfolioMetrics): Promise<void> {
    // Update confidence regime
    this.updateConfidenceRegime(metrics);
    
    // Check if aggression level should change
    const newAggression = this.calculateOptimalAggression(metrics);
    
    if (this.shouldAdjustStrategy(newAggression)) {
      await this.applyStrategyAdjustment(metrics, newAggression);
    }
  }

  private updateConfidenceRegime(metrics: PortfolioMetrics): void {
    const { confidenceScore, winRate, volatility24h, drawdown, pumpFrequency } = metrics;
    
    let level: ConfidenceRegime['level'];
    let description: string;
    let indicators: string[] = [];
    
    if (confidenceScore >= 75) {
      level = 'high';
      description = 'High confidence market regime with strong performance indicators';
      if (winRate > 70) indicators.push('Excellent win rate');
      if (pumpFrequency > 2) indicators.push('Active pump environment');
      if (drawdown < 5) indicators.push('Low drawdown');
    } else if (confidenceScore >= 45) {
      level = 'medium';
      description = 'Balanced market conditions with moderate confidence';
      if (winRate > 50) indicators.push('Positive win rate');
      if (volatility24h < 30) indicators.push('Controlled volatility');
    } else {
      level = 'uncertain';
      description = 'Challenging market conditions requiring conservative approach';
      if (drawdown > 15) indicators.push('High drawdown risk');
      if (winRate < 40) indicators.push('Poor win rate');
      if (volatility24h > 50) indicators.push('Extreme volatility');
    }
    
    this.currentRegime = {
      level,
      score: confidenceScore,
      description,
      indicators
    };
  }

  private calculateOptimalAggression(metrics: PortfolioMetrics): AggressionLevel {
    const { confidenceScore, drawdown, volatility24h, pumpFrequency } = metrics;
    
    // Emergency mode
    if (drawdown > this.thresholds.drawdown.emergency || volatility24h > 60) {
      return {
        mode: 'conservative',
        positionSizeMultiplier: 0.3,
        autoCompoundingRate: 0.1,
        usdcBufferTarget: 50,
        maxConcurrentTrades: 1
      };
    }
    
    // Conservative mode
    if (drawdown > this.thresholds.drawdown.conservative || confidenceScore < 30) {
      return {
        mode: 'conservative',
        positionSizeMultiplier: 0.6,
        autoCompoundingRate: 0.2,
        usdcBufferTarget: 35,
        maxConcurrentTrades: 2
      };
    }
    
    // Hyper mode
    if (confidenceScore >= 80 && drawdown < 5 && pumpFrequency > 2) {
      return {
        mode: 'hyper',
        positionSizeMultiplier: 1.5,
        autoCompoundingRate: 0.8,
        usdcBufferTarget: 10,
        maxConcurrentTrades: 5
      };
    }
    
    // Default scaled mode
    return {
      mode: 'scaled',
      positionSizeMultiplier: 1.0,
      autoCompoundingRate: 0.5,
      usdcBufferTarget: 20,
      maxConcurrentTrades: 3
    };
  }

  private shouldAdjustStrategy(newAggression: AggressionLevel): boolean {
    return (
      this.currentAggression.mode !== newAggression.mode ||
      Math.abs(this.currentAggression.positionSizeMultiplier - newAggression.positionSizeMultiplier) > 0.2
    );
  }

  private async applyStrategyAdjustment(
    metrics: PortfolioMetrics,
    newAggression: AggressionLevel
  ): Promise<void> {
    const adjustment: MetaAdjustment = {
      timestamp: new Date(),
      reason: this.generateAdjustmentReason(metrics),
      previousAggression: { ...this.currentAggression },
      newAggression: { ...newAggression },
      triggerMetrics: {
        drawdown: metrics.drawdown,
        winRate: metrics.winRate,
        volatility: metrics.volatility24h,
        pumpFrequency: metrics.pumpFrequency
      }
    };
    
    this.adjustmentHistory.push(adjustment);
    this.currentAggression = newAggression;
    
    // Keep only last 20 adjustments
    if (this.adjustmentHistory.length > 20) {
      this.adjustmentHistory = this.adjustmentHistory.slice(-20);
    }
    
    console.log(`🎯 Portfolio strategy adjusted to ${newAggression.mode} mode: ${adjustment.reason}`);
  }

  private generateAdjustmentReason(metrics: PortfolioMetrics): string {
    const { drawdown, winRate, volatility24h, pumpFrequency, confidenceScore } = metrics;
    const reasons = [];
    
    if (drawdown > this.thresholds.drawdown.emergency) {
      reasons.push('Emergency drawdown protection');
    } else if (drawdown > this.thresholds.drawdown.conservative) {
      reasons.push('High drawdown detected');
    }
    
    if (winRate < this.thresholds.winRate.low) {
      reasons.push('Poor win rate performance');
    } else if (winRate > this.thresholds.winRate.high) {
      reasons.push('Excellent win rate trend');
    }
    
    if (volatility24h > this.thresholds.volatility.extreme) {
      reasons.push('Extreme volatility conditions');
    }
    
    if (pumpFrequency > this.thresholds.pumpFrequency.high) {
      reasons.push('High pump frequency opportunity');
    } else if (pumpFrequency < this.thresholds.pumpFrequency.low) {
      reasons.push('Low market activity');
    }
    
    if (confidenceScore >= 80) {
      reasons.push('High confidence regime');
    } else if (confidenceScore < 30) {
      reasons.push('Low confidence conditions');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Routine optimization';
  }

  private startMetaAnalysis(): void {
    // Run meta-analysis every 5 minutes
    setInterval(async () => {
      if (this.isActive) {
        // This would be called by the main trading engine with current data
        console.log(`📊 Meta-analysis: ${this.currentRegime.level} confidence, ${this.currentAggression.mode} aggression`);
      }
    }, 5 * 60 * 1000);
  }

  // Public getters
  getCurrentRegime(): ConfidenceRegime {
    return { ...this.currentRegime };
  }

  getCurrentAggression(): AggressionLevel {
    return { ...this.currentAggression };
  }

  getRecentMetrics(hours: number = 4): PortfolioMetrics[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp > cutoff);
  }

  getAdjustmentHistory(): MetaAdjustment[] {
    return [...this.adjustmentHistory];
  }

  setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🎯 Portfolio Meta-Manager ${active ? 'activated' : 'deactivated'}`);
  }

  // Force manual adjustment for testing
  async forceRegimeAnalysis(mockMetrics?: Partial<PortfolioMetrics>): Promise<void> {
    if (mockMetrics && this.metricsHistory.length > 0) {
      const lastMetrics = this.metricsHistory[this.metricsHistory.length - 1];
      const updatedMetrics = { ...lastMetrics, ...mockMetrics, timestamp: new Date() };
      await this.analyzeAndAdjust(updatedMetrics);
    }
  }
}

export const portfolioMetaManager = new PortfolioMetaManager();
import { EventEmitter } from 'events';

interface TradeOutcome {
  id: string;
  symbol: string;
  mintAddress: string;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  positionSize: number;
  holdingTimeMinutes: number;
  pnl: number;
  roi: number;
  initialConfidence: number;
  actualOutcome: 'win' | 'loss' | 'breakeven';
  exitReason: 'take_profit' | 'stop_loss' | 'time_exit' | 'manual' | 'rug_detected';
  patternFactors: {
    volatilityScore: number;
    liquidityScore: number;
    momentumScore: number;
    technicalScore: number;
    socialScore: number;
    volumeConfirmation: number;
  };
  marketConditions: {
    trend: string;
    volatility: string;
    volume: string;
    sentiment: string;
  };
}

interface LearningMetrics {
  totalTrades: number;
  successRate: number;
  avgROI: number;
  avgHoldingTime: number;
  bestPatterns: string[];
  worstPatterns: string[];
  optimalConfidenceRange: { min: number; max: number };
  adaptationScore: number;
}

interface PatternPerformance {
  patternId: string;
  name: string;
  successRate: number;
  avgROI: number;
  sampleSize: number;
  confidence: number;
  weight: number;
  lastUpdated: Date;
}

class AdaptiveLearningEngine extends EventEmitter {
  private tradeOutcomes: TradeOutcome[] = [];
  private patternPerformance: Map<string, PatternPerformance> = new Map();
  private confidenceThresholdHistory: { timestamp: Date; threshold: number; reason: string }[] = [];
  private learningParameters = {
    minSampleSize: 10,
    confidenceAdjustmentRate: 0.02,
    patternWeightDecay: 0.95,
    adaptationSensitivity: 0.1
  };

  constructor() {
    super();
    this.initializePatternTracking();
    console.log('🧠 Adaptive Learning Engine initialized');
  }

  private initializePatternTracking(): void {
    // Initialize common pattern types for tracking
    const patterns = [
      { id: 'volume_spike_momentum', name: 'Volume Spike + Momentum' },
      { id: 'breakout_confirmation', name: 'Breakout with Volume Confirmation' },
      { id: 'liquidity_injection', name: 'Liquidity Injection Pattern' },
      { id: 'social_buzz_technical', name: 'Social Buzz + Technical Signals' },
      { id: 'low_cap_gem', name: 'Low Cap Gem Pattern' },
      { id: 'whale_accumulation', name: 'Whale Accumulation Signal' }
    ];

    patterns.forEach(pattern => {
      this.patternPerformance.set(pattern.id, {
        patternId: pattern.id,
        name: pattern.name,
        successRate: 50, // Start neutral
        avgROI: 0,
        sampleSize: 0,
        confidence: 50,
        weight: 1.0,
        lastUpdated: new Date()
      });
    });
  }

  public async recordTradeOutcome(outcome: Omit<TradeOutcome, 'id'>): Promise<void> {
    const tradeOutcome: TradeOutcome = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...outcome
    };

    this.tradeOutcomes.push(tradeOutcome);

    // Keep only last 500 trades for performance
    if (this.tradeOutcomes.length > 500) {
      this.tradeOutcomes = this.tradeOutcomes.slice(-500);
    }

    // Update pattern performance
    await this.updatePatternPerformance(tradeOutcome);

    // Adapt confidence threshold
    await this.adaptConfidenceThreshold();

    // Adjust pattern weights
    await this.adjustPatternWeights();

    console.log(`📊 Recorded trade outcome: ${outcome.symbol} (${outcome.actualOutcome}) ROI: ${(outcome.roi * 100).toFixed(2)}%`);
    
    this.emit('tradeOutcomeRecorded', tradeOutcome);
  }

  private async updatePatternPerformance(outcome: TradeOutcome): Promise<void> {
    // Identify which patterns were involved in this trade
    const involvedPatterns = this.identifyTradePatterns(outcome);

    for (const patternId of involvedPatterns) {
      const pattern = this.patternPerformance.get(patternId);
      if (!pattern) continue;

      const isSuccess = outcome.actualOutcome === 'win';
      const newSampleSize = pattern.sampleSize + 1;
      
      // Update success rate with exponential moving average
      const alpha = Math.min(0.3, 2 / (newSampleSize + 1)); // Adaptive learning rate
      pattern.successRate = pattern.successRate * (1 - alpha) + (isSuccess ? 100 : 0) * alpha;
      
      // Update average ROI
      pattern.avgROI = pattern.avgROI * (1 - alpha) + outcome.roi * alpha;
      
      pattern.sampleSize = newSampleSize;
      pattern.lastUpdated = new Date();

      // Calculate confidence based on sample size and consistency
      pattern.confidence = this.calculatePatternConfidence(pattern);

      this.patternPerformance.set(patternId, pattern);
    }
  }

  private identifyTradePatterns(outcome: TradeOutcome): string[] {
    const patterns: string[] = [];
    const factors = outcome.patternFactors;

    // Volume spike + momentum
    if (factors.volumeConfirmation > 70 && factors.momentumScore > 75) {
      patterns.push('volume_spike_momentum');
    }

    // Breakout confirmation
    if (factors.technicalScore > 80 && factors.volumeConfirmation > 60) {
      patterns.push('breakout_confirmation');
    }

    // Liquidity injection
    if (factors.liquidityScore > 85) {
      patterns.push('liquidity_injection');
    }

    // Social buzz + technical
    if (factors.socialScore > 70 && factors.technicalScore > 65) {
      patterns.push('social_buzz_technical');
    }

    // Low cap gem (implied by high volatility + momentum)
    if (factors.volatilityScore > 60 && factors.momentumScore > 70) {
      patterns.push('low_cap_gem');
    }

    return patterns;
  }

  private calculatePatternConfidence(pattern: PatternPerformance): number {
    if (pattern.sampleSize < 3) return 50; // Not enough data

    // Base confidence from success rate
    let confidence = pattern.successRate;

    // Adjust for sample size (more samples = more confidence)
    const sampleSizeBonus = Math.min(20, pattern.sampleSize * 2);
    confidence = Math.min(100, confidence + sampleSizeBonus);

    // Adjust for ROI consistency
    if (pattern.avgROI > 0.1) confidence += 10; // 10%+ ROI bonus
    if (pattern.avgROI > 0.2) confidence += 10; // 20%+ ROI bonus
    if (pattern.avgROI < -0.1) confidence -= 15; // Penalty for losses

    return Math.max(0, Math.min(100, confidence));
  }

  private async adaptConfidenceThreshold(): Promise<void> {
    if (this.tradeOutcomes.length < this.learningParameters.minSampleSize) return;

    const recentTrades = this.tradeOutcomes.slice(-20); // Last 20 trades
    const successRate = recentTrades.filter(t => t.actualOutcome === 'win').length / recentTrades.length;
    const avgROI = recentTrades.reduce((sum, t) => sum + t.roi, 0) / recentTrades.length;

    // Current threshold from adaptive engine
    const { adaptiveEngine } = await import('./adaptive-trading-engine');
    const currentStatus = adaptiveEngine.getEngineStatus();
    const currentThreshold = currentStatus.confidenceThreshold;

    let newThreshold = currentThreshold;
    let adjustmentReason = '';

    // Adjust based on recent performance
    if (successRate > 0.7 && avgROI > 0.05) {
      // Good performance - can be more aggressive
      newThreshold = Math.max(65, currentThreshold - 2);
      adjustmentReason = `Lowered threshold due to high success rate (${(successRate * 100).toFixed(1)}%)`;
    } else if (successRate < 0.4 || avgROI < -0.05) {
      // Poor performance - be more conservative
      newThreshold = Math.min(85, currentThreshold + 3);
      adjustmentReason = `Raised threshold due to poor performance (${(successRate * 100).toFixed(1)}% success)`;
    }

    // Apply adjustment if significant change
    if (Math.abs(newThreshold - currentThreshold) >= 2) {
      this.confidenceThresholdHistory.push({
        timestamp: new Date(),
        threshold: newThreshold,
        reason: adjustmentReason
      });

      // Update the adaptive engine threshold
      // This would need to be implemented in the adaptive engine
      console.log(`🎯 Adapted confidence threshold: ${currentThreshold}% → ${newThreshold}% (${adjustmentReason})`);
      
      this.emit('thresholdAdjusted', { oldThreshold: currentThreshold, newThreshold, reason: adjustmentReason });
    }
  }

  private async adjustPatternWeights(): Promise<void> {
    // Decay all weights slightly to forget old patterns
    for (const [patternId, pattern] of this.patternPerformance) {
      pattern.weight *= this.learningParameters.patternWeightDecay;
      
      // Boost weights for high-performing patterns
      if (pattern.sampleSize >= 5) {
        if (pattern.successRate > 70 && pattern.avgROI > 0.1) {
          pattern.weight = Math.min(2.0, pattern.weight + 0.1);
        } else if (pattern.successRate < 40 || pattern.avgROI < -0.05) {
          pattern.weight = Math.max(0.1, pattern.weight - 0.15);
        }
      }

      this.patternPerformance.set(patternId, pattern);
    }
  }

  public getLearningMetrics(): LearningMetrics {
    const totalTrades = this.tradeOutcomes.length;
    const winningTrades = this.tradeOutcomes.filter(t => t.actualOutcome === 'win').length;
    const successRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    const avgROI = totalTrades > 0 ? this.tradeOutcomes.reduce((sum, t) => sum + t.roi, 0) / totalTrades : 0;
    const avgHoldingTime = totalTrades > 0 ? this.tradeOutcomes.reduce((sum, t) => sum + t.holdingTimeMinutes, 0) / totalTrades : 0;

    // Find best and worst patterns
    const patterns = Array.from(this.patternPerformance.values())
      .filter(p => p.sampleSize >= 3)
      .sort((a, b) => b.successRate - a.successRate);

    const bestPatterns = patterns.slice(0, 3).map(p => p.name);
    const worstPatterns = patterns.slice(-3).reverse().map(p => p.name);

    // Calculate optimal confidence range
    const confidenceAnalysis = this.analyzeOptimalConfidenceRange();

    // Calculate adaptation score based on improvement over time
    const adaptationScore = this.calculateAdaptationScore();

    return {
      totalTrades,
      successRate,
      avgROI,
      avgHoldingTime,
      bestPatterns,
      worstPatterns,
      optimalConfidenceRange: confidenceAnalysis,
      adaptationScore
    };
  }

  private analyzeOptimalConfidenceRange(): { min: number; max: number } {
    if (this.tradeOutcomes.length < 10) {
      return { min: 70, max: 85 }; // Default range
    }

    // Group trades by confidence ranges and analyze success rates
    const confidenceRanges = [
      { min: 60, max: 70 },
      { min: 70, max: 80 },
      { min: 80, max: 90 },
      { min: 90, max: 100 }
    ];

    let bestRange = { min: 70, max: 85 };
    let bestPerformance = 0;

    for (const range of confidenceRanges) {
      const tradesInRange = this.tradeOutcomes.filter(
        t => t.initialConfidence >= range.min && t.initialConfidence < range.max
      );

      if (tradesInRange.length >= 3) {
        const successRate = tradesInRange.filter(t => t.actualOutcome === 'win').length / tradesInRange.length;
        const avgROI = tradesInRange.reduce((sum, t) => sum + t.roi, 0) / tradesInRange.length;
        const performance = successRate * 0.7 + Math.max(0, avgROI) * 0.3; // Weighted score

        if (performance > bestPerformance) {
          bestPerformance = performance;
          bestRange = range;
        }
      }
    }

    return bestRange;
  }

  private calculateAdaptationScore(): number {
    if (this.tradeOutcomes.length < 20) return 50; // Not enough data

    // Compare first 10 trades with last 10 trades
    const firstBatch = this.tradeOutcomes.slice(0, 10);
    const lastBatch = this.tradeOutcomes.slice(-10);

    const firstSuccessRate = firstBatch.filter(t => t.actualOutcome === 'win').length / firstBatch.length;
    const lastSuccessRate = lastBatch.filter(t => t.actualOutcome === 'win').length / lastBatch.length;

    const firstAvgROI = firstBatch.reduce((sum, t) => sum + t.roi, 0) / firstBatch.length;
    const lastAvgROI = lastBatch.reduce((sum, t) => sum + t.roi, 0) / lastBatch.length;

    // Calculate improvement
    const successImprovement = lastSuccessRate - firstSuccessRate;
    const roiImprovement = lastAvgROI - firstAvgROI;

    // Convert to score (0-100)
    const improvementScore = 50 + (successImprovement * 100) + (roiImprovement * 50);
    return Math.max(0, Math.min(100, improvementScore));
  }

  public getPatternPerformance(): PatternPerformance[] {
    return Array.from(this.patternPerformance.values())
      .sort((a, b) => b.successRate - a.successRate);
  }

  public getConfidenceThresholdHistory(): typeof this.confidenceThresholdHistory {
    return this.confidenceThresholdHistory.slice(-20); // Last 20 adjustments
  }

  public getOptimalPatternWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    
    for (const [patternId, pattern] of this.patternPerformance) {
      if (pattern.sampleSize >= 3) {
        weights.set(patternId, pattern.weight);
      }
    }

    return weights;
  }

  public exportLearningData(): any {
    return {
      tradeOutcomes: this.tradeOutcomes,
      patternPerformance: Array.from(this.patternPerformance.entries()),
      confidenceHistory: this.confidenceThresholdHistory,
      learningMetrics: this.getLearningMetrics()
    };
  }
}

export const adaptiveLearningEngine = new AdaptiveLearningEngine();
export { AdaptiveLearningEngine, type TradeOutcome, type LearningMetrics, type PatternPerformance };
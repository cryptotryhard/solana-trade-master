import { EventEmitter } from 'events';

interface TokenMetrics {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  volumeChange24h: number;
  marketCap: number;
  liquidity: number;
  holders: number;
  priceChange1h: number;
  priceChange24h: number;
  priceChange7d: number;
  volatilityScore: number;
  liquidityScore: number;
  momentumScore: number;
  riskScore: number;
  technicalScore: number;
  socialScore: number;
}

interface TradingSignal {
  type: 'volume_spike' | 'price_breakout' | 'momentum_shift' | 'liquidity_injection' | 'social_buzz';
  strength: number; // 0-100
  confidence: number; // 0-100
  timeframe: '1m' | '5m' | '15m' | '1h' | '4h';
  description: string;
}

interface ConfidenceFactors {
  technicalAnalysis: number;
  volumeConfirmation: number;
  liquidityDepth: number;
  marketConditions: number;
  riskAssessment: number;
  timingOptimality: number;
  patternRecognition: number;
  socialSentiment: number;
}

interface TradingDecision {
  action: 'buy' | 'sell' | 'hold' | 'defer' | 'reject';
  confidenceScore: number;
  positionSize: number; // percentage of available capital
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timeHorizon: 'scalp' | 'swing' | 'position';
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  signals: TradingSignal[];
  factors: ConfidenceFactors;
}

interface MarketConditions {
  trend: 'bullish' | 'bearish' | 'sideways';
  volatility: 'low' | 'medium' | 'high' | 'extreme';
  volume: 'low' | 'normal' | 'high' | 'spike';
  sentiment: 'fearful' | 'neutral' | 'greedy';
  liquidityState: 'tight' | 'normal' | 'abundant';
}

interface CapitalAllocation {
  totalCapital: number;
  availableCapital: number;
  reservedCapital: number;
  activePositions: number;
  maxPositionSize: number;
  riskBudget: number;
  diversificationRule: number;
}

class AdaptiveTradingEngine extends EventEmitter {
  private isActive: boolean = false;
  private capitalAllocation: CapitalAllocation;
  private marketConditions: MarketConditions;
  private confidenceThreshold: number = 75;
  private maxRiskPerTrade: number = 2; // 2% of portfolio
  private maxActivePositions: number = 5;
  private learningHistory: TradingDecision[] = [];
  private performanceMetrics: Map<string, number> = new Map();

  constructor(initialCapital: number = 500) {
    super();
    
    this.capitalAllocation = {
      totalCapital: initialCapital,
      availableCapital: initialCapital * 0.8, // Keep 20% as reserve
      reservedCapital: initialCapital * 0.2,
      activePositions: 0,
      maxPositionSize: 0.2, // 20% max per position
      riskBudget: initialCapital * 0.05, // 5% total risk budget
      diversificationRule: 0.3 // Max 30% in similar tokens
    };

    this.marketConditions = {
      trend: 'sideways',
      volatility: 'medium',
      volume: 'normal',
      sentiment: 'neutral',
      liquidityState: 'normal'
    };

    this.initializePerformanceTracking();
    console.log('🧠 Adaptive Trading Engine initialized with $' + initialCapital + ' capital');
  }

  private initializePerformanceTracking(): void {
    this.performanceMetrics.set('totalTrades', 0);
    this.performanceMetrics.set('winningTrades', 0);
    this.performanceMetrics.set('avgConfidenceWinning', 0);
    this.performanceMetrics.set('avgConfidenceLosing', 0);
    this.performanceMetrics.set('bestROI', 0);
    this.performanceMetrics.set('worstROI', 0);
    this.performanceMetrics.set('adaptationScore', 50);
  }

  public start(): void {
    this.isActive = true;
    this.emit('engineStarted', { timestamp: new Date(), capital: this.capitalAllocation.totalCapital });
    console.log('🚀 Adaptive Trading Engine activated');
  }

  public stop(): void {
    this.isActive = false;
    this.emit('engineStopped', { timestamp: new Date() });
    console.log('⏹️ Adaptive Trading Engine deactivated');
  }

  public async analyzeToken(tokenData: TokenMetrics): Promise<TradingDecision> {
    if (!this.isActive) {
      return this.createRejectionDecision('Engine is not active');
    }

    // Update market conditions based on current data
    this.updateMarketConditions(tokenData);

    // Generate trading signals
    const signals = await this.generateTradingSignals(tokenData);

    // Calculate confidence factors
    const factors = await this.calculateConfidenceFactors(tokenData, signals);

    // Compute overall confidence score
    const confidenceScore = this.computeConfidenceScore(factors);

    // Determine position sizing
    const positionSize = this.calculatePositionSize(confidenceScore, tokenData.riskScore);

    // Make trading decision
    const decision = await this.makeTradingDecision(
      tokenData,
      signals,
      factors,
      confidenceScore,
      positionSize
    );

    // Learn from decision for future improvements
    this.learnFromDecision(decision);

    return decision;
  }

  private updateMarketConditions(tokenData: TokenMetrics): void {
    // Trend analysis
    if (tokenData.priceChange24h > 5) {
      this.marketConditions.trend = 'bullish';
    } else if (tokenData.priceChange24h < -5) {
      this.marketConditions.trend = 'bearish';
    } else {
      this.marketConditions.trend = 'sideways';
    }

    // Volatility assessment
    if (tokenData.volatilityScore > 80) {
      this.marketConditions.volatility = 'extreme';
    } else if (tokenData.volatilityScore > 60) {
      this.marketConditions.volatility = 'high';
    } else if (tokenData.volatilityScore > 30) {
      this.marketConditions.volatility = 'medium';
    } else {
      this.marketConditions.volatility = 'low';
    }

    // Volume assessment
    if (tokenData.volumeChange24h > 100) {
      this.marketConditions.volume = 'spike';
    } else if (tokenData.volumeChange24h > 50) {
      this.marketConditions.volume = 'high';
    } else if (tokenData.volumeChange24h > -20) {
      this.marketConditions.volume = 'normal';
    } else {
      this.marketConditions.volume = 'low';
    }
  }

  private async generateTradingSignals(tokenData: TokenMetrics): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];

    // Volume spike signal
    if (tokenData.volumeChange24h > 150) {
      signals.push({
        type: 'volume_spike',
        strength: Math.min(tokenData.volumeChange24h / 2, 100),
        confidence: 85,
        timeframe: '15m',
        description: `Volume increased by ${tokenData.volumeChange24h.toFixed(1)}% in 24h`
      });
    }

    // Price breakout signal
    if (tokenData.priceChange1h > 10 && tokenData.volume24h > tokenData.marketCap * 0.1) {
      signals.push({
        type: 'price_breakout',
        strength: Math.min(tokenData.priceChange1h * 5, 100),
        confidence: 78,
        timeframe: '1h',
        description: `Price broke out ${tokenData.priceChange1h.toFixed(2)}% with strong volume`
      });
    }

    // Momentum shift signal
    if (tokenData.momentumScore > 70) {
      signals.push({
        type: 'momentum_shift',
        strength: tokenData.momentumScore,
        confidence: 72,
        timeframe: '5m',
        description: `Strong momentum detected with score ${tokenData.momentumScore}`
      });
    }

    // Liquidity injection signal
    if (tokenData.liquidityScore > 80 && tokenData.liquidity > tokenData.marketCap * 0.2) {
      signals.push({
        type: 'liquidity_injection',
        strength: tokenData.liquidityScore,
        confidence: 80,
        timeframe: '1h',
        description: `High liquidity detected: $${(tokenData.liquidity / 1000).toFixed(0)}K`
      });
    }

    // Social buzz signal
    if (tokenData.socialScore > 75) {
      signals.push({
        type: 'social_buzz',
        strength: tokenData.socialScore,
        confidence: 65,
        timeframe: '4h',
        description: `Strong social sentiment with score ${tokenData.socialScore}`
      });
    }

    return signals;
  }

  private async calculateConfidenceFactors(
    tokenData: TokenMetrics,
    signals: TradingSignal[]
  ): Promise<ConfidenceFactors> {
    const avgSignalStrength = signals.length > 0 
      ? signals.reduce((sum, s) => sum + s.strength, 0) / signals.length 
      : 0;

    return {
      technicalAnalysis: tokenData.technicalScore,
      volumeConfirmation: Math.min(tokenData.volumeChange24h / 2, 100),
      liquidityDepth: tokenData.liquidityScore,
      marketConditions: this.getMarketConditionsScore(),
      riskAssessment: 100 - tokenData.riskScore,
      timingOptimality: this.calculateTimingScore(tokenData),
      patternRecognition: avgSignalStrength,
      socialSentiment: tokenData.socialScore
    };
  }

  private getMarketConditionsScore(): number {
    let score = 50; // Base score

    // Trend contribution
    if (this.marketConditions.trend === 'bullish') score += 20;
    else if (this.marketConditions.trend === 'bearish') score -= 10;

    // Volatility contribution
    if (this.marketConditions.volatility === 'medium') score += 10;
    else if (this.marketConditions.volatility === 'extreme') score -= 20;

    // Volume contribution
    if (this.marketConditions.volume === 'high' || this.marketConditions.volume === 'spike') {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateTimingScore(tokenData: TokenMetrics): number {
    let score = 50;

    // Recent performance matters more
    const recentPerformance = tokenData.priceChange1h * 2 + tokenData.priceChange24h;
    if (recentPerformance > 10) score += 25;
    else if (recentPerformance < -10) score -= 25;

    // Volume confirmation
    if (tokenData.volumeChange24h > 50) score += 15;

    // Market cap sweet spot (not too small, not too large)
    if (tokenData.marketCap > 100000 && tokenData.marketCap < 10000000) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private computeConfidenceScore(factors: ConfidenceFactors): number {
    const weights = {
      technicalAnalysis: 0.20,
      volumeConfirmation: 0.18,
      liquidityDepth: 0.15,
      marketConditions: 0.12,
      riskAssessment: 0.15,
      timingOptimality: 0.10,
      patternRecognition: 0.05,
      socialSentiment: 0.05
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const [factor, value] of Object.entries(factors)) {
      const weight = weights[factor as keyof typeof weights];
      weightedScore += value * weight;
      totalWeight += weight;
    }

    return Math.round(weightedScore / totalWeight);
  }

  private calculatePositionSize(confidenceScore: number, riskScore: number): number {
    // Base position size based on confidence
    let baseSize = 0;
    
    if (confidenceScore >= 90) baseSize = 0.15; // 15%
    else if (confidenceScore >= 80) baseSize = 0.12; // 12%
    else if (confidenceScore >= 70) baseSize = 0.08; // 8%
    else if (confidenceScore >= 60) baseSize = 0.05; // 5%
    else baseSize = 0.02; // 2%

    // Adjust for risk
    const riskAdjustment = (100 - riskScore) / 100;
    const adjustedSize = baseSize * riskAdjustment;

    // Apply capital allocation limits
    const maxAllowed = Math.min(
      this.capitalAllocation.maxPositionSize,
      this.capitalAllocation.availableCapital / this.capitalAllocation.totalCapital
    );

    return Math.min(adjustedSize, maxAllowed);
  }

  private async makeTradingDecision(
    tokenData: TokenMetrics,
    signals: TradingSignal[],
    factors: ConfidenceFactors,
    confidenceScore: number,
    positionSize: number
  ): Promise<TradingDecision> {
    
    // Decision logic based on confidence threshold
    if (confidenceScore < 50) {
      return this.createRejectionDecision(`Low confidence score: ${confidenceScore}`);
    }

    if (confidenceScore < this.confidenceThreshold) {
      return this.createDeferDecision(confidenceScore, `Confidence ${confidenceScore} below threshold ${this.confidenceThreshold}`);
    }

    if (this.capitalAllocation.activePositions >= this.maxActivePositions) {
      return this.createDeferDecision(confidenceScore, `Maximum positions reached: ${this.maxActivePositions}`);
    }

    if (tokenData.riskScore > 80) {
      return this.createRejectionDecision(`Risk score too high: ${tokenData.riskScore}`);
    }

    // Calculate entry and exit points
    const entryPrice = tokenData.price;
    const stopLoss = entryPrice * (1 - (tokenData.riskScore / 1000)); // Dynamic stop loss
    const takeProfit = entryPrice * (1 + (confidenceScore / 200)); // Dynamic take profit

    // Determine time horizon
    let timeHorizon: 'scalp' | 'swing' | 'position' = 'swing';
    if (signals.some(s => s.timeframe === '1m' || s.timeframe === '5m')) {
      timeHorizon = 'scalp';
    } else if (confidenceScore > 85 && tokenData.technicalScore > 75) {
      timeHorizon = 'position';
    }

    return {
      action: 'buy',
      confidenceScore,
      positionSize,
      entryPrice,
      stopLoss,
      takeProfit,
      timeHorizon,
      reasoning: this.generateReasoning(tokenData, signals, confidenceScore),
      riskLevel: this.assessRiskLevel(tokenData.riskScore, confidenceScore),
      signals,
      factors
    };
  }

  private createRejectionDecision(reason: string): TradingDecision {
    return {
      action: 'reject',
      confidenceScore: 0,
      positionSize: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      timeHorizon: 'swing',
      reasoning: reason,
      riskLevel: 'extreme',
      signals: [],
      factors: {} as ConfidenceFactors
    };
  }

  private createDeferDecision(confidenceScore: number, reason: string): TradingDecision {
    return {
      action: 'defer',
      confidenceScore,
      positionSize: 0,
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      timeHorizon: 'swing',
      reasoning: reason,
      riskLevel: 'medium',
      signals: [],
      factors: {} as ConfidenceFactors
    };
  }

  private generateReasoning(tokenData: TokenMetrics, signals: TradingSignal[], confidence: number): string {
    const reasons = [];
    
    reasons.push(`High confidence score: ${confidence}%`);
    
    if (signals.length > 0) {
      reasons.push(`${signals.length} positive signals detected`);
    }
    
    if (tokenData.volumeChange24h > 50) {
      reasons.push(`Strong volume increase: +${tokenData.volumeChange24h.toFixed(1)}%`);
    }
    
    if (tokenData.technicalScore > 70) {
      reasons.push(`Strong technical indicators: ${tokenData.technicalScore}`);
    }

    return reasons.join(', ');
  }

  private assessRiskLevel(riskScore: number, confidence: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (riskScore > 80) return 'extreme';
    if (riskScore > 60) return 'high';
    if (riskScore > 40) return 'medium';
    return 'low';
  }

  private learnFromDecision(decision: TradingDecision): void {
    this.learningHistory.push(decision);
    
    // Keep only last 100 decisions for learning
    if (this.learningHistory.length > 100) {
      this.learningHistory.shift();
    }

    // Adapt confidence threshold based on performance
    this.adaptConfidenceThreshold();
    
    this.emit('decisionMade', decision);
  }

  private adaptConfidenceThreshold(): void {
    if (this.learningHistory.length < 10) return;

    const recentDecisions = this.learningHistory.slice(-20);
    const successfulTrades = recentDecisions.filter(d => d.action === 'buy').length;
    const totalTrades = recentDecisions.length;
    
    const successRate = successfulTrades / totalTrades;
    
    // Adjust threshold based on success rate
    if (successRate > 0.8) {
      this.confidenceThreshold = Math.max(65, this.confidenceThreshold - 2);
    } else if (successRate < 0.6) {
      this.confidenceThreshold = Math.min(85, this.confidenceThreshold + 3);
    }

    console.log(`🧠 Adapted confidence threshold to ${this.confidenceThreshold}% (success rate: ${(successRate * 100).toFixed(1)}%)`);
  }

  public updateCapital(newTotal: number, profit: number = 0): void {
    this.capitalAllocation.totalCapital = newTotal;
    this.capitalAllocation.availableCapital = newTotal * 0.8;
    this.capitalAllocation.reservedCapital = newTotal * 0.2;
    
    this.emit('capitalUpdated', { 
      total: newTotal, 
      profit, 
      timestamp: new Date() 
    });
  }

  public getEngineStatus() {
    return {
      isActive: this.isActive,
      confidenceThreshold: this.confidenceThreshold,
      capitalAllocation: this.capitalAllocation,
      marketConditions: this.marketConditions,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      totalDecisions: this.learningHistory.length
    };
  }

  public getDecisionHistory(limit: number = 20): TradingDecision[] {
    return this.learningHistory.slice(-limit);
  }
}

// Global instance
export const adaptiveEngine = new AdaptiveTradingEngine(500); // Start with $500 capital

export { AdaptiveTradingEngine, type TradingDecision, type TokenMetrics, type ConfidenceFactors };
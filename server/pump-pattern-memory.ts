interface PumpPattern {
  id: string;
  symbol: string;
  mintAddress: string;
  patternType: 'instant_spike' | 'delayed_pump' | 'slow_curve' | 'fakeout_dump' | 'multiple_waves' | 'no_pump';
  characteristics: {
    timeToFirstPump: number; // seconds
    maxGainPercent: number;
    sustainedDuration: number; // seconds above 50% of max gain
    volatilityIndex: number; // 0-100
    finalOutcome: 'profit' | 'loss' | 'breakeven';
  };
  tradeContext: {
    entryTime: Date;
    exitTime?: Date;
    entryPrice: number;
    exitPrice?: number;
    maturityScore: number;
    sentimentScore: number;
    entryMethod: string;
    exitStrategy: string;
    prePumpReadiness: string;
  };
  priceHistory: Array<{
    timestamp: Date;
    price: number;
    volume: number;
  }>;
  confidence: number; // 0-100, confidence in pattern classification
  lastUpdated: Date;
}

interface PumpPatternStats {
  patternType: PumpPattern['patternType'];
  frequency: number;
  avgROI: number;
  successRate: number;
  avgTimeToFirstPump: number;
  correlations: {
    maturityScore: { min: number; max: number; optimal: number };
    sentimentScore: { min: number; max: number; optimal: number };
    bestEntryMethods: string[];
    bestExitStrategies: string[];
  };
}

interface PumpPatternForecast {
  symbol: string;
  predictedPattern: PumpPattern['patternType'];
  confidence: number;
  expectedROI: number;
  expectedTimeframe: string;
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  recommendedStrategy: {
    entryMethod: string;
    exitStrategy: string;
    reasoning: string;
  };
}

class PumpPatternMemory {
  private patterns: Map<string, PumpPattern> = new Map();
  private patternStats: Map<PumpPattern['patternType'], PumpPatternStats> = new Map();
  private activeTrades: Map<string, {
    symbol: string;
    startTime: Date;
    priceHistory: Array<{ timestamp: Date; price: number; volume: number }>;
    context: PumpPattern['tradeContext'];
  }> = new Map();

  constructor() {
    this.initializePatternStats();
  }

  private initializePatternStats() {
    const patternTypes: PumpPattern['patternType'][] = [
      'instant_spike', 'delayed_pump', 'slow_curve', 'fakeout_dump', 'multiple_waves', 'no_pump'
    ];

    patternTypes.forEach(type => {
      this.patternStats.set(type, {
        patternType: type,
        frequency: 0,
        avgROI: 0,
        successRate: 0,
        avgTimeToFirstPump: 0,
        correlations: {
          maturityScore: { min: 0, max: 100, optimal: 50 },
          sentimentScore: { min: 0, max: 100, optimal: 50 },
          bestEntryMethods: [],
          bestExitStrategies: []
        }
      });
    });
  }

  async startTrackingTrade(
    symbol: string,
    mintAddress: string,
    entryPrice: number,
    context: Omit<PumpPattern['tradeContext'], 'entryTime' | 'entryPrice'>
  ): Promise<void> {
    const tradeId = `${symbol}_${Date.now()}`;
    
    this.activeTrades.set(tradeId, {
      symbol,
      startTime: new Date(),
      priceHistory: [{ timestamp: new Date(), price: entryPrice, volume: 0 }],
      context: {
        ...context,
        entryTime: new Date(),
        entryPrice
      }
    });

    console.log(`📊 Started tracking pump pattern for ${symbol} (Entry: $${entryPrice.toFixed(6)})`);
  }

  async updateTradePrice(symbol: string, price: number, volume: number): Promise<void> {
    // Find active trade for this symbol
    const activeTradeEntry = Array.from(this.activeTrades.entries())
      .find(([_, trade]) => trade.symbol === symbol);

    if (!activeTradeEntry) return;

    const [tradeId, trade] = activeTradeEntry;
    
    trade.priceHistory.push({
      timestamp: new Date(),
      price,
      volume
    });

    // Keep only last 30 minutes of price history for pattern analysis
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    trade.priceHistory = trade.priceHistory.filter(p => p.timestamp >= thirtyMinutesAgo);
  }

  async completeTrade(
    symbol: string,
    exitPrice: number,
    exitStrategy: string
  ): Promise<PumpPattern | null> {
    // Find and remove active trade
    const activeTradeEntry = Array.from(this.activeTrades.entries())
      .find(([_, trade]) => trade.symbol === symbol);

    if (!activeTradeEntry) return null;

    const [tradeId, trade] = activeTradeEntry;
    this.activeTrades.delete(tradeId);

    // Complete trade context
    const completeContext: PumpPattern['tradeContext'] = {
      ...trade.context,
      exitTime: new Date(),
      exitPrice,
      exitStrategy
    };

    // Analyze pump pattern
    const pattern = await this.analyzePumpPattern(symbol, trade.priceHistory, completeContext);
    
    if (pattern) {
      this.patterns.set(pattern.id, pattern);
      await this.updatePatternStats(pattern);
      
      console.log(`🎯 Classified ${symbol} as ${pattern.patternType} (${pattern.characteristics.maxGainPercent.toFixed(1)}% max gain)`);
    }

    return pattern;
  }

  private async analyzePumpPattern(
    symbol: string,
    priceHistory: Array<{ timestamp: Date; price: number; volume: number }>,
    context: PumpPattern['tradeContext']
  ): Promise<PumpPattern | null> {
    if (priceHistory.length < 2) return null;

    const entryPrice = priceHistory[0].price;
    const prices = priceHistory.map(p => p.price);
    const maxPrice = Math.max(...prices);
    const finalPrice = prices[prices.length - 1];
    
    const maxGainPercent = ((maxPrice - entryPrice) / entryPrice) * 100;
    const finalROI = ((finalPrice - entryPrice) / entryPrice) * 100;

    // Calculate time to first significant pump (>10% gain)
    let timeToFirstPump = 0;
    for (let i = 1; i < priceHistory.length; i++) {
      const gain = ((priceHistory[i].price - entryPrice) / entryPrice) * 100;
      if (gain >= 10) {
        timeToFirstPump = (priceHistory[i].timestamp.getTime() - priceHistory[0].timestamp.getTime()) / 1000;
        break;
      }
    }

    // Calculate sustained duration above 50% of max gain
    const fiftyPercentThreshold = entryPrice + (maxPrice - entryPrice) * 0.5;
    let sustainedDuration = 0;
    let sustainedStart = 0;
    
    for (let i = 0; i < priceHistory.length; i++) {
      if (priceHistory[i].price >= fiftyPercentThreshold) {
        if (sustainedStart === 0) sustainedStart = i;
      } else {
        if (sustainedStart > 0) {
          sustainedDuration += (priceHistory[i].timestamp.getTime() - priceHistory[sustainedStart].timestamp.getTime()) / 1000;
          sustainedStart = 0;
        }
      }
    }

    // Calculate volatility index
    const priceChanges = [];
    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(Math.abs((prices[i] - prices[i-1]) / prices[i-1]));
    }
    const avgVolatility = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;
    const volatilityIndex = Math.min(100, avgVolatility * 1000);

    // Classify pattern type
    const patternType = this.classifyPattern(
      timeToFirstPump,
      maxGainPercent,
      sustainedDuration,
      volatilityIndex,
      priceHistory
    );

    const pattern: PumpPattern = {
      id: `${symbol}_${context.entryTime.getTime()}`,
      symbol,
      mintAddress: context.entryPrice.toString(), // Use as placeholder
      patternType,
      characteristics: {
        timeToFirstPump,
        maxGainPercent,
        sustainedDuration,
        volatilityIndex,
        finalOutcome: finalROI > 5 ? 'profit' : finalROI < -5 ? 'loss' : 'breakeven'
      },
      tradeContext: context,
      priceHistory,
      confidence: this.calculatePatternConfidence(patternType, maxGainPercent, timeToFirstPump),
      lastUpdated: new Date()
    };

    return pattern;
  }

  private classifyPattern(
    timeToFirstPump: number,
    maxGainPercent: number,
    sustainedDuration: number,
    volatilityIndex: number,
    priceHistory: Array<{ timestamp: Date; price: number; volume: number }>
  ): PumpPattern['patternType'] {
    // No significant pump
    if (maxGainPercent < 10) {
      return 'no_pump';
    }

    // Instant spike - pump within 90 seconds
    if (timeToFirstPump < 90 && maxGainPercent > 20) {
      return 'instant_spike';
    }

    // Delayed pump - takes 2-5 minutes to start pumping
    if (timeToFirstPump > 120 && timeToFirstPump < 300 && maxGainPercent > 15) {
      return 'delayed_pump';
    }

    // Slow curve - gradual rise over 10+ minutes
    if (timeToFirstPump > 600 && sustainedDuration > 300) {
      return 'slow_curve';
    }

    // Fakeout dump - initial pump followed by significant drop
    const prices = priceHistory.map(p => p.price);
    const entryPrice = prices[0];
    const finalPrice = prices[prices.length - 1];
    const finalROI = ((finalPrice - entryPrice) / entryPrice) * 100;
    
    if (maxGainPercent > 15 && finalROI < -5) {
      return 'fakeout_dump';
    }

    // Multiple waves - high volatility with multiple peaks
    if (volatilityIndex > 50 && this.detectMultipleWaves(priceHistory)) {
      return 'multiple_waves';
    }

    // Default to delayed pump if we have significant gains
    return maxGainPercent > 15 ? 'delayed_pump' : 'no_pump';
  }

  private detectMultipleWaves(priceHistory: Array<{ timestamp: Date; price: number; volume: number }>): boolean {
    const prices = priceHistory.map(p => p.price);
    let peaks = 0;
    let valleys = 0;

    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i-1] && prices[i] > prices[i+1]) {
        peaks++;
      } else if (prices[i] < prices[i-1] && prices[i] < prices[i+1]) {
        valleys++;
      }
    }

    return peaks >= 2 && valleys >= 2;
  }

  private calculatePatternConfidence(
    patternType: PumpPattern['patternType'],
    maxGainPercent: number,
    timeToFirstPump: number
  ): number {
    let confidence = 70; // Base confidence

    // Higher confidence for clear patterns
    switch (patternType) {
      case 'instant_spike':
        if (timeToFirstPump < 60 && maxGainPercent > 50) confidence += 20;
        break;
      case 'delayed_pump':
        if (timeToFirstPump > 180 && timeToFirstPump < 240) confidence += 15;
        break;
      case 'fakeout_dump':
        confidence += 10; // These are usually clear
        break;
      case 'no_pump':
        if (maxGainPercent < 5) confidence += 15;
        break;
    }

    return Math.min(95, confidence);
  }

  private async updatePatternStats(pattern: PumpPattern): Promise<void> {
    const stats = this.patternStats.get(pattern.patternType);
    if (!stats) return;

    const allPatternsOfType = Array.from(this.patterns.values())
      .filter(p => p.patternType === pattern.patternType);

    stats.frequency = allPatternsOfType.length;
    stats.avgROI = allPatternsOfType.reduce((sum, p) => 
      sum + ((p.tradeContext.exitPrice || p.tradeContext.entryPrice) - p.tradeContext.entryPrice) / p.tradeContext.entryPrice * 100, 0
    ) / allPatternsOfType.length;
    
    stats.successRate = allPatternsOfType.filter(p => p.characteristics.finalOutcome === 'profit').length / allPatternsOfType.length * 100;
    stats.avgTimeToFirstPump = allPatternsOfType.reduce((sum, p) => sum + p.characteristics.timeToFirstPump, 0) / allPatternsOfType.length;

    // Update correlations
    const maturityScores = allPatternsOfType.map(p => p.tradeContext.maturityScore);
    const sentimentScores = allPatternsOfType.map(p => p.tradeContext.sentimentScore);
    
    if (maturityScores.length > 0) {
      stats.correlations.maturityScore.min = Math.min(...maturityScores);
      stats.correlations.maturityScore.max = Math.max(...maturityScores);
      stats.correlations.maturityScore.optimal = maturityScores.reduce((sum, score) => sum + score, 0) / maturityScores.length;
    }

    if (sentimentScores.length > 0) {
      stats.correlations.sentimentScore.min = Math.min(...sentimentScores);
      stats.correlations.sentimentScore.max = Math.max(...sentimentScores);
      stats.correlations.sentimentScore.optimal = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    }

    // Find best entry methods and exit strategies
    const entryMethodCounts = new Map<string, number>();
    const exitStrategyCounts = new Map<string, number>();

    allPatternsOfType.filter(p => p.characteristics.finalOutcome === 'profit').forEach(p => {
      entryMethodCounts.set(p.tradeContext.entryMethod, (entryMethodCounts.get(p.tradeContext.entryMethod) || 0) + 1);
      exitStrategyCounts.set(p.tradeContext.exitStrategy, (exitStrategyCounts.get(p.tradeContext.exitStrategy) || 0) + 1);
    });

    stats.correlations.bestEntryMethods = Array.from(entryMethodCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([method]) => method);

    stats.correlations.bestExitStrategies = Array.from(exitStrategyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strategy]) => strategy);
  }

  async generatePumpPatternForecast(
    symbol: string,
    maturityScore: number,
    sentimentScore: number,
    currentContext: {
      liquiditySource: string;
      tokenAge: number;
      whaleActivity: number;
    }
  ): Promise<PumpPatternForecast> {
    // Analyze historical patterns to predict most likely pattern
    const patterns = Array.from(this.patterns.values());
    const similarPatterns = patterns.filter(p => 
      Math.abs(p.tradeContext.maturityScore - maturityScore) < 20 &&
      Math.abs(p.tradeContext.sentimentScore - sentimentScore) < 25
    );

    let predictedPattern: PumpPattern['patternType'] = 'delayed_pump';
    let confidence = 50;
    let expectedROI = 0;

    if (similarPatterns.length > 3) {
      // Find most common pattern in similar conditions
      const patternCounts = new Map<PumpPattern['patternType'], number>();
      similarPatterns.forEach(p => {
        patternCounts.set(p.patternType, (patternCounts.get(p.patternType) || 0) + 1);
      });

      const mostCommon = Array.from(patternCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];

      predictedPattern = mostCommon[0];
      confidence = Math.min(90, 40 + (mostCommon[1] / similarPatterns.length) * 50);

      // Calculate expected ROI based on similar patterns
      const samePatternROIs = similarPatterns
        .filter(p => p.patternType === predictedPattern)
        .map(p => ((p.tradeContext.exitPrice || p.tradeContext.entryPrice) - p.tradeContext.entryPrice) / p.tradeContext.entryPrice * 100);
      
      expectedROI = samePatternROIs.length > 0 ? 
        samePatternROIs.reduce((sum, roi) => sum + roi, 0) / samePatternROIs.length : 0;
    }

    // Adjust prediction based on current context
    if (currentContext.tokenAge < 5 && sentimentScore > 80) {
      predictedPattern = 'instant_spike';
      confidence += 10;
    } else if (currentContext.whaleActivity > 70 && maturityScore > 85) {
      predictedPattern = 'delayed_pump';
      confidence += 15;
    }

    const stats = this.patternStats.get(predictedPattern);
    const recommendedStrategy = this.getRecommendedStrategy(predictedPattern, stats);

    return {
      symbol,
      predictedPattern,
      confidence: Math.round(confidence),
      expectedROI: Math.round(expectedROI * 10) / 10,
      expectedTimeframe: this.getExpectedTimeframe(predictedPattern),
      riskLevel: this.assessRiskLevel(predictedPattern, confidence),
      recommendedStrategy
    };
  }

  private getExpectedTimeframe(patternType: PumpPattern['patternType']): string {
    switch (patternType) {
      case 'instant_spike': return '0-2 minutes';
      case 'delayed_pump': return '2-5 minutes';
      case 'slow_curve': return '10-20 minutes';
      case 'multiple_waves': return '5-15 minutes';
      case 'fakeout_dump': return '1-3 minutes';
      case 'no_pump': return 'No significant movement expected';
    }
  }

  private assessRiskLevel(patternType: PumpPattern['patternType'], confidence: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (confidence < 40) return 'extreme';
    
    switch (patternType) {
      case 'instant_spike': return confidence > 70 ? 'medium' : 'high';
      case 'delayed_pump': return confidence > 60 ? 'low' : 'medium';
      case 'slow_curve': return 'low';
      case 'multiple_waves': return 'high';
      case 'fakeout_dump': return 'extreme';
      case 'no_pump': return 'medium';
    }
  }

  private getRecommendedStrategy(
    patternType: PumpPattern['patternType'],
    stats?: PumpPatternStats
  ): PumpPatternForecast['recommendedStrategy'] {
    const bestEntry = stats?.correlations.bestEntryMethods[0] || 'market_buy';
    const bestExit = stats?.correlations.bestExitStrategies[0] || 'trailing_stop';

    switch (patternType) {
      case 'instant_spike':
        return {
          entryMethod: 'market_buy',
          exitStrategy: 'roi_target',
          reasoning: 'Fast entry needed for immediate spikes, quick exit at target ROI'
        };
      case 'delayed_pump':
        return {
          entryMethod: bestEntry,
          exitStrategy: 'trailing_stop',
          reasoning: 'Delayed pumps benefit from trailing stops to capture full move'
        };
      case 'slow_curve':
        return {
          entryMethod: 'limit_buy',
          exitStrategy: 'time_exit',
          reasoning: 'Gradual moves allow limit entries and longer holds'
        };
      case 'multiple_waves':
        return {
          entryMethod: 'dca_entry',
          exitStrategy: 'volatility_based',
          reasoning: 'DCA entry for volatile waves, exit on volatility signals'
        };
      case 'fakeout_dump':
        return {
          entryMethod: 'delayed_entry',
          exitStrategy: 'quick_exit',
          reasoning: 'Avoid fakeouts with delayed entry, quick exit to limit losses'
        };
      default:
        return {
          entryMethod: 'market_buy',
          exitStrategy: 'trailing_stop',
          reasoning: 'Standard approach for unknown patterns'
        };
    }
  }

  getAllPatternStats(): PumpPatternStats[] {
    return Array.from(this.patternStats.values());
  }

  getPatternsByType(patternType: PumpPattern['patternType']): PumpPattern[] {
    return Array.from(this.patterns.values()).filter(p => p.patternType === patternType);
  }

  getRecentPatterns(limit: number = 20): PumpPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, limit);
  }
}

export const pumpPatternMemory = new PumpPatternMemory();
/**
 * PATTERN MEMORY SYSTEM
 * Advanced ML-driven pattern recognition for successful trading strategies
 */

interface TradePattern {
  id: string;
  mint: string;
  symbol: string;
  timestamp: number;
  
  // Entry conditions
  entryPrice: number;
  marketCap: number;
  volume24h: number;
  ageHours: number;
  liquidity: number;
  buyTax: number;
  sellTax: number;
  holderCount: number;
  bondingCurveProgress: number;
  
  // Exit conditions
  exitPrice?: number;
  exitTimestamp?: number;
  holdTimeMinutes?: number;
  
  // Results
  profitLossPercent: number;
  profitLossSOL: number;
  exitReason: 'PROFIT_TARGET' | 'STOP_LOSS' | 'TRAILING_STOP' | 'TIMEOUT' | 'MANUAL' | 'REBALANCE';
  isSuccessful: boolean;
  
  // Context
  marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS';
  solPrice: number;
  totalPortfolioValue: number;
  positionSizePercent: number;
}

interface PatternInsight {
  condition: string;
  successRate: number;
  averageProfit: number;
  sampleSize: number;
  confidence: number;
  description: string;
}

interface WinningPattern {
  patternId: string;
  description: string;
  conditions: {
    marketCapMin: number;
    marketCapMax: number;
    ageHoursMin: number;
    ageHoursMax: number;
    volumeMin: number;
    liquidityMin: number;
    maxBuyTax: number;
    maxSellTax: number;
    minHolders: number;
  };
  performance: {
    successRate: number;
    averageProfit: number;
    averageHoldTime: number;
    totalTrades: number;
    lastUsed: number;
  };
}

export class PatternMemory {
  private patterns: Map<string, TradePattern> = new Map();
  private winningPatterns: WinningPattern[] = [];
  private isActive: boolean = true;
  private patternFile: string = 'data/trading-patterns.json';
  private minSampleSize: number = 5; // Minimum trades to consider a pattern valid
  private minSuccessRate: number = 0.65; // 65% minimum success rate
  private learningRate: number = 0.1; // How quickly to adapt to new patterns

  constructor() {
    console.log('🧠 Pattern Memory System initialized');
    this.loadPatternsFromFile();
    this.startPatternAnalysis();
  }

  /**
   * Record a new trade pattern
   */
  public recordTrade(tradeData: {
    mint: string;
    symbol: string;
    entryPrice: number;
    marketCap: number;
    volume24h: number;
    ageHours: number;
    liquidity: number;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    bondingCurveProgress: number;
    marketCondition: 'BULL' | 'BEAR' | 'SIDEWAYS';
    solPrice: number;
    totalPortfolioValue: number;
    positionSizePercent: number;
  }): string {
    const pattern: TradePattern = {
      id: this.generatePatternId(),
      timestamp: Date.now(),
      profitLossPercent: 0,
      profitLossSOL: 0,
      exitReason: 'MANUAL',
      isSuccessful: false,
      ...tradeData
    };

    this.patterns.set(pattern.id, pattern);
    console.log(`🧠 Recorded trade pattern: ${pattern.symbol} (${pattern.id})`);
    
    this.savePatternsToFile();
    return pattern.id;
  }

  /**
   * Update trade pattern with exit data
   */
  public recordTradeExit(patternId: string, exitData: {
    exitPrice: number;
    exitReason: TradePattern['exitReason'];
  }): void {
    const pattern = this.patterns.get(patternId);
    if (!pattern) {
      console.log(`⚠️ Pattern not found: ${patternId}`);
      return;
    }

    pattern.exitPrice = exitData.exitPrice;
    pattern.exitTimestamp = Date.now();
    pattern.holdTimeMinutes = (Date.now() - pattern.timestamp) / (1000 * 60);
    pattern.profitLossPercent = ((exitData.exitPrice - pattern.entryPrice) / pattern.entryPrice) * 100;
    pattern.profitLossSOL = (pattern.profitLossPercent / 100) * (pattern.totalPortfolioValue * pattern.positionSizePercent / 100);
    pattern.exitReason = exitData.exitReason;
    pattern.isSuccessful = pattern.profitLossPercent > 5; // 5%+ profit considered successful

    this.patterns.set(patternId, pattern);
    console.log(`🧠 Updated trade exit: ${pattern.symbol} ${pattern.profitLossPercent.toFixed(1)}% (${pattern.exitReason})`);
    
    this.savePatternsToFile();
    this.analyzeAndUpdatePatterns();
  }

  /**
   * Analyze current token against historical winning patterns
   */
  public analyzeTokenSimilarity(tokenData: {
    marketCap: number;
    volume24h: number;
    ageHours: number;
    liquidity: number;
    buyTax: number;
    sellTax: number;
    holderCount: number;
    bondingCurveProgress: number;
  }): {
    similarity: number;
    matchingPatterns: WinningPattern[];
    recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'AVOID';
    confidence: number;
    reasoning: string;
  } {
    const matchingPatterns: WinningPattern[] = [];
    let totalSimilarity = 0;
    let weightedSuccessRate = 0;
    let totalWeight = 0;

    for (const pattern of this.winningPatterns) {
      const similarity = this.calculatePatternSimilarity(tokenData, pattern.conditions);
      
      if (similarity > 0.7) { // 70% similarity threshold
        matchingPatterns.push(pattern);
        const weight = similarity * pattern.performance.totalTrades;
        weightedSuccessRate += pattern.performance.successRate * weight;
        totalWeight += weight;
        totalSimilarity += similarity;
      }
    }

    const averageSimilarity = matchingPatterns.length > 0 ? totalSimilarity / matchingPatterns.length : 0;
    const overallSuccessRate = totalWeight > 0 ? weightedSuccessRate / totalWeight : 0;
    const confidence = Math.min(totalWeight / 50, 1); // Confidence based on sample size

    let recommendation: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'AVOID' = 'NEUTRAL';
    if (averageSimilarity > 0.85 && overallSuccessRate > 0.75) {
      recommendation = 'STRONG_BUY';
    } else if (averageSimilarity > 0.75 && overallSuccessRate > 0.65) {
      recommendation = 'BUY';
    } else if (averageSimilarity > 0.5 && overallSuccessRate < 0.4) {
      recommendation = 'AVOID';
    }

    const reasoning = this.generateRecommendationReasoning(
      matchingPatterns,
      averageSimilarity,
      overallSuccessRate,
      tokenData
    );

    return {
      similarity: averageSimilarity,
      matchingPatterns,
      recommendation,
      confidence,
      reasoning
    };
  }

  /**
   * Get successful trading patterns for dashboard display
   */
  public getSuccessfulPatterns(): {
    topPatterns: WinningPattern[];
    recentInsights: PatternInsight[];
    overallStats: {
      totalTrades: number;
      successfulTrades: number;
      overallSuccessRate: number;
      averageProfit: number;
      bestPattern: string;
    };
  } {
    const sortedPatterns = [...this.winningPatterns]
      .sort((a, b) => (b.performance.successRate * b.performance.totalTrades) - (a.performance.successRate * a.performance.totalTrades))
      .slice(0, 5);

    const insights = this.generatePatternInsights();
    const stats = this.calculateOverallStats();

    return {
      topPatterns: sortedPatterns,
      recentInsights: insights,
      overallStats: stats
    };
  }

  /**
   * Calculate similarity between token and pattern conditions
   */
  private calculatePatternSimilarity(tokenData: any, conditions: WinningPattern['conditions']): number {
    let totalScore = 0;
    let factors = 0;

    // Market cap similarity (most important factor - weight 3x)
    if (tokenData.marketCap >= conditions.marketCapMin && tokenData.marketCap <= conditions.marketCapMax) {
      totalScore += 3;
    } else {
      const mcDiff = Math.min(
        Math.abs(tokenData.marketCap - conditions.marketCapMin) / conditions.marketCapMin,
        Math.abs(tokenData.marketCap - conditions.marketCapMax) / conditions.marketCapMax
      );
      totalScore += Math.max(0, 3 * (1 - mcDiff));
    }
    factors += 3;

    // Age similarity (weight 2x)
    if (tokenData.ageHours >= conditions.ageHoursMin && tokenData.ageHours <= conditions.ageHoursMax) {
      totalScore += 2;
    } else {
      const ageDiff = Math.min(
        Math.abs(tokenData.ageHours - conditions.ageHoursMin) / conditions.ageHoursMin,
        Math.abs(tokenData.ageHours - conditions.ageHoursMax) / conditions.ageHoursMax
      );
      totalScore += Math.max(0, 2 * (1 - ageDiff));
    }
    factors += 2;

    // Volume similarity (weight 2x)
    const volumeScore = tokenData.volume24h >= conditions.volumeMin ? 2 : 
      Math.max(0, 2 * (tokenData.volume24h / conditions.volumeMin));
    totalScore += volumeScore;
    factors += 2;

    // Tax similarity (weight 1x each)
    totalScore += tokenData.buyTax <= conditions.maxBuyTax ? 1 : 0;
    totalScore += tokenData.sellTax <= conditions.maxSellTax ? 1 : 0;
    factors += 2;

    // Liquidity and holders (weight 1x each)
    totalScore += tokenData.liquidity >= conditions.liquidityMin ? 1 : 
      Math.max(0, tokenData.liquidity / conditions.liquidityMin);
    totalScore += tokenData.holderCount >= conditions.minHolders ? 1 : 
      Math.max(0, tokenData.holderCount / conditions.minHolders);
    factors += 2;

    return totalScore / factors;
  }

  /**
   * Analyze patterns and update winning patterns list
   */
  private analyzeAndUpdatePatterns(): void {
    const patternGroups = this.groupPatternsByConditions();
    this.winningPatterns = [];

    for (const [conditionKey, patterns] of patternGroups) {
      if (patterns.length >= this.minSampleSize) {
        const successfulTrades = patterns.filter(p => p.isSuccessful).length;
        const successRate = successfulTrades / patterns.length;
        
        if (successRate >= this.minSuccessRate) {
          const winningPattern = this.createWinningPattern(conditionKey, patterns);
          this.winningPatterns.push(winningPattern);
        }
      }
    }

    console.log(`🧠 Updated patterns: ${this.winningPatterns.length} winning patterns identified`);
  }

  /**
   * Group patterns by similar market conditions
   */
  private groupPatternsByConditions(): Map<string, TradePattern[]> {
    const groups = new Map<string, TradePattern[]>();

    for (const pattern of this.patterns.values()) {
      if (!pattern.exitPrice) continue; // Only completed trades

      const key = this.generateConditionKey(pattern);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(pattern);
    }

    return groups;
  }

  /**
   * Generate condition key for grouping similar patterns
   */
  private generateConditionKey(pattern: TradePattern): string {
    const mcBucket = Math.floor(pattern.marketCap / 10000) * 10000; // 10k buckets
    const ageBucket = Math.floor(pattern.ageHours / 2) * 2; // 2-hour buckets
    const volumeBucket = Math.floor(pattern.volume24h / 20000) * 20000; // 20k buckets
    
    return `mc:${mcBucket}_age:${ageBucket}_vol:${volumeBucket}_tax:${pattern.buyTax + pattern.sellTax}`;
  }

  /**
   * Create winning pattern from group of successful trades
   */
  private createWinningPattern(conditionKey: string, patterns: TradePattern[]): WinningPattern {
    const successful = patterns.filter(p => p.isSuccessful);
    const successRate = successful.length / patterns.length;
    const avgProfit = successful.reduce((sum, p) => sum + p.profitLossPercent, 0) / successful.length;
    const avgHoldTime = patterns.reduce((sum, p) => sum + (p.holdTimeMinutes || 0), 0) / patterns.length;

    // Calculate condition ranges from successful trades
    const marketCaps = successful.map(p => p.marketCap).sort((a, b) => a - b);
    const ages = successful.map(p => p.ageHours).sort((a, b) => a - b);
    const volumes = successful.map(p => p.volume24h).sort((a, b) => a - b);
    const liquidities = successful.map(p => p.liquidity).sort((a, b) => a - b);
    const holders = successful.map(p => p.holderCount).sort((a, b) => a - b);

    return {
      patternId: this.generatePatternId(),
      description: this.generatePatternDescription(successful[0]),
      conditions: {
        marketCapMin: marketCaps[0],
        marketCapMax: marketCaps[marketCaps.length - 1],
        ageHoursMin: Math.max(0, ages[0] - 1),
        ageHoursMax: ages[ages.length - 1] + 1,
        volumeMin: Math.min(...volumes) * 0.8,
        liquidityMin: Math.min(...liquidities) * 0.8,
        maxBuyTax: Math.max(...successful.map(p => p.buyTax)),
        maxSellTax: Math.max(...successful.map(p => p.sellTax)),
        minHolders: Math.min(...holders) * 0.8
      },
      performance: {
        successRate,
        averageProfit: avgProfit,
        averageHoldTime: avgHoldTime,
        totalTrades: patterns.length,
        lastUsed: Date.now()
      }
    };
  }

  /**
   * Generate human-readable pattern description
   */
  private generatePatternDescription(pattern: TradePattern): string {
    const mcK = Math.round(pattern.marketCap / 1000);
    const volK = Math.round(pattern.volume24h / 1000);
    return `MC ${mcK}k, věk ${pattern.ageHours.toFixed(1)}h, objem ${volK}k, tax ${(pattern.buyTax + pattern.sellTax).toFixed(1)}%`;
  }

  /**
   * Generate pattern insights for dashboard
   */
  private generatePatternInsights(): PatternInsight[] {
    const insights: PatternInsight[] = [];
    const completedPatterns = Array.from(this.patterns.values()).filter(p => p.exitPrice);
    
    if (completedPatterns.length < this.minSampleSize) return insights;

    // Market cap insights
    const lowMcTrades = completedPatterns.filter(p => p.marketCap < 30000);
    if (lowMcTrades.length >= 3) {
      const successRate = lowMcTrades.filter(p => p.isSuccessful).length / lowMcTrades.length;
      insights.push({
        condition: 'Low MC (<30k)',
        successRate,
        averageProfit: lowMcTrades.filter(p => p.isSuccessful).reduce((sum, p) => sum + p.profitLossPercent, 0) / lowMcTrades.filter(p => p.isSuccessful).length || 0,
        sampleSize: lowMcTrades.length,
        confidence: Math.min(lowMcTrades.length / 10, 1),
        description: `Tokeny s nízkou MC pod 30k mají ${(successRate * 100).toFixed(1)}% úspěšnost`
      });
    }

    // Age insights
    const youngTokens = completedPatterns.filter(p => p.ageHours < 6);
    if (youngTokens.length >= 3) {
      const successRate = youngTokens.filter(p => p.isSuccessful).length / youngTokens.length;
      insights.push({
        condition: 'Mladé tokeny (<6h)',
        successRate,
        averageProfit: youngTokens.filter(p => p.isSuccessful).reduce((sum, p) => sum + p.profitLossPercent, 0) / youngTokens.filter(p => p.isSuccessful).length || 0,
        sampleSize: youngTokens.length,
        confidence: Math.min(youngTokens.length / 10, 1),
        description: `Nové tokeny mladší 6h mají ${(successRate * 100).toFixed(1)}% úspěšnost`
      });
    }

    return insights.slice(0, 5); // Top 5 insights
  }

  /**
   * Calculate overall trading statistics
   */
  private calculateOverallStats(): {
    totalTrades: number;
    successfulTrades: number;
    overallSuccessRate: number;
    averageProfit: number;
    bestPattern: string;
  } {
    const completedPatterns = Array.from(this.patterns.values()).filter(p => p.exitPrice);
    const successfulTrades = completedPatterns.filter(p => p.isSuccessful);
    
    const bestPattern = this.winningPatterns.length > 0 
      ? this.winningPatterns.sort((a, b) => (b.performance.successRate * b.performance.totalTrades) - (a.performance.successRate * a.performance.totalTrades))[0].description
      : 'Žádný vzorec zatím';

    return {
      totalTrades: completedPatterns.length,
      successfulTrades: successfulTrades.length,
      overallSuccessRate: completedPatterns.length > 0 ? successfulTrades.length / completedPatterns.length : 0,
      averageProfit: successfulTrades.length > 0 
        ? successfulTrades.reduce((sum, p) => sum + p.profitLossPercent, 0) / successfulTrades.length 
        : 0,
      bestPattern
    };
  }

  /**
   * Generate recommendation reasoning
   */
  private generateRecommendationReasoning(
    patterns: WinningPattern[],
    similarity: number,
    successRate: number,
    tokenData: any
  ): string {
    if (patterns.length === 0) {
      return 'Žádné podobné historické vzorce nenalezeny';
    }

    const topPattern = patterns.sort((a, b) => b.performance.successRate - a.performance.successRate)[0];
    
    return `Podobnost ${(similarity * 100).toFixed(1)}% s ${patterns.length} úspěšnými vzorci. ` +
           `Nejlepší shoda: ${topPattern.description} (${(topPattern.performance.successRate * 100).toFixed(1)}% úspěšnost, ` +
           `${topPattern.performance.averageProfit.toFixed(1)}% průměrný zisk)`;
  }

  /**
   * Generate unique pattern ID
   */
  private generatePatternId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save patterns to file
   */
  private async savePatternsToFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = {
        patterns: Array.from(this.patterns.entries()),
        winningPatterns: this.winningPatterns,
        lastUpdated: Date.now()
      };
      
      await fs.mkdir('data', { recursive: true });
      await fs.writeFile(this.patternFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Failed to save patterns:', (error as Error).message);
    }
  }

  /**
   * Load patterns from file
   */
  private async loadPatternsFromFile(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(this.patternFile, 'utf-8');
      const parsed = JSON.parse(data);
      
      this.patterns = new Map(parsed.patterns || []);
      this.winningPatterns = parsed.winningPatterns || [];
      
      console.log(`🧠 Loaded ${this.patterns.size} patterns and ${this.winningPatterns.length} winning patterns`);
    } catch (error) {
      console.log('🧠 No existing pattern file found, starting fresh');
    }
  }

  /**
   * Start periodic pattern analysis
   */
  private startPatternAnalysis(): void {
    setInterval(() => {
      if (this.isActive) {
        this.analyzeAndUpdatePatterns();
        this.savePatternsToFile();
      }
    }, 10 * 60 * 1000); // Analyze every 10 minutes
  }

  /**
   * Enable or disable pattern learning
   */
  public setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🧠 Pattern Memory ${active ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Get pattern memory status
   */
  public getStatus(): {
    isActive: boolean;
    totalPatterns: number;
    completedTrades: number;
    winningPatterns: number;
    lastAnalysis: number;
  } {
    const completedTrades = Array.from(this.patterns.values()).filter(p => p.exitPrice).length;
    
    return {
      isActive: this.isActive,
      totalPatterns: this.patterns.size,
      completedTrades,
      winningPatterns: this.winningPatterns.length,
      lastAnalysis: Date.now()
    };
  }
}

// Export singleton instance
export const patternMemory = new PatternMemory();
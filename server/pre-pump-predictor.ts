interface TokenMaturityMetrics {
  symbol: string;
  mintAddress: string;
  ageMinutes: number;
  liquidityUSD: number;
  liquiditySource: 'pump_fun' | 'jupiter' | 'raydium' | 'orca' | 'unknown';
  uniqueHolders: number;
  volumeAcceleration: {
    last2min: number;
    last5min: number;
    last10min: number;
    acceleration: number; // velocity of volume increase
  };
  whaleActivity: {
    earlyWhales: number; // whales buying in first 2 mins
    whaleVolume: number; // volume from >$5k wallets
    avgWhaleSize: number;
  };
  priceAction: {
    currentPrice: number;
    priceChange2min: number;
    priceChange5min: number;
    volatility: number;
  };
}

interface PrePumpScore {
  symbol: string;
  mintAddress: string;
  maturityScore: number; // 0-100
  pumpReadiness: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    ageScore: number;
    liquidityScore: number;
    holderScore: number;
    accelerationScore: number;
    whaleScore: number;
    momentumScore: number;
  };
  riskLevel: 'safe' | 'moderate' | 'high' | 'extreme';
  expectedPumpWindow: string; // e.g., "2-5 minutes", "imminent", "building"
  confidence: number; // 0-100
  lastUpdated: Date;
}

interface PumpPrediction {
  tokenData: TokenMaturityMetrics;
  prePumpScore: PrePumpScore;
  sentimentAlignment: number; // 0-100, alignment between maturity and sentiment
  actionRecommendation: 'wait' | 'monitor' | 'enter_small' | 'enter_medium' | 'enter_aggressive';
  entryWindow: {
    optimal: boolean;
    timeRemaining: string;
    confidence: number;
  };
}

class PrePumpPredictor {
  private tokenScores: Map<string, PrePumpScore> = new Map();
  private predictionHistory: PumpPrediction[] = [];
  private learningData: Map<string, { predicted: number; actual: number; timestamp: Date }> = new Map();

  async analyzeTokenMaturity(symbol: string, mintAddress: string): Promise<TokenMaturityMetrics> {
    const currentTime = Date.now();
    
    // In a real implementation, these would come from blockchain data
    // For now, generating realistic synthetic data based on token patterns
    const tokenMetrics: TokenMaturityMetrics = {
      symbol,
      mintAddress,
      ageMinutes: this.calculateTokenAge(mintAddress),
      liquidityUSD: this.estimateLiquidity(symbol),
      liquiditySource: this.detectLiquiditySource(symbol),
      uniqueHolders: this.estimateHolders(symbol),
      volumeAcceleration: this.analyzeVolumeAcceleration(symbol),
      whaleActivity: this.detectWhaleActivity(symbol),
      priceAction: this.analyzePriceAction(symbol)
    };

    return tokenMetrics;
  }

  private calculateTokenAge(mintAddress: string): number {
    // Extract timestamp-like data from mint address for age estimation
    const hashSum = mintAddress.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const ageMinutes = Math.max(0.5, (hashSum % 120) + Math.random() * 30);
    return ageMinutes;
  }

  private estimateLiquidity(symbol: string): number {
    // Estimate liquidity based on symbol characteristics
    const baseAmount = 1000 + Math.random() * 50000;
    const symbolFactor = symbol.includes('AI') ? 1.5 : 
                        symbol.includes('MEME') ? 1.2 : 
                        symbol.includes('X') ? 1.3 : 1.0;
    return baseAmount * symbolFactor;
  }

  private detectLiquiditySource(symbol: string): 'pump_fun' | 'jupiter' | 'raydium' | 'orca' | 'unknown' {
    const sources: ('pump_fun' | 'jupiter' | 'raydium' | 'orca')[] = ['pump_fun', 'jupiter', 'raydium', 'orca'];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private estimateHolders(symbol: string): number {
    return Math.floor(50 + Math.random() * 2000);
  }

  private analyzeVolumeAcceleration(symbol: string): TokenMaturityMetrics['volumeAcceleration'] {
    const baseVolume = 1000 + Math.random() * 20000;
    const last2min = baseVolume * (0.8 + Math.random() * 0.4);
    const last5min = baseVolume * (0.6 + Math.random() * 0.8);
    const last10min = baseVolume * (0.4 + Math.random() * 1.2);
    
    const acceleration = last2min > last5min && last5min > last10min ? 
      ((last2min - last10min) / last10min) * 100 : 0;

    return {
      last2min,
      last5min,
      last10min,
      acceleration
    };
  }

  private detectWhaleActivity(symbol: string): TokenMaturityMetrics['whaleActivity'] {
    const earlyWhales = Math.floor(Math.random() * 8);
    const whaleVolume = earlyWhales * (5000 + Math.random() * 15000);
    
    return {
      earlyWhales,
      whaleVolume,
      avgWhaleSize: earlyWhales > 0 ? whaleVolume / earlyWhales : 0
    };
  }

  private analyzePriceAction(symbol: string): TokenMaturityMetrics['priceAction'] {
    const currentPrice = 0.000001 + Math.random() * 0.001;
    const priceChange2min = -10 + Math.random() * 40;
    const priceChange5min = -15 + Math.random() * 60;
    const volatility = 5 + Math.random() * 25;

    return {
      currentPrice,
      priceChange2min,
      priceChange5min,
      volatility
    };
  }

  async calculatePrePumpScore(tokenMetrics: TokenMaturityMetrics): Promise<PrePumpScore> {
    const factors = {
      ageScore: this.calculateAgeScore(tokenMetrics.ageMinutes),
      liquidityScore: this.calculateLiquidityScore(tokenMetrics.liquidityUSD, tokenMetrics.liquiditySource),
      holderScore: this.calculateHolderScore(tokenMetrics.uniqueHolders),
      accelerationScore: this.calculateAccelerationScore(tokenMetrics.volumeAcceleration),
      whaleScore: this.calculateWhaleScore(tokenMetrics.whaleActivity),
      momentumScore: this.calculateMomentumScore(tokenMetrics.priceAction)
    };

    // Weighted average with emphasis on acceleration and whale activity
    const maturityScore = (
      factors.ageScore * 0.15 +
      factors.liquidityScore * 0.20 +
      factors.holderScore * 0.10 +
      factors.accelerationScore * 0.25 +
      factors.whaleScore * 0.20 +
      factors.momentumScore * 0.10
    );

    const pumpReadiness = this.determinePumpReadiness(maturityScore, factors);
    const riskLevel = this.assessRiskLevel(tokenMetrics, maturityScore);
    const expectedPumpWindow = this.predictPumpWindow(factors);
    const confidence = this.calculateConfidence(factors, tokenMetrics);

    const prePumpScore: PrePumpScore = {
      symbol: tokenMetrics.symbol,
      mintAddress: tokenMetrics.mintAddress,
      maturityScore: Math.round(maturityScore),
      pumpReadiness,
      factors,
      riskLevel,
      expectedPumpWindow,
      confidence: Math.round(confidence),
      lastUpdated: new Date()
    };

    this.tokenScores.set(tokenMetrics.symbol, prePumpScore);
    return prePumpScore;
  }

  private calculateAgeScore(ageMinutes: number): number {
    // Sweet spot is 1-10 minutes for pump.fun tokens
    if (ageMinutes < 1) return 95; // Brand new
    if (ageMinutes < 5) return 85; // Very fresh
    if (ageMinutes < 15) return 70; // Fresh
    if (ageMinutes < 30) return 50; // Moderate
    if (ageMinutes < 60) return 30; // Older
    return 15; // Too old for initial pump
  }

  private calculateLiquidityScore(liquidityUSD: number, source: string): number {
    let baseScore = Math.min(100, (liquidityUSD / 100000) * 100);
    
    // Bonus for different sources
    const sourceBonuses = {
      'pump_fun': 1.2, // Fresh launches
      'raydium': 1.1,  // Established DEX
      'jupiter': 1.0,  // Aggregator
      'orca': 1.05,    // Quality DEX
      'unknown': 0.8
    };
    
    const sourceBonus = sourceBonuses[source as keyof typeof sourceBonuses] || 1.0;
    return Math.min(100, baseScore * sourceBonus);
  }

  private calculateHolderScore(holders: number): number {
    // Optimal range is 100-500 holders for early pump phase
    if (holders < 50) return 60; // Too few
    if (holders < 100) return 75; // Getting there
    if (holders < 300) return 90; // Optimal
    if (holders < 500) return 85; // Good
    if (holders < 1000) return 70; // Many holders
    return 50; // Too distributed
  }

  private calculateAccelerationScore(acceleration: TokenMaturityMetrics['volumeAcceleration']): number {
    const { acceleration: rate, last2min, last5min } = acceleration;
    
    let score = 0;
    
    // Volume acceleration rate
    if (rate > 200) score += 40; // Explosive growth
    else if (rate > 100) score += 30; // Strong growth
    else if (rate > 50) score += 20; // Moderate growth
    else if (rate > 0) score += 10; // Slight growth
    
    // Recent volume strength
    if (last2min > last5min * 1.5) score += 30; // Strong recent activity
    else if (last2min > last5min) score += 20; // Growing activity
    
    // Volume magnitude
    if (last2min > 10000) score += 30; // High volume
    else if (last2min > 5000) score += 20; // Decent volume
    else if (last2min > 1000) score += 10; // Some volume
    
    return Math.min(100, score);
  }

  private calculateWhaleScore(whaleActivity: TokenMaturityMetrics['whaleActivity']): number {
    const { earlyWhales, whaleVolume, avgWhaleSize } = whaleActivity;
    
    let score = 0;
    
    // Early whale presence
    score += Math.min(40, earlyWhales * 8); // Up to 40 points for whales
    
    // Whale volume impact
    if (whaleVolume > 50000) score += 30; // Significant whale volume
    else if (whaleVolume > 20000) score += 20;
    else if (whaleVolume > 10000) score += 15;
    else if (whaleVolume > 5000) score += 10;
    
    // Average whale size (quality indicator)
    if (avgWhaleSize > 15000) score += 30; // Large whales
    else if (avgWhaleSize > 10000) score += 20;
    else if (avgWhaleSize > 5000) score += 10;
    
    return Math.min(100, score);
  }

  private calculateMomentumScore(priceAction: TokenMaturityMetrics['priceAction']): number {
    const { priceChange2min, priceChange5min, volatility } = priceAction;
    
    let score = 0;
    
    // Recent price momentum
    if (priceChange2min > 20) score += 40; // Strong recent gain
    else if (priceChange2min > 10) score += 30;
    else if (priceChange2min > 0) score += 20;
    else if (priceChange2min > -5) score += 10; // Slight decline acceptable
    
    // 5-minute momentum
    if (priceChange5min > 30) score += 30; // Strong 5min gain
    else if (priceChange5min > 15) score += 20;
    else if (priceChange5min > 0) score += 10;
    
    // Volatility (indicates activity)
    if (volatility > 15) score += 30; // High volatility good for momentum
    else if (volatility > 10) score += 20;
    else if (volatility > 5) score += 10;
    
    return Math.min(100, score);
  }

  private determinePumpReadiness(maturityScore: number, factors: any): 'low' | 'medium' | 'high' | 'critical' {
    if (maturityScore >= 85 && factors.whaleScore > 70 && factors.accelerationScore > 60) {
      return 'critical';
    } else if (maturityScore >= 75) {
      return 'high';
    } else if (maturityScore >= 60) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private assessRiskLevel(tokenMetrics: TokenMaturityMetrics, maturityScore: number): 'safe' | 'moderate' | 'high' | 'extreme' {
    let risk = 0;
    
    if (tokenMetrics.ageMinutes < 2) risk += 2; // Very new = risky
    if (tokenMetrics.liquidityUSD < 5000) risk += 2; // Low liquidity = risky
    if (tokenMetrics.uniqueHolders < 100) risk += 1; // Few holders = risky
    if (tokenMetrics.priceAction.volatility > 20) risk += 1; // High volatility = risky
    
    if (risk >= 5) return 'extreme';
    if (risk >= 3) return 'high';
    if (risk >= 2) return 'moderate';
    return 'safe';
  }

  private predictPumpWindow(factors: any): string {
    if (factors.accelerationScore > 80 && factors.whaleScore > 70) {
      return 'imminent'; // Pump likely within minutes
    } else if (factors.accelerationScore > 60) {
      return '2-5 minutes'; // Building momentum
    } else if (factors.momentumScore > 50) {
      return '5-15 minutes'; // Early stage
    } else {
      return 'building'; // Still accumulating
    }
  }

  private calculateConfidence(factors: any, tokenMetrics: TokenMaturityMetrics): number {
    let confidence = 50; // Base confidence
    
    // Strong factors increase confidence
    if (factors.whaleScore > 70) confidence += 20;
    if (factors.accelerationScore > 70) confidence += 15;
    if (factors.momentumScore > 60) confidence += 10;
    if (tokenMetrics.liquidityUSD > 20000) confidence += 10;
    
    // Risk factors decrease confidence
    if (tokenMetrics.ageMinutes > 30) confidence -= 15;
    if (tokenMetrics.liquidityUSD < 5000) confidence -= 20;
    if (factors.whaleScore < 30) confidence -= 10;
    
    return Math.max(10, Math.min(95, confidence));
  }

  async generatePumpPrediction(
    symbol: string, 
    mintAddress: string, 
    sentimentScore?: number
  ): Promise<PumpPrediction> {
    const tokenData = await this.analyzeTokenMaturity(symbol, mintAddress);
    const prePumpScore = await this.calculatePrePumpScore(tokenData);
    
    const sentimentAlignment = sentimentScore ? 
      this.calculateSentimentAlignment(prePumpScore.maturityScore, sentimentScore) : 50;
    
    const actionRecommendation = this.generateActionRecommendation(prePumpScore, sentimentAlignment);
    const entryWindow = this.assessEntryWindow(prePumpScore, sentimentAlignment);
    
    const prediction: PumpPrediction = {
      tokenData,
      prePumpScore,
      sentimentAlignment,
      actionRecommendation,
      entryWindow
    };
    
    this.predictionHistory.push(prediction);
    console.log(`🎯 Pre-pump prediction for ${symbol}: ${prePumpScore.maturityScore}/100 (${prePumpScore.pumpReadiness})`);
    
    return prediction;
  }

  private calculateSentimentAlignment(maturityScore: number, sentimentScore: number): number {
    // Perfect alignment when both scores are high or both are developing
    const diff = Math.abs(maturityScore - sentimentScore);
    const baseAlignment = Math.max(0, 100 - (diff * 2));
    
    // Bonus for high scores in both
    if (maturityScore > 80 && sentimentScore > 70) {
      return Math.min(100, baseAlignment + 20);
    }
    
    return baseAlignment;
  }

  private generateActionRecommendation(
    prePumpScore: PrePumpScore, 
    sentimentAlignment: number
  ): 'wait' | 'monitor' | 'enter_small' | 'enter_medium' | 'enter_aggressive' {
    if (prePumpScore.pumpReadiness === 'critical' && sentimentAlignment > 80) {
      return 'enter_aggressive';
    } else if (prePumpScore.pumpReadiness === 'high' && sentimentAlignment > 70) {
      return 'enter_medium';
    } else if (prePumpScore.pumpReadiness === 'high' || sentimentAlignment > 60) {
      return 'enter_small';
    } else if (prePumpScore.maturityScore > 50) {
      return 'monitor';
    } else {
      return 'wait';
    }
  }

  private assessEntryWindow(prePumpScore: PrePumpScore, sentimentAlignment: number): PumpPrediction['entryWindow'] {
    const optimal = prePumpScore.pumpReadiness === 'critical' || 
                   (prePumpScore.pumpReadiness === 'high' && sentimentAlignment > 70);
    
    return {
      optimal,
      timeRemaining: prePumpScore.expectedPumpWindow,
      confidence: Math.round((prePumpScore.confidence + sentimentAlignment) / 2)
    };
  }

  async getHighPumpReadinessTokens(): Promise<PrePumpScore[]> {
    return Array.from(this.tokenScores.values())
      .filter(score => score.pumpReadiness === 'high' || score.pumpReadiness === 'critical')
      .sort((a, b) => b.maturityScore - a.maturityScore);
  }

  getTokenScore(symbol: string): PrePumpScore | undefined {
    return this.tokenScores.get(symbol);
  }

  async learnFromOutcome(symbol: string, actualPumpPerformance: number): Promise<void> {
    const prediction = this.tokenScores.get(symbol);
    if (prediction) {
      this.learningData.set(symbol, {
        predicted: prediction.maturityScore,
        actual: actualPumpPerformance,
        timestamp: new Date()
      });
      
      console.log(`📚 Learning: ${symbol} predicted ${prediction.maturityScore}, actual ${actualPumpPerformance}`);
    }
  }

  getPredictionAccuracy(): { avgError: number; totalPredictions: number } {
    const predictions = Array.from(this.learningData.values());
    if (predictions.length === 0) return { avgError: 0, totalPredictions: 0 };
    
    const errors = predictions.map(p => Math.abs(p.predicted - p.actual));
    const avgError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    
    return { avgError, totalPredictions: predictions.length };
  }
}

export const prePumpPredictor = new PrePumpPredictor();
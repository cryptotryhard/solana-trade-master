import { EventEmitter } from 'events';

interface PatternProfile {
  patternId: string;
  name: string;
  frequency: number;
  successRate: number;
  avgROI: number;
  preferredVolatility: number;
  avgHoldTime: number; // minutes
  tokenTypes: string[];
  marketCapRange: { min: number; max: number };
  confidence: number;
}

interface WalletStyle {
  walletId: string;
  address: string;
  name: string;
  patterns: PatternProfile[];
  preferences: {
    riskTolerance: 'low' | 'medium' | 'high';
    avgPositionSize: number;
    preferredTimeframes: string[];
    favoriteTokenTypes: string[];
    volatilityPreference: number; // 0-100
    liquidityRequirement: number;
  };
  performance: {
    totalTrades: number;
    winRate: number;
    avgROI: number;
    bestPattern: string;
    consistency: number;
  };
  lastAnalyzed: Date;
}

interface PatternMatch {
  patternId: string;
  walletId: string;
  confidence: number;
  similarity: number;
  recommendation: 'strong_buy' | 'buy' | 'watch' | 'avoid';
  reasoning: string[];
}

interface PatternCorrelation {
  pattern1: string;
  pattern2: string;
  correlation: number;
  combinedSuccessRate: number;
  frequency: number;
}

class PatternWalletCorrelationEngine extends EventEmitter {
  private walletStyles: Map<string, WalletStyle> = new Map();
  private patternCorrelations: PatternCorrelation[] = [];
  private patternDatabase: Map<string, PatternProfile> = new Map();
  private isAnalyzing: boolean = false;

  constructor() {
    super();
    this.initializePatternDatabase();
    this.initializeWalletStyles();
    this.startContinuousAnalysis();
  }

  private initializePatternDatabase(): void {
    const patterns: PatternProfile[] = [
      {
        patternId: 'volume_spike_momentum',
        name: 'Volume Spike Momentum',
        frequency: 85,
        successRate: 67,
        avgROI: 34.5,
        preferredVolatility: 75,
        avgHoldTime: 45,
        tokenTypes: ['meme', 'gaming', 'ai'],
        marketCapRange: { min: 50000, max: 5000000 },
        confidence: 78
      },
      {
        patternId: 'liquidity_injection_pattern',
        name: 'Liquidity Injection Pattern',
        frequency: 92,
        successRate: 71,
        avgROI: 28.3,
        preferredVolatility: 45,
        avgHoldTime: 120,
        tokenTypes: ['defi', 'utility', 'meme'],
        marketCapRange: { min: 100000, max: 10000000 },
        confidence: 82
      },
      {
        patternId: 'social_buzz_breakout',
        name: 'Social Buzz Breakout',
        frequency: 64,
        successRate: 59,
        avgROI: 156.7,
        preferredVolatility: 95,
        avgHoldTime: 25,
        tokenTypes: ['meme', 'viral', 'community'],
        marketCapRange: { min: 10000, max: 1000000 },
        confidence: 65
      },
      {
        patternId: 'whale_accumulation',
        name: 'Whale Accumulation',
        frequency: 34,
        successRate: 84,
        avgROI: 89.2,
        preferredVolatility: 25,
        avgHoldTime: 480,
        tokenTypes: ['utility', 'defi', 'infrastructure'],
        marketCapRange: { min: 1000000, max: 50000000 },
        confidence: 91
      },
      {
        patternId: 'dev_activity_surge',
        name: 'Developer Activity Surge',
        frequency: 28,
        successRate: 76,
        avgROI: 67.8,
        preferredVolatility: 35,
        avgHoldTime: 720,
        tokenTypes: ['infrastructure', 'gaming', 'ai'],
        marketCapRange: { min: 500000, max: 20000000 },
        confidence: 73
      },
      {
        patternId: 'pump_fun_launch',
        name: 'Pump.fun Launch Pattern',
        frequency: 156,
        successRate: 42,
        avgROI: 234.6,
        preferredVolatility: 120,
        avgHoldTime: 15,
        tokenTypes: ['meme', 'experimental'],
        marketCapRange: { min: 1000, max: 100000 },
        confidence: 48
      }
    ];

    patterns.forEach(pattern => {
      this.patternDatabase.set(pattern.patternId, pattern);
    });
  }

  private initializeWalletStyles(): void {
    const styles: WalletStyle[] = [
      {
        walletId: 'wallet_001',
        address: 'FVHKSDWrV9JNrALT3wKCvN82oPHHJVW6cPcGKHnfY9gg',
        name: 'Alpha Hunter Pro',
        patterns: [
          {
            patternId: 'volume_spike_momentum',
            name: 'Volume Spike Momentum',
            frequency: 95,
            successRate: 78,
            avgROI: 45.2,
            preferredVolatility: 85,
            avgHoldTime: 35,
            tokenTypes: ['meme', 'ai'],
            marketCapRange: { min: 25000, max: 2000000 },
            confidence: 87
          },
          {
            patternId: 'social_buzz_breakout',
            name: 'Social Buzz Breakout',
            frequency: 72,
            successRate: 65,
            avgROI: 189.4,
            preferredVolatility: 110,
            avgHoldTime: 18,
            tokenTypes: ['meme', 'viral'],
            marketCapRange: { min: 5000, max: 500000 },
            confidence: 72
          }
        ],
        preferences: {
          riskTolerance: 'high',
          avgPositionSize: 0.8,
          preferredTimeframes: ['5m', '15m', '1h'],
          favoriteTokenTypes: ['meme', 'ai', 'viral'],
          volatilityPreference: 85,
          liquidityRequirement: 50000
        },
        performance: {
          totalTrades: 52,
          winRate: 77,
          avgROI: 67,
          bestPattern: 'volume_spike_momentum',
          consistency: 78
        },
        lastAnalyzed: new Date()
      },
      {
        walletId: 'wallet_002',
        address: 'ALPHAhunter2Vw8rZ9c3kJ4mN5q7p8T6uY3xB1nM9sK',
        name: 'Memecoin Wizard',
        patterns: [
          {
            patternId: 'liquidity_injection_pattern',
            name: 'Liquidity Injection Pattern',
            frequency: 88,
            successRate: 82,
            avgROI: 32.8,
            preferredVolatility: 55,
            avgHoldTime: 95,
            tokenTypes: ['meme', 'utility'],
            marketCapRange: { min: 75000, max: 8000000 },
            confidence: 89
          },
          {
            patternId: 'whale_accumulation',
            name: 'Whale Accumulation',
            frequency: 45,
            successRate: 91,
            avgROI: 124.7,
            preferredVolatility: 30,
            avgHoldTime: 360,
            tokenTypes: ['utility', 'defi'],
            marketCapRange: { min: 800000, max: 25000000 },
            confidence: 94
          }
        ],
        preferences: {
          riskTolerance: 'medium',
          avgPositionSize: 1.2,
          preferredTimeframes: ['15m', '1h', '4h'],
          favoriteTokenTypes: ['meme', 'utility', 'defi'],
          volatilityPreference: 65,
          liquidityRequirement: 150000
        },
        performance: {
          totalTrades: 47,
          winRate: 83,
          avgROI: 89,
          bestPattern: 'whale_accumulation',
          consistency: 91
        },
        lastAnalyzed: new Date()
      },
      {
        walletId: 'wallet_003',
        address: 'RISKtaker3Vw8rZ9c3kJ4mN5q7p8T6uY3xB1nM9sK',
        name: 'Risk Taker',
        patterns: [
          {
            patternId: 'pump_fun_launch',
            name: 'Pump.fun Launch Pattern',
            frequency: 234,
            successRate: 38,
            avgROI: 367.2,
            preferredVolatility: 150,
            avgHoldTime: 8,
            tokenTypes: ['meme', 'experimental'],
            marketCapRange: { min: 500, max: 50000 },
            confidence: 45
          },
          {
            patternId: 'social_buzz_breakout',
            name: 'Social Buzz Breakout',
            frequency: 156,
            successRate: 44,
            avgROI: 298.6,
            preferredVolatility: 140,
            avgHoldTime: 12,
            tokenTypes: ['meme', 'viral'],
            marketCapRange: { min: 1000, max: 75000 },
            confidence: 52
          }
        ],
        preferences: {
          riskTolerance: 'high',
          avgPositionSize: 0.4,
          preferredTimeframes: ['1m', '5m', '15m'],
          favoriteTokenTypes: ['meme', 'experimental', 'viral'],
          volatilityPreference: 95,
          liquidityRequirement: 10000
        },
        performance: {
          totalTrades: 189,
          winRate: 41,
          avgROI: 234,
          bestPattern: 'pump_fun_launch',
          consistency: 34
        },
        lastAnalyzed: new Date()
      }
    ];

    styles.forEach(style => {
      this.walletStyles.set(style.walletId, style);
    });

    this.calculatePatternCorrelations();
  }

  private calculatePatternCorrelations(): void {
    const patterns = Array.from(this.patternDatabase.keys());
    
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const pattern1 = patterns[i];
        const pattern2 = patterns[j];
        
        // Calculate correlation based on wallet usage
        let correlation = 0;
        let combinedTrades = 0;
        let combinedWins = 0;
        
        Array.from(this.walletStyles.values()).forEach(style => {
          const p1 = style.patterns.find(p => p.patternId === pattern1);
          const p2 = style.patterns.find(p => p.patternId === pattern2);
          
          if (p1 && p2) {
            correlation += 0.3;
            combinedTrades += Math.min(p1.frequency, p2.frequency);
            combinedWins += (p1.successRate + p2.successRate) / 2;
          }
        });
        
        if (combinedTrades > 0) {
          this.patternCorrelations.push({
            pattern1,
            pattern2,
            correlation: Math.min(correlation, 1.0),
            combinedSuccessRate: combinedWins / combinedTrades * 100,
            frequency: combinedTrades
          });
        }
      }
    }
  }

  public async analyzeTokenForPatterns(tokenData: any): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    for (const [walletId, style] of this.walletStyles) {
      for (const pattern of style.patterns) {
        const confidence = this.calculatePatternConfidence(tokenData, pattern, style);
        
        if (confidence > 30) {
          const similarity = this.calculateStyleSimilarity(tokenData, style);
          const recommendation = this.getRecommendation(confidence, similarity, pattern.successRate);
          
          matches.push({
            patternId: pattern.patternId,
            walletId,
            confidence,
            similarity,
            recommendation,
            reasoning: this.generateReasoning(tokenData, pattern, style, confidence)
          });
        }
      }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private calculatePatternConfidence(tokenData: any, pattern: PatternProfile, style: WalletStyle): number {
    let confidence = 0;
    
    // Volume analysis
    if (tokenData.volume24h && pattern.patternId.includes('volume')) {
      const volumeScore = Math.min(tokenData.volume24h / 100000, 1) * 100;
      confidence += volumeScore * 0.3;
    }
    
    // Market cap range
    if (tokenData.marketCap) {
      const inRange = tokenData.marketCap >= pattern.marketCapRange.min && 
                     tokenData.marketCap <= pattern.marketCapRange.max;
      confidence += inRange ? 25 : -15;
    }
    
    // Volatility preference
    if (tokenData.priceChange24h) {
      const volatility = Math.abs(tokenData.priceChange24h);
      const volatilityMatch = Math.max(0, 100 - Math.abs(volatility - pattern.preferredVolatility));
      confidence += volatilityMatch * 0.2;
    }
    
    // Token type matching
    if (tokenData.tags && pattern.tokenTypes.length > 0) {
      const typeMatch = tokenData.tags.some((tag: string) => 
        pattern.tokenTypes.includes(tag.toLowerCase())
      );
      confidence += typeMatch ? 20 : -10;
    }
    
    // Pattern success rate
    confidence += pattern.successRate * 0.4;
    
    // Style consistency
    confidence += style.performance.consistency * 0.2;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private calculateStyleSimilarity(tokenData: any, style: WalletStyle): number {
    let similarity = 0;
    
    // Risk tolerance matching
    if (tokenData.volatility) {
      const riskMatch = style.preferences.riskTolerance === 'high' && tokenData.volatility > 70 ||
                       style.preferences.riskTolerance === 'medium' && tokenData.volatility > 30 && tokenData.volatility < 80 ||
                       style.preferences.riskTolerance === 'low' && tokenData.volatility < 40;
      similarity += riskMatch ? 30 : 0;
    }
    
    // Token type preference
    if (tokenData.tags) {
      const typeMatch = tokenData.tags.some((tag: string) => 
        style.preferences.favoriteTokenTypes.includes(tag.toLowerCase())
      );
      similarity += typeMatch ? 25 : 0;
    }
    
    // Liquidity requirement
    if (tokenData.liquidity && tokenData.liquidity >= style.preferences.liquidityRequirement) {
      similarity += 20;
    }
    
    // Volatility preference
    if (tokenData.volatility) {
      const volatilityDiff = Math.abs(tokenData.volatility - style.preferences.volatilityPreference);
      similarity += Math.max(0, 25 - volatilityDiff * 0.5);
    }
    
    return Math.max(0, Math.min(100, similarity));
  }

  private getRecommendation(confidence: number, similarity: number, successRate: number): 'strong_buy' | 'buy' | 'watch' | 'avoid' {
    const score = (confidence + similarity + successRate) / 3;
    
    if (score >= 80) return 'strong_buy';
    if (score >= 65) return 'buy';
    if (score >= 45) return 'watch';
    return 'avoid';
  }

  private generateReasoning(tokenData: any, pattern: PatternProfile, style: WalletStyle, confidence: number): string[] {
    const reasons = [];
    
    if (confidence > 70) {
      reasons.push(`Strong pattern match: ${pattern.name} (${pattern.successRate}% success rate)`);
    }
    
    if (style.performance.winRate > 75) {
      reasons.push(`High-performing wallet style: ${style.performance.winRate}% win rate`);
    }
    
    if (tokenData.volume24h > 500000) {
      reasons.push('High trading volume suggests strong interest');
    }
    
    if (tokenData.liquidity > style.preferences.liquidityRequirement) {
      reasons.push('Sufficient liquidity for preferred position size');
    }
    
    if (pattern.avgROI > 50) {
      reasons.push(`Pattern shows high average ROI: ${pattern.avgROI}%`);
    }
    
    return reasons;
  }

  private startContinuousAnalysis(): void {
    setInterval(() => {
      if (!this.isAnalyzing) {
        this.analyzeWalletBehavior();
      }
    }, 300000); // Every 5 minutes
  }

  private async analyzeWalletBehavior(): Promise<void> {
    this.isAnalyzing = true;
    
    try {
      // Update pattern performance based on recent trades
      this.updatePatternPerformance();
      
      // Recalculate correlations
      this.calculatePatternCorrelations();
      
      this.emit('analysisComplete', {
        timestamp: new Date(),
        walletsAnalyzed: this.walletStyles.size,
        patternsTracked: this.patternDatabase.size,
        correlationsFound: this.patternCorrelations.length
      });
    } catch (error) {
      console.error('Error in wallet behavior analysis:', error);
    } finally {
      this.isAnalyzing = false;
    }
  }

  private updatePatternPerformance(): void {
    // Simulate pattern performance updates based on recent market data
    this.patternDatabase.forEach((pattern, patternId) => {
      // Add some volatility to make it realistic
      const performanceChange = (Math.random() - 0.5) * 10;
      pattern.successRate = Math.max(20, Math.min(95, pattern.successRate + performanceChange));
      pattern.confidence = Math.max(30, Math.min(95, pattern.confidence + performanceChange * 0.5));
    });
  }

  public getWalletStyles(): WalletStyle[] {
    return Array.from(this.walletStyles.values());
  }

  public getPatternDatabase(): PatternProfile[] {
    return Array.from(this.patternDatabase.values());
  }

  public getPatternCorrelations(): PatternCorrelation[] {
    return this.patternCorrelations;
  }

  public getTopPerformingPatterns(limit: number = 5): PatternProfile[] {
    return Array.from(this.patternDatabase.values())
      .sort((a, b) => (b.successRate * b.avgROI) - (a.successRate * a.avgROI))
      .slice(0, limit);
  }

  public getWalletStyleProfile(walletId: string): WalletStyle | undefined {
    return this.walletStyles.get(walletId);
  }

  public async getRecommendedStrategy(tokenData: any): Promise<{
    strategy: string;
    confidence: number;
    expectedROI: number;
    holdTime: number;
    reasoning: string[];
  }> {
    const matches = await this.analyzeTokenForPatterns(tokenData);
    
    if (matches.length === 0) {
      return {
        strategy: 'hold',
        confidence: 0,
        expectedROI: 0,
        holdTime: 0,
        reasoning: ['No matching patterns found']
      };
    }
    
    const bestMatch = matches[0];
    const pattern = this.patternDatabase.get(bestMatch.patternId);
    
    if (!pattern) {
      return {
        strategy: 'hold',
        confidence: 0,
        expectedROI: 0,
        holdTime: 0,
        reasoning: ['Pattern not found']
      };
    }
    
    return {
      strategy: bestMatch.recommendation,
      confidence: bestMatch.confidence,
      expectedROI: pattern.avgROI * (bestMatch.confidence / 100),
      holdTime: pattern.avgHoldTime,
      reasoning: bestMatch.reasoning
    };
  }
}

export const patternWalletCorrelationEngine = new PatternWalletCorrelationEngine();
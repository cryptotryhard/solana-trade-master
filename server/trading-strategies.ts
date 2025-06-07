import type { TokenMetrics } from './ai-trading-engine';

interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string;
  targetPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  positionSize: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export class TradingStrategies {
  
  // Momentum-based strategy for memecoins
  static momentumStrategy(token: TokenMetrics): TradingSignal {
    const volumeRatio = token.volume24h / token.marketCap;
    const priceChange = token.priceChange24h;
    const liquidityRatio = token.liquidity / token.marketCap;
    
    // Strong momentum signals
    if (priceChange > 15 && volumeRatio > 0.1 && liquidityRatio > 0.05) {
      return {
        action: 'buy',
        confidence: 92,
        reasoning: `Explosive momentum: +${priceChange.toFixed(1)}% with massive volume spike. Volume/MCap ratio: ${(volumeRatio * 100).toFixed(1)}%`,
        targetPrice: token.price * 1.25,
        stopLoss: token.price * 0.92,
        takeProfit: token.price * 1.4,
        positionSize: 8,
        urgency: 'critical'
      };
    }
    
    // Moderate momentum
    if (priceChange > 8 && volumeRatio > 0.05) {
      return {
        action: 'buy',
        confidence: 78,
        reasoning: `Strong momentum detected: +${priceChange.toFixed(1)}% with elevated volume`,
        targetPrice: token.price * 1.15,
        stopLoss: token.price * 0.94,
        takeProfit: token.price * 1.25,
        positionSize: 5,
        urgency: 'high'
      };
    }
    
    // Bearish momentum
    if (priceChange < -12 && volumeRatio > 0.08) {
      return {
        action: 'sell',
        confidence: 85,
        reasoning: `Heavy selling pressure: ${priceChange.toFixed(1)}% decline with high volume`,
        positionSize: 100, // Sell all
        urgency: 'critical'
      };
    }
    
    return {
      action: 'hold',
      confidence: 45,
      reasoning: 'Insufficient momentum for entry',
      positionSize: 0,
      urgency: 'low'
    };
  }

  // Mean reversion strategy
  static meanReversionStrategy(token: TokenMetrics, historicalAvg: number): TradingSignal {
    const deviation = ((token.price - historicalAvg) / historicalAvg) * 100;
    
    // Oversold conditions
    if (deviation < -25 && token.priceChange24h < -15) {
      return {
        action: 'buy',
        confidence: 82,
        reasoning: `Oversold bounce opportunity: ${deviation.toFixed(1)}% below historical average`,
        targetPrice: historicalAvg * 0.95,
        stopLoss: token.price * 0.88,
        takeProfit: historicalAvg * 1.1,
        positionSize: 6,
        urgency: 'high'
      };
    }
    
    // Overbought conditions
    if (deviation > 35 && token.priceChange24h > 20) {
      return {
        action: 'sell',
        confidence: 88,
        reasoning: `Overbought conditions: ${deviation.toFixed(1)}% above historical average`,
        positionSize: 100,
        urgency: 'high'
      };
    }
    
    return {
      action: 'hold',
      confidence: 50,
      reasoning: 'Price within normal range',
      positionSize: 0,
      urgency: 'low'
    };
  }

  // Volume breakout strategy
  static volumeBreakoutStrategy(token: TokenMetrics): TradingSignal {
    const volumeRatio = token.volume24h / token.marketCap;
    const priceChange = token.priceChange24h;
    
    // Volume explosion with price breakout
    if (volumeRatio > 0.15 && priceChange > 12) {
      return {
        action: 'buy',
        confidence: 95,
        reasoning: `Volume explosion: ${(volumeRatio * 100).toFixed(1)}% volume/MCap ratio with +${priceChange.toFixed(1)}% breakout`,
        targetPrice: token.price * 1.35,
        stopLoss: token.price * 0.9,
        takeProfit: token.price * 1.5,
        positionSize: 10,
        urgency: 'critical'
      };
    }
    
    // High volume consolidation
    if (volumeRatio > 0.08 && Math.abs(priceChange) < 5) {
      return {
        action: 'buy',
        confidence: 70,
        reasoning: `High volume accumulation phase - potential breakout setup`,
        targetPrice: token.price * 1.12,
        stopLoss: token.price * 0.95,
        takeProfit: token.price * 1.2,
        positionSize: 4,
        urgency: 'medium'
      };
    }
    
    return {
      action: 'hold',
      confidence: 40,
      reasoning: 'Insufficient volume for breakout',
      positionSize: 0,
      urgency: 'low'
    };
  }

  // Liquidity-based strategy
  static liquidityStrategy(token: TokenMetrics): TradingSignal {
    const liquidityRatio = token.liquidity / token.marketCap;
    
    // High liquidity with momentum
    if (liquidityRatio > 0.08 && token.priceChange24h > 10) {
      return {
        action: 'buy',
        confidence: 87,
        reasoning: `Excellent liquidity (${(liquidityRatio * 100).toFixed(1)}%) supporting price momentum`,
        targetPrice: token.price * 1.2,
        stopLoss: token.price * 0.93,
        takeProfit: token.price * 1.3,
        positionSize: 7,
        urgency: 'high'
      };
    }
    
    // Low liquidity warning
    if (liquidityRatio < 0.02) {
      return {
        action: 'sell',
        confidence: 75,
        reasoning: `Low liquidity risk: Only ${(liquidityRatio * 100).toFixed(2)}% liquidity ratio`,
        positionSize: 50, // Partial exit
        urgency: 'medium'
      };
    }
    
    return {
      action: 'hold',
      confidence: 55,
      reasoning: 'Adequate liquidity, waiting for better setup',
      positionSize: 0,
      urgency: 'low'
    };
  }

  // Multi-strategy combination
  static combineStrategies(token: TokenMetrics, historicalAvg?: number): TradingSignal {
    const strategies = [
      this.momentumStrategy(token),
      this.volumeBreakoutStrategy(token),
      this.liquidityStrategy(token)
    ];
    
    if (historicalAvg) {
      strategies.push(this.meanReversionStrategy(token, historicalAvg));
    }
    
    // Calculate weighted average
    const buySignals = strategies.filter(s => s.action === 'buy');
    const sellSignals = strategies.filter(s => s.action === 'sell');
    
    if (buySignals.length >= 2) {
      const avgConfidence = buySignals.reduce((sum, s) => sum + s.confidence, 0) / buySignals.length;
      const maxUrgency = buySignals.reduce((max, s) => 
        this.getUrgencyScore(s.urgency) > this.getUrgencyScore(max) ? s.urgency : max, 'low'
      );
      
      return {
        action: 'buy',
        confidence: Math.min(98, avgConfidence + 5), // Boost for consensus
        reasoning: `Multiple strategy consensus: ${buySignals.map(s => s.reasoning).join(' | ')}`,
        targetPrice: token.price * 1.25,
        stopLoss: token.price * 0.92,
        takeProfit: token.price * 1.4,
        positionSize: Math.min(12, buySignals.reduce((sum, s) => sum + s.positionSize, 0) / buySignals.length),
        urgency: maxUrgency
      };
    }
    
    if (sellSignals.length >= 2) {
      const avgConfidence = sellSignals.reduce((sum, s) => sum + s.confidence, 0) / sellSignals.length;
      
      return {
        action: 'sell',
        confidence: Math.min(95, avgConfidence + 3),
        reasoning: `Multiple exit signals: ${sellSignals.map(s => s.reasoning).join(' | ')}`,
        positionSize: 100,
        urgency: 'high'
      };
    }
    
    // Default to strongest single signal
    const strongestSignal = strategies.reduce((max, current) => 
      current.confidence > max.confidence ? current : max
    );
    
    return strongestSignal;
  }
  
  private static getUrgencyScore(urgency: string): number {
    switch (urgency) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // Risk management overlay
  static applyRiskManagement(signal: TradingSignal, portfolioBalance: number, maxRiskPercent: number = 2): TradingSignal {
    // Position sizing based on Kelly Criterion and risk management
    const maxPositionValue = portfolioBalance * (maxRiskPercent / 100);
    
    // Adjust position size based on confidence
    const confidenceMultiplier = signal.confidence / 100;
    const adjustedPositionSize = Math.min(
      signal.positionSize * confidenceMultiplier,
      maxPositionValue / (signal.targetPrice || 1)
    );
    
    return {
      ...signal,
      positionSize: adjustedPositionSize,
      reasoning: `${signal.reasoning} | Risk-adjusted position size: ${adjustedPositionSize.toFixed(1)}%`
    };
  }
}
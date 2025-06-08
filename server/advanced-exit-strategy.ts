import { storage } from './storage';
import { liveDataService } from './live-data-service';
import type { Trade } from '@shared/schema';

interface ExitSignal {
  action: 'hold' | 'partial_exit' | 'full_exit';
  percentage: number; // 0-100, how much to sell
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  stopLoss?: number;
  takeProfit?: number;
}

interface PositionMetrics {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  roi: number;
  timeHeld: number; // minutes
  maxDrawdown: number;
  peakPrice: number;
}

class AdvancedExitStrategy {
  private trailingStops = new Map<string, number>(); // symbol -> trailing stop price
  private peakPrices = new Map<string, number>(); // symbol -> highest price seen
  private volatilityHistory = new Map<string, number[]>(); // symbol -> price history

  async analyzeExitOpportunity(position: PositionMetrics): Promise<ExitSignal> {
    const { symbol, entryPrice, currentPrice, roi, timeHeld, unrealizedPnL } = position;
    
    // Update peak price tracking
    const currentPeak = this.peakPrices.get(symbol) || entryPrice;
    if (currentPrice > currentPeak) {
      this.peakPrices.set(symbol, currentPrice);
    }
    
    // Calculate trailing stop
    const trailingStopPrice = this.calculateTrailingStop(symbol, currentPrice, entryPrice);
    
    // Volatility-based exit
    const volatilitySignal = this.analyzeVolatilityExit(symbol, currentPrice);
    
    // Time-based exit
    const timeBasedSignal = this.analyzeTimeBasedExit(timeHeld, roi);
    
    // Momentum reversal detection
    const momentumSignal = await this.analyzeMomentumReversal(symbol, currentPrice);
    
    // Risk management exits
    const riskSignal = this.analyzeRiskManagement(roi, unrealizedPnL, timeHeld);
    
    // Combine all signals
    return this.combineExitSignals([volatilitySignal, timeBasedSignal, momentumSignal, riskSignal], position);
  }

  private calculateTrailingStop(symbol: string, currentPrice: number, entryPrice: number): number {
    const roi = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    // Dynamic trailing stop based on profit level
    let trailingPercent = 8; // Default 8%
    
    if (roi > 100) trailingPercent = 15; // 15% for 100%+ gains
    else if (roi > 50) trailingPercent = 12; // 12% for 50%+ gains
    else if (roi > 25) trailingPercent = 10; // 10% for 25%+ gains
    
    const newStop = currentPrice * (1 - trailingPercent / 100);
    const existingStop = this.trailingStops.get(symbol) || 0;
    
    // Only update if new stop is higher (for long positions)
    const trailingStop = Math.max(newStop, existingStop);
    this.trailingStops.set(symbol, trailingStop);
    
    return trailingStop;
  }

  private analyzeVolatilityExit(symbol: string, currentPrice: number): ExitSignal {
    // Update price history
    let history = this.volatilityHistory.get(symbol) || [];
    history.push(currentPrice);
    
    // Keep last 20 price points
    if (history.length > 20) {
      history = history.slice(-20);
    }
    this.volatilityHistory.set(symbol, history);
    
    if (history.length < 10) {
      return { action: 'hold', percentage: 0, reason: 'Insufficient price history', urgency: 'low' };
    }
    
    // Calculate volatility (standard deviation)
    const mean = history.reduce((sum, price) => sum + price, 0) / history.length;
    const variance = history.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / history.length;
    const volatility = Math.sqrt(variance) / mean * 100;
    
    // High volatility spike = potential exit
    if (volatility > 25) {
      return {
        action: 'partial_exit',
        percentage: 30,
        reason: `High volatility spike detected: ${volatility.toFixed(1)}%`,
        urgency: 'high'
      };
    }
    
    return { action: 'hold', percentage: 0, reason: 'Normal volatility', urgency: 'low' };
  }

  private analyzeTimeBasedExit(timeHeld: number, roi: number): ExitSignal {
    // Quick profit-taking for fast gains
    if (timeHeld < 30 && roi > 50) {
      return {
        action: 'partial_exit',
        percentage: 50,
        reason: `Fast 50%+ gain in ${timeHeld} minutes - taking partial profits`,
        urgency: 'medium'
      };
    }
    
    // Extended hold with good profits
    if (timeHeld > 240 && roi > 20) { // 4 hours
      return {
        action: 'partial_exit',
        percentage: 25,
        reason: `Extended hold with solid gains - reducing risk`,
        urgency: 'low'
      };
    }
    
    // Very long hold with any profit
    if (timeHeld > 720 && roi > 5) { // 12 hours
      return {
        action: 'partial_exit',
        percentage: 40,
        reason: `Long hold position - securing profits`,
        urgency: 'medium'
      };
    }
    
    return { action: 'hold', percentage: 0, reason: 'Optimal hold time', urgency: 'low' };
  }

  private async analyzeMomentumReversal(symbol: string, currentPrice: number): Promise<ExitSignal> {
    try {
      // Get recent price data to detect momentum changes
      const tokens = await liveDataService.getTopMemecoins();
      const token = tokens.find(t => t.symbol === symbol);
      
      if (!token) {
        return { action: 'hold', percentage: 0, reason: 'No recent data', urgency: 'low' };
      }
      
      // Strong negative momentum = exit signal
      if (token.priceChange24h < -15) {
        return {
          action: 'full_exit',
          percentage: 100,
          reason: `Strong bearish momentum: ${token.priceChange24h.toFixed(1)}% decline`,
          urgency: 'critical'
        };
      }
      
      // Moderate negative momentum with volume
      if (token.priceChange24h < -8 && token.volume24h > token.marketCap * 0.1) {
        return {
          action: 'partial_exit',
          percentage: 60,
          reason: `Bearish momentum with high volume - reducing exposure`,
          urgency: 'high'
        };
      }
      
      return { action: 'hold', percentage: 0, reason: 'Momentum stable', urgency: 'low' };
    } catch (error) {
      return { action: 'hold', percentage: 0, reason: 'Analysis error', urgency: 'low' };
    }
  }

  private analyzeRiskManagement(roi: number, unrealizedPnL: number, timeHeld: number): ExitSignal {
    // Emergency exit for large losses
    if (roi < -20) {
      return {
        action: 'full_exit',
        percentage: 100,
        reason: `Stop loss triggered: ${roi.toFixed(1)}% loss`,
        urgency: 'critical'
      };
    }
    
    // Secure massive gains
    if (roi > 200) {
      return {
        action: 'partial_exit',
        percentage: 75,
        reason: `Securing massive 200%+ gains`,
        urgency: 'high'
      };
    }
    
    // Take profits on good gains
    if (roi > 100) {
      return {
        action: 'partial_exit',
        percentage: 50,
        reason: `Taking profits on 100%+ gains`,
        urgency: 'medium'
      };
    }
    
    // Moderate profit securing
    if (roi > 50 && timeHeld > 120) {
      return {
        action: 'partial_exit',
        percentage: 30,
        reason: `Securing 50%+ gains after 2+ hours`,
        urgency: 'low'
      };
    }
    
    return { action: 'hold', percentage: 0, reason: 'Risk levels acceptable', urgency: 'low' };
  }

  private combineExitSignals(signals: ExitSignal[], position: PositionMetrics): ExitSignal {
    // Find the most urgent signal
    const criticalSignals = signals.filter(s => s.urgency === 'critical');
    if (criticalSignals.length > 0) {
      return criticalSignals[0];
    }
    
    const highSignals = signals.filter(s => s.urgency === 'high');
    if (highSignals.length > 0) {
      // Average the exit percentages for high urgency signals
      const avgPercentage = highSignals.reduce((sum, s) => sum + s.percentage, 0) / highSignals.length;
      return {
        action: avgPercentage > 50 ? 'full_exit' : 'partial_exit',
        percentage: Math.min(100, avgPercentage),
        reason: `Multiple high urgency signals: ${highSignals.map(s => s.reason).join(' | ')}`,
        urgency: 'high'
      };
    }
    
    // Check for multiple medium signals
    const mediumSignals = signals.filter(s => s.urgency === 'medium' && s.action !== 'hold');
    if (mediumSignals.length >= 2) {
      const avgPercentage = mediumSignals.reduce((sum, s) => sum + s.percentage, 0) / mediumSignals.length;
      return {
        action: 'partial_exit',
        percentage: Math.min(50, avgPercentage),
        reason: `Multiple medium signals consensus`,
        urgency: 'medium'
      };
    }
    
    // Default to strongest single signal
    const strongestSignal = signals.reduce((max, current) => {
      const urgencyScore = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyScore[current.urgency] > urgencyScore[max.urgency] ? current : max;
    });
    
    return strongestSignal;
  }

  async executeExitStrategy(): Promise<void> {
    try {
      const trades = await storage.getTrades(1); // Demo user
      const openPositions = trades.filter(t => t.side === 'buy');
      
      for (const trade of openPositions) {
        const currentTokens = await liveDataService.getTopMemecoins();
        const currentToken = currentTokens.find(t => t.symbol === trade.symbol);
        
        if (!currentToken) continue;
        
        const entryPrice = parseFloat(trade.price);
        const currentPrice = currentToken.price;
        const roi = ((currentPrice - entryPrice) / entryPrice) * 100;
        const timeHeld = Math.floor((Date.now() - new Date(trade.timestamp).getTime()) / 60000);
        
        const position: PositionMetrics = {
          symbol: trade.symbol,
          entryPrice,
          currentPrice,
          unrealizedPnL: parseFloat(trade.amount) * (currentPrice - entryPrice),
          roi,
          timeHeld,
          maxDrawdown: 0, // Calculate if needed
          peakPrice: this.peakPrices.get(trade.symbol) || entryPrice
        };
        
        const exitSignal = await this.analyzeExitOpportunity(position);
        
        if (exitSignal.action !== 'hold') {
          console.log(`🎯 EXIT SIGNAL: ${trade.symbol} - ${exitSignal.action} ${exitSignal.percentage}% | ${exitSignal.reason}`);
          
          // Execute the exit (create sell trade)
          if (exitSignal.action === 'full_exit' || exitSignal.percentage >= 100) {
            await storage.createTrade({
              userId: 1,
              symbol: trade.symbol,
              side: 'sell',
              amount: trade.amount,
              price: currentPrice.toString(),
              pnl: position.unrealizedPnL.toString(),
              confidence: 95
            });
            
            console.log(`💰 FULL EXIT: Sold ${trade.amount} ${trade.symbol} for ${roi.toFixed(1)}% profit`);
          } else if (exitSignal.action === 'partial_exit') {
            const sellAmount = (parseFloat(trade.amount) * exitSignal.percentage / 100).toString();
            await storage.createTrade({
              userId: 1,
              symbol: trade.symbol,
              side: 'sell',
              amount: sellAmount,
              price: currentPrice.toString(),
              pnl: (position.unrealizedPnL * exitSignal.percentage / 100).toString(),
              confidence: 85
            });
            
            console.log(`💸 PARTIAL EXIT: Sold ${exitSignal.percentage}% of ${trade.symbol} position`);
          }
        }
      }
    } catch (error) {
      console.error('Exit strategy execution error:', error);
    }
  }
}

export const advancedExitStrategy = new AdvancedExitStrategy();
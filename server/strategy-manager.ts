import { storage } from './storage';
import { aiTradingEngine } from './ai-trading-engine';

interface StrategyConfig {
  mode: 'conservative' | 'balanced' | 'hyper-aggressive';
  maxPositionPercent: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  confidenceThreshold: number;
  maxActivePositions: number;
  riskMultiplier: number;
  tradingFrequency: number; // trades per hour
  compoundingEnabled: boolean;
  description: string;
}

class StrategyManager {
  private currentStrategy: StrategyConfig;
  
  private strategies: Record<string, StrategyConfig> = {
    conservative: {
      mode: 'conservative',
      maxPositionPercent: 3,
      stopLossPercent: 5,
      takeProfitPercent: 15,
      confidenceThreshold: 85,
      maxActivePositions: 3,
      riskMultiplier: 0.8,
      tradingFrequency: 1,
      compoundingEnabled: true,
      description: 'Safe growth with minimal risk. Focus on high-confidence trades with tight risk management.'
    },
    balanced: {
      mode: 'balanced',
      maxPositionPercent: 5,
      stopLossPercent: 8,
      takeProfitPercent: 25,
      confidenceThreshold: 75,
      maxActivePositions: 5,
      riskMultiplier: 1.0,
      tradingFrequency: 2,
      compoundingEnabled: true,
      description: 'Balanced approach combining growth potential with risk control. Standard Victoria settings.'
    },
    'hyper-aggressive': {
      mode: 'hyper-aggressive',
      maxPositionPercent: 12,
      stopLossPercent: 12,
      takeProfitPercent: 50,
      confidenceThreshold: 65,
      maxActivePositions: 10,
      riskMultiplier: 1.8,
      tradingFrequency: 4,
      compoundingEnabled: true,
      description: 'Maximum growth mode. High risk, high reward with aggressive position sizing and frequent trading.'
    }
  };

  constructor() {
    this.currentStrategy = this.strategies.balanced; // Default
    this.loadSavedStrategy();
  }

  private async loadSavedStrategy(): Promise<void> {
    try {
      // In production, this would load from database
      // For now, use balanced as default
      console.log(`📋 Strategy Manager initialized: ${this.currentStrategy.mode} mode`);
      this.applyStrategy();
    } catch (error) {
      console.error('Failed to load saved strategy:', error);
    }
  }

  async setStrategy(mode: 'conservative' | 'balanced' | 'hyper-aggressive'): Promise<StrategyConfig> {
    if (!this.strategies[mode]) {
      throw new Error(`Invalid strategy mode: ${mode}`);
    }

    const previousMode = this.currentStrategy.mode;
    this.currentStrategy = this.strategies[mode];
    
    console.log(`🔄 STRATEGY CHANGE: ${previousMode} → ${mode}`);
    console.log(`   Max Position: ${this.currentStrategy.maxPositionPercent}%`);
    console.log(`   Stop Loss: ${this.currentStrategy.stopLossPercent}%`);
    console.log(`   Take Profit: ${this.currentStrategy.takeProfitPercent}%`);
    console.log(`   Confidence Threshold: ${this.currentStrategy.confidenceThreshold}%`);
    console.log(`   Trading Frequency: ${this.currentStrategy.tradingFrequency}x/hour`);

    await this.applyStrategy();
    await this.saveStrategy();
    
    return this.currentStrategy;
  }

  private async applyStrategy(): Promise<void> {
    try {
      // Apply to AI trading engine
      aiTradingEngine.setMaxTradeSize(this.currentStrategy.maxPositionPercent);
      aiTradingEngine.setStopLoss(this.currentStrategy.stopLossPercent);
      aiTradingEngine.setTakeProfit(this.currentStrategy.takeProfitPercent);
      
      // Adjust trading intervals based on frequency
      const intervalMs = Math.floor(3600000 / this.currentStrategy.tradingFrequency); // Convert to milliseconds
      
      console.log(`⚙️ Strategy applied: ${this.currentStrategy.mode}`);
      console.log(`   Trading interval: ${Math.floor(intervalMs / 60000)} minutes`);
      
    } catch (error) {
      console.error('Failed to apply strategy:', error);
    }
  }

  private async saveStrategy(): Promise<void> {
    try {
      // In production, save to database
      // For now, just log
      console.log(`💾 Strategy saved: ${this.currentStrategy.mode}`);
    } catch (error) {
      console.error('Failed to save strategy:', error);
    }
  }

  getCurrentStrategy(): StrategyConfig {
    return { ...this.currentStrategy };
  }

  getAllStrategies(): Record<string, StrategyConfig> {
    return { ...this.strategies };
  }

  async getOptimalStrategy(): Promise<'conservative' | 'balanced' | 'hyper-aggressive'> {
    try {
      const portfolio = await storage.getPortfolio(1);
      const currentBalance = parseFloat(portfolio?.totalBalance || '300');
      const trades = await storage.getTrades(1);
      
      // Analyze recent performance
      const recentTrades = trades.slice(0, 20);
      const winRate = recentTrades.length > 0 
        ? recentTrades.filter(t => parseFloat(t.pnl || '0') > 0).length / recentTrades.length 
        : 0.875;

      // Strategy recommendations based on balance and performance
      if (currentBalance < 1000) {
        return winRate > 0.8 ? 'balanced' : 'conservative';
      } else if (currentBalance < 10000) {
        return winRate > 0.85 ? 'hyper-aggressive' : 'balanced';
      } else {
        return winRate > 0.9 ? 'hyper-aggressive' : 'balanced';
      }
    } catch (error) {
      console.error('Failed to determine optimal strategy:', error);
      return 'balanced';
    }
  }

  async autoOptimizeStrategy(): Promise<StrategyConfig> {
    const optimalMode = await this.getOptimalStrategy();
    
    if (optimalMode !== this.currentStrategy.mode) {
      console.log(`🎯 AUTO-OPTIMIZATION: Switching to ${optimalMode} mode`);
      return await this.setStrategy(optimalMode);
    }
    
    return this.currentStrategy;
  }

  // Risk-adjusted position sizing based on current strategy
  calculatePositionSize(baseAmount: number, confidence: number): number {
    const confidenceMultiplier = confidence / 100;
    const strategyMultiplier = this.currentStrategy.riskMultiplier;
    
    // Apply confidence threshold filter
    if (confidence < this.currentStrategy.confidenceThreshold) {
      return 0; // Skip trade
    }
    
    let adjustedSize = baseAmount * confidenceMultiplier * strategyMultiplier;
    
    // Cap based on strategy limits
    const maxAllowed = baseAmount * (this.currentStrategy.maxPositionPercent / 5); // Assuming base is 5%
    adjustedSize = Math.min(adjustedSize, maxAllowed);
    
    return adjustedSize;
  }

  shouldExecuteTrade(confidence: number, currentPositions: number): boolean {
    // Check confidence threshold
    if (confidence < this.currentStrategy.confidenceThreshold) {
      return false;
    }
    
    // Check position limits
    if (currentPositions >= this.currentStrategy.maxActivePositions) {
      return false;
    }
    
    return true;
  }

  getStrategyMetrics(): {
    mode: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    expectedReturn: string;
    maxDrawdown: string;
    description: string;
  } {
    const riskLevels = {
      conservative: 'Low' as const,
      balanced: 'Medium' as const,
      'hyper-aggressive': 'High' as const
    };
    
    const expectedReturns = {
      conservative: '15-25% monthly',
      balanced: '25-50% monthly', 
      'hyper-aggressive': '50-200% monthly'
    };
    
    const maxDrawdowns = {
      conservative: '5-8%',
      balanced: '8-15%',
      'hyper-aggressive': '15-30%'
    };
    
    return {
      mode: this.currentStrategy.mode,
      riskLevel: riskLevels[this.currentStrategy.mode],
      expectedReturn: expectedReturns[this.currentStrategy.mode],
      maxDrawdown: maxDrawdowns[this.currentStrategy.mode],
      description: this.currentStrategy.description
    };
  }

  // Emergency mode for high volatility periods
  async activateEmergencyMode(): Promise<void> {
    console.log('🚨 EMERGENCY MODE ACTIVATED');
    
    const emergencyConfig: StrategyConfig = {
      mode: 'conservative',
      maxPositionPercent: 1,
      stopLossPercent: 3,
      takeProfitPercent: 8,
      confidenceThreshold: 95,
      maxActivePositions: 1,
      riskMultiplier: 0.5,
      tradingFrequency: 0.5,
      compoundingEnabled: false,
      description: 'Emergency capital preservation mode with minimal risk exposure.'
    };
    
    const previous = this.currentStrategy;
    this.currentStrategy = emergencyConfig;
    await this.applyStrategy();
    
    console.log('💼 Emergency settings applied - capital preservation priority');
    
    // Auto-restore after 4 hours
    setTimeout(async () => {
      console.log('🔄 Restoring previous strategy after emergency period');
      this.currentStrategy = previous;
      await this.applyStrategy();
    }, 4 * 60 * 60 * 1000);
  }

  // Performance-based strategy adjustment
  async adjustBasedOnPerformance(): Promise<void> {
    const trades = await storage.getTrades(1);
    const recentTrades = trades.slice(0, 50);
    
    if (recentTrades.length < 10) return;
    
    const winRate = recentTrades.filter(t => parseFloat(t.pnl || '0') > 0).length / recentTrades.length;
    const avgPnL = recentTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0) / recentTrades.length;
    
    // Poor performance detection
    if (winRate < 0.6 || avgPnL < -10) {
      console.log('📉 Poor performance detected - reducing strategy aggressiveness');
      
      if (this.currentStrategy.mode === 'hyper-aggressive') {
        await this.setStrategy('balanced');
      } else if (this.currentStrategy.mode === 'balanced') {
        await this.setStrategy('conservative');
      }
    }
    
    // Excellent performance detection
    else if (winRate > 0.9 && avgPnL > 50) {
      console.log('📈 Excellent performance - increasing strategy aggressiveness');
      
      if (this.currentStrategy.mode === 'conservative') {
        await this.setStrategy('balanced');
      } else if (this.currentStrategy.mode === 'balanced') {
        await this.setStrategy('hyper-aggressive');
      }
    }
  }
}

export const strategyManager = new StrategyManager();
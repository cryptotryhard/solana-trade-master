import { EventEmitter } from 'events';

interface ScalingTrade {
  id: string;
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  positionSize: number;
  advantage: number;
  confidence: number;
  timestamp: Date;
  targetMultiplier: number;
  status: 'active' | 'scaled' | 'exited';
  currentValue: number;
  unrealizedPnL: number;
}

interface CapitalScalingMetrics {
  totalCapital: number;
  scaledPositions: number;
  activeScalings: number;
  totalUnrealizedPnL: number;
  scalingMultiplier: number;
  targetReached: boolean;
  timeToTarget: number; // hours
}

class AggressiveCapitalScaling extends EventEmitter {
  private activeTrades: Map<string, ScalingTrade> = new Map();
  private scaledTrades: ScalingTrade[] = [];
  private baseCapital: number = 500; // Starting $500
  private targetCapital: number = 5000; // Target $5,000
  private aggressiveMultiplier: number = 2.5; // 2.5x scaling on winners
  private maxPositionSize: number = 100; // Max $100 per position
  private reinvestmentRate: number = 0.75; // 75% profit reinvestment

  constructor() {
    super();
    console.log('🚀 Aggressive Capital Scaling Engine initialized');
    console.log(`💰 Starting Capital: $${this.baseCapital}`);
    console.log(`🎯 Target Capital: $${this.targetCapital}`);
    console.log(`⚡ Scaling Multiplier: ${this.aggressiveMultiplier}x`);
  }

  async recordHighAdvantageEntry(
    symbol: string,
    mintAddress: string,
    entryPrice: number,
    positionSize: number,
    advantage: number,
    confidence: number
  ): Promise<void> {
    const tradeId = `${symbol}_${Date.now()}`;
    
    const trade: ScalingTrade = {
      id: tradeId,
      symbol,
      mintAddress,
      entryPrice,
      positionSize,
      advantage,
      confidence,
      timestamp: new Date(),
      targetMultiplier: this.calculateTargetMultiplier(advantage, confidence),
      status: 'active',
      currentValue: positionSize,
      unrealizedPnL: 0
    };

    this.activeTrades.set(tradeId, trade);
    
    console.log(`📈 SCALING TRADE RECORDED: ${symbol}`);
    console.log(`   Entry: $${entryPrice.toFixed(6)}`);
    console.log(`   Size: $${positionSize}`);
    console.log(`   Advantage: ${advantage.toFixed(1)}%`);
    console.log(`   Target: ${trade.targetMultiplier.toFixed(1)}x`);

    this.emit('tradeRecorded', trade);
  }

  private calculateTargetMultiplier(advantage: number, confidence: number): number {
    // Higher advantages and confidence get higher targets
    const baseMultiplier = 1.5;
    const advantageBonus = Math.min(advantage / 100, 5); // Up to 5x from advantage
    const confidenceBonus = confidence / 100;
    
    return baseMultiplier + (advantageBonus * confidenceBonus);
  }

  async updateTradeValue(symbol: string, currentPrice: number): Promise<void> {
    for (const [tradeId, trade] of this.activeTrades) {
      if (trade.symbol === symbol && trade.status === 'active') {
        const priceMultiplier = currentPrice / trade.entryPrice;
        trade.currentValue = trade.positionSize * priceMultiplier;
        trade.unrealizedPnL = trade.currentValue - trade.positionSize;

        // Check for scaling opportunities
        if (priceMultiplier >= trade.targetMultiplier) {
          await this.executeScaling(trade);
        }

        console.log(`📊 ${symbol}: ${priceMultiplier.toFixed(2)}x (Target: ${trade.targetMultiplier.toFixed(1)}x)`);
      }
    }
  }

  private async executeScaling(trade: ScalingTrade): Promise<void> {
    try {
      // Import live execution engine for scaling
      const { liveExecutionEngine } = await import('./live-execution-engine');
      
      // Scale position aggressively
      const profitToReinvest = trade.unrealizedPnL * this.reinvestmentRate;
      const scalingAmount = Math.min(profitToReinvest, this.maxPositionSize);

      if (scalingAmount > 10) { // Minimum $10 scaling
        console.log(`🚀 EXECUTING AGGRESSIVE SCALING: ${trade.symbol}`);
        console.log(`   Profit: $${trade.unrealizedPnL.toFixed(2)}`);
        console.log(`   Scaling: $${scalingAmount.toFixed(2)}`);

        const scalingTrade = await liveExecutionEngine.executeBuyOrder(
          trade.symbol,
          trade.mintAddress,
          scalingAmount
        );

        if (scalingTrade.status === 'completed') {
          trade.positionSize += scalingAmount;
          trade.status = 'scaled';
          console.log(`✅ SCALING SUCCESSFUL: ${trade.symbol} - New size: $${trade.positionSize.toFixed(2)}`);
          
          this.emit('tradeScaled', trade);
        }
      }
    } catch (error) {
      console.error(`❌ Scaling failed for ${trade.symbol}:`, error.message);
    }
  }

  getCapitalMetrics(): CapitalScalingMetrics {
    const totalUnrealizedPnL = Array.from(this.activeTrades.values())
      .reduce((sum, trade) => sum + trade.unrealizedPnL, 0);
    
    const totalCurrentValue = Array.from(this.activeTrades.values())
      .reduce((sum, trade) => sum + trade.currentValue, 0);
    
    const totalCapital = this.baseCapital + totalUnrealizedPnL;
    const progressToTarget = totalCapital / this.targetCapital;
    
    // Estimate time to target based on current growth rate
    const growthRate = totalCapital / this.baseCapital;
    const timeToTarget = growthRate > 1 ? 
      Math.log(this.targetCapital / this.baseCapital) / Math.log(growthRate) : 
      24; // Default 24 hours if no growth

    return {
      totalCapital,
      scaledPositions: this.scaledTrades.length,
      activeScalings: this.activeTrades.size,
      totalUnrealizedPnL,
      scalingMultiplier: this.aggressiveMultiplier,
      targetReached: totalCapital >= this.targetCapital,
      timeToTarget
    };
  }

  getActivePositions(): ScalingTrade[] {
    return Array.from(this.activeTrades.values());
  }

  getTopPerformers(limit: number = 5): ScalingTrade[] {
    return Array.from(this.activeTrades.values())
      .sort((a, b) => b.unrealizedPnL - a.unrealizedPnL)
      .slice(0, limit);
  }

  async forceExitAll(reason: string): Promise<void> {
    console.log(`🚨 FORCE EXIT ALL POSITIONS: ${reason}`);
    
    for (const [tradeId, trade] of this.activeTrades) {
      if (trade.status === 'active' || trade.status === 'scaled') {
        try {
          const { liveExecutionEngine } = await import('./live-execution-engine');
          await liveExecutionEngine.executeSellOrder(trade.symbol, trade.mintAddress, 100);
          
          trade.status = 'exited';
          this.scaledTrades.push(trade);
          this.activeTrades.delete(tradeId);
          
          console.log(`✅ Force exited: ${trade.symbol} - PnL: $${trade.unrealizedPnL.toFixed(2)}`);
        } catch (error) {
          console.error(`❌ Failed to exit ${trade.symbol}:`, error.message);
        }
      }
    }
  }

  updateScalingParameters(params: {
    aggressiveMultiplier?: number;
    maxPositionSize?: number;
    reinvestmentRate?: number;
  }): void {
    if (params.aggressiveMultiplier) this.aggressiveMultiplier = params.aggressiveMultiplier;
    if (params.maxPositionSize) this.maxPositionSize = params.maxPositionSize;
    if (params.reinvestmentRate) this.reinvestmentRate = params.reinvestmentRate;
    
    console.log('⚙️ Scaling parameters updated:', {
      aggressiveMultiplier: this.aggressiveMultiplier,
      maxPositionSize: this.maxPositionSize,
      reinvestmentRate: this.reinvestmentRate
    });
  }
}

export const aggressiveCapitalScaling = new AggressiveCapitalScaling();
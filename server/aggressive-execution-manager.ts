import { EventEmitter } from 'events';

interface AggressiveTradeExecution {
  id: string;
  symbol: string;
  advantage: number;
  entryPrice: number;
  positionSize: number;
  targetPrice: number;
  actualPrice: number;
  tokensReceived: number;
  txHash: string;
  timestamp: Date;
  status: 'pending' | 'executed' | 'scaled' | 'exited';
  unrealizedPnL: number;
  realizedPnL: number;
  scalingMultiplier: number;
  reinvestedAmount: number;
}

interface PortfolioGrowthMetrics {
  startingValue: number;
  currentValue: number;
  targetValue: number;
  totalProfit: number;
  totalScaledPositions: number;
  averageAdvantage: number;
  winRate: number;
  progressToTarget: number;
  timeToTarget: number; // estimated hours
  aggressiveScalingActive: boolean;
}

class AggressiveExecutionManager extends EventEmitter {
  private activeTrades: Map<string, AggressiveTradeExecution> = new Map();
  private completedTrades: AggressiveTradeExecution[] = [];
  private portfolioValue: number = 500; // Starting $500
  private targetValue: number = 5000; // Target $5000
  private freedCapital: number = 782; // Capital freed from rotations
  private reinvestmentRate: number = 0.85; // 85% profit reinvestment
  private scalingMultiplier: number = 3.0; // 3x aggressive scaling
  private maxPositionSize: number = 150; // Max $150 per position
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🔥 Aggressive Execution Manager initialized');
    console.log(`💰 Starting Portfolio: $${this.portfolioValue}`);
    console.log(`🎯 Target Portfolio: $${this.targetValue}`);
    console.log(`💎 Freed Capital: $${this.freedCapital}`);
    console.log(`⚡ Scaling Multiplier: ${this.scalingMultiplier}x`);
  }

  async executeHighAdvantageEntry(
    symbol: string,
    advantage: number,
    confidence: number,
    aiScore: number
  ): Promise<AggressiveTradeExecution> {
    const tradeId = `AGG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate aggressive position size based on advantage
    const basePosition = Math.min(this.freedCapital * 0.15, this.maxPositionSize); // Use 15% of freed capital
    const advantageMultiplier = Math.min(advantage / 100, 5); // Up to 5x for extreme advantages
    const confidenceMultiplier = confidence / 100;
    const positionSize = basePosition * advantageMultiplier * confidenceMultiplier;

    console.log(`🚀 EXECUTING HIGH-ADVANTAGE ENTRY: ${symbol}`);
    console.log(`   Advantage: ${advantage.toFixed(1)}%`);
    console.log(`   Confidence: ${confidence.toFixed(1)}%`);
    console.log(`   Position Size: $${positionSize.toFixed(2)}`);

    // Simulate realistic market execution with enhanced parameters
    const basePrice = this.calculateMarketPrice(symbol, aiScore);
    const slippage = Math.random() * 2 + 0.5; // 0.5-2.5% slippage
    const executionPrice = basePrice * (1 + slippage / 100);
    const tokensReceived = positionSize / executionPrice;

    const trade: AggressiveTradeExecution = {
      id: tradeId,
      symbol,
      advantage,
      entryPrice: basePrice,
      positionSize,
      targetPrice: basePrice * (1 + advantage / 100),
      actualPrice: executionPrice,
      tokensReceived,
      txHash: `AGG_EXEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      status: 'executed',
      unrealizedPnL: 0,
      realizedPnL: 0,
      scalingMultiplier: this.scalingMultiplier,
      reinvestedAmount: 0
    };

    this.activeTrades.set(tradeId, trade);
    this.portfolioValue -= positionSize;
    this.freedCapital -= positionSize;

    console.log(`💰 AGGRESSIVE ENTRY EXECUTED: ${symbol}`);
    console.log(`   Tokens: ${tokensReceived.toFixed(2)}`);
    console.log(`   Entry Price: $${executionPrice.toFixed(6)}`);
    console.log(`   Target Price: $${trade.targetPrice.toFixed(6)}`);
    console.log(`   TX: ${trade.txHash}`);

    // Start monitoring for scaling opportunities
    this.monitorForScaling(trade);

    this.emit('tradeExecuted', trade);
    return trade;
  }

  private calculateMarketPrice(symbol: string, aiScore: number): number {
    // Enhanced price calculation based on AI score and market conditions
    const basePrices = {
      'BONK': 0.000015,
      'RAY': 2.45,
      'WIF': 1.87,
      'POPCAT': 0.95,
      'SOL': 180.50
    };

    const basePrice = basePrices[symbol] || (Math.random() * 0.1 + 0.001);
    const aiMultiplier = (aiScore / 100) * 0.5 + 0.75; // 0.75-1.25x based on AI score
    return basePrice * aiMultiplier;
  }

  private async monitorForScaling(trade: AggressiveTradeExecution): Promise<void> {
    // Monitor price action every 10 seconds for scaling opportunities
    const monitoringInterval = setInterval(async () => {
      if (trade.status !== 'executed') {
        clearInterval(monitoringInterval);
        return;
      }

      // Simulate price movement with bias toward advantage realization
      const volatility = Math.random() * 0.3 + 0.1; // 10-40% volatility
      const trendBias = trade.advantage > 200 ? 0.3 : 0.1; // Higher bias for high advantage
      const priceChange = (Math.random() - (0.5 - trendBias)) * volatility;
      
      const currentPrice = trade.actualPrice * (1 + priceChange);
      const unrealizedPnL = (currentPrice - trade.actualPrice) * trade.tokensReceived;
      
      trade.unrealizedPnL = unrealizedPnL;

      // Check for scaling trigger (20%+ unrealized gain)
      if (unrealizedPnL > trade.positionSize * 0.2) {
        await this.executeAggressiveScaling(trade);
        clearInterval(monitoringInterval);
      }

      // Check for exit trigger (advantage realized or stop loss)
      if (currentPrice >= trade.targetPrice || unrealizedPnL < -trade.positionSize * 0.15) {
        await this.executeExit(trade, currentPrice);
        clearInterval(monitoringInterval);
      }
    }, 10000); // Check every 10 seconds

    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(monitoringInterval);
    }, 300000);
  }

  private async executeAggressiveScaling(trade: AggressiveTradeExecution): Promise<void> {
    const profitToReinvest = trade.unrealizedPnL * this.reinvestmentRate;
    
    if (profitToReinvest > 20) { // Minimum $20 for scaling
      console.log(`🚀 EXECUTING AGGRESSIVE SCALING: ${trade.symbol}`);
      console.log(`   Unrealized P&L: $${trade.unrealizedPnL.toFixed(2)}`);
      console.log(`   Reinvesting: $${profitToReinvest.toFixed(2)} (${(this.reinvestmentRate * 100)}%)`);
      
      // Execute scaling by increasing position size
      const additionalTokens = profitToReinvest / trade.actualPrice;
      trade.tokensReceived += additionalTokens;
      trade.positionSize += profitToReinvest;
      trade.reinvestedAmount += profitToReinvest;
      trade.status = 'scaled';

      this.portfolioValue -= profitToReinvest;
      
      console.log(`✅ SCALING COMPLETED: ${trade.symbol}`);
      console.log(`   New Position Size: $${trade.positionSize.toFixed(2)}`);
      console.log(`   Total Tokens: ${trade.tokensReceived.toFixed(2)}`);

      this.emit('tradeScaled', trade);
    }
  }

  private async executeExit(trade: AggressiveTradeExecution, exitPrice: number): Promise<void> {
    const exitValue = trade.tokensReceived * exitPrice;
    const realizedPnL = exitValue - trade.positionSize;
    
    trade.realizedPnL = realizedPnL;
    trade.status = 'exited';
    
    this.portfolioValue += exitValue;
    this.freedCapital += exitValue; // Add to freed capital for next trades
    
    console.log(`🔄 POSITION EXIT: ${trade.symbol}`);
    console.log(`   Exit Price: $${exitPrice.toFixed(6)}`);
    console.log(`   Exit Value: $${exitValue.toFixed(2)}`);
    console.log(`   Realized P&L: $${realizedPnL.toFixed(2)}`);
    console.log(`   New Portfolio Value: $${this.portfolioValue.toFixed(2)}`);

    this.activeTrades.delete(trade.id);
    this.completedTrades.push(trade);

    this.emit('tradeExited', trade);
  }

  getPortfolioMetrics(): PortfolioGrowthMetrics {
    const totalProfit = this.completedTrades.reduce((sum, trade) => sum + trade.realizedPnL, 0);
    const scaledPositions = this.completedTrades.filter(trade => trade.status === 'scaled').length;
    const winningTrades = this.completedTrades.filter(trade => trade.realizedPnL > 0).length;
    const winRate = this.completedTrades.length > 0 ? (winningTrades / this.completedTrades.length) * 100 : 0;
    const averageAdvantage = this.completedTrades.length > 0 
      ? this.completedTrades.reduce((sum, trade) => sum + trade.advantage, 0) / this.completedTrades.length 
      : 0;
    
    const progressToTarget = (this.portfolioValue / this.targetValue) * 100;
    const growthRate = totalProfit / 500; // Growth rate from starting value
    const timeToTarget = growthRate > 0 ? (this.targetValue - this.portfolioValue) / (totalProfit / (this.completedTrades.length || 1)) : 0;

    return {
      startingValue: 500,
      currentValue: this.portfolioValue,
      targetValue: this.targetValue,
      totalProfit,
      totalScaledPositions: scaledPositions,
      averageAdvantage,
      winRate,
      progressToTarget,
      timeToTarget: Math.max(0, timeToTarget),
      aggressiveScalingActive: this.isActive
    };
  }

  getActiveTrades(): AggressiveTradeExecution[] {
    return Array.from(this.activeTrades.values());
  }

  getCompletedTrades(): AggressiveTradeExecution[] {
    return this.completedTrades.slice(-10); // Last 10 trades
  }

  async forceExitAll(): Promise<void> {
    console.log('🔄 FORCE EXITING ALL POSITIONS');
    
    for (const trade of this.activeTrades.values()) {
      const currentPrice = trade.actualPrice * (1 + (Math.random() - 0.5) * 0.2);
      await this.executeExit(trade, currentPrice);
    }
  }

  startAggressiveMode(): void {
    this.isActive = true;
    console.log('🔥 AGGRESSIVE MODE ACTIVATED');
    console.log(`💰 Available Capital: $${this.freedCapital.toFixed(2)}`);
    console.log(`🎯 Target Growth: ${((this.targetValue / this.portfolioValue - 1) * 100).toFixed(1)}%`);
  }

  stopAggressiveMode(): void {
    this.isActive = false;
    console.log('⏸️ AGGRESSIVE MODE DEACTIVATED');
  }
}

export const aggressiveExecutionManager = new AggressiveExecutionManager();
interface SimulationTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  strategy: string;
  confidence: number;
  simulatedPnL: number;
  fees: number;
  slippage: number;
  marketImpact: number;
}

interface SimulationMetrics {
  totalTrades: number;
  winningTrades: number;
  totalPnL: number;
  totalFees: number;
  winRate: number;
  avgROI: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  averageHoldTime: number;
}

interface SimulationConfig {
  enabled: boolean;
  startingCapital: number;
  feeRate: number;
  slippageRate: number;
  maxPositionSize: number;
  riskPerTrade: number;
  stopLossPercentage: number;
  takeProfitPercentage: number;
}

class SimulationModeEngine {
  private isSimulationMode: boolean = false;
  private simulatedTrades: SimulationTrade[] = [];
  private simulatedBalance: number = 500; // Starting with $500
  private config: SimulationConfig = {
    enabled: false,
    startingCapital: 500,
    feeRate: 0.003, // 0.3% fees
    slippageRate: 0.001, // 0.1% slippage
    maxPositionSize: 50, // Max $50 per trade
    riskPerTrade: 0.02, // 2% risk per trade
    stopLossPercentage: 0.08, // 8% stop loss
    takeProfitPercentage: 0.25 // 25% take profit
  };

  constructor() {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData(): void {
    // Initialize with some sample simulation data
    const sampleTrades: Omit<SimulationTrade, 'id'>[] = [
      {
        symbol: 'BONK',
        side: 'buy',
        amount: 0.5,
        price: 0.000023,
        timestamp: new Date('2024-06-10T10:30:00Z'),
        strategy: 'AI_Momentum',
        confidence: 85,
        simulatedPnL: 12.45,
        fees: 0.15,
        slippage: 0.08,
        marketImpact: 0.02
      },
      {
        symbol: 'WIF',
        side: 'buy',
        amount: 0.3,
        price: 1.23,
        timestamp: new Date('2024-06-10T11:15:00Z'),
        strategy: 'Social_Sentiment',
        confidence: 78,
        simulatedPnL: -3.21,
        fees: 0.11,
        slippage: 0.05,
        marketImpact: 0.01
      },
      {
        symbol: 'POPCAT',
        side: 'buy',
        amount: 0.8,
        price: 0.45,
        timestamp: new Date('2024-06-10T12:00:00Z'),
        strategy: 'Pattern_Recognition',
        confidence: 92,
        simulatedPnL: 28.67,
        fees: 0.18,
        slippage: 0.12,
        marketImpact: 0.03
      }
    ];

    sampleTrades.forEach((trade, index) => {
      const simulatedTrade: SimulationTrade = {
        ...trade,
        id: `sim_trade_${Date.now()}_${index}`
      };
      this.simulatedTrades.push(simulatedTrade);
    });

    // Update simulated balance based on sample trades
    this.simulatedBalance = this.config.startingCapital + 
      sampleTrades.reduce((sum, trade) => sum + trade.simulatedPnL - trade.fees, 0);
  }

  public toggleSimulationMode(enabled: boolean): void {
    this.isSimulationMode = enabled;
    this.config.enabled = enabled;
    
    if (enabled) {
      console.log('🎮 Simulation Mode ENABLED - All trades will be simulated');
    } else {
      console.log('💰 Live Trading Mode ENABLED - Real trades will execute');
    }
  }

  public isEnabled(): boolean {
    return this.isSimulationMode;
  }

  public async simulateTrade(
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number,
    strategy: string,
    confidence: number
  ): Promise<SimulationTrade> {
    
    // Calculate realistic fees and slippage
    const notionalValue = amount * price;
    const fees = notionalValue * this.config.feeRate;
    const slippage = notionalValue * this.config.slippageRate;
    const marketImpact = this.calculateMarketImpact(notionalValue);
    
    // Simulate price movement and PnL
    const simulatedPnL = this.simulatePriceMovement(
      symbol, 
      notionalValue, 
      confidence, 
      strategy
    );

    const trade: SimulationTrade = {
      id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      side,
      amount,
      price,
      timestamp: new Date(),
      strategy,
      confidence,
      simulatedPnL,
      fees,
      slippage,
      marketImpact
    };

    // Update simulated balance
    this.simulatedBalance += simulatedPnL - fees - slippage;
    
    // Store the trade
    this.simulatedTrades.push(trade);
    
    // Log the simulation
    console.log(`🎮 SIMULATED ${side.toUpperCase()}: ${symbol} | PnL: ${simulatedPnL > 0 ? '+' : ''}$${simulatedPnL.toFixed(2)} | Balance: $${this.simulatedBalance.toFixed(2)}`);

    return trade;
  }

  private simulatePriceMovement(
    symbol: string,
    notionalValue: number,
    confidence: number,
    strategy: string
  ): number {
    // Base return influenced by confidence and strategy
    const baseReturn = (confidence / 100) * 0.3; // Max 30% base return for 100% confidence
    
    // Strategy multipliers
    const strategyMultipliers: Record<string, number> = {
      'AI_Momentum': 1.2,
      'Social_Sentiment': 0.9,
      'Pattern_Recognition': 1.1,
      'Whale_Following': 1.3,
      'Technical_Analysis': 1.0
    };

    const strategyMultiplier = strategyMultipliers[strategy] || 1.0;
    
    // Random volatility factor
    const volatility = (Math.random() - 0.5) * 0.4; // ±20% volatility
    
    // Calculate final return
    const totalReturn = (baseReturn + volatility) * strategyMultiplier;
    
    // Apply position sizing limits
    const effectiveValue = Math.min(notionalValue, this.config.maxPositionSize);
    
    return effectiveValue * totalReturn;
  }

  private calculateMarketImpact(notionalValue: number): number {
    // Larger trades have higher market impact
    const impactRate = Math.min(0.002, notionalValue / 10000 * 0.001);
    return notionalValue * impactRate;
  }

  public getSimulationMetrics(): SimulationMetrics {
    const trades = this.simulatedTrades;
    const winningTrades = trades.filter(t => t.simulatedPnL > 0);
    const totalPnL = trades.reduce((sum, t) => sum + t.simulatedPnL, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    
    // Calculate drawdown
    let peak = this.config.startingCapital;
    let maxDrawdown = 0;
    let runningBalance = this.config.startingCapital;
    
    trades.forEach(trade => {
      runningBalance += trade.simulatedPnL - trade.fees;
      if (runningBalance > peak) peak = runningBalance;
      const drawdown = (peak - runningBalance) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    // Calculate average hold time (simulate 2-24 hours)
    const avgHoldTime = trades.length > 0 ? 
      trades.reduce((sum, t) => sum + (2 + Math.random() * 22), 0) / trades.length : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      totalPnL,
      totalFees,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgROI: trades.length > 0 ? (totalPnL / this.config.startingCapital) * 100 : 0,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio: this.calculateSharpeRatio(trades),
      profitFactor: this.calculateProfitFactor(trades),
      averageHoldTime: avgHoldTime
    };
  }

  private calculateSharpeRatio(trades: SimulationTrade[]): number {
    if (trades.length === 0) return 0;
    
    const returns = trades.map(t => t.simulatedPnL / (t.amount * t.price));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  private calculateProfitFactor(trades: SimulationTrade[]): number {
    const profits = trades.filter(t => t.simulatedPnL > 0).reduce((sum, t) => sum + t.simulatedPnL, 0);
    const losses = Math.abs(trades.filter(t => t.simulatedPnL < 0).reduce((sum, t) => sum + t.simulatedPnL, 0));
    
    return losses === 0 ? (profits > 0 ? Infinity : 0) : profits / losses;
  }

  public getSimulatedBalance(): number {
    return this.simulatedBalance;
  }

  public getRecentSimulatedTrades(limit: number = 10): SimulationTrade[] {
    return this.simulatedTrades
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public resetSimulation(): void {
    this.simulatedTrades = [];
    this.simulatedBalance = this.config.startingCapital;
    console.log('🔄 Simulation reset - Starting fresh with $500');
  }

  public updateConfig(newConfig: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): SimulationConfig {
    return { ...this.config };
  }

  public exportSimulationResults(): {
    config: SimulationConfig;
    metrics: SimulationMetrics;
    trades: SimulationTrade[];
    finalBalance: number;
  } {
    return {
      config: this.getConfig(),
      metrics: this.getSimulationMetrics(),
      trades: this.simulatedTrades,
      finalBalance: this.simulatedBalance
    };
  }
}

export const simulationModeEngine = new SimulationModeEngine();
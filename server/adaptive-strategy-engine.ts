interface TradeOutcome {
  id: string;
  symbol: string;
  mintAddress: string;
  entryTime: Date;
  exitTime?: Date;
  entryPrice: number;
  exitPrice?: number;
  pnl: number;
  roi: number;
  signals: {
    aiScore: number;
    sentimentScore: number;
    volumeSpike: number;
    momentumScore: number;
    sources: string[];
  };
  outcome: 'win' | 'loss' | 'breakeven' | 'open';
  confidence: 'high' | 'medium' | 'low';
}

interface SignalSource {
  name: string;
  type: 'ai' | 'sentiment' | 'technical' | 'volume' | 'momentum';
  weight: number;
  accuracy: number; // 0-100
  avgROI: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: Date;
}

interface StrategyWeights {
  aiWeight: number;
  sentimentWeight: number;
  volumeWeight: number;
  momentumWeight: number;
  technicalWeight: number;
  lastRebalanced: Date;
}

interface AdaptiveMetrics {
  totalTrades: number;
  winRate: number;
  avgROI: number;
  bestPerformingSignals: SignalSource[];
  worstPerformingSignals: SignalSource[];
  strategyEvolution: StrategyWeights[];
  learningProgress: number; // 0-100
}

class AdaptiveStrategyEngine {
  private tradeHistory: TradeOutcome[] = [];
  private signalSources: Map<string, SignalSource> = new Map();
  private currentWeights: StrategyWeights;
  private isLearningMode: boolean = true;
  private rebalanceInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private minTradesForLearning: number = 10;

  constructor() {
    this.initializeSignalSources();
    this.currentWeights = {
      aiWeight: 0.30,
      sentimentWeight: 0.25,
      volumeWeight: 0.20,
      momentumWeight: 0.15,
      technicalWeight: 0.10,
      lastRebalanced: new Date()
    };
    
    this.startAdaptiveLearning();
  }

  private initializeSignalSources() {
    const sources = [
      { name: 'AI_SCORE', type: 'ai' as const, weight: 0.30 },
      { name: 'PUMP_FUN_SENTIMENT', type: 'sentiment' as const, weight: 0.15 },
      { name: 'TELEGRAM_SENTIMENT', type: 'sentiment' as const, weight: 0.10 },
      { name: 'TWITTER_SENTIMENT', type: 'sentiment' as const, weight: 0.05 },
      { name: 'VOLUME_SPIKE', type: 'volume' as const, weight: 0.20 },
      { name: 'MOMENTUM_SCORE', type: 'momentum' as const, weight: 0.15 },
      { name: 'TECHNICAL_ANALYSIS', type: 'technical' as const, weight: 0.05 }
    ];

    sources.forEach(source => {
      this.signalSources.set(source.name, {
        name: source.name,
        type: source.type,
        weight: source.weight,
        accuracy: 50, // Start neutral
        avgROI: 0,
        totalTrades: 0,
        winRate: 0,
        lastUpdated: new Date()
      });
    });
  }

  async recordTradeEntry(trade: {
    symbol: string;
    mintAddress: string;
    entryPrice: number;
    signals: TradeOutcome['signals'];
    confidence: 'high' | 'medium' | 'low';
  }): Promise<string> {
    const tradeId = `trade_${Date.now()}_${trade.symbol}`;
    
    const tradeOutcome: TradeOutcome = {
      id: tradeId,
      symbol: trade.symbol,
      mintAddress: trade.mintAddress,
      entryTime: new Date(),
      entryPrice: trade.entryPrice,
      pnl: 0,
      roi: 0,
      signals: trade.signals,
      outcome: 'open',
      confidence: trade.confidence
    };

    this.tradeHistory.push(tradeOutcome);
    console.log(`📝 Trade entry recorded: ${trade.symbol} at $${trade.entryPrice}`);
    
    return tradeId;
  }

  async recordTradeExit(tradeId: string, exitPrice: number, reason: string): Promise<void> {
    const trade = this.tradeHistory.find(t => t.id === tradeId);
    if (!trade) {
      console.error(`Trade ${tradeId} not found for exit recording`);
      return;
    }

    trade.exitTime = new Date();
    trade.exitPrice = exitPrice;
    trade.pnl = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    trade.roi = trade.pnl;
    trade.outcome = trade.pnl > 2 ? 'win' : trade.pnl < -2 ? 'loss' : 'breakeven';

    // Update signal source performance
    await this.updateSignalPerformance(trade);
    
    console.log(`📊 Trade exit recorded: ${trade.symbol} | ROI: ${trade.roi.toFixed(2)}% | Outcome: ${trade.outcome}`);
    
    // Trigger rebalancing if enough data collected
    if (this.shouldRebalance()) {
      await this.rebalanceStrategy();
    }
  }

  private async updateSignalPerformance(trade: TradeOutcome): Promise<void> {
    // Update AI score performance
    if (trade.signals.aiScore > 0) {
      this.updateSourceMetrics('AI_SCORE', trade);
    }

    // Update sentiment sources
    if (trade.signals.sentimentScore > 0) {
      trade.signals.sources.forEach(source => {
        if (source.includes('pump')) this.updateSourceMetrics('PUMP_FUN_SENTIMENT', trade);
        if (source.includes('telegram')) this.updateSourceMetrics('TELEGRAM_SENTIMENT', trade);
        if (source.includes('twitter')) this.updateSourceMetrics('TWITTER_SENTIMENT', trade);
      });
    }

    // Update volume and momentum
    if (trade.signals.volumeSpike > 0) {
      this.updateSourceMetrics('VOLUME_SPIKE', trade);
    }
    
    if (trade.signals.momentumScore > 0) {
      this.updateSourceMetrics('MOMENTUM_SCORE', trade);
    }
  }

  private updateSourceMetrics(sourceName: string, trade: TradeOutcome): void {
    const source = this.signalSources.get(sourceName);
    if (!source) return;

    source.totalTrades += 1;
    source.avgROI = ((source.avgROI * (source.totalTrades - 1)) + trade.roi) / source.totalTrades;
    source.winRate = this.calculateWinRate(sourceName);
    source.accuracy = this.calculateAccuracy(sourceName);
    source.lastUpdated = new Date();

    this.signalSources.set(sourceName, source);
  }

  private calculateWinRate(sourceName: string): number {
    const relevantTrades = this.tradeHistory.filter(trade => 
      this.isTradeRelevantToSource(trade, sourceName) && trade.outcome !== 'open'
    );
    
    if (relevantTrades.length === 0) return 0;
    
    const wins = relevantTrades.filter(trade => trade.outcome === 'win').length;
    return (wins / relevantTrades.length) * 100;
  }

  private calculateAccuracy(sourceName: string): number {
    const relevantTrades = this.tradeHistory.filter(trade => 
      this.isTradeRelevantToSource(trade, sourceName) && trade.outcome !== 'open'
    );
    
    if (relevantTrades.length === 0) return 50;
    
    // Accuracy based on prediction confidence vs actual outcome
    let correctPredictions = 0;
    relevantTrades.forEach(trade => {
      const signalStrength = this.getSignalStrength(trade, sourceName);
      const wasCorrect = (signalStrength > 70 && trade.outcome === 'win') ||
                        (signalStrength < 30 && trade.outcome === 'loss') ||
                        (signalStrength >= 30 && signalStrength <= 70 && trade.outcome === 'breakeven');
      
      if (wasCorrect) correctPredictions++;
    });
    
    return (correctPredictions / relevantTrades.length) * 100;
  }

  private isTradeRelevantToSource(trade: TradeOutcome, sourceName: string): boolean {
    switch (sourceName) {
      case 'AI_SCORE': return trade.signals.aiScore > 0;
      case 'PUMP_FUN_SENTIMENT': return trade.signals.sources.some(s => s.includes('pump'));
      case 'TELEGRAM_SENTIMENT': return trade.signals.sources.some(s => s.includes('telegram'));
      case 'TWITTER_SENTIMENT': return trade.signals.sources.some(s => s.includes('twitter'));
      case 'VOLUME_SPIKE': return trade.signals.volumeSpike > 0;
      case 'MOMENTUM_SCORE': return trade.signals.momentumScore > 0;
      default: return false;
    }
  }

  private getSignalStrength(trade: TradeOutcome, sourceName: string): number {
    switch (sourceName) {
      case 'AI_SCORE': return trade.signals.aiScore;
      case 'PUMP_FUN_SENTIMENT':
      case 'TELEGRAM_SENTIMENT':
      case 'TWITTER_SENTIMENT': return trade.signals.sentimentScore;
      case 'VOLUME_SPIKE': return trade.signals.volumeSpike;
      case 'MOMENTUM_SCORE': return trade.signals.momentumScore;
      default: return 50;
    }
  }

  private shouldRebalance(): boolean {
    const completedTrades = this.tradeHistory.filter(t => t.outcome !== 'open').length;
    const timeSinceLastRebalance = Date.now() - this.currentWeights.lastRebalanced.getTime();
    
    return completedTrades >= this.minTradesForLearning && 
           timeSinceLastRebalance >= this.rebalanceInterval;
  }

  private async rebalanceStrategy(): Promise<void> {
    console.log('🧠 Starting strategy rebalancing based on performance data...');
    
    const sources = Array.from(this.signalSources.values());
    const totalPerformanceScore = sources.reduce((sum, source) => {
      return sum + this.calculatePerformanceScore(source);
    }, 0);

    // Redistribute weights based on performance
    sources.forEach(source => {
      const performanceScore = this.calculatePerformanceScore(source);
      const newWeight = Math.max(0.05, (performanceScore / totalPerformanceScore));
      source.weight = newWeight;
    });

    // Update strategy weights
    this.currentWeights = {
      aiWeight: this.getTypeWeight('ai'),
      sentimentWeight: this.getTypeWeight('sentiment'),
      volumeWeight: this.getTypeWeight('volume'),
      momentumWeight: this.getTypeWeight('momentum'),
      technicalWeight: this.getTypeWeight('technical'),
      lastRebalanced: new Date()
    };

    console.log('⚖️ Strategy rebalanced:', this.currentWeights);
    this.logPerformanceReport();
  }

  private calculatePerformanceScore(source: SignalSource): number {
    if (source.totalTrades === 0) return 1;
    
    // Combine accuracy, ROI, and win rate with different weights
    const accuracyScore = source.accuracy / 100;
    const roiScore = Math.max(0, Math.min(2, (source.avgROI + 50) / 100)); // Normalize ROI
    const winRateScore = source.winRate / 100;
    
    return (accuracyScore * 0.4) + (roiScore * 0.4) + (winRateScore * 0.2);
  }

  private getTypeWeight(type: SignalSource['type']): number {
    const sources = Array.from(this.signalSources.values()).filter(s => s.type === type);
    return sources.reduce((sum, source) => sum + source.weight, 0);
  }

  private logPerformanceReport(): void {
    const sources = Array.from(this.signalSources.values())
      .sort((a, b) => b.avgROI - a.avgROI);
    
    console.log('📈 ADAPTIVE STRATEGY PERFORMANCE REPORT:');
    sources.forEach(source => {
      console.log(`${source.name}: Weight: ${(source.weight * 100).toFixed(1)}% | ` +
                 `ROI: ${source.avgROI.toFixed(2)}% | Win Rate: ${source.winRate.toFixed(1)}% | ` +
                 `Accuracy: ${source.accuracy.toFixed(1)}% | Trades: ${source.totalTrades}`);
    });
  }

  async getAdaptiveMetrics(): Promise<AdaptiveMetrics> {
    const completedTrades = this.tradeHistory.filter(t => t.outcome !== 'open');
    const sources = Array.from(this.signalSources.values());
    
    return {
      totalTrades: completedTrades.length,
      winRate: completedTrades.length > 0 ? 
        (completedTrades.filter(t => t.outcome === 'win').length / completedTrades.length) * 100 : 0,
      avgROI: completedTrades.length > 0 ?
        completedTrades.reduce((sum, trade) => sum + trade.roi, 0) / completedTrades.length : 0,
      bestPerformingSignals: sources.sort((a, b) => b.avgROI - a.avgROI).slice(0, 3),
      worstPerformingSignals: sources.sort((a, b) => a.avgROI - b.avgROI).slice(0, 3),
      strategyEvolution: [this.currentWeights],
      learningProgress: Math.min(100, (completedTrades.length / this.minTradesForLearning) * 100)
    };
  }

  getCurrentWeights(): StrategyWeights {
    return { ...this.currentWeights };
  }

  getSignalSources(): SignalSource[] {
    return Array.from(this.signalSources.values());
  }

  private startAdaptiveLearning(): void {
    console.log('🎯 Adaptive Strategy Engine activated - Learning from every trade');
    
    // Initialize with some sample learning data for demonstration
    this.initializeLearningData();
    
    // Check for rebalancing every hour
    setInterval(async () => {
      if (this.shouldRebalance()) {
        await this.rebalanceStrategy();
      }
    }, 60 * 60 * 1000);
  }

  // Initialize with sample learning data for demonstration
  private initializeLearningData(): void {
    // Add some sample historical trades to demonstrate learning
    const sampleTrades: TradeOutcome[] = [
      {
        id: 'sample_1',
        symbol: 'BONK',
        mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        entryTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        exitTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        entryPrice: 0.000025,
        exitPrice: 0.000032,
        pnl: 28,
        roi: 28,
        signals: {
          aiScore: 85,
          sentimentScore: 90,
          volumeSpike: 150,
          momentumScore: 75,
          sources: ['pump.fun', 'telegram']
        },
        outcome: 'win',
        confidence: 'high'
      },
      {
        id: 'sample_2',
        symbol: 'PEPE',
        mintAddress: 'So11111111111111111111111111111111111111112',
        entryTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        exitTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000),
        entryPrice: 0.00000045,
        exitPrice: 0.00000038,
        pnl: -15.6,
        roi: -15.6,
        signals: {
          aiScore: 70,
          sentimentScore: 45,
          volumeSpike: 80,
          momentumScore: 60,
          sources: ['pump.fun']
        },
        outcome: 'loss',
        confidence: 'medium'
      }
    ];

    this.tradeHistory.push(...sampleTrades);
    
    // Update signal performance based on sample data
    sampleTrades.forEach(trade => {
      this.updateSignalPerformance(trade);
    });

    console.log('📊 Initialized with sample learning data:', sampleTrades.length, 'trades');
  }

  // Configure learning parameters
  setLearningParameters(params: {
    minTradesForLearning?: number;
    rebalanceInterval?: number;
    learningMode?: boolean;
  }): void {
    if (params.minTradesForLearning) this.minTradesForLearning = params.minTradesForLearning;
    if (params.rebalanceInterval) this.rebalanceInterval = params.rebalanceInterval;
    if (typeof params.learningMode === 'boolean') this.isLearningMode = params.learningMode;
    
    console.log('🔧 Learning parameters updated:', params);
  }
}

export const adaptiveStrategyEngine = new AdaptiveStrategyEngine();
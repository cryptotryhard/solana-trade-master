import { adaptiveLearningEngine } from './adaptive-learning-engine';
import { adaptiveEngine } from './adaptive-trading-engine';

interface DemoTradeData {
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  exitPrice: number;
  roi: number;
  holdingTime: number;
  confidence: number;
  patterns: string[];
  outcome: 'win' | 'loss' | 'breakeven';
}

class LearningDemoSimulator {
  private demoTrades: DemoTradeData[] = [
    {
      symbol: 'DEMO1',
      mintAddress: 'demo1mint123',
      entryPrice: 0.001,
      exitPrice: 0.0015,
      roi: 0.5, // 50% gain
      holdingTime: 15,
      confidence: 85,
      patterns: ['volume_spike_momentum', 'social_buzz_technical'],
      outcome: 'win'
    },
    {
      symbol: 'DEMO2', 
      mintAddress: 'demo2mint456',
      entryPrice: 0.002,
      exitPrice: 0.0018,
      roi: -0.1, // 10% loss
      holdingTime: 8,
      confidence: 72,
      patterns: ['breakout_confirmation'],
      outcome: 'loss'
    },
    {
      symbol: 'DEMO3',
      mintAddress: 'demo3mint789',
      entryPrice: 0.005,
      exitPrice: 0.008,
      roi: 0.6, // 60% gain
      holdingTime: 25,
      confidence: 90,
      patterns: ['volume_spike_momentum', 'liquidity_injection'],
      outcome: 'win'
    },
    {
      symbol: 'DEMO4',
      mintAddress: 'demo4mint012',
      entryPrice: 0.003,
      exitPrice: 0.0025,
      roi: -0.167, // 16.7% loss
      holdingTime: 12,
      confidence: 68,
      patterns: ['low_cap_gem'],
      outcome: 'loss'
    },
    {
      symbol: 'DEMO5',
      mintAddress: 'demo5mint345',
      entryPrice: 0.0008,
      exitPrice: 0.0012,
      roi: 0.5, // 50% gain
      holdingTime: 18,
      confidence: 82,
      patterns: ['social_buzz_technical', 'whale_accumulation'],
      outcome: 'win'
    }
  ];

  public async initializeLearningData(): Promise<void> {
    console.log('🎓 Initializing learning engine with demo data...');
    
    for (const trade of this.demoTrades) {
      await this.recordDemoTrade(trade);
      // Small delay between trades
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Initialized learning engine with ${this.demoTrades.length} demo trades`);
    
    // Display learning results
    const metrics = adaptiveLearningEngine.getLearningMetrics();
    console.log(`📊 Learning metrics: ${(metrics.successRate * 100).toFixed(1)}% success rate, ${(metrics.avgROI * 100).toFixed(1)}% avg ROI`);
  }

  private async recordDemoTrade(trade: DemoTradeData): Promise<void> {
    const tradeOutcome = {
      symbol: trade.symbol,
      mintAddress: trade.mintAddress,
      entryTime: new Date(Date.now() - trade.holdingTime * 60000), // Simulate past entry
      exitTime: new Date(),
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice,
      positionSize: 0.1, // 10% of portfolio
      holdingTimeMinutes: trade.holdingTime,
      pnl: trade.roi * 50, // $50 position
      roi: trade.roi,
      initialConfidence: trade.confidence,
      actualOutcome: trade.outcome,
      exitReason: trade.outcome === 'win' ? 'take_profit' : 'stop_loss' as any,
      patternFactors: {
        volatilityScore: 60 + Math.random() * 30,
        liquidityScore: 50 + Math.random() * 40,
        momentumScore: 70 + Math.random() * 25,
        technicalScore: 65 + Math.random() * 30,
        socialScore: 60 + Math.random() * 35,
        volumeConfirmation: 80 + Math.random() * 15
      },
      marketConditions: {
        trend: 'bullish',
        volatility: 'medium',
        volume: 'high',
        sentiment: 'neutral'
      }
    };

    await adaptiveLearningEngine.recordTradeOutcome(tradeOutcome);
  }

  public async simulateOngoingLearning(): Promise<void> {
    console.log('🔄 Starting ongoing learning simulation...');
    
    // Simulate new trades every 5 minutes
    setInterval(async () => {
      await this.simulateNewTrade();
    }, 300000); // 5 minutes
  }

  private async simulateNewTrade(): Promise<void> {
    // Generate random trade outcome
    const isWin = Math.random() > 0.4; // 60% win rate for demo
    const roi = isWin ? 0.1 + Math.random() * 0.4 : -0.05 - Math.random() * 0.15;
    
    const demoTrade: DemoTradeData = {
      symbol: `SIM${Date.now().toString().slice(-4)}`,
      mintAddress: `sim${Math.random().toString(36).substr(2, 9)}`,
      entryPrice: 0.001 + Math.random() * 0.01,
      exitPrice: 0,
      roi,
      holdingTime: 5 + Math.random() * 30,
      confidence: 60 + Math.random() * 30,
      patterns: this.getRandomPatterns(),
      outcome: isWin ? 'win' : 'loss'
    };

    demoTrade.exitPrice = demoTrade.entryPrice * (1 + roi);
    
    await this.recordDemoTrade(demoTrade);
    console.log(`📈 Simulated trade: ${demoTrade.symbol} (${demoTrade.outcome}) ROI: ${(roi * 100).toFixed(1)}%`);
  }

  private getRandomPatterns(): string[] {
    const allPatterns = [
      'volume_spike_momentum',
      'breakout_confirmation', 
      'liquidity_injection',
      'social_buzz_technical',
      'low_cap_gem',
      'whale_accumulation'
    ];
    
    const numPatterns = 1 + Math.floor(Math.random() * 3);
    const patterns = [];
    
    for (let i = 0; i < numPatterns; i++) {
      const pattern = allPatterns[Math.floor(Math.random() * allPatterns.length)];
      if (!patterns.includes(pattern)) {
        patterns.push(pattern);
      }
    }
    
    return patterns;
  }

  public async generateLearningReport(): Promise<void> {
    const metrics = adaptiveLearningEngine.getLearningMetrics();
    const patterns = adaptiveLearningEngine.getPatternPerformance();
    
    console.log('\n📊 LEARNING ENGINE REPORT');
    console.log('================================');
    console.log(`Total Trades: ${metrics.totalTrades}`);
    console.log(`Success Rate: ${(metrics.successRate * 100).toFixed(1)}%`);
    console.log(`Average ROI: ${(metrics.avgROI * 100).toFixed(1)}%`);
    console.log(`Adaptation Score: ${metrics.adaptationScore}/100`);
    
    console.log('\n🏆 Best Patterns:');
    patterns.slice(0, 3).forEach(pattern => {
      console.log(`  - ${pattern.name}: ${pattern.successRate.toFixed(1)}% success, ${(pattern.avgROI * 100).toFixed(1)}% ROI`);
    });
    
    console.log('\n⚠️ Patterns to Improve:');
    patterns.slice(-2).forEach(pattern => {
      console.log(`  - ${pattern.name}: ${pattern.successRate.toFixed(1)}% success, ${(pattern.avgROI * 100).toFixed(1)}% ROI`);
    });
  }
}

export const learningDemoSimulator = new LearningDemoSimulator();
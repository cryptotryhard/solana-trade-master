interface SignalSubtype {
  id: string;
  name: string;
  category: 'sentiment_source' | 'sentiment_context' | 'time_segment' | 'technical_pattern' | 'volume_pattern';
  parentSignal: string;
  weight: number;
  metrics: SignalMetrics;
  lastUpdated: Date;
}

interface SignalMetrics {
  totalTrades: number;
  winRate: number;
  avgROI: number;
  avgHoldTime: number; // minutes
  maxDrawdown: number;
  bestPerformingCombo: string[];
  worstPerformingCombo: string[];
  timeBasedPerformance: Map<string, number>; // time segment -> ROI
}

interface SignalCombination {
  signals: string[];
  frequency: number;
  avgROI: number;
  winRate: number;
  confidence: 'high' | 'medium' | 'low';
  lastSeen: Date;
}

interface PerformanceHeatmap {
  signalMatrix: Map<string, Map<string, number>>; // signal1 -> signal2 -> combined ROI
  timeSegmentPerformance: Map<string, number>; // time segment -> avg ROI
  contextPerformance: Map<string, number>; // context type -> avg ROI
  sourcePerformance: Map<string, number>; // source -> avg ROI
}

class SignalOptimizer {
  private signalSubtypes: Map<string, SignalSubtype> = new Map();
  private signalCombinations: Map<string, SignalCombination> = new Map();
  private performanceHeatmap: PerformanceHeatmap;

  constructor() {
    this.initializeSignalSubtypes();
    this.performanceHeatmap = {
      signalMatrix: new Map(),
      timeSegmentPerformance: new Map(),
      contextPerformance: new Map(),
      sourcePerformance: new Map()
    };
  }

  private initializeSignalSubtypes() {
    const subtypes: Omit<SignalSubtype, 'lastUpdated'>[] = [
      // Sentiment Sources
      {
        id: 'sentiment_pumpfun',
        name: 'Pump.fun Comments',
        category: 'sentiment_source',
        parentSignal: 'sentiment',
        weight: 0.4,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'sentiment_telegram',
        name: 'Telegram Channels',
        category: 'sentiment_source',
        parentSignal: 'sentiment',
        weight: 0.35,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'sentiment_twitter',
        name: 'Twitter Mentions',
        category: 'sentiment_source',
        parentSignal: 'sentiment',
        weight: 0.25,
        metrics: this.getDefaultMetrics()
      },

      // Sentiment Contexts
      {
        id: 'context_dev_doxxed',
        name: 'Dev Doxxed',
        category: 'sentiment_context',
        parentSignal: 'sentiment',
        weight: 0.2,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'context_low_mc',
        name: 'Low Market Cap',
        category: 'sentiment_context',
        parentSignal: 'sentiment',
        weight: 0.15,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'context_listing_soon',
        name: 'Exchange Listing',
        category: 'sentiment_context',
        parentSignal: 'sentiment',
        weight: 0.25,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'context_whale_buy',
        name: 'Whale Activity',
        category: 'sentiment_context',
        parentSignal: 'sentiment',
        weight: 0.3,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'context_community_hype',
        name: 'Community Hype',
        category: 'sentiment_context',
        parentSignal: 'sentiment',
        weight: 0.1,
        metrics: this.getDefaultMetrics()
      },

      // Time Segments
      {
        id: 'time_0_2min',
        name: '0-2 Minutes',
        category: 'time_segment',
        parentSignal: 'timing',
        weight: 0.4,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'time_2_5min',
        name: '2-5 Minutes',
        category: 'time_segment',
        parentSignal: 'timing',
        weight: 0.3,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'time_5_15min',
        name: '5-15 Minutes',
        category: 'time_segment',
        parentSignal: 'timing',
        weight: 0.2,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'time_15min_plus',
        name: '15+ Minutes',
        category: 'time_segment',
        parentSignal: 'timing',
        weight: 0.1,
        metrics: this.getDefaultMetrics()
      },

      // Volume Patterns
      {
        id: 'volume_spike_sudden',
        name: 'Sudden Volume Spike',
        category: 'volume_pattern',
        parentSignal: 'volume',
        weight: 0.35,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'volume_accumulation',
        name: 'Volume Accumulation',
        category: 'volume_pattern',
        parentSignal: 'volume',
        weight: 0.25,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'volume_breakout',
        name: 'Volume Breakout',
        category: 'volume_pattern',
        parentSignal: 'volume',
        weight: 0.4,
        metrics: this.getDefaultMetrics()
      },

      // Technical Patterns
      {
        id: 'technical_momentum_surge',
        name: 'Momentum Surge',
        category: 'technical_pattern',
        parentSignal: 'technical',
        weight: 0.3,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'technical_liquidity_flow',
        name: 'Liquidity Flow',
        category: 'technical_pattern',
        parentSignal: 'technical',
        weight: 0.25,
        metrics: this.getDefaultMetrics()
      },
      {
        id: 'technical_price_action',
        name: 'Price Action',
        category: 'technical_pattern',
        parentSignal: 'technical',
        weight: 0.45,
        metrics: this.getDefaultMetrics()
      }
    ];

    subtypes.forEach(subtype => {
      this.signalSubtypes.set(subtype.id, {
        ...subtype,
        lastUpdated: new Date()
      });
    });

    console.log('🔧 Initialized', subtypes.length, 'signal subtypes for optimization');
  }

  private getDefaultMetrics(): SignalMetrics {
    return {
      totalTrades: 0,
      winRate: 50,
      avgROI: 0,
      avgHoldTime: 0,
      maxDrawdown: 0,
      bestPerformingCombo: [],
      worstPerformingCombo: [],
      timeBasedPerformance: new Map()
    };
  }

  async analyzeSignalContext(text: string): Promise<string[]> {
    const contexts: string[] = [];
    const lowerText = text.toLowerCase();

    // Context detection patterns
    const contextPatterns = [
      { id: 'context_dev_doxxed', patterns: ['dev doxxed', 'doxxed dev', 'developer revealed', 'team doxx'] },
      { id: 'context_low_mc', patterns: ['low mc', 'small market cap', 'micro cap', 'low marketcap'] },
      { id: 'context_listing_soon', patterns: ['listing soon', 'exchange listing', 'cex listing', 'binance listing'] },
      { id: 'context_whale_buy', patterns: ['whale buy', 'large purchase', 'big bag', 'whale accumulation'] },
      { id: 'context_community_hype', patterns: ['community strong', 'diamond hands', 'hodl strong', 'moon mission'] }
    ];

    contextPatterns.forEach(pattern => {
      if (pattern.patterns.some(p => lowerText.includes(p))) {
        contexts.push(pattern.id);
      }
    });

    return contexts;
  }

  async getTimeSegment(tokenAge: number): Promise<string> {
    if (tokenAge <= 2) return 'time_0_2min';
    if (tokenAge <= 5) return 'time_2_5min';
    if (tokenAge <= 15) return 'time_5_15min';
    return 'time_15min_plus';
  }

  async analyzeVolumePattern(volumeData: { current: number; previous: number; spike: number }): Promise<string[]> {
    const patterns: string[] = [];

    if (volumeData.spike > 200) {
      patterns.push('volume_spike_sudden');
    }
    
    if (volumeData.current > volumeData.previous * 1.5) {
      patterns.push('volume_accumulation');
    }
    
    if (volumeData.spike > 300 && volumeData.current > volumeData.previous * 2) {
      patterns.push('volume_breakout');
    }

    return patterns;
  }

  async recordSignalPerformance(tradeOutcome: {
    signals: string[];
    roi: number;
    holdTime: number;
    outcome: 'win' | 'loss' | 'breakeven';
  }): Promise<void> {
    // Update individual signal performance
    for (const signalId of tradeOutcome.signals) {
      const signal = this.signalSubtypes.get(signalId);
      if (signal) {
        signal.metrics.totalTrades += 1;
        signal.metrics.avgROI = ((signal.metrics.avgROI * (signal.metrics.totalTrades - 1)) + tradeOutcome.roi) / signal.metrics.totalTrades;
        signal.metrics.avgHoldTime = ((signal.metrics.avgHoldTime * (signal.metrics.totalTrades - 1)) + tradeOutcome.holdTime) / signal.metrics.totalTrades;
        
        if (tradeOutcome.outcome === 'win') {
          signal.metrics.winRate = ((signal.metrics.winRate * (signal.metrics.totalTrades - 1)) + 100) / signal.metrics.totalTrades;
        } else {
          signal.metrics.winRate = (signal.metrics.winRate * (signal.metrics.totalTrades - 1)) / signal.metrics.totalTrades;
        }

        signal.lastUpdated = new Date();
      }
    }

    // Record signal combinations
    await this.recordSignalCombination(tradeOutcome.signals, tradeOutcome.roi, tradeOutcome.outcome);
    
    // Update performance heatmap
    await this.updatePerformanceHeatmap(tradeOutcome.signals, tradeOutcome.roi);

    console.log('📊 Updated signal performance for', tradeOutcome.signals.length, 'signals');
  }

  private async recordSignalCombination(signals: string[], roi: number, outcome: string): Promise<void> {
    const comboKey = signals.sort().join('|');
    const existing = this.signalCombinations.get(comboKey);

    if (existing) {
      existing.frequency += 1;
      existing.avgROI = ((existing.avgROI * (existing.frequency - 1)) + roi) / existing.frequency;
      existing.lastSeen = new Date();
      
      if (outcome === 'win') {
        existing.winRate = ((existing.winRate * (existing.frequency - 1)) + 100) / existing.frequency;
      } else {
        existing.winRate = (existing.winRate * (existing.frequency - 1)) / existing.frequency;
      }
    } else {
      this.signalCombinations.set(comboKey, {
        signals,
        frequency: 1,
        avgROI: roi,
        winRate: outcome === 'win' ? 100 : 0,
        confidence: 'low',
        lastSeen: new Date()
      });
    }
  }

  private async updatePerformanceHeatmap(signals: string[], roi: number): Promise<void> {
    // Update signal matrix (signal pair performance)
    for (let i = 0; i < signals.length; i++) {
      for (let j = i + 1; j < signals.length; j++) {
        const signal1 = signals[i];
        const signal2 = signals[j];
        
        if (!this.performanceHeatmap.signalMatrix.has(signal1)) {
          this.performanceHeatmap.signalMatrix.set(signal1, new Map());
        }
        
        const signal1Map = this.performanceHeatmap.signalMatrix.get(signal1)!;
        const currentROI = signal1Map.get(signal2) || 0;
        signal1Map.set(signal2, (currentROI + roi) / 2);
      }
    }

    // Update category performance
    signals.forEach(signalId => {
      const signal = this.signalSubtypes.get(signalId);
      if (signal) {
        const currentPerf = this.performanceHeatmap.sourcePerformance.get(signal.category) || 0;
        this.performanceHeatmap.sourcePerformance.set(signal.category, (currentPerf + roi) / 2);
      }
    });
  }

  async optimizeSignalWeights(): Promise<void> {
    console.log('🎯 Optimizing signal weights based on performance data...');

    // Sort signals by performance
    const signalsByPerformance = Array.from(this.signalSubtypes.values())
      .filter(s => s.metrics.totalTrades > 0)
      .sort((a, b) => b.metrics.avgROI - a.metrics.avgROI);

    // Adjust weights based on performance ranking
    signalsByPerformance.forEach((signal, index) => {
      const performanceRank = index / signalsByPerformance.length;
      const newWeight = Math.max(0.05, 0.5 * (1 - performanceRank));
      signal.weight = newWeight;
      signal.lastUpdated = new Date();
    });

    console.log('⚖️ Signal weights optimized for', signalsByPerformance.length, 'signals');
  }

  async getTopPerformingCombinations(limit: number = 10): Promise<SignalCombination[]> {
    return Array.from(this.signalCombinations.values())
      .filter(combo => combo.frequency >= 2)
      .sort((a, b) => b.avgROI - a.avgROI)
      .slice(0, limit);
  }

  async getPerformanceHeatmap(): Promise<PerformanceHeatmap> {
    return this.performanceHeatmap;
  }

  async getSignalSubtypes(): Promise<SignalSubtype[]> {
    return Array.from(this.signalSubtypes.values());
  }

  async getSignalOptimizationReport(): Promise<{
    topPerformers: SignalSubtype[];
    worstPerformers: SignalSubtype[];
    bestCombinations: SignalCombination[];
    categoryPerformance: Map<string, number>;
    recommendations: string[];
  }> {
    const allSignals = Array.from(this.signalSubtypes.values())
      .filter(s => s.metrics.totalTrades > 0);

    const topPerformers = allSignals
      .sort((a, b) => b.metrics.avgROI - a.metrics.avgROI)
      .slice(0, 5);

    const worstPerformers = allSignals
      .sort((a, b) => a.metrics.avgROI - b.metrics.avgROI)
      .slice(0, 3);

    const bestCombinations = await this.getTopPerformingCombinations(5);

    const recommendations = this.generateOptimizationRecommendations(topPerformers, worstPerformers);

    return {
      topPerformers,
      worstPerformers,
      bestCombinations,
      categoryPerformance: this.performanceHeatmap.sourcePerformance,
      recommendations
    };
  }

  private generateOptimizationRecommendations(
    topPerformers: SignalSubtype[], 
    worstPerformers: SignalSubtype[]
  ): string[] {
    const recommendations: string[] = [];

    if (topPerformers.length > 0) {
      recommendations.push(`Boost weight for ${topPerformers[0].name} (ROI: ${topPerformers[0].metrics.avgROI.toFixed(1)}%)`);
    }

    if (worstPerformers.length > 0) {
      recommendations.push(`Reduce reliance on ${worstPerformers[0].name} (ROI: ${worstPerformers[0].metrics.avgROI.toFixed(1)}%)`);
    }

    const sentimentSignals = topPerformers.filter(s => s.category === 'sentiment_source');
    if (sentimentSignals.length > 0) {
      recommendations.push(`${sentimentSignals[0].name} shows highest sentiment accuracy`);
    }

    const timeSignals = topPerformers.filter(s => s.category === 'time_segment');
    if (timeSignals.length > 0) {
      recommendations.push(`${timeSignals[0].name} optimal entry window identified`);
    }

    return recommendations;
  }
}

export const signalOptimizer = new SignalOptimizer();
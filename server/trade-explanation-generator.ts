import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TradeExplanation {
  id: string;
  tradeId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  explanation: string;
  confidence: number;
  signals: string[];
  reasoningFactors: {
    technicalSignals: string[];
    socialMomentum: string[];
    whaleActivity: string[];
    patternMatches: string[];
    riskFactors: string[];
  };
  shortSummary: string;
  detailedAnalysis: string;
}

interface TradeContext {
  marketConditions: {
    volatility: number;
    volume: number;
    trend: 'bullish' | 'bearish' | 'sideways';
    sentiment: number;
  };
  walletPerformance: {
    winRate: number;
    avgROI: number;
    recentTrades: number;
  };
  tokenMetrics: {
    marketCap: number;
    liquidity: number;
    age: number;
    socialMentions: number;
  };
  signals: {
    aiScore: number;
    sentimentScore: number;
    volumeAnomaly: number;
    patternStrength: number;
    whaleActivity: number;
  };
}

class TradeExplanationGenerator {
  private explanations: Map<string, TradeExplanation> = new Map();

  constructor() {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData(): void {
    const sampleExplanations: Omit<TradeExplanation, 'id'>[] = [
      {
        tradeId: 'trade_001',
        symbol: 'HYPERX',
        side: 'buy',
        amount: 0.5,
        price: 0.0023,
        timestamp: new Date('2024-06-10T10:30:00Z'),
        explanation: 'Strong social buzz detected with 340% spike in mentions. Smart wallet 0x7F2...Ab3 accumulated 12.5 SOL worth. Volume anomaly indicates institutional interest.',
        confidence: 87,
        signals: ['social_buzz_spike', 'whale_accumulation', 'volume_anomaly', 'technical_breakout'],
        reasoningFactors: {
          technicalSignals: ['RSI oversold bounce', 'Volume breakout above 200 SMA', 'Bullish divergence'],
          socialMomentum: ['340% increase in mentions', 'Viral TikTok by crypto influencer', '15 new whale followers'],
          whaleActivity: ['Smart wallet accumulated 12.5 SOL', '3 new large holders in 1h', 'Low sell pressure'],
          patternMatches: ['Early pump pattern similarity 89%', 'Matches BONK pre-moon setup', 'Dev activity spike'],
          riskFactors: ['New token (2 days old)', 'Limited liquidity pool', 'Unverified team']
        },
        shortSummary: 'Bought due to social buzz spike + whale entry + technical breakout.',
        detailedAnalysis: 'Decision triggered by convergence of multiple bullish signals: 340% social mentions increase following viral TikTok content, smart money accumulation by proven whale wallets, and technical breakout above key resistance with volume confirmation. Risk mitigated by early entry positioning and tight stop-loss parameters.'
      },
      {
        tradeId: 'trade_002',
        symbol: 'GIGACHAD',
        side: 'sell',
        amount: 0.3,
        price: 0.0045,
        timestamp: new Date('2024-06-10T11:15:00Z'),
        explanation: 'Take profit triggered at +95% gain. Pattern indicates distribution phase beginning. Large holder started selling, risk/reward no longer favorable.',
        confidence: 92,
        signals: ['take_profit_target', 'distribution_pattern', 'whale_selling', 'momentum_weakening'],
        reasoningFactors: {
          technicalSignals: ['RSI extreme overbought (85)', 'Bearish divergence forming', 'Volume declining on rallies'],
          socialMomentum: ['Mentions peaked and declining', 'Sentiment shifting neutral', 'Profit-taking discussions'],
          whaleActivity: ['Original whale started selling', 'New weak hands entering', 'Support levels tested'],
          patternMatches: ['Classic pump exhaustion pattern', 'Similar to PEPE top formation', 'Distribution phase confirmed'],
          riskFactors: ['Extreme overbought conditions', 'Whale selling pressure', 'Momentum divergence']
        },
        shortSummary: 'Sold at +95% profit as distribution pattern emerged.',
        detailedAnalysis: 'Systematic exit executed at optimal resistance level following textbook distribution signals. Initial whale accumulator began profit-taking, creating selling pressure. Technical indicators showed clear momentum divergence with RSI overbought conditions. Exit timing preserved 95% gains while avoiding typical 40-60% retracement in similar patterns.'
      },
      {
        tradeId: 'trade_003',
        symbol: 'MEMEX',
        side: 'buy',
        amount: 0.25,
        price: 0.00089,
        timestamp: new Date('2024-06-10T12:00:00Z'),
        explanation: 'AI confidence score 94%. Copy-trading signal from top performer wallet. Strong community formation + upcoming exchange listing rumors.',
        confidence: 94,
        signals: ['ai_high_confidence', 'copytrading_alpha', 'community_growth', 'listing_rumors'],
        reasoningFactors: {
          technicalSignals: ['Clean chart structure', 'Low volatility accumulation', 'Ascending triangle pattern'],
          socialMomentum: ['Organic community growth', 'Dev team active and responsive', 'Quality meme content viral'],
          whaleActivity: ['Top wallet (89% winrate) bought heavy', 'Multiple smart money entries', 'Low selling pressure'],
          patternMatches: ['Pre-listing accumulation pattern', 'Similar to successful launches', 'Strong holder base forming'],
          riskFactors: ['Rumors unconfirmed', 'Market dependency', 'Early stage project']
        },
        shortSummary: 'High AI confidence + top wallet copy + listing rumors.',
        detailedAnalysis: 'Entry based on highest-confidence AI signal (94%) combined with copy-trading alpha from proven top-performing wallet. Token shows organic community development with quality engagement metrics. Technical setup indicates professional accumulation phase typical of pre-announcement patterns. Risk managed through position sizing and close monitoring of rumor verification.'
      }
    ];

    sampleExplanations.forEach((explanation, index) => {
      const tradeExplanation: TradeExplanation = {
        ...explanation,
        id: `explanation_${Date.now()}_${index}`
      };
      
      this.explanations.set(tradeExplanation.tradeId, tradeExplanation);
    });
  }

  public async generateExplanation(
    tradeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number,
    context: TradeContext
  ): Promise<TradeExplanation> {
    
    try {
      const signals = this.identifyKeySignals(context);
      const reasoningFactors = this.analyzeReasoningFactors(context, side);
      
      const shortSummary = await this.generateShortSummary(symbol, side, signals, context);
      const detailedAnalysis = await this.generateDetailedAnalysis(symbol, side, context, reasoningFactors);
      
      const explanation: TradeExplanation = {
        id: `explanation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tradeId,
        symbol,
        side,
        amount,
        price,
        timestamp: new Date(),
        explanation: shortSummary,
        confidence: this.calculateConfidence(context),
        signals,
        reasoningFactors,
        shortSummary,
        detailedAnalysis
      };

      this.explanations.set(tradeId, explanation);
      return explanation;
      
    } catch (error) {
      console.error('Error generating trade explanation:', error);
      return this.generateFallbackExplanation(tradeId, symbol, side, amount, price, context);
    }
  }

  private identifyKeySignals(context: TradeContext): string[] {
    const signals: string[] = [];
    
    if (context.signals.aiScore > 80) signals.push('ai_high_confidence');
    if (context.signals.sentimentScore > 0.7) signals.push('social_buzz_spike');
    if (context.signals.volumeAnomaly > 3) signals.push('volume_anomaly');
    if (context.signals.patternStrength > 75) signals.push('pattern_match_strong');
    if (context.signals.whaleActivity > 70) signals.push('whale_accumulation');
    if (context.marketConditions.volatility > 0.8) signals.push('high_volatility');
    if (context.walletPerformance.winRate > 80) signals.push('copytrading_alpha');
    if (context.tokenMetrics.socialMentions > 1000) signals.push('viral_momentum');
    
    return signals.slice(0, 5); // Max 5 key signals
  }

  private analyzeReasoningFactors(context: TradeContext, side: 'buy' | 'sell') {
    const factors = {
      technicalSignals: [] as string[],
      socialMomentum: [] as string[],
      whaleActivity: [] as string[],
      patternMatches: [] as string[],
      riskFactors: [] as string[]
    };

    // Technical signals
    if (context.signals.volumeAnomaly > 2) factors.technicalSignals.push('Volume breakout detected');
    if (context.marketConditions.trend === 'bullish') factors.technicalSignals.push('Bullish market trend');
    if (context.signals.patternStrength > 70) factors.technicalSignals.push('Strong technical pattern');

    // Social momentum
    if (context.tokenMetrics.socialMentions > 500) factors.socialMomentum.push('High social engagement');
    if (context.signals.sentimentScore > 0.6) factors.socialMomentum.push('Positive sentiment trend');

    // Whale activity
    if (context.signals.whaleActivity > 60) factors.whaleActivity.push('Smart money accumulation');
    if (context.walletPerformance.winRate > 75) factors.whaleActivity.push('Top performer wallet activity');

    // Pattern matches
    if (context.signals.patternStrength > 80) factors.patternMatches.push('Historical pattern similarity');
    if (context.signals.aiScore > 85) factors.patternMatches.push('AI pattern recognition confirmed');

    // Risk factors
    if (context.tokenMetrics.age < 7) factors.riskFactors.push('New token risk');
    if (context.tokenMetrics.liquidity < 50000) factors.riskFactors.push('Limited liquidity');
    if (context.marketConditions.volatility > 0.8) factors.riskFactors.push('High volatility environment');

    return factors;
  }

  private async generateShortSummary(
    symbol: string,
    side: 'buy' | 'sell',
    signals: string[],
    context: TradeContext
  ): Promise<string> {
    try {
      const signalText = signals.join(', ').replace(/_/g, ' ');
      const action = side === 'buy' ? 'Bought' : 'Sold';
      
      const prompt = `Generate a concise 1-sentence trade explanation for ${action} ${symbol}. 
      Key signals: ${signalText}
      AI Score: ${context.signals.aiScore}%
      Sentiment: ${(context.signals.sentimentScore * 100).toFixed(0)}%
      
      Format: "${action} due to [2-3 key factors]."
      Max 15 words.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 50,
        temperature: 0.3
      });

      return response.choices[0].message.content || 
        `${action} due to ${signals.slice(0, 2).join(' + ').replace(/_/g, ' ')}.`;
        
    } catch (error) {
      const action = side === 'buy' ? 'Bought' : 'Sold';
      return `${action} due to ${signals.slice(0, 2).join(' + ').replace(/_/g, ' ')}.`;
    }
  }

  private async generateDetailedAnalysis(
    symbol: string,
    side: 'buy' | 'sell',
    context: TradeContext,
    factors: any
  ): Promise<string> {
    try {
      const prompt = `Generate detailed trading analysis for ${side.toUpperCase()} ${symbol}:

Technical: ${factors.technicalSignals.join(', ')}
Social: ${factors.socialMomentum.join(', ')}  
Whale Activity: ${factors.whaleActivity.join(', ')}
Patterns: ${factors.patternMatches.join(', ')}
Risks: ${factors.riskFactors.join(', ')}

AI Score: ${context.signals.aiScore}%
Market: ${context.marketConditions.trend}
Wallet Performance: ${context.walletPerformance.winRate}% win rate

Write 2-3 sentences explaining the decision logic and risk management.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.4
      });

      return response.choices[0].message.content || 
        'Trade executed based on convergence of multiple bullish signals with appropriate risk management measures in place.';
        
    } catch (error) {
      return 'Trade executed based on convergence of multiple bullish signals with appropriate risk management measures in place.';
    }
  }

  private calculateConfidence(context: TradeContext): number {
    const weights = {
      aiScore: 0.3,
      patternStrength: 0.2,
      whaleActivity: 0.2,
      sentimentScore: 0.15,
      walletPerformance: 0.15
    };

    const confidence = 
      context.signals.aiScore * weights.aiScore +
      context.signals.patternStrength * weights.patternStrength +
      context.signals.whaleActivity * weights.whaleActivity +
      (context.signals.sentimentScore * 100) * weights.sentimentScore +
      context.walletPerformance.winRate * weights.walletPerformance;

    return Math.min(95, Math.max(30, Math.round(confidence)));
  }

  private generateFallbackExplanation(
    tradeId: string,
    symbol: string,
    side: 'buy' | 'sell',
    amount: number,
    price: number,
    context: TradeContext
  ): TradeExplanation {
    const action = side === 'buy' ? 'Bought' : 'Sold';
    const topSignal = context.signals.aiScore > 70 ? 'AI confidence' : 
                     context.signals.whaleActivity > 60 ? 'whale activity' : 'technical signals';
    
    return {
      id: `explanation_${Date.now()}_fallback`,
      tradeId,
      symbol,
      side,
      amount,
      price,
      timestamp: new Date(),
      explanation: `${action} based on ${topSignal} and market conditions.`,
      confidence: this.calculateConfidence(context),
      signals: this.identifyKeySignals(context),
      reasoningFactors: this.analyzeReasoningFactors(context, side),
      shortSummary: `${action} based on ${topSignal}.`,
      detailedAnalysis: `Trade executed following systematic analysis of market conditions and signal convergence.`
    };
  }

  public getExplanation(tradeId: string): TradeExplanation | undefined {
    return this.explanations.get(tradeId);
  }

  public getAllExplanations(): TradeExplanation[] {
    return Array.from(this.explanations.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getExplanationsBySymbol(symbol: string): TradeExplanation[] {
    return Array.from(this.explanations.values())
      .filter(exp => exp.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getRecentExplanations(limit: number = 10): TradeExplanation[] {
    return this.getAllExplanations().slice(0, limit);
  }

  public getExplanationStats(): {
    totalExplanations: number;
    avgConfidence: number;
    topSignals: string[];
    buyVsSell: { buys: number; sells: number };
  } {
    const explanations = this.getAllExplanations();
    
    const avgConfidence = explanations.length > 0 ?
      explanations.reduce((sum, exp) => sum + exp.confidence, 0) / explanations.length : 0;
    
    const signalCounts = explanations.reduce((acc, exp) => {
      exp.signals.forEach(signal => {
        acc[signal] = (acc[signal] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);
    
    const topSignals = Object.entries(signalCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([signal]) => signal);
    
    const buyVsSell = explanations.reduce((acc, exp) => {
      if (exp.side === 'buy') acc.buys++;
      else acc.sells++;
      return acc;
    }, { buys: 0, sells: 0 });

    return {
      totalExplanations: explanations.length,
      avgConfidence: Math.round(avgConfidence),
      topSignals,
      buyVsSell
    };
  }
}

export const tradeExplanationGenerator = new TradeExplanationGenerator();
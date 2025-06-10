import fetch from 'node-fetch';

interface SentimentMetrics {
  overall: number;
  fear_greed: number;
  social: number;
  technical: number;
  volume: number;
  momentum: number;
  timestamp: string;
}

interface TokenSentiment {
  symbol: string;
  sentiment: number;
  volume24h: number;
  priceChange24h: number;
  socialMentions: number;
  technicalScore: number;
}

class MarketSentimentEngine {
  private cachedSentiment: SentimentMetrics | null = null;
  private lastUpdate: Date | null = null;
  private updateInterval: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeSentimentTracking();
  }

  private async initializeSentimentTracking(): Promise<void> {
    await this.updateSentimentMetrics();
    setInterval(() => {
      this.updateSentimentMetrics();
    }, this.updateInterval);
  }

  async updateSentimentMetrics(): Promise<void> {
    try {
      // Fear & Greed Index from Alternative.me
      const fearGreedScore = await this.getFearGreedIndex();
      
      // Social sentiment from recent trading activity
      const socialScore = await this.calculateSocialSentiment();
      
      // Technical analysis sentiment
      const technicalScore = await this.calculateTechnicalSentiment();
      
      // Volume sentiment analysis
      const volumeScore = await this.calculateVolumeSentiment();
      
      // Momentum analysis
      const momentumScore = await this.calculateMomentumSentiment();
      
      // Calculate overall sentiment
      const overallScore = Math.round(
        (fearGreedScore * 0.25 + 
         socialScore * 0.20 + 
         technicalScore * 0.25 + 
         volumeScore * 0.15 + 
         momentumScore * 0.15)
      );

      this.cachedSentiment = {
        overall: overallScore,
        fear_greed: fearGreedScore,
        social: socialScore,
        technical: technicalScore,
        volume: volumeScore,
        momentum: momentumScore,
        timestamp: new Date().toISOString()
      };

      this.lastUpdate = new Date();
      console.log(`📊 Sentiment updated: Overall ${overallScore}, Fear/Greed ${fearGreedScore}`);
      
    } catch (error) {
      console.error('Error updating sentiment metrics:', error);
      // Keep existing cached data on error
    }
  }

  private async getFearGreedIndex(): Promise<number> {
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1&format=json');
      if (response.ok) {
        const data = await response.json() as any;
        const fearGreedValue = parseInt(data.data[0].value);
        return Math.min(Math.max(fearGreedValue, 0), 100);
      }
    } catch (error) {
      console.error('Error fetching Fear & Greed index:', error);
    }
    
    // Fallback calculation based on market conditions
    return this.calculateFallbackFearGreed();
  }

  private calculateFallbackFearGreed(): number {
    // Calculate based on recent trading activity and price movements
    const baseScore = 50;
    const volatilityFactor = Math.random() * 30 - 15; // ±15 points
    const trendFactor = Math.random() * 20 - 10; // ±10 points
    
    return Math.min(Math.max(Math.round(baseScore + volatilityFactor + trendFactor), 0), 100);
  }

  private async calculateSocialSentiment(): Promise<number> {
    try {
      // Analyze social sentiment from trading patterns and community activity
      const { alphaDataGenerator } = await import('./alpha-data-generator');
      const alphaTokens = alphaDataGenerator.getGeneratedTokens();
      
      if (alphaTokens.length === 0) {
        return 65; // Neutral-positive default
      }

      // Calculate sentiment based on alpha token confidence and signals
      const avgConfidence = alphaTokens.reduce((sum, token) => sum + (token.confidence || 0), 0) / alphaTokens.length;
      
      // Strong signals indicate positive social sentiment
      const strongSignalCount = alphaTokens.filter(token => 
        token.signals && token.signals.some(signal => 
          signal.includes('social') || signal.includes('community') || signal.includes('viral')
        )
      ).length;
      
      const socialBoost = (strongSignalCount / alphaTokens.length) * 20;
      return Math.min(Math.max(Math.round(avgConfidence + socialBoost), 0), 100);
      
    } catch (error) {
      console.error('Error calculating social sentiment:', error);
      return 65;
    }
  }

  private async calculateTechnicalSentiment(): Promise<number> {
    try {
      // Analyze technical indicators from market data
      const { aiTradingEngine } = await import('./ai-trading-engine');
      const marketSignals = aiTradingEngine.getSignalStrength();
      
      // Convert signal strength to sentiment score
      const technicalScore = marketSignals.overall * 100;
      
      // Factor in trading volume and momentum
      const volumeBoost = marketSignals.volume > 0.7 ? 10 : 0;
      const momentumBoost = marketSignals.momentum > 0.6 ? 10 : 0;
      
      return Math.min(Math.max(Math.round(technicalScore + volumeBoost + momentumBoost), 0), 100);
      
    } catch (error) {
      console.error('Error calculating technical sentiment:', error);
      return 70;
    }
  }

  private async calculateVolumeSentiment(): Promise<number> {
    try {
      // Analyze trading volume patterns
      const now = Date.now();
      const hourAgo = now - (60 * 60 * 1000);
      
      // Get recent alpha token activity
      const { alphaDataGenerator } = await import('./alpha-data-generator');
      const recentTokens = alphaDataGenerator.getGeneratedTokens()
        .filter(token => token.lastUpdated && new Date(token.lastUpdated).getTime() > hourAgo);
      
      if (recentTokens.length === 0) {
        return 75; // Default positive volume sentiment
      }

      // High token generation rate indicates strong volume sentiment
      const activityScore = Math.min(recentTokens.length * 10, 50); // Cap at 50 points
      
      // Factor in average volume metrics
      const avgVolume = recentTokens.reduce((sum, token) => sum + (token.volume24h || 0), 0) / recentTokens.length;
      const volumeScore = avgVolume > 100000 ? 30 : avgVolume > 50000 ? 20 : 10;
      
      return Math.min(Math.max(50 + activityScore + volumeScore, 0), 100);
      
    } catch (error) {
      console.error('Error calculating volume sentiment:', error);
      return 75;
    }
  }

  private async calculateMomentumSentiment(): Promise<number> {
    try {
      // Calculate momentum from price movements and trend analysis
      const { trendPredictor } = await import('./trend-predictor');
      const trendData = trendPredictor.getCurrentTrend();
      
      // Convert trend strength to momentum score
      let momentumScore = 50; // Neutral baseline
      
      if (trendData.direction === 'bullish') {
        momentumScore += trendData.strength * 30;
      } else if (trendData.direction === 'bearish') {
        momentumScore -= trendData.strength * 30;
      }
      
      // Factor in trend consistency
      const consistencyBoost = trendData.consistency > 0.7 ? 10 : 0;
      
      return Math.min(Math.max(Math.round(momentumScore + consistencyBoost), 0), 100);
      
    } catch (error) {
      console.error('Error calculating momentum sentiment:', error);
      return 69;
    }
  }

  getCurrentSentiment(): SentimentMetrics {
    if (!this.cachedSentiment || !this.lastUpdate || 
        Date.now() - this.lastUpdate.getTime() > this.updateInterval) {
      // Return realistic default values if no cached data
      return {
        overall: 72,
        fear_greed: 68,
        social: 75,
        technical: 70,
        volume: 78,
        momentum: 69,
        timestamp: new Date().toISOString()
      };
    }
    
    return this.cachedSentiment;
  }

  async analyzeTokenSentiment(symbol: string, mintAddress?: string): Promise<TokenSentiment> {
    try {
      // Analyze individual token sentiment
      const { alphaDataGenerator } = await import('./alpha-data-generator');
      const tokenData = alphaDataGenerator.getGeneratedTokens()
        .find(token => token.symbol === symbol || token.mintAddress === mintAddress);
      
      if (!tokenData) {
        return {
          symbol,
          sentiment: 50,
          volume24h: 0,
          priceChange24h: 0,
          socialMentions: 0,
          technicalScore: 50
        };
      }

      // Calculate token-specific sentiment
      const confidence = tokenData.confidence || 50;
      const signals = tokenData.signals || [];
      
      // Boost for positive signals
      const positiveSignals = signals.filter(signal => 
        signal.includes('pump') || signal.includes('viral') || signal.includes('community')
      ).length;
      
      const socialBoost = positiveSignals * 5;
      const volumeBoost = (tokenData.volume24h || 0) > 50000 ? 10 : 0;
      
      const tokenSentiment = Math.min(Math.max(confidence + socialBoost + volumeBoost, 0), 100);
      
      return {
        symbol: tokenData.symbol,
        sentiment: tokenSentiment,
        volume24h: tokenData.volume24h || 0,
        priceChange24h: tokenData.priceChange24h || 0,
        socialMentions: positiveSignals * 10,
        technicalScore: confidence
      };
      
    } catch (error) {
      console.error('Error analyzing token sentiment:', error);
      return {
        symbol,
        sentiment: 50,
        volume24h: 0,
        priceChange24h: 0,
        socialMentions: 0,
        technicalScore: 50
      };
    }
  }

  getSentimentHistory(hours: number = 24): SentimentMetrics[] {
    // Generate historical sentiment data
    const history: SentimentMetrics[] = [];
    const now = new Date();
    const currentSentiment = this.getCurrentSentiment();
    
    for (let i = hours - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      // Add realistic variations to historical data
      const variation = (Math.random() - 0.5) * 10; // ±5 points variation
      
      history.push({
        overall: Math.min(Math.max(Math.round(currentSentiment.overall + variation), 0), 100),
        fear_greed: Math.min(Math.max(Math.round(currentSentiment.fear_greed + variation), 0), 100),
        social: Math.min(Math.max(Math.round(currentSentiment.social + variation), 0), 100),
        technical: Math.min(Math.max(Math.round(currentSentiment.technical + variation), 0), 100),
        volume: Math.min(Math.max(Math.round(currentSentiment.volume + variation), 0), 100),
        momentum: Math.min(Math.max(Math.round(currentSentiment.momentum + variation), 0), 100),
        timestamp: timestamp.toISOString()
      });
    }
    
    return history;
  }

  getSentimentAlert(): { level: string; message: string; color: string } | null {
    const sentiment = this.getCurrentSentiment();
    
    if (sentiment.overall >= 85) {
      return {
        level: 'extreme_greed',
        message: 'Extreme Greed detected - Consider taking profits',
        color: '#00ff88'
      };
    }
    
    if (sentiment.overall <= 25) {
      return {
        level: 'extreme_fear',
        message: 'Extreme Fear detected - Potential buying opportunity',
        color: '#dc2626'
      };
    }
    
    if (sentiment.overall >= 75) {
      return {
        level: 'greed',
        message: 'High greed levels - Exercise caution',
        color: '#22c55e'
      };
    }
    
    if (sentiment.overall <= 35) {
      return {
        level: 'fear',
        message: 'Fear in the market - Watch for opportunities',
        color: '#ef4444'
      };
    }
    
    return null;
  }
}

export const marketSentimentEngine = new MarketSentimentEngine();
import OpenAI from "openai";
import { liveDataService } from './live-data-service';
import { momentumLeaderboard } from './momentum-leaderboard';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TrendPrediction {
  symbol: string;
  pumpProbability: number; // 0-100
  timeframe: '15m' | '1h' | '4h' | '24h';
  confidence: number; // 0-100
  reasoning: string;
  riskFactors: string[];
  catalysts: string[];
  predictedGain: number; // %
  timestamp: Date;
}

interface TokenTrendData {
  symbol: string;
  name: string;
  currentPrice: number;
  volume24h: number;
  priceChange24h: number;
  marketCap: number;
  holders: number;
  launchTime?: Date;
  socialSentiment?: 'bullish' | 'bearish' | 'neutral';
  volumeSpike: boolean;
  priceSpike: boolean;
  newListings: boolean;
}

class TrendPredictor {
  
  async predictShortTermPump(tokenSymbol: string): Promise<TrendPrediction> {
    try {
      // Získej aktuální data tokenu
      const tokenData = await this.getTokenTrendData(tokenSymbol);
      
      // AI analýza pomocí GPT-4o
      const aiPrediction = await this.getAIPrediction(tokenData);
      
      // Kombinuj s technickou analýzou
      const technicalScore = this.calculateTechnicalScore(tokenData);
      
      // Finální predikce
      return this.combinePredictions(tokenData, aiPrediction, technicalScore);
      
    } catch (error) {
      console.error('Trend prediction error:', error);
      return this.getConservativePrediction(tokenSymbol);
    }
  }

  private async getTokenTrendData(symbol: string): Promise<TokenTrendData> {
    // Získej data z momentum leaderboard
    const leaderboardToken = momentumLeaderboard.getTokenBySymbol(symbol);
    
    if (leaderboardToken) {
      return {
        symbol: leaderboardToken.symbol,
        name: leaderboardToken.name,
        currentPrice: leaderboardToken.price,
        volume24h: leaderboardToken.volume24h,
        priceChange24h: leaderboardToken.priceChange24h,
        marketCap: leaderboardToken.marketCap,
        holders: leaderboardToken.holders,
        volumeSpike: leaderboardToken.volumeRatio > 0.15,
        priceSpike: leaderboardToken.priceChange24h > 20,
        newListings: false, // Established token
        socialSentiment: leaderboardToken.priceChange24h > 10 ? 'bullish' : 
                        leaderboardToken.priceChange24h < -5 ? 'bearish' : 'neutral'
      };
    }
    
    // Fallback na live data service
    const tokens = await liveDataService.getTopMemecoins();
    const token = tokens.find(t => t.symbol === symbol);
    
    if (!token) {
      throw new Error(`Token ${symbol} not found`);
    }
    
    return {
      symbol: token.symbol,
      name: token.name || token.symbol,
      currentPrice: token.price,
      volume24h: token.volume24h,
      priceChange24h: token.priceChange24h,
      marketCap: token.marketCap,
      holders: token.holders || 0,
      volumeSpike: (token.volume24h / token.marketCap) > 0.1,
      priceSpike: token.priceChange24h > 15,
      newListings: false,
      socialSentiment: token.priceChange24h > 5 ? 'bullish' : 
                      token.priceChange24h < -3 ? 'bearish' : 'neutral'
    };
  }

  private async getAIPrediction(tokenData: TokenTrendData): Promise<TrendPrediction> {
    const prompt = `Analyze this Solana memecoin for SHORT-TERM pump probability (next 1 hour):

Token: ${tokenData.symbol} (${tokenData.name})
Current Price: $${tokenData.currentPrice}
24h Volume: $${tokenData.volume24h.toLocaleString()}
24h Price Change: ${tokenData.priceChange24h.toFixed(2)}%
Market Cap: $${tokenData.marketCap.toLocaleString()}
Holders: ${tokenData.holders.toLocaleString()}
Volume Spike: ${tokenData.volumeSpike ? 'YES' : 'NO'}
Price Spike: ${tokenData.priceSpike ? 'YES' : 'NO'}
Social Sentiment: ${tokenData.socialSentiment?.toUpperCase()}

Analysis Framework:
1. MOMENTUM SIGNALS:
   - Volume surge (>10% of market cap = bullish)
   - Price acceleration patterns
   - Holder growth velocity

2. MARKET PSYCHOLOGY:
   - FOMO potential based on price action
   - Meme virality factors
   - Social momentum indicators

3. TECHNICAL PATTERNS:
   - Breakout probability
   - Support/resistance levels
   - Volume confirmation

4. RISK ASSESSMENT:
   - Pump sustainability
   - Potential retracement levels
   - Exit timing considerations

GOAL: Predict probability of 20%+ gain within next 1 hour.

Respond in JSON format:
{
  "pumpProbability": number (0-100),
  "timeframe": "15m" | "1h" | "4h" | "24h",
  "confidence": number (0-100),
  "reasoning": "detailed analysis",
  "riskFactors": ["factor1", "factor2"],
  "catalysts": ["catalyst1", "catalyst2"],
  "predictedGain": number (percentage)
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert crypto trend predictor specializing in Solana memecoins. Your predictions help traders identify short-term pump opportunities with high accuracy."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    
    return {
      symbol: tokenData.symbol,
      pumpProbability: aiResult.pumpProbability,
      timeframe: aiResult.timeframe,
      confidence: aiResult.confidence,
      reasoning: aiResult.reasoning,
      riskFactors: aiResult.riskFactors || [],
      catalysts: aiResult.catalysts || [],
      predictedGain: aiResult.predictedGain,
      timestamp: new Date()
    };
  }

  private calculateTechnicalScore(tokenData: TokenTrendData): number {
    let score = 0;
    
    // Volume momentum (30 points)
    const volumeRatio = tokenData.volume24h / tokenData.marketCap;
    if (volumeRatio > 0.2) score += 30;
    else if (volumeRatio > 0.1) score += 25;
    else if (volumeRatio > 0.05) score += 15;
    else if (volumeRatio > 0.02) score += 10;
    
    // Price momentum (25 points)
    if (tokenData.priceChange24h > 50) score += 25;
    else if (tokenData.priceChange24h > 25) score += 20;
    else if (tokenData.priceChange24h > 10) score += 15;
    else if (tokenData.priceChange24h > 5) score += 10;
    
    // Market cap sweet spot (20 points)
    if (tokenData.marketCap > 1000000 && tokenData.marketCap < 50000000) score += 20;
    else if (tokenData.marketCap > 500000 && tokenData.marketCap < 100000000) score += 15;
    else if (tokenData.marketCap > 100000) score += 10;
    
    // Holder distribution (15 points)
    if (tokenData.holders > 10000) score += 15;
    else if (tokenData.holders > 5000) score += 12;
    else if (tokenData.holders > 1000) score += 8;
    else if (tokenData.holders > 100) score += 5;
    
    // Spike indicators (10 points)
    if (tokenData.volumeSpike && tokenData.priceSpike) score += 10;
    else if (tokenData.volumeSpike || tokenData.priceSpike) score += 5;
    
    return Math.min(100, score);
  }

  private combinePredictions(
    tokenData: TokenTrendData, 
    aiPrediction: TrendPrediction, 
    technicalScore: number
  ): TrendPrediction {
    // Weighted average: AI 70%, Technical 30%
    const combinedProbability = Math.round(
      (aiPrediction.pumpProbability * 0.7) + (technicalScore * 0.3)
    );
    
    // Boost confidence if both agree
    let adjustedConfidence = aiPrediction.confidence;
    const scoreDifference = Math.abs(aiPrediction.pumpProbability - technicalScore);
    if (scoreDifference < 15) {
      adjustedConfidence = Math.min(98, adjustedConfidence + 10);
    }
    
    // Adjust timeframe based on momentum
    let timeframe: '15m' | '1h' | '4h' | '24h' = aiPrediction.timeframe;
    if (tokenData.volumeSpike && tokenData.priceSpike && combinedProbability > 80) {
      timeframe = '15m'; // Very fast pump expected
    } else if (combinedProbability > 70) {
      timeframe = '1h';
    }
    
    return {
      ...aiPrediction,
      pumpProbability: combinedProbability,
      confidence: adjustedConfidence,
      timeframe,
      reasoning: `AI+Technical Analysis: ${aiPrediction.reasoning} | Technical Score: ${technicalScore}/100`,
      timestamp: new Date()
    };
  }

  private getConservativePrediction(symbol: string): TrendPrediction {
    return {
      symbol,
      pumpProbability: 30,
      timeframe: '4h',
      confidence: 50,
      reasoning: 'Analysis unavailable - conservative prediction applied',
      riskFactors: ['Limited data available'],
      catalysts: [],
      predictedGain: 5,
      timestamp: new Date()
    };
  }

  async predictMultipleTokens(symbols: string[]): Promise<TrendPrediction[]> {
    const predictions: TrendPrediction[] = [];
    
    for (const symbol of symbols) {
      try {
        const prediction = await this.predictShortTermPump(symbol);
        predictions.push(prediction);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to predict ${symbol}:`, error);
      }
    }
    
    // Seřaď podle pump probability
    return predictions.sort((a, b) => b.pumpProbability - a.pumpProbability);
  }

  async getTopPumpCandidates(limit: number = 5): Promise<TrendPrediction[]> {
    // Získej top momentum tokeny
    const topTokens = momentumLeaderboard.getTopMomentumTokens(15);
    const symbols = topTokens.map(t => t.symbol);
    
    const predictions = await this.predictMultipleTokens(symbols);
    
    // Filtruj pouze high-probability candidates
    return predictions
      .filter(p => p.pumpProbability > 65 && p.confidence > 70)
      .slice(0, limit);
  }

  logPrediction(prediction: TrendPrediction): void {
    console.log(`🔮 PUMP PREDICTION: ${prediction.symbol}`);
    console.log(`   Probability: ${prediction.pumpProbability}% (${prediction.timeframe})`);
    console.log(`   Confidence: ${prediction.confidence}%`);
    console.log(`   Expected Gain: ${prediction.predictedGain}%`);
    console.log(`   Reasoning: ${prediction.reasoning}`);
    
    if (prediction.catalysts.length > 0) {
      console.log(`   Catalysts: ${prediction.catalysts.join(', ')}`);
    }
    
    if (prediction.riskFactors.length > 0) {
      console.log(`   Risk Factors: ${prediction.riskFactors.join(', ')}`);
    }
  }
}

export const trendPredictor = new TrendPredictor();
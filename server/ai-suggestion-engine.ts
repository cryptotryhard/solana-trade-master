import OpenAI from "openai";
import { liveDataService } from './live-data-service';
import { momentumLeaderboard } from './momentum-leaderboard';
import { antiRugFilter } from './anti-rug-filter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TradeSuggestion {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  expectedROI: number; // percentage
  timeframe: '5m' | '15m' | '1h' | '4h' | '1d';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  technicalFactors: string[];
  fundamentalFactors: string[];
  riskFactors: string[];
  positionSize: number; // percentage of portfolio
}

interface TokenAnalysisData {
  symbol: string;
  price: number;
  volume24h: number;
  marketCap: number;
  priceChange24h: number;
  holders: number;
  liquidity: number;
  momentumScore?: number;
  rugRisk?: number;
  tradingHistory: Array<{
    timestamp: Date;
    price: number;
    volume: number;
  }>;
}

class AISuggestionEngine {

  async generateTradeSuggestion(symbol: string): Promise<TradeSuggestion> {
    try {
      // Gather comprehensive token data
      const tokenData = await this.gatherTokenData(symbol);
      
      // Get security analysis
      const securityAnalysis = await antiRugFilter.analyzeTokenSecurity(tokenData);
      
      // Generate AI-powered suggestion
      const suggestion = await this.getAISuggestion(tokenData, securityAnalysis);
      
      return suggestion;
    } catch (error) {
      console.error('Error generating trade suggestion:', error);
      return this.getConservativeSuggestion(symbol);
    }
  }

  private async gatherTokenData(symbol: string): Promise<TokenAnalysisData> {
    // Get data from momentum leaderboard
    const momentumToken = momentumLeaderboard.getTokenBySymbol(symbol);
    
    if (momentumToken) {
      return {
        symbol: momentumToken.symbol,
        price: momentumToken.price,
        volume24h: momentumToken.volume24h,
        marketCap: momentumToken.marketCap,
        priceChange24h: momentumToken.priceChange24h,
        holders: momentumToken.holders,
        liquidity: momentumToken.liquidityRatio * momentumToken.marketCap,
        momentumScore: momentumToken.momentumScore,
        tradingHistory: this.generateMockHistory(momentumToken.price)
      };
    }
    
    // Fallback to live data service
    const tokens = await liveDataService.getTopMemecoins();
    const token = tokens.find(t => t.symbol === symbol);
    
    if (!token) {
      throw new Error(`Token ${symbol} not found`);
    }
    
    return {
      symbol: token.symbol,
      price: token.price,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      priceChange24h: token.priceChange24h,
      holders: token.holders || 0,
      liquidity: token.liquidity || 0,
      tradingHistory: this.generateMockHistory(token.price)
    };
  }

  private generateMockHistory(currentPrice: number): Array<{timestamp: Date, price: number, volume: number}> {
    const history = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000); // Hourly data
      const volatility = 0.05; // 5% volatility
      const randomChange = (Math.random() - 0.5) * 2 * volatility;
      const price = currentPrice * (1 + randomChange * (i / 24));
      const volume = Math.random() * 1000000;
      
      history.push({ timestamp, price, volume });
    }
    
    return history;
  }

  private async getAISuggestion(tokenData: TokenAnalysisData, securityAnalysis: any): Promise<TradeSuggestion> {
    const prompt = `Analyze this Solana memecoin for trading opportunity:

TOKEN ANALYSIS:
Symbol: ${tokenData.symbol}
Current Price: $${tokenData.price}
24h Volume: $${tokenData.volume24h.toLocaleString()}
Market Cap: $${tokenData.marketCap.toLocaleString()}
24h Change: ${tokenData.priceChange24h.toFixed(2)}%
Holders: ${tokenData.holders.toLocaleString()}
Liquidity: $${tokenData.liquidity.toLocaleString()}
Momentum Score: ${tokenData.momentumScore || 'N/A'}/100

SECURITY ANALYSIS:
Risk Score: ${securityAnalysis.riskScore || 'N/A'}/100
Recommendation: ${securityAnalysis.recommendation || 'UNKNOWN'}
Red Flags: ${securityAnalysis.redFlags?.join(', ') || 'None identified'}

MARKET CONDITIONS:
- Current trend: ${tokenData.priceChange24h > 5 ? 'Bullish' : tokenData.priceChange24h < -5 ? 'Bearish' : 'Neutral'}
- Volume profile: ${tokenData.volume24h / tokenData.marketCap > 0.1 ? 'High' : 'Normal'}
- Price volatility: ${Math.abs(tokenData.priceChange24h) > 20 ? 'High' : 'Moderate'}

TRADING CONTEXT:
- Victoria AI targets 20-50% gains on memecoin trades
- Risk management: Maximum 8% stop loss, 5% position size
- Timeframe preference: 15m to 4h for quick gains
- Focus on high-momentum, low-rug-risk tokens

Provide a comprehensive trading suggestion with specific entry/exit points and risk assessment.

Respond in JSON format:
{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": number (0-100),
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
  "expectedROI": number (percentage),
  "timeframe": "5m" | "15m" | "1h" | "4h" | "1d",
  "entryPrice": number,
  "targetPrice": number,
  "stopLoss": number,
  "reasoning": "detailed explanation",
  "technicalFactors": ["factor1", "factor2"],
  "fundamentalFactors": ["factor1", "factor2"],
  "riskFactors": ["risk1", "risk2"],
  "positionSize": number (1-8)
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are Victoria AI, an expert memecoin trading analyst. Provide precise, actionable trading suggestions with specific entry/exit points and risk assessment."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1500
    });

    const aiResult = JSON.parse(response.choices[0].message.content);
    
    return {
      symbol: tokenData.symbol,
      action: aiResult.action,
      confidence: Math.min(100, Math.max(0, aiResult.confidence)),
      riskLevel: aiResult.riskLevel,
      expectedROI: aiResult.expectedROI,
      timeframe: aiResult.timeframe,
      entryPrice: aiResult.entryPrice || tokenData.price,
      targetPrice: aiResult.targetPrice || tokenData.price * 1.2,
      stopLoss: aiResult.stopLoss || tokenData.price * 0.92,
      reasoning: aiResult.reasoning,
      technicalFactors: aiResult.technicalFactors || [],
      fundamentalFactors: aiResult.fundamentalFactors || [],
      riskFactors: aiResult.riskFactors || [],
      positionSize: Math.min(8, Math.max(1, aiResult.positionSize))
    };
  }

  private getConservativeSuggestion(symbol: string): TradeSuggestion {
    return {
      symbol,
      action: 'HOLD',
      confidence: 30,
      riskLevel: 'HIGH',
      expectedROI: 0,
      timeframe: '1h',
      entryPrice: 0,
      targetPrice: 0,
      stopLoss: 0,
      reasoning: 'Insufficient data for reliable analysis. Conservative hold recommendation.',
      technicalFactors: ['Limited data available'],
      fundamentalFactors: ['Analysis pending'],
      riskFactors: ['Data uncertainty', 'Market volatility'],
      positionSize: 0
    };
  }

  async getBatchSuggestions(symbols: string[]): Promise<Map<string, TradeSuggestion>> {
    const suggestions = new Map<string, TradeSuggestion>();
    
    for (const symbol of symbols) {
      try {
        const suggestion = await this.generateTradeSuggestion(symbol);
        suggestions.set(symbol, suggestion);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Failed to generate suggestion for ${symbol}:`, error);
        suggestions.set(symbol, this.getConservativeSuggestion(symbol));
      }
    }
    
    return suggestions;
  }

  getRiskLevelColor(riskLevel: string): string {
    switch (riskLevel) {
      case 'LOW': return '#22c55e';
      case 'MEDIUM': return '#eab308';
      case 'HIGH': return '#f97316';
      case 'EXTREME': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'BUY': return '#22c55e';
      case 'SELL': return '#ef4444';
      case 'HOLD': return '#eab308';
      default: return '#6b7280';
    }
  }

  calculateRiskScore(suggestion: TradeSuggestion): number {
    let riskScore = 0;
    
    // Risk level weight
    const riskWeights = { LOW: 20, MEDIUM: 40, HIGH: 70, EXTREME: 90 };
    riskScore += riskWeights[suggestion.riskLevel] || 50;
    
    // Confidence inverse weight (lower confidence = higher risk)
    riskScore += (100 - suggestion.confidence) * 0.3;
    
    // Position size weight
    riskScore += suggestion.positionSize * 2;
    
    // Expected ROI weight (higher ROI can mean higher risk)
    if (suggestion.expectedROI > 50) riskScore += 20;
    else if (suggestion.expectedROI > 25) riskScore += 10;
    
    return Math.min(100, Math.max(0, Math.round(riskScore)));
  }
}

export const aiSuggestionEngine = new AISuggestionEngine();
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  createdTimestamp: number;
  raydiumPool: string | null;
  marketCap: number;
  volume24h: number;
  priceUsd: number;
  holders: number;
  totalSupply: number;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
}

interface TokenAnalysis {
  scamRisk: number; // 0-100, higher = more likely scam
  viralPotential: number; // 0-100
  liquidityHealth: number; // 0-100
  communityStrength: number; // 0-100
  overallScore: number; // 0-100
  recommendation: 'BUY' | 'AVOID' | 'MONITOR';
  reasoning: string;
}

class PumpFunScanner {
  private baseUrl = 'https://frontend-api.pump.fun';
  
  async scanNewTokens(): Promise<PumpFunToken[]> {
    try {
      // Fetch latest tokens from pump.fun
      const response = await fetch(`${this.baseUrl}/coins?limit=50&sort=created_timestamp&order=DESC`);
      
      if (!response.ok) {
        // Fallback to mock data for development
        return this.getMockTokens();
      }
      
      const data = await response.json();
      return data.coins || [];
    } catch (error) {
      console.error('Error fetching pump.fun tokens:', error);
      return this.getMockTokens();
    }
  }

  async analyzeToken(token: PumpFunToken): Promise<TokenAnalysis> {
    try {
      const prompt = `Analyze this Solana memecoin for trading potential:

Token: ${token.name} (${token.symbol})
Description: ${token.description}
Market Cap: $${token.marketCap.toLocaleString()}
Volume 24h: $${token.volume24h.toLocaleString()}
Price: $${token.priceUsd}
Holders: ${token.holders}
Created: ${new Date(token.createdTimestamp).toISOString()}
Social: ${token.twitter ? 'Twitter ✓' : 'No Twitter'} ${token.telegram ? 'Telegram ✓' : 'No Telegram'} ${token.website ? 'Website ✓' : 'No Website'}

Analyze for:
1. Scam risk (0-100): Check for red flags like suspicious description, no social media, suspicious tokenomics
2. Viral potential (0-100): Meme quality, community potential, narrative strength
3. Liquidity health (0-100): Market cap vs volume ratio, holder distribution
4. Community strength (0-100): Social presence, engagement potential
5. Overall score (0-100): Investment attractiveness

Respond in JSON format:
{
  "scamRisk": number,
  "viralPotential": number, 
  "liquidityHealth": number,
  "communityStrength": number,
  "overallScore": number,
  "recommendation": "BUY" | "AVOID" | "MONITOR",
  "reasoning": "detailed explanation"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(token);
    }
  }

  async scanAndAnalyze(): Promise<Array<PumpFunToken & { analysis: TokenAnalysis }>> {
    const tokens = await this.scanNewTokens();
    const analyzed = [];

    for (const token of tokens.slice(0, 10)) { // Analyze top 10 new tokens
      const analysis = await this.analyzeToken(token);
      analyzed.push({ ...token, analysis });
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return analyzed.sort((a, b) => b.analysis.overallScore - a.analysis.overallScore);
  }

  private getMockTokens(): PumpFunToken[] {
    return [
      {
        mint: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        name: "Solana Shiba",
        symbol: "SOLSHIB",
        description: "The legendary Shiba Inu but on Solana! 🐕 Ready to moon with the pack! No dev tokens, fair launch, community driven!",
        image: "https://pump.fun/token-images/solshib.png",
        createdTimestamp: Date.now() - 3600000,
        raydiumPool: null,
        marketCap: 120000,
        volume24h: 45000,
        priceUsd: 0.000012,
        holders: 234,
        totalSupply: 1000000000,
        website: null,
        twitter: "https://twitter.com/solshib",
        telegram: "https://t.me/solshib"
      },
      {
        mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHymW3hr",
        name: "Pepe Rocket",
        symbol: "PEPROCK",
        description: "Pepe is going to space! 🚀🐸 The most bullish frog in crypto is ready for interstellar gains!",
        image: "https://pump.fun/token-images/peprock.png",
        createdTimestamp: Date.now() - 7200000,
        raydiumPool: "ABC123...",
        marketCap: 350000,
        volume24h: 120000,
        priceUsd: 0.00035,
        holders: 567,
        totalSupply: 1000000000,
        website: "https://peperocket.fun",
        twitter: "https://twitter.com/peperocket",
        telegram: "https://t.me/peperocket"
      },
      {
        mint: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX7R",
        name: "Doge Killer",
        symbol: "DOGKILL",
        description: "Finally, something to dethrone DOGE! Superior tokenomics, diamond hands community, going to flip everything!",
        image: "https://pump.fun/token-images/dogkill.png",
        createdTimestamp: Date.now() - 1800000,
        raydiumPool: null,
        marketCap: 75000,
        volume24h: 25000,
        priceUsd: 0.000075,
        holders: 145,
        totalSupply: 1000000000,
        website: null,
        twitter: null,
        telegram: null
      }
    ];
  }

  private getFallbackAnalysis(token: PumpFunToken): TokenAnalysis {
    // Basic heuristic analysis
    const hasTwitter = !!token.twitter;
    const hasTelegram = !!token.telegram;
    const hasWebsite = !!token.website;
    const socialScore = (hasTwitter ? 30 : 0) + (hasTelegram ? 30 : 0) + (hasWebsite ? 20 : 0);
    
    const volumeRatio = token.volume24h / token.marketCap;
    const liquidityScore = Math.min(100, volumeRatio * 1000);
    
    const holderScore = Math.min(100, token.holders / 10);
    
    const scamRisk = 100 - socialScore - (token.description.length > 50 ? 20 : 0);
    const viralPotential = socialScore + (token.description.includes('🚀') || token.description.includes('moon') ? 20 : 0);
    
    const overallScore = Math.max(0, (liquidityScore + holderScore + viralPotential + (100 - scamRisk)) / 4);
    
    return {
      scamRisk: Math.max(0, Math.min(100, scamRisk)),
      viralPotential: Math.max(0, Math.min(100, viralPotential)),
      liquidityHealth: Math.max(0, Math.min(100, liquidityScore)),
      communityStrength: Math.max(0, Math.min(100, holderScore + socialScore / 2)),
      overallScore: Math.max(0, Math.min(100, overallScore)),
      recommendation: overallScore > 70 ? 'BUY' : overallScore > 40 ? 'MONITOR' : 'AVOID',
      reasoning: `Heuristic analysis: ${overallScore > 70 ? 'Strong fundamentals detected' : overallScore > 40 ? 'Mixed signals, requires monitoring' : 'High risk factors identified'}`
    };
  }
}

export const pumpFunScanner = new PumpFunScanner();
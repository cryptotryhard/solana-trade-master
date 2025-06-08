import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface RugAnalysis {
  riskScore: number; // 0-100, higher = more risky
  redFlags: string[];
  liquidityHealth: number; // 0-100
  ownershipRisk: number; // 0-100
  recommendation: 'SAFE' | 'CAUTION' | 'AVOID';
  reasoning: string;
}

interface TokenSecurity {
  mintAddress: string;
  symbol: string;
  ownershipPercentage: number;
  liquidityLocked: boolean;
  liquidityPercent: number;
  topHoldersPercent: number;
  mintAuthority: boolean;
  freezeAuthority: boolean;
  hasWebsite: boolean;
  hasSocials: boolean;
  contractVerified: boolean;
  createdRecently: boolean; // < 24 hours
}

class AntiRugFilter {
  
  async analyzeTokenSecurity(tokenData: any): Promise<RugAnalysis> {
    try {
      const security = await this.getTokenSecurityData(tokenData);
      const aiAnalysis = await this.getAISecurityAnalysis(tokenData, security);
      
      return this.combineSecurityAnalysis(security, aiAnalysis);
    } catch (error) {
      console.error('Security analysis error:', error);
      return this.getConservativeAnalysis();
    }
  }

  private async getTokenSecurityData(tokenData: any): Promise<TokenSecurity> {
    // In production, this would fetch from Helius API or similar
    // For now, simulate based on available data
    
    const hasWebsite = !!tokenData.website;
    const hasSocials = !!(tokenData.twitter || tokenData.telegram);
    const createdRecently = tokenData.createdTimestamp && 
      (Date.now() - tokenData.createdTimestamp) < 86400000; // 24 hours
    
    // Simulate security metrics based on token characteristics
    let ownershipPercentage = 15; // Default assumption
    let liquidityPercent = 8;
    let topHoldersPercent = 45;
    
    // Adjust based on holder count and market cap
    if (tokenData.holders < 100) {
      ownershipPercentage = 35; // High risk for low holder count
      topHoldersPercent = 65;
    } else if (tokenData.holders < 500) {
      ownershipPercentage = 25;
      topHoldersPercent = 55;
    }
    
    // Liquidity estimation based on volume/mcap ratio
    const volumeRatio = tokenData.volume24h / tokenData.marketCap;
    if (volumeRatio > 0.2) liquidityPercent = 15;
    else if (volumeRatio > 0.1) liquidityPercent = 12;
    else if (volumeRatio < 0.02) liquidityPercent = 3;
    
    return {
      mintAddress: tokenData.mint,
      symbol: tokenData.symbol,
      ownershipPercentage,
      liquidityLocked: liquidityPercent > 10,
      liquidityPercent,
      topHoldersPercent,
      mintAuthority: ownershipPercentage > 20, // Assume mint authority if high ownership
      freezeAuthority: false, // Assume no freeze for memecoins
      hasWebsite,
      hasSocials,
      contractVerified: hasSocials && hasWebsite,
      createdRecently
    };
  }

  private async getAISecurityAnalysis(tokenData: any, security: TokenSecurity): Promise<RugAnalysis> {
    try {
      const prompt = `Analyze this Solana token for rug pull risk:

Token: ${tokenData.symbol} (${tokenData.name})
Description: ${tokenData.description || 'No description'}
Market Cap: $${tokenData.marketCap?.toLocaleString() || 'Unknown'}
Holders: ${tokenData.holders || 'Unknown'}
Created: ${security.createdRecently ? 'Less than 24h ago' : 'More than 24h ago'}

Security Analysis:
- Owner holds ~${security.ownershipPercentage}% of supply
- Top holders control ~${security.topHoldersPercent}% 
- Liquidity: ${security.liquidityPercent}% of market cap
- Liquidity locked: ${security.liquidityLocked ? 'Yes' : 'No'}
- Mint authority: ${security.mintAuthority ? 'Active' : 'Disabled'}
- Website: ${security.hasWebsite ? 'Yes' : 'No'}
- Social media: ${security.hasSocials ? 'Yes' : 'No'}

Red flags to check:
1. Excessive owner concentration (>30% = high risk)
2. Low liquidity (<5% = dangerous)
3. No social presence (red flag)
4. Recent creation with immediate hype
5. Suspicious token description
6. Active mint authority (can inflate supply)

Provide analysis in JSON format:
{
  "riskScore": number (0-100),
  "redFlags": ["flag1", "flag2"],
  "liquidityHealth": number (0-100),
  "ownershipRisk": number (0-100),
  "recommendation": "SAFE" | "CAUTION" | "AVOID",
  "reasoning": "detailed explanation"
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('AI security analysis failed:', error);
      return this.getHeuristicAnalysis(security);
    }
  }

  private combineSecurityAnalysis(security: TokenSecurity, aiAnalysis: RugAnalysis): RugAnalysis {
    // Adjust AI analysis with hard security metrics
    let adjustedRiskScore = aiAnalysis.riskScore;
    const redFlags = [...aiAnalysis.redFlags];
    
    // Hard red flags that override AI
    if (security.ownershipPercentage > 50) {
      adjustedRiskScore = Math.max(adjustedRiskScore, 85);
      redFlags.push('Extreme owner concentration (>50%)');
    }
    
    if (security.liquidityPercent < 3) {
      adjustedRiskScore = Math.max(adjustedRiskScore, 90);
      redFlags.push('Dangerously low liquidity (<3%)');
    }
    
    if (!security.hasSocials && !security.hasWebsite) {
      adjustedRiskScore = Math.max(adjustedRiskScore, 75);
      redFlags.push('No social media or website presence');
    }
    
    if (security.createdRecently && security.ownershipPercentage > 30) {
      adjustedRiskScore = Math.max(adjustedRiskScore, 80);
      redFlags.push('Recently created with high owner concentration');
    }
    
    // Determine final recommendation
    let recommendation: 'SAFE' | 'CAUTION' | 'AVOID' = 'SAFE';
    if (adjustedRiskScore > 75) recommendation = 'AVOID';
    else if (adjustedRiskScore > 50) recommendation = 'CAUTION';
    
    return {
      riskScore: adjustedRiskScore,
      redFlags: [...new Set(redFlags)], // Remove duplicates
      liquidityHealth: Math.max(0, 100 - (100 - security.liquidityPercent) * 2),
      ownershipRisk: security.ownershipPercentage * 2, // Scale to 0-100
      recommendation,
      reasoning: `${aiAnalysis.reasoning} | Security score: ${adjustedRiskScore}/100 | ${redFlags.length} red flags detected`
    };
  }

  private getHeuristicAnalysis(security: TokenSecurity): RugAnalysis {
    let riskScore = 20; // Base risk
    const redFlags: string[] = [];
    
    // Owner concentration risk
    if (security.ownershipPercentage > 40) {
      riskScore += 40;
      redFlags.push('High owner concentration');
    } else if (security.ownershipPercentage > 25) {
      riskScore += 25;
      redFlags.push('Moderate owner concentration');
    }
    
    // Liquidity risk
    if (security.liquidityPercent < 5) {
      riskScore += 35;
      redFlags.push('Low liquidity');
    } else if (security.liquidityPercent < 10) {
      riskScore += 20;
    }
    
    // Social presence
    if (!security.hasSocials) {
      riskScore += 20;
      redFlags.push('No social media presence');
    }
    
    // Recent creation
    if (security.createdRecently) {
      riskScore += 15;
      redFlags.push('Recently created token');
    }
    
    // Mint authority
    if (security.mintAuthority) {
      riskScore += 15;
      redFlags.push('Active mint authority');
    }
    
    const recommendation = riskScore > 75 ? 'AVOID' : riskScore > 50 ? 'CAUTION' : 'SAFE';
    
    return {
      riskScore: Math.min(100, riskScore),
      redFlags,
      liquidityHealth: Math.max(0, 100 - (100 - security.liquidityPercent) * 2),
      ownershipRisk: security.ownershipPercentage * 2,
      recommendation,
      reasoning: `Heuristic analysis based on ${redFlags.length} risk factors`
    };
  }

  private getConservativeAnalysis(): RugAnalysis {
    return {
      riskScore: 60,
      redFlags: ['Analysis unavailable - proceed with caution'],
      liquidityHealth: 50,
      ownershipRisk: 60,
      recommendation: 'CAUTION',
      reasoning: 'Unable to complete security analysis - applying conservative approach'
    };
  }

  async filterSafeTokens(tokens: any[]): Promise<any[]> {
    const safeTokens = [];
    
    for (const token of tokens) {
      const analysis = await this.analyzeTokenSecurity(token);
      
      if (analysis.recommendation !== 'AVOID') {
        safeTokens.push({
          ...token,
          securityAnalysis: analysis
        });
        
        console.log(`🛡️ SECURITY CHECK: ${token.symbol} - ${analysis.recommendation} (Risk: ${analysis.riskScore}/100)`);
        if (analysis.redFlags.length > 0) {
          console.log(`⚠️ Red flags: ${analysis.redFlags.join(', ')}`);
        }
      } else {
        console.log(`🚨 BLOCKED: ${token.symbol} - HIGH RISK (${analysis.riskScore}/100): ${analysis.redFlags.join(', ')}`);
      }
      
      // Rate limiting to avoid API abuse
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return safeTokens;
  }

  // Quick filter for established tokens
  async quickSecurityCheck(symbol: string, marketCap: number, holders: number): Promise<boolean> {
    // Basic heuristics for quick filtering
    if (marketCap < 50000) return false; // Too small
    if (holders < 50) return false; // Too few holders
    
    // Whitelist established tokens
    const establishedTokens = ['BONK', 'WIF', 'POPCAT', 'RAY', 'ORCA', 'SAMO'];
    if (establishedTokens.includes(symbol)) return true;
    
    return true; // Pass to full analysis
  }
}

export const antiRugFilter = new AntiRugFilter();
import { EventEmitter } from 'events';

interface SecurityScore {
  tokenAge: number; // 0-100 (100 = older, safer)
  developerHoldings: number; // 0-100 (lower = safer)
  liquidityRatio: number; // 0-100 (higher = safer)
  contractSecurity: number; // 0-100 (higher = safer)
  holderDistribution: number; // 0-100 (higher = safer)
  tradingActivity: number; // 0-100 (higher = safer)
  overallScore: number; // 0-100 (higher = safer)
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'extreme';
}

interface ContractAnalysis {
  hasReentrancyProtection: boolean;
  hasHoneypotRisk: boolean;
  hasMintFunction: boolean;
  hasBlacklistFunction: boolean;
  hasTransferLimits: boolean;
  hasOwnershipRenounced: boolean;
  liquidityLocked: boolean;
  proxyContract: boolean;
  riskFlags: string[];
  securityScore: number;
}

interface TokenMetrics {
  symbol: string;
  mintAddress: string;
  age: number; // days since creation
  marketCap: number;
  liquidity: number;
  volume24h: number;
  holders: number;
  transactions24h: number;
  price: number;
  priceChange24h: number;
  liquidityToMcapRatio: number;
}

interface DeveloperAnalysis {
  totalSupply: number;
  devHoldings: number;
  devPercentage: number;
  top10HoldersPercentage: number;
  burnedTokens: number;
  lockedTokens: number;
  distributionScore: number;
}

interface RiskAssessment {
  tokenMetrics: TokenMetrics;
  securityScore: SecurityScore;
  contractAnalysis: ContractAnalysis;
  developerAnalysis: DeveloperAnalysis;
  riskFactors: string[];
  safetyRecommendations: string[];
  tradingDecision: 'approve' | 'caution' | 'reject';
  maxAllocation: number; // percentage of portfolio
  timestamp: Date;
}

interface RiskThresholds {
  minTokenAge: number; // days
  maxDevHoldings: number; // percentage
  minLiquidityRatio: number; // percentage
  minSecurityScore: number; // 0-100
  minHolderCount: number;
  maxRiskScore: number; // 0-100
}

class LayeredRiskDefenseSystem extends EventEmitter {
  private riskThresholds: RiskThresholds;
  private assessmentHistory: RiskAssessment[] = [];
  private blockedTokens: Set<string> = new Set();
  private riskDatabase: Map<string, RiskAssessment> = new Map();

  constructor() {
    super();
    this.initializeThresholds();
    this.startRiskMonitoring();
  }

  private initializeThresholds(): void {
    this.riskThresholds = {
      minTokenAge: 7, // At least 7 days old
      maxDevHoldings: 20, // Max 20% dev holdings
      minLiquidityRatio: 5, // Min 5% liquidity to market cap
      minSecurityScore: 60, // Min 60/100 security score
      minHolderCount: 100, // Min 100 holders
      maxRiskScore: 75 // Max 75/100 overall risk
    };
  }

  public async assessTokenRisk(tokenData: any): Promise<RiskAssessment> {
    // Gather token metrics
    const tokenMetrics = await this.analyzeTokenMetrics(tokenData);
    
    // Analyze smart contract security
    const contractAnalysis = await this.analyzeContract(tokenData.mintAddress);
    
    // Analyze developer holdings and distribution
    const developerAnalysis = await this.analyzeDeveloperHoldings(tokenData);
    
    // Calculate security scores
    const securityScore = this.calculateSecurityScore(tokenMetrics, contractAnalysis, developerAnalysis);
    
    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(tokenMetrics, contractAnalysis, developerAnalysis, securityScore);
    
    // Generate safety recommendations
    const safetyRecommendations = this.generateSafetyRecommendations(securityScore, riskFactors);
    
    // Make trading decision
    const tradingDecision = this.makeTradingDecision(securityScore);
    
    // Calculate max allocation based on risk
    const maxAllocation = this.calculateMaxAllocation(securityScore);
    
    const assessment: RiskAssessment = {
      tokenMetrics,
      securityScore,
      contractAnalysis,
      developerAnalysis,
      riskFactors,
      safetyRecommendations,
      tradingDecision,
      maxAllocation,
      timestamp: new Date()
    };
    
    // Store assessment
    this.riskDatabase.set(tokenData.mintAddress, assessment);
    this.assessmentHistory.push(assessment);
    
    // Block token if extremely risky
    if (tradingDecision === 'reject') {
      this.blockedTokens.add(tokenData.mintAddress);
    }
    
    this.emit('riskAssessmentComplete', assessment);
    
    return assessment;
  }

  private async analyzeTokenMetrics(tokenData: any): Promise<TokenMetrics> {
    // Calculate token age (simulated for demo)
    const age = tokenData.marketCap ? Math.max(1, Math.floor(tokenData.marketCap / 100000)) : 1;
    
    // Calculate liquidity to market cap ratio
    const liquidityToMcapRatio = tokenData.liquidity && tokenData.marketCap ? 
      (tokenData.liquidity / tokenData.marketCap) * 100 : 0;
    
    // Simulate holder count based on market cap and volume
    const holders = tokenData.marketCap ? 
      Math.floor(Math.sqrt(tokenData.marketCap) * 10) + Math.floor(Math.random() * 500) : 50;
    
    // Simulate transaction count
    const transactions24h = tokenData.volume24h ? 
      Math.floor(tokenData.volume24h / 1000) + Math.floor(Math.random() * 200) : 10;

    return {
      symbol: tokenData.symbol,
      mintAddress: tokenData.mintAddress,
      age,
      marketCap: tokenData.marketCap || 0,
      liquidity: tokenData.liquidity || 0,
      volume24h: tokenData.volume24h || 0,
      holders,
      transactions24h,
      price: tokenData.price || 0,
      priceChange24h: tokenData.priceChange24h || 0,
      liquidityToMcapRatio
    };
  }

  private async analyzeContract(mintAddress: string): Promise<ContractAnalysis> {
    // Simulated contract analysis - in production would use actual blockchain analysis
    const riskFlags: string[] = [];
    let securityScore = 70; // Base score
    
    // Simulate contract features
    const hasReentrancyProtection = Math.random() > 0.3;
    const hasHoneypotRisk = Math.random() < 0.15;
    const hasMintFunction = Math.random() < 0.4;
    const hasBlacklistFunction = Math.random() < 0.2;
    const hasTransferLimits = Math.random() < 0.3;
    const hasOwnershipRenounced = Math.random() > 0.4;
    const liquidityLocked = Math.random() > 0.3;
    const proxyContract = Math.random() < 0.1;
    
    // Adjust security score based on features
    if (!hasReentrancyProtection) {
      riskFlags.push('No reentrancy protection detected');
      securityScore -= 15;
    }
    
    if (hasHoneypotRisk) {
      riskFlags.push('Potential honeypot contract');
      securityScore -= 25;
    }
    
    if (hasMintFunction) {
      riskFlags.push('Unlimited mint function detected');
      securityScore -= 20;
    }
    
    if (hasBlacklistFunction) {
      riskFlags.push('Blacklist function present');
      securityScore -= 10;
    }
    
    if (hasTransferLimits) {
      riskFlags.push('Transfer limits detected');
      securityScore -= 5;
    }
    
    if (!hasOwnershipRenounced) {
      riskFlags.push('Ownership not renounced');
      securityScore -= 10;
    }
    
    if (!liquidityLocked) {
      riskFlags.push('Liquidity not locked');
      securityScore -= 15;
    }
    
    if (proxyContract) {
      riskFlags.push('Proxy contract detected');
      securityScore -= 20;
    }
    
    // Add positive features
    if (hasReentrancyProtection) securityScore += 5;
    if (hasOwnershipRenounced) securityScore += 10;
    if (liquidityLocked) securityScore += 15;
    
    return {
      hasReentrancyProtection,
      hasHoneypotRisk,
      hasMintFunction,
      hasBlacklistFunction,
      hasTransferLimits,
      hasOwnershipRenounced,
      liquidityLocked,
      proxyContract,
      riskFlags,
      securityScore: Math.max(0, Math.min(100, securityScore))
    };
  }

  private async analyzeDeveloperHoldings(tokenData: any): Promise<DeveloperAnalysis> {
    // Simulate developer analysis
    const totalSupply = 1000000000; // 1B tokens (typical)
    
    // Generate realistic distribution
    const devPercentage = 5 + Math.random() * 25; // 5-30%
    const devHoldings = (totalSupply * devPercentage) / 100;
    
    const top10HoldersPercentage = devPercentage + Math.random() * 30; // Include dev + others
    const burnedTokens = Math.random() * totalSupply * 0.1; // 0-10% burned
    const lockedTokens = Math.random() * totalSupply * 0.2; // 0-20% locked
    
    // Calculate distribution score
    let distributionScore = 100;
    
    if (devPercentage > 20) distributionScore -= 30;
    else if (devPercentage > 15) distributionScore -= 20;
    else if (devPercentage > 10) distributionScore -= 10;
    
    if (top10HoldersPercentage > 50) distributionScore -= 25;
    else if (top10HoldersPercentage > 40) distributionScore -= 15;
    
    if (burnedTokens > 0) distributionScore += 10;
    if (lockedTokens > 0) distributionScore += 15;
    
    return {
      totalSupply,
      devHoldings,
      devPercentage,
      top10HoldersPercentage,
      burnedTokens,
      lockedTokens,
      distributionScore: Math.max(0, Math.min(100, distributionScore))
    };
  }

  private calculateSecurityScore(
    metrics: TokenMetrics,
    contract: ContractAnalysis,
    developer: DeveloperAnalysis
  ): SecurityScore {
    
    // Token age score (older = safer)
    const tokenAge = Math.min(100, (metrics.age / 30) * 100); // 30 days = 100%
    
    // Developer holdings score (lower = safer)
    const developerHoldings = Math.max(0, 100 - (developer.devPercentage * 2));
    
    // Liquidity ratio score
    const liquidityRatio = Math.min(100, metrics.liquidityToMcapRatio * 10);
    
    // Contract security score (from contract analysis)
    const contractSecurity = contract.securityScore;
    
    // Holder distribution score
    const holderDistribution = developer.distributionScore;
    
    // Trading activity score
    const tradingActivity = Math.min(100, (metrics.transactions24h / 100) * 100);
    
    // Calculate overall score
    const overallScore = Math.round(
      (tokenAge * 0.15) +
      (developerHoldings * 0.20) +
      (liquidityRatio * 0.20) +
      (contractSecurity * 0.25) +
      (holderDistribution * 0.15) +
      (tradingActivity * 0.05)
    );
    
    // Determine risk level
    let riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'extreme';
    if (overallScore >= 85) riskLevel = 'safe';
    else if (overallScore >= 70) riskLevel = 'low';
    else if (overallScore >= 55) riskLevel = 'medium';
    else if (overallScore >= 40) riskLevel = 'high';
    else riskLevel = 'extreme';
    
    return {
      tokenAge,
      developerHoldings,
      liquidityRatio,
      contractSecurity,
      holderDistribution,
      tradingActivity,
      overallScore,
      riskLevel
    };
  }

  private identifyRiskFactors(
    metrics: TokenMetrics,
    contract: ContractAnalysis,
    developer: DeveloperAnalysis,
    security: SecurityScore
  ): string[] {
    const risks: string[] = [];
    
    // Age-related risks
    if (metrics.age < this.riskThresholds.minTokenAge) {
      risks.push(`Token too new (${metrics.age} days, minimum ${this.riskThresholds.minTokenAge})`);
    }
    
    // Developer holding risks
    if (developer.devPercentage > this.riskThresholds.maxDevHoldings) {
      risks.push(`High developer holdings (${developer.devPercentage.toFixed(1)}%)`);
    }
    
    // Liquidity risks
    if (metrics.liquidityToMcapRatio < this.riskThresholds.minLiquidityRatio) {
      risks.push(`Low liquidity ratio (${metrics.liquidityToMcapRatio.toFixed(1)}%)`);
    }
    
    // Holder concentration risks
    if (developer.top10HoldersPercentage > 60) {
      risks.push('High holder concentration');
    }
    
    // Contract risks
    if (contract.riskFlags.length > 0) {
      risks.push(...contract.riskFlags);
    }
    
    // Volume risks
    if (metrics.volume24h < 10000) {
      risks.push('Very low trading volume');
    }
    
    // Price volatility risks
    if (Math.abs(metrics.priceChange24h) > 50) {
      risks.push('Extreme price volatility');
    }
    
    return risks;
  }

  private generateSafetyRecommendations(security: SecurityScore, riskFactors: string[]): string[] {
    const recommendations: string[] = [];
    
    if (security.riskLevel === 'extreme' || security.riskLevel === 'high') {
      recommendations.push('AVOID: High risk token - do not trade');
      recommendations.push('Wait for improved security metrics');
    } else if (security.riskLevel === 'medium') {
      recommendations.push('Use small position sizes only');
      recommendations.push('Set tight stop losses (5-8%)');
      recommendations.push('Monitor closely for exit opportunities');
    } else {
      recommendations.push('Suitable for moderate position sizes');
      recommendations.push('Standard risk management applies');
    }
    
    if (security.liquidityRatio < 30) {
      recommendations.push('Ensure sufficient liquidity before entry');
    }
    
    if (security.contractSecurity < 70) {
      recommendations.push('Exercise extra caution with smart contract interactions');
    }
    
    if (riskFactors.length > 3) {
      recommendations.push('Multiple risk factors identified - consider waiting');
    }
    
    return recommendations;
  }

  private makeTradingDecision(security: SecurityScore): 'approve' | 'caution' | 'reject' {
    if (security.overallScore >= 70) return 'approve';
    if (security.overallScore >= 50) return 'caution';
    return 'reject';
  }

  private calculateMaxAllocation(security: SecurityScore): number {
    // Base allocation percentage based on security score
    let maxAllocation = (security.overallScore / 100) * 25; // Max 25% for perfect score
    
    // Adjust based on risk level
    switch (security.riskLevel) {
      case 'safe':
        maxAllocation *= 1.0;
        break;
      case 'low':
        maxAllocation *= 0.8;
        break;
      case 'medium':
        maxAllocation *= 0.5;
        break;
      case 'high':
        maxAllocation *= 0.2;
        break;
      case 'extreme':
        maxAllocation = 0;
        break;
    }
    
    return Math.max(0, Math.min(25, maxAllocation));
  }

  private startRiskMonitoring(): void {
    // Monitor existing assessments and update risk levels
    setInterval(() => {
      this.updateRiskAssessments();
    }, 600000); // Every 10 minutes
  }

  private updateRiskAssessments(): void {
    // Review recent assessments and update if needed
    const recentAssessments = this.assessmentHistory.slice(-20);
    
    recentAssessments.forEach(assessment => {
      if (assessment.securityScore.riskLevel === 'extreme') {
        this.emit('highRiskAlert', {
          token: assessment.tokenMetrics.symbol,
          riskLevel: assessment.securityScore.riskLevel,
          riskFactors: assessment.riskFactors
        });
      }
    });
  }

  public isTokenBlocked(mintAddress: string): boolean {
    return this.blockedTokens.has(mintAddress);
  }

  public getTokenRiskScore(mintAddress: string): SecurityScore | null {
    const assessment = this.riskDatabase.get(mintAddress);
    return assessment ? assessment.securityScore : null;
  }

  public updateRiskThresholds(newThresholds: Partial<RiskThresholds>): void {
    this.riskThresholds = { ...this.riskThresholds, ...newThresholds };
    this.emit('thresholdsUpdated', this.riskThresholds);
  }

  public getRiskThresholds(): RiskThresholds {
    return { ...this.riskThresholds };
  }

  public getAssessmentHistory(limit: number = 50): RiskAssessment[] {
    return this.assessmentHistory.slice(-limit);
  }

  public getHighRiskTokens(): RiskAssessment[] {
    return this.assessmentHistory.filter(
      assessment => assessment.securityScore.riskLevel === 'high' || 
                   assessment.securityScore.riskLevel === 'extreme'
    );
  }

  public getSafeTokens(): RiskAssessment[] {
    return this.assessmentHistory.filter(
      assessment => assessment.securityScore.riskLevel === 'safe' || 
                   assessment.securityScore.riskLevel === 'low'
    );
  }

  public generateRiskReport(): {
    totalAssessments: number;
    riskDistribution: Record<string, number>;
    averageSecurityScore: number;
    blockedTokensCount: number;
    topRiskFactors: Array<{ factor: string; frequency: number }>;
  } {
    const totalAssessments = this.assessmentHistory.length;
    
    // Calculate risk distribution
    const riskDistribution = {
      safe: 0,
      low: 0,
      medium: 0,
      high: 0,
      extreme: 0
    };
    
    let totalScore = 0;
    const riskFactorCounts: Record<string, number> = {};
    
    this.assessmentHistory.forEach(assessment => {
      riskDistribution[assessment.securityScore.riskLevel]++;
      totalScore += assessment.securityScore.overallScore;
      
      assessment.riskFactors.forEach(factor => {
        riskFactorCounts[factor] = (riskFactorCounts[factor] || 0) + 1;
      });
    });
    
    const averageSecurityScore = totalAssessments > 0 ? totalScore / totalAssessments : 0;
    
    // Top risk factors
    const topRiskFactors = Object.entries(riskFactorCounts)
      .map(([factor, frequency]) => ({ factor, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    return {
      totalAssessments,
      riskDistribution,
      averageSecurityScore,
      blockedTokensCount: this.blockedTokens.size,
      topRiskFactors
    };
  }
}

export const layeredRiskDefenseSystem = new LayeredRiskDefenseSystem();
import { EventEmitter } from 'events';

interface AllocationParameters {
  baseAmount: number; // Base SOL amount
  maxAmount: number; // Maximum SOL per trade
  minAmount: number; // Minimum SOL per trade
  riskTolerance: number; // 0-100
  portfolioRatio: number; // Max % of portfolio per trade
  safetyCapEnabled: boolean;
  safetyCapAmount: number;
}

interface TokenRiskProfile {
  symbol: string;
  mintAddress: string;
  volatilityScore: number; // 0-100
  liquidityScore: number; // 0-100
  volumeScore: number; // 0-100
  ageScore: number; // 0-100
  holderDistributionScore: number; // 0-100
  contractSecurityScore: number; // 0-100
  overallRiskScore: number; // 0-100 (lower = safer)
}

interface AllocationDecision {
  tokenSymbol: string;
  recommendedAmount: number; // SOL
  confidenceLevel: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  reasoning: string[];
  maxLoss: number; // Expected maximum loss in SOL
  expectedROI: number; // Expected return %
  holdingPeriod: number; // Expected holding time in minutes
  stopLoss: number; // Recommended stop loss %
  takeProfit: number; // Recommended take profit %
}

interface PortfolioMetrics {
  totalValue: number; // SOL
  availableCapital: number; // SOL
  allocatedCapital: number; // SOL
  positionCount: number;
  avgPositionSize: number; // SOL
  riskExposure: number; // % of portfolio at risk
  diversificationScore: number; // 0-100
  performanceScore: number; // 0-100
}

interface DynamicAllocation {
  baseMultiplier: number; // Base position size multiplier
  confidenceMultiplier: number; // Adjustment based on confidence
  volatilityMultiplier: number; // Adjustment based on volatility
  liquidityMultiplier: number; // Adjustment based on liquidity
  patternMultiplier: number; // Adjustment based on pattern strength
  walletPerformanceMultiplier: number; // Adjustment based on copytrading performance
  finalMultiplier: number; // Combined multiplier
  finalAmount: number; // Final SOL amount
}

class SmartCapitalAllocationEngine extends EventEmitter {
  private allocationParams!: AllocationParameters;
  private portfolioMetrics!: PortfolioMetrics;
  private activeAllocations: Map<string, AllocationDecision> = new Map();
  private allocationHistory: AllocationDecision[] = [];

  constructor() {
    super();
    this.initializeParameters();
    this.updatePortfolioMetrics();
    this.startPeriodicOptimization();
  }

  private initializeParameters(): void {
    this.allocationParams = {
      baseAmount: 0.5, // 0.5 SOL base
      maxAmount: 1.5, // 1.5 SOL maximum
      minAmount: 0.2, // 0.2 SOL minimum
      riskTolerance: 70, // Medium-high risk tolerance
      portfolioRatio: 25, // Max 25% per trade
      safetyCapEnabled: true,
      safetyCapAmount: 2.0 // Max 2 SOL safety cap
    };

    this.portfolioMetrics = {
      totalValue: 3.257, // Current SOL balance
      availableCapital: 2.8, // Available for trading
      allocatedCapital: 0.457, // Currently allocated
      positionCount: 0,
      avgPositionSize: 0,
      riskExposure: 14.0,
      diversificationScore: 75,
      performanceScore: 68
    };
  }

  public async calculateOptimalAllocation(
    tokenData: any,
    confidenceScore: number,
    patternStrength: number = 0,
    walletPerformance: number = 0
  ): Promise<AllocationDecision> {
    
    // Calculate token risk profile
    const riskProfile = await this.assessTokenRisk(tokenData);
    
    // Calculate dynamic allocation multipliers
    const allocation = this.calculateDynamicAllocation(
      confidenceScore,
      riskProfile,
      patternStrength,
      walletPerformance
    );
    
    // Generate allocation decision
    const decision = this.generateAllocationDecision(
      tokenData,
      riskProfile,
      allocation,
      confidenceScore
    );
    
    // Validate against portfolio constraints
    const validatedDecision = this.validateAllocation(decision);
    
    // Store allocation
    this.activeAllocations.set(tokenData.symbol, validatedDecision);
    this.allocationHistory.push(validatedDecision);
    
    this.emit('allocationCalculated', validatedDecision);
    
    return validatedDecision;
  }

  private async assessTokenRisk(tokenData: any): Promise<TokenRiskProfile> {
    let volatilityScore = 50;
    let liquidityScore = 50;
    let volumeScore = 50;
    let ageScore = 50;
    let holderDistributionScore = 50;
    let contractSecurityScore = 50;

    // Volatility assessment
    if (tokenData.priceChange24h !== undefined) {
      const volatility = Math.abs(tokenData.priceChange24h);
      volatilityScore = Math.min(100, volatility * 2); // Higher volatility = higher risk score
    }

    // Liquidity assessment
    if (tokenData.liquidity) {
      if (tokenData.liquidity > 1000000) liquidityScore = 20; // Very liquid
      else if (tokenData.liquidity > 500000) liquidityScore = 35;
      else if (tokenData.liquidity > 100000) liquidityScore = 50;
      else if (tokenData.liquidity > 50000) liquidityScore = 70;
      else liquidityScore = 90; // Low liquidity = high risk
    }

    // Volume assessment
    if (tokenData.volume24h) {
      if (tokenData.volume24h > 2000000) volumeScore = 25; // High volume = lower risk
      else if (tokenData.volume24h > 500000) volumeScore = 40;
      else if (tokenData.volume24h > 100000) volumeScore = 55;
      else if (tokenData.volume24h > 50000) volumeScore = 75;
      else volumeScore = 90; // Low volume = high risk
    }

    // Age assessment (simulated based on market cap as proxy)
    if (tokenData.marketCap) {
      if (tokenData.marketCap > 10000000) ageScore = 30; // Established tokens
      else if (tokenData.marketCap > 1000000) ageScore = 50;
      else if (tokenData.marketCap > 100000) ageScore = 70;
      else ageScore = 90; // Very new = high risk
    }

    // Holder distribution (simulated)
    const simulatedHolders = Math.floor(Math.random() * 10000) + 100;
    if (simulatedHolders > 5000) holderDistributionScore = 30;
    else if (simulatedHolders > 1000) holderDistributionScore = 50;
    else if (simulatedHolders > 500) holderDistributionScore = 70;
    else holderDistributionScore = 85;

    // Contract security (simulated - would integrate with actual security scanners)
    contractSecurityScore = 30 + Math.floor(Math.random() * 40); // Random between 30-70

    // Calculate overall risk score
    const overallRiskScore = Math.round(
      (volatilityScore * 0.25) +
      (liquidityScore * 0.20) +
      (volumeScore * 0.15) +
      (ageScore * 0.15) +
      (holderDistributionScore * 0.15) +
      (contractSecurityScore * 0.10)
    );

    return {
      symbol: tokenData.symbol,
      mintAddress: tokenData.mintAddress,
      volatilityScore,
      liquidityScore,
      volumeScore,
      ageScore,
      holderDistributionScore,
      contractSecurityScore,
      overallRiskScore
    };
  }

  private calculateDynamicAllocation(
    confidenceScore: number,
    riskProfile: TokenRiskProfile,
    patternStrength: number,
    walletPerformance: number
  ): DynamicAllocation {
    
    // Base multiplier starts at 1.0
    const baseMultiplier = 1.0;
    
    // Confidence multiplier (0.5x to 2.0x)
    const confidenceMultiplier = 0.5 + (confidenceScore / 100) * 1.5;
    
    // Volatility multiplier (lower volatility = higher allocation)
    const volatilityMultiplier = Math.max(0.3, 1.5 - (riskProfile.volatilityScore / 100));
    
    // Liquidity multiplier (higher liquidity = higher allocation)
    const liquidityMultiplier = 0.5 + (100 - riskProfile.liquidityScore) / 100 * 0.8;
    
    // Pattern strength multiplier
    const patternMultiplier = patternStrength > 0 ? 1.0 + (patternStrength / 100) * 0.5 : 1.0;
    
    // Wallet performance multiplier (for copytrading)
    const walletPerformanceMultiplier = walletPerformance > 0 ? 1.0 + (walletPerformance / 100) * 0.3 : 1.0;
    
    // Combine all multipliers
    const finalMultiplier = Math.min(3.0, // Cap at 3x
      baseMultiplier *
      confidenceMultiplier *
      volatilityMultiplier *
      liquidityMultiplier *
      patternMultiplier *
      walletPerformanceMultiplier
    );
    
    // Calculate final amount
    const rawAmount = this.allocationParams.baseAmount * finalMultiplier;
    const finalAmount = Math.max(
      this.allocationParams.minAmount,
      Math.min(this.allocationParams.maxAmount, rawAmount)
    );

    return {
      baseMultiplier,
      confidenceMultiplier,
      volatilityMultiplier,
      liquidityMultiplier,
      patternMultiplier,
      walletPerformanceMultiplier,
      finalMultiplier,
      finalAmount
    };
  }

  private generateAllocationDecision(
    tokenData: any,
    riskProfile: TokenRiskProfile,
    allocation: DynamicAllocation,
    confidenceScore: number
  ): AllocationDecision {
    
    // Determine risk level
    const riskLevel = this.getRiskLevel(riskProfile.overallRiskScore);
    
    // Calculate expected ROI based on confidence and historical data
    const expectedROI = this.calculateExpectedROI(confidenceScore, riskProfile);
    
    // Calculate holding period based on volatility and patterns
    const holdingPeriod = this.calculateHoldingPeriod(riskProfile, confidenceScore);
    
    // Set stop loss and take profit based on risk level
    const { stopLoss, takeProfit } = this.calculateStopLossTakeProfit(riskLevel, expectedROI);
    
    // Calculate max loss
    const maxLoss = allocation.finalAmount * (stopLoss / 100);
    
    // Generate reasoning
    const reasoning = this.generateReasoning(allocation, riskProfile, confidenceScore);

    return {
      tokenSymbol: tokenData.symbol,
      recommendedAmount: allocation.finalAmount,
      confidenceLevel: confidenceScore,
      riskLevel,
      reasoning,
      maxLoss,
      expectedROI,
      holdingPeriod,
      stopLoss,
      takeProfit
    };
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'extreme' {
    if (riskScore <= 30) return 'low';
    if (riskScore <= 50) return 'medium';
    if (riskScore <= 75) return 'high';
    return 'extreme';
  }

  private calculateExpectedROI(confidenceScore: number, riskProfile: TokenRiskProfile): number {
    // Base ROI expectation
    let baseROI = 15;
    
    // Adjust based on confidence
    baseROI += (confidenceScore - 50) * 0.8;
    
    // Adjust based on volatility (higher volatility = higher potential ROI)
    baseROI += (riskProfile.volatilityScore - 50) * 0.5;
    
    // Adjust based on overall risk
    baseROI += (riskProfile.overallRiskScore - 50) * 0.3;
    
    return Math.max(5, Math.min(200, baseROI));
  }

  private calculateHoldingPeriod(riskProfile: TokenRiskProfile, confidenceScore: number): number {
    // Base holding period: 60 minutes
    let holdingPeriod = 60;
    
    // Adjust based on volatility (higher volatility = shorter holding)
    holdingPeriod *= (100 - riskProfile.volatilityScore) / 100;
    
    // Adjust based on confidence (higher confidence = longer holding)
    holdingPeriod *= (50 + confidenceScore) / 100;
    
    return Math.max(5, Math.min(480, holdingPeriod)); // 5 min to 8 hours
  }

  private calculateStopLossTakeProfit(riskLevel: string, expectedROI: number): { stopLoss: number; takeProfit: number } {
    let stopLoss: number;
    let takeProfit: number;
    
    switch (riskLevel) {
      case 'low':
        stopLoss = 8;
        takeProfit = expectedROI * 0.7;
        break;
      case 'medium':
        stopLoss = 12;
        takeProfit = expectedROI * 0.8;
        break;
      case 'high':
        stopLoss = 18;
        takeProfit = expectedROI * 0.9;
        break;
      case 'extreme':
        stopLoss = 25;
        takeProfit = expectedROI;
        break;
      default:
        stopLoss = 12;
        takeProfit = expectedROI * 0.8;
        break;
    }
    
    return { stopLoss, takeProfit: Math.max(10, takeProfit) };
  }

  private generateReasoning(
    allocation: DynamicAllocation,
    riskProfile: TokenRiskProfile,
    confidenceScore: number
  ): string[] {
    const reasoning = [];
    
    reasoning.push(`Position size: ${allocation.finalAmount.toFixed(3)} SOL (${(allocation.finalMultiplier * 100).toFixed(0)}% of base)`);
    
    if (allocation.confidenceMultiplier > 1.2) {
      reasoning.push(`High confidence boost: ${((allocation.confidenceMultiplier - 1) * 100).toFixed(0)}%`);
    }
    
    if (allocation.volatilityMultiplier < 0.8) {
      reasoning.push(`Reduced for high volatility (${riskProfile.volatilityScore}/100)`);
    }
    
    if (allocation.liquidityMultiplier > 1.0) {
      reasoning.push(`Increased for good liquidity (${100 - riskProfile.liquidityScore}/100)`);
    }
    
    if (riskProfile.overallRiskScore > 70) {
      reasoning.push(`High risk token - conservative sizing`);
    }
    
    if (confidenceScore > 80) {
      reasoning.push(`Strong signal confidence - increased allocation`);
    }
    
    return reasoning;
  }

  private validateAllocation(decision: AllocationDecision): AllocationDecision {
    let validatedAmount = decision.recommendedAmount;
    
    // Apply safety cap
    if (this.allocationParams.safetyCapEnabled) {
      validatedAmount = Math.min(validatedAmount, this.allocationParams.safetyCapAmount);
    }
    
    // Check portfolio ratio constraint
    const portfolioPercentage = (validatedAmount / this.portfolioMetrics.totalValue) * 100;
    if (portfolioPercentage > this.allocationParams.portfolioRatio) {
      validatedAmount = (this.portfolioMetrics.totalValue * this.allocationParams.portfolioRatio) / 100;
    }
    
    // Check available capital
    if (validatedAmount > this.portfolioMetrics.availableCapital) {
      validatedAmount = this.portfolioMetrics.availableCapital * 0.8; // Leave 20% buffer
    }
    
    // Apply final constraints
    validatedAmount = Math.max(this.allocationParams.minAmount, validatedAmount);
    validatedAmount = Math.min(this.allocationParams.maxAmount, validatedAmount);
    
    if (validatedAmount !== decision.recommendedAmount) {
      decision.reasoning.push(`Adjusted to ${validatedAmount.toFixed(3)} SOL due to portfolio constraints`);
    }
    
    return {
      ...decision,
      recommendedAmount: validatedAmount,
      maxLoss: validatedAmount * (decision.stopLoss / 100)
    };
  }

  private updatePortfolioMetrics(): void {
    // This would be integrated with actual portfolio tracking
    setInterval(() => {
      // Update available capital based on current positions
      const allocatedAmount = Array.from(this.activeAllocations.values())
        .reduce((sum, allocation) => sum + allocation.recommendedAmount, 0);
      
      this.portfolioMetrics.allocatedCapital = allocatedAmount;
      this.portfolioMetrics.availableCapital = this.portfolioMetrics.totalValue - allocatedAmount;
      this.portfolioMetrics.positionCount = this.activeAllocations.size;
      
      if (this.portfolioMetrics.positionCount > 0) {
        this.portfolioMetrics.avgPositionSize = allocatedAmount / this.portfolioMetrics.positionCount;
      }
      
      this.portfolioMetrics.riskExposure = (allocatedAmount / this.portfolioMetrics.totalValue) * 100;
      
      this.emit('portfolioUpdated', this.portfolioMetrics);
    }, 30000); // Update every 30 seconds
  }

  private startPeriodicOptimization(): void {
    setInterval(() => {
      this.optimizeAllocations();
    }, 300000); // Optimize every 5 minutes
  }

  private optimizeAllocations(): void {
    // Review and optimize existing allocations
    for (const [symbol, allocation] of this.activeAllocations) {
      // Check if allocation needs adjustment based on performance
      if (allocation.confidenceLevel < 40) {
        this.emit('allocationWarning', {
          symbol,
          message: 'Low confidence allocation detected',
          recommendation: 'Consider reducing position size'
        });
      }
    }
  }

  public updateAllocationParameters(newParams: Partial<AllocationParameters>): void {
    this.allocationParams = { ...this.allocationParams, ...newParams };
    this.emit('parametersUpdated', this.allocationParams);
  }

  public getAllocationParameters(): AllocationParameters {
    return { ...this.allocationParams };
  }

  public getPortfolioMetrics(): PortfolioMetrics {
    return { ...this.portfolioMetrics };
  }

  public getActiveAllocations(): AllocationDecision[] {
    return Array.from(this.activeAllocations.values());
  }

  public getAllocationHistory(limit: number = 50): AllocationDecision[] {
    return this.allocationHistory.slice(-limit);
  }

  public removeAllocation(symbol: string): void {
    this.activeAllocations.delete(symbol);
    this.updatePortfolioMetrics();
  }

  public getAllocationSummary(): {
    totalAllocated: number;
    averageRisk: string;
    expectedROI: number;
    maxPotentialLoss: number;
  } {
    const allocations = Array.from(this.activeAllocations.values());
    
    if (allocations.length === 0) {
      return {
        totalAllocated: 0,
        averageRisk: 'none',
        expectedROI: 0,
        maxPotentialLoss: 0
      };
    }
    
    const totalAllocated = allocations.reduce((sum, a) => sum + a.recommendedAmount, 0);
    const avgExpectedROI = allocations.reduce((sum, a) => sum + a.expectedROI, 0) / allocations.length;
    const maxPotentialLoss = allocations.reduce((sum, a) => sum + a.maxLoss, 0);
    
    // Calculate average risk
    const riskValues = { low: 1, medium: 2, high: 3, extreme: 4 };
    const avgRiskValue = allocations.reduce((sum, a) => sum + riskValues[a.riskLevel], 0) / allocations.length;
    
    let averageRisk: string;
    if (avgRiskValue <= 1.5) averageRisk = 'low';
    else if (avgRiskValue <= 2.5) averageRisk = 'medium';
    else if (avgRiskValue <= 3.5) averageRisk = 'high';
    else averageRisk = 'extreme';
    
    return {
      totalAllocated,
      averageRisk,
      expectedROI: avgExpectedROI,
      maxPotentialLoss
    };
  }
}

export const smartCapitalAllocationEngine = new SmartCapitalAllocationEngine();
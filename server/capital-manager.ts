/**
 * CAPITAL MANAGER - Dynamic Position Sizing & Portfolio Optimization
 * Calculates optimal position sizes based on total portfolio value
 */

import fs from 'fs/promises';
import path from 'path';

interface PortfolioMetrics {
  totalSOL: number;
  totalValueUSD: number;
  activePositions: number;
  capitalUsedPercent: number;
  dynamicPositionSize: number;
  maxAllowedPositions: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  lastUpdated: number;
}

interface PositionData {
  id: string;
  status: string;
  entryAmount: number;
  currentValue?: number;
  pnl?: number;
}

export class CapitalManager {
  private metrics: PortfolioMetrics;
  private updateInterval: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly BASE_POSITION_PERCENT = 2.0; // 2% of portfolio per position
  private readonly MIN_POSITION_SIZE = 0.01; // Minimum 0.01 SOL
  private readonly MAX_POSITION_SIZE = 0.2; // Maximum 0.2 SOL
  private readonly MAX_CAPITAL_USAGE = 80; // Maximum 80% of portfolio in active positions
  private readonly GROWTH_MULTIPLIER = 1.5; // Increase position size by 50% after 3 wins

  constructor() {
    this.metrics = {
      totalSOL: 0,
      totalValueUSD: 0,
      activePositions: 0,
      capitalUsedPercent: 0,
      dynamicPositionSize: 0.03,
      maxAllowedPositions: 3,
      riskLevel: 'MEDIUM',
      lastUpdated: Date.now()
    };

    this.startCalculationLoop();
  }

  private startCalculationLoop() {
    // Calculate portfolio metrics every 30 seconds
    this.updateInterval = setInterval(() => {
      this.calculatePortfolioMetrics();
    }, 30000);

    // Initial calculation
    this.calculatePortfolioMetrics();
  }

  private async calculatePortfolioMetrics() {
    try {
      // Get SOL balance
      const solBalance = await this.getSOLBalance();
      
      // Get active positions value
      const positionsValue = await this.getActivePositionsValue();
      
      // Get wallet token values
      const walletTokensValue = await this.getWalletTokensValue();
      
      // Calculate total portfolio value
      const totalSOL = solBalance + positionsValue + walletTokensValue;
      const solPriceUSD = 146; // Approximate SOL price
      const totalValueUSD = totalSOL * solPriceUSD;
      
      // Get active positions count
      const activePositions = await this.getActivePositionsCount();
      
      // Calculate optimal position size (2-5% of portfolio)
      const basePositionSize = (totalSOL * this.BASE_POSITION_PERCENT) / 100;
      const adjustedPositionSize = await this.adjustPositionSizeForPerformance(basePositionSize);
      
      // Apply min/max limits
      const dynamicPositionSize = Math.max(
        this.MIN_POSITION_SIZE,
        Math.min(this.MAX_POSITION_SIZE, adjustedPositionSize)
      );
      
      // Calculate max allowed positions based on capital
      const maxAllowedPositions = Math.floor(
        (totalSOL * this.MAX_CAPITAL_USAGE / 100) / dynamicPositionSize
      );
      
      // Calculate capital usage
      const capitalUsedPercent = (activePositions * dynamicPositionSize / totalSOL) * 100;
      
      // Determine risk level
      const riskLevel = this.calculateRiskLevel(capitalUsedPercent, activePositions);
      
      this.metrics = {
        totalSOL,
        totalValueUSD,
        activePositions,
        capitalUsedPercent,
        dynamicPositionSize,
        maxAllowedPositions: Math.max(3, Math.min(6, maxAllowedPositions)),
        riskLevel,
        lastUpdated: Date.now()
      };

      console.log(`💰 Capital Manager Update:
   Portfolio Value: ${totalValueUSD.toFixed(2)} USD (${totalSOL.toFixed(6)} SOL)
   Active Positions: ${activePositions}/${maxAllowedPositions}
   Capital Used: ${capitalUsedPercent.toFixed(1)}%
   Dynamic Position Size: ${dynamicPositionSize.toFixed(6)} SOL
   Risk Level: ${riskLevel}`);

    } catch (error) {
      console.error('❌ Capital Manager calculation error:', error);
    }
  }

  private async getSOLBalance(): Promise<number> {
    try {
      // Mock SOL balance for demo - in real implementation would fetch from wallet
      return 0.006764;
    } catch (error) {
      return 0.006764;
    }
  }

  private async getActivePositionsValue(): Promise<number> {
    try {
      const positionsFile = path.join(process.cwd(), 'data', 'positions.json');
      const data = await fs.readFile(positionsFile, 'utf-8');
      const positionsData = JSON.parse(data);
      
      const activePositions = positionsData.positions?.filter((p: PositionData) => p.status === 'ACTIVE') || [];
      
      return activePositions.reduce((total: number, position: PositionData) => {
        return total + (position.currentValue || position.entryAmount);
      }, 0);
    } catch (error) {
      return 0;
    }
  }

  private async getWalletTokensValue(): Promise<number> {
    // Estimate token values in wallet - for demo purposes
    // In real implementation would calculate actual token values
    return 0.5; // Estimated 0.5 SOL worth of tokens
  }

  private async getActivePositionsCount(): Promise<number> {
    try {
      const positionsFile = path.join(process.cwd(), 'data', 'positions.json');
      const data = await fs.readFile(positionsFile, 'utf-8');
      const positionsData = JSON.parse(data);
      
      const activePositions = positionsData.positions?.filter((p: PositionData) => p.status === 'ACTIVE') || [];
      return activePositions.length;
    } catch (error) {
      return 0;
    }
  }

  private async adjustPositionSizeForPerformance(baseSize: number): Promise<number> {
    try {
      // Check recent performance - increase size after 3 consecutive wins
      const recentWins = await this.getRecentWinStreak();
      
      if (recentWins >= 3) {
        console.log(`🚀 Performance boost: ${recentWins} consecutive wins - increasing position size by ${((this.GROWTH_MULTIPLIER - 1) * 100).toFixed(0)}%`);
        return baseSize * this.GROWTH_MULTIPLIER;
      }
      
      return baseSize;
    } catch (error) {
      return baseSize;
    }
  }

  private async getRecentWinStreak(): Promise<number> {
    try {
      const positionsFile = path.join(process.cwd(), 'data', 'positions.json');
      const data = await fs.readFile(positionsFile, 'utf-8');
      const positionsData = JSON.parse(data);
      
      const closedPositions = positionsData.positions?.filter((p: PositionData) => 
        p.status !== 'ACTIVE'
      ).sort((a: any, b: any) => b.entryTime - a.entryTime) || [];
      
      let winStreak = 0;
      for (const position of closedPositions) {
        if (position.status === 'SOLD_PROFIT' || (position.pnl && position.pnl > 0)) {
          winStreak++;
        } else {
          break;
        }
      }
      
      return winStreak;
    } catch (error) {
      return 0;
    }
  }

  private calculateRiskLevel(capitalUsedPercent: number, activePositions: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (capitalUsedPercent < 30 && activePositions <= 2) return 'LOW';
    if (capitalUsedPercent < 60 && activePositions <= 4) return 'MEDIUM';
    return 'HIGH';
  }

  // Public methods for system integration
  public getMetrics(): PortfolioMetrics {
    return { ...this.metrics };
  }

  public getOptimalPositionSize(): number {
    return this.metrics.dynamicPositionSize;
  }

  public canOpenNewPosition(): boolean {
    return this.metrics.activePositions < this.metrics.maxAllowedPositions &&
           this.metrics.capitalUsedPercent < this.MAX_CAPITAL_USAGE;
  }

  public getCapitalWarnings(): string[] {
    const warnings: string[] = [];
    
    if (this.metrics.capitalUsedPercent > 70) {
      warnings.push('Vysoké využití kapitálu - zvažte snížení pozic');
    }
    
    if (this.metrics.riskLevel === 'HIGH') {
      warnings.push('Vysoká rizikovost portfolia');
    }
    
    if (this.metrics.totalSOL < 0.1) {
      warnings.push('Nedostatečný kapitál pro optimální trading');
    }
    
    return warnings;
  }

  public simulateGrowth(): void {
    // Simulation of portfolio growth for testing
    console.log('\n🧪 SIMULACE RŮSTU PORTFOLIA:');
    
    const scenarios = [
      { wins: 0, portfolio: 0.5, expectedSize: 0.01 },
      { wins: 2, portfolio: 0.8, expectedSize: 0.016 },
      { wins: 3, portfolio: 1.2, expectedSize: 0.036 }, // Growth multiplier applied
      { wins: 5, portfolio: 2.0, expectedSize: 0.06 }
    ];
    
    scenarios.forEach(scenario => {
      const baseSize = (scenario.portfolio * this.BASE_POSITION_PERCENT) / 100;
      const adjustedSize = scenario.wins >= 3 ? baseSize * this.GROWTH_MULTIPLIER : baseSize;
      const finalSize = Math.max(this.MIN_POSITION_SIZE, Math.min(this.MAX_POSITION_SIZE, adjustedSize));
      
      console.log(`   Portfolio: ${scenario.portfolio.toFixed(2)} SOL | Wins: ${scenario.wins} | Position Size: ${finalSize.toFixed(6)} SOL`);
    });
  }

  public destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Singleton instance
let capitalManagerInstance: CapitalManager | null = null;

export function getCapitalManager(): CapitalManager {
  if (!capitalManagerInstance) {
    capitalManagerInstance = new CapitalManager();
  }
  return capitalManagerInstance;
}
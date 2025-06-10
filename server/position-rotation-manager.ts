import { aggressiveAlphaFilter } from './aggressive-alpha-filter';
import { storage } from './storage';
import { jupiterIntegration } from './jupiter-integration';

interface Position {
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  valueUSD: number;
  marketCap: number;
  entryTime: Date;
  currentVolume: number;
  entryVolume: number;
  unrealizedPnL: number;
  unrealizedROI: number;
}

interface RotationExecution {
  id: string;
  symbol: string;
  action: 'exit' | 'reduce';
  percentage: number;
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  executedAt?: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  originalValue: number;
  exitValue?: number;
  pnl?: number;
}

class PositionRotationManager {
  private rotationExecutions: RotationExecution[] = [];
  private isActive: boolean = true;
  private rotationInterval: NodeJS.Timeout | null = null;
  private lastRotationCheck: Date = new Date();

  constructor() {
    this.startRotationMonitoring();
  }

  private startRotationMonitoring(): void {
    console.log('🔄 POSITION ROTATION: Starting aggressive rotation monitoring');
    
    // Check for rotations every 30 seconds
    this.rotationInterval = setInterval(async () => {
      await this.checkAndExecuteRotations();
    }, 30000);

    // Initial check
    setTimeout(() => this.checkAndExecuteRotations(), 5000);
  }

  private async checkAndExecuteRotations(): Promise<void> {
    if (!this.isActive) return;

    try {
      console.log('🔍 ROTATION CHECK: Analyzing current positions for rotation opportunities');
      
      // Get current positions from storage/portfolio
      const currentPositions = await this.getCurrentPositions();
      
      if (currentPositions.length === 0) {
        console.log('📊 ROTATION CHECK: No positions to analyze');
        return;
      }

      // Generate rotation signals using aggressive filter
      const rotationSignals = aggressiveAlphaFilter.generateRotationSignals(currentPositions);
      
      if (rotationSignals.length === 0) {
        console.log('✅ ROTATION CHECK: All positions meet criteria - no rotations needed');
        return;
      }

      console.log(`⚠️ ROTATION SIGNALS: Found ${rotationSignals.length} positions requiring rotation`);
      
      // Execute rotation signals by priority
      for (const signal of rotationSignals) {
        await this.executeRotationSignal(signal, currentPositions);
      }

      this.lastRotationCheck = new Date();

    } catch (error) {
      console.error('❌ ROTATION ERROR:', error);
    }
  }

  private async getCurrentPositions(): Promise<Position[]> {
    try {
      // Mock current positions - in real implementation would fetch from portfolio tracker
      const mockPositions: Position[] = [
        {
          symbol: 'BONK',
          mintAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          entryPrice: 0.000008,
          currentPrice: 0.000012,
          quantity: 50000000,
          valueUSD: 600,
          marketCap: 2500000000, // $2.5B - large cap that should be rotated out
          entryTime: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
          currentVolume: 15000000,
          entryVolume: 25000000,
          unrealizedPnL: 200,
          unrealizedROI: 50
        },
        {
          symbol: 'SOLEND',
          mintAddress: '5h6ssFpeDeRbzsw9AUSsKnkzTXeWjWs4KY7eKKGNj1Y8',
          entryPrice: 0.45,
          currentPrice: 0.52,
          quantity: 500,
          valueUSD: 260,
          marketCap: 180000000, // $180M - medium cap that should be reduced
          entryTime: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
          currentVolume: 2500000,
          entryVolume: 4000000,
          unrealizedPnL: 35,
          unrealizedROI: 15.5
        }
      ];

      return mockPositions;
    } catch (error) {
      console.error('Error fetching current positions:', error);
      return [];
    }
  }

  private async executeRotationSignal(signal: any, positions: Position[]): Promise<void> {
    const position = positions.find(p => p.symbol === signal.symbol);
    if (!position) {
      console.log(`❌ ROTATION: Position ${signal.symbol} not found`);
      return;
    }

    const execution: RotationExecution = {
      id: `rotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: signal.symbol,
      action: signal.action,
      percentage: signal.recommendedPercentage || 100,
      reason: signal.reason,
      urgency: signal.urgency,
      status: 'pending',
      originalValue: position.valueUSD
    };

    this.rotationExecutions.push(execution);

    console.log(`🔄 EXECUTING ROTATION: ${signal.symbol}`);
    console.log(`   Action: ${signal.action.toUpperCase()}`);
    console.log(`   Percentage: ${execution.percentage}%`);
    console.log(`   Reason: ${signal.reason}`);
    console.log(`   Urgency: ${signal.urgency.toUpperCase()}`);
    console.log(`   Value: $${position.valueUSD.toFixed(2)}`);

    try {
      execution.status = 'executing';

      // Calculate exit amounts
      const exitQuantity = (position.quantity * execution.percentage) / 100;
      const exitValue = (position.valueUSD * execution.percentage) / 100;

      // Simulate the exit trade
      await this.simulateExitTrade(position, exitQuantity, exitValue);

      execution.status = 'completed';
      execution.executedAt = new Date();
      execution.exitValue = exitValue;
      execution.pnl = (exitValue * position.unrealizedROI) / 100;

      console.log(`✅ ROTATION COMPLETED: ${signal.symbol}`);
      console.log(`   Exited: ${execution.percentage}% ($${exitValue.toFixed(2)})`);
      console.log(`   PnL: $${execution.pnl?.toFixed(2) || 0}`);

      // Free up capital for new alpha opportunities
      console.log(`💰 CAPITAL FREED: $${exitValue.toFixed(2)} available for new alpha entries`);

    } catch (error) {
      execution.status = 'failed';
      console.error(`❌ ROTATION FAILED: ${signal.symbol}`, error);
    }
  }

  private async simulateExitTrade(position: Position, quantity: number, value: number): Promise<void> {
    // Simulate trade execution delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    console.log(`📊 SIMULATED EXIT: ${position.symbol}`);
    console.log(`   Quantity: ${quantity.toLocaleString()}`);
    console.log(`   Value: $${value.toFixed(2)}`);
    console.log(`   Entry Price: $${position.entryPrice}`);
    console.log(`   Exit Price: $${position.currentPrice}`);
  }

  getRotationHistory(limit: number = 10): RotationExecution[] {
    return this.rotationExecutions
      .sort((a, b) => (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0))
      .slice(0, limit);
  }

  getRotationStats(): {
    totalRotations: number;
    successfulRotations: number;
    successRate: number;
    totalCapitalFreed: number;
    avgRotationTime: number;
    lastRotationCheck: Date;
  } {
    const successful = this.rotationExecutions.filter(r => r.status === 'completed');
    const totalCapitalFreed = successful.reduce((sum, r) => sum + (r.exitValue || 0), 0);
    
    return {
      totalRotations: this.rotationExecutions.length,
      successfulRotations: successful.length,
      successRate: this.rotationExecutions.length > 0 ? (successful.length / this.rotationExecutions.length) * 100 : 0,
      totalCapitalFreed,
      avgRotationTime: 2.5, // minutes - placeholder
      lastRotationCheck: this.lastRotationCheck
    };
  }

  getActiveRotations(): RotationExecution[] {
    return this.rotationExecutions.filter(r => r.status === 'pending' || r.status === 'executing');
  }

  setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🔄 ROTATION MANAGER: ${active ? 'Activated' : 'Deactivated'}`);
  }

  stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
    this.isActive = false;
    console.log('🔄 ROTATION MANAGER: Stopped');
  }

  // Force immediate rotation check (for testing/manual triggers)
  async forceRotationCheck(): Promise<void> {
    console.log('🚀 FORCING ROTATION CHECK: Manual trigger activated');
    await this.checkAndExecuteRotations();
  }
}

export const positionRotationManager = new PositionRotationManager();
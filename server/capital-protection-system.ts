/**
 * CAPITAL PROTECTION SYSTEM
 * Automatická ochrana kapitálu s defenzivními režimy
 */

import { EventEmitter } from 'events';

interface ProtectionTrigger {
  name: string;
  condition: (metrics: TradingMetrics) => boolean;
  action: DefensiveAction;
  priority: number;
}

interface TradingMetrics {
  currentCapital: number;
  solBalance: number;
  totalROI: number;
  dailyLoss: number;
  consecutiveLosses: number;
  volatilityScore: number;
}

enum DefensiveAction {
  REDUCE_POSITION_SIZE = 'reduce_position_size',
  PARTIAL_LIQUIDATION = 'partial_liquidation',
  EMERGENCY_STOP = 'emergency_stop',
  CONSERVATIVE_MODE = 'conservative_mode',
  PROFIT_HARVEST = 'profit_harvest'
}

class CapitalProtectionSystem extends EventEmitter {
  private isActive: boolean = true;
  private protectionTriggers: ProtectionTrigger[] = [];
  private tradingMetrics: TradingMetrics = {
    currentCapital: 0,
    solBalance: 0,
    totalROI: 0,
    dailyLoss: 0,
    consecutiveLosses: 0,
    volatilityScore: 0
  };

  private protectionLevels = {
    CRITICAL: { threshold: 1.5, action: DefensiveAction.EMERGENCY_STOP },
    HIGH: { threshold: 3.0, action: DefensiveAction.PARTIAL_LIQUIDATION },
    MEDIUM: { threshold: 5.0, action: DefensiveAction.CONSERVATIVE_MODE },
    LOW: { threshold: 10.0, action: DefensiveAction.REDUCE_POSITION_SIZE }
  };

  constructor() {
    super();
    this.initializeProtectionTriggers();
    this.startMonitoring();
  }

  private initializeProtectionTriggers(): void {
    this.protectionTriggers = [
      {
        name: 'SOL_CRITICAL_LOW',
        condition: (metrics) => metrics.solBalance < 1.5,
        action: DefensiveAction.EMERGENCY_STOP,
        priority: 1
      },
      {
        name: 'DAILY_LOSS_LIMIT',
        condition: (metrics) => metrics.dailyLoss > 20,
        action: DefensiveAction.PARTIAL_LIQUIDATION,
        priority: 2
      },
      {
        name: 'CONSECUTIVE_LOSSES',
        condition: (metrics) => metrics.consecutiveLosses >= 5,
        action: DefensiveAction.CONSERVATIVE_MODE,
        priority: 3
      },
      {
        name: 'HIGH_VOLATILITY',
        condition: (metrics) => metrics.volatilityScore > 85,
        action: DefensiveAction.REDUCE_POSITION_SIZE,
        priority: 4
      },
      {
        name: 'PROFIT_TARGET_REACHED',
        condition: (metrics) => metrics.currentCapital > 750,
        action: DefensiveAction.PROFIT_HARVEST,
        priority: 5
      }
    ];
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.evaluateProtectionTriggers();
    }, 5000); // Check every 5 seconds
  }

  public updateMetrics(metrics: Partial<TradingMetrics>): void {
    this.tradingMetrics = { ...this.tradingMetrics, ...metrics };
    this.evaluateProtectionTriggers();
  }

  private evaluateProtectionTriggers(): void {
    if (!this.isActive) return;

    const activeTriggers = this.protectionTriggers
      .filter(trigger => trigger.condition(this.tradingMetrics))
      .sort((a, b) => a.priority - b.priority);

    if (activeTriggers.length > 0) {
      const primaryTrigger = activeTriggers[0];
      this.executeDefensiveAction(primaryTrigger);
    }
  }

  private async executeDefensiveAction(trigger: ProtectionTrigger): Promise<void> {
    console.log(`🛡️ CAPITAL PROTECTION ACTIVATED: ${trigger.name}`);
    console.log(`📊 Current metrics:`, this.tradingMetrics);

    switch (trigger.action) {
      case DefensiveAction.EMERGENCY_STOP:
        await this.emergencyStop();
        break;
      case DefensiveAction.PARTIAL_LIQUIDATION:
        await this.partialLiquidation();
        break;
      case DefensiveAction.CONSERVATIVE_MODE:
        await this.enableConservativeMode();
        break;
      case DefensiveAction.REDUCE_POSITION_SIZE:
        await this.reducePositionSize();
        break;
      case DefensiveAction.PROFIT_HARVEST:
        await this.harvestProfits();
        break;
    }

    this.emit('protection_activated', { trigger, metrics: this.tradingMetrics });
  }

  private async emergencyStop(): Promise<void> {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    console.log('⏸️ Stopping all trading operations');
    console.log('🔄 Initiating emergency liquidation sequence');
    
    this.emit('emergency_stop', {
      reason: 'Critical SOL balance reached',
      action: 'All trading suspended'
    });
  }

  private async partialLiquidation(): Promise<void> {
    console.log('📉 PARTIAL LIQUIDATION TRIGGERED');
    console.log('💰 Liquidating 30% of positions to preserve capital');
    
    this.emit('partial_liquidation', {
      percentage: 30,
      reason: 'Daily loss limit exceeded'
    });
  }

  private async enableConservativeMode(): Promise<void> {
    console.log('🛡️ CONSERVATIVE MODE ENABLED');
    console.log('📊 Reducing position sizes by 50%');
    console.log('🎯 Focusing on high-confidence trades only');
    
    this.emit('conservative_mode', {
      positionSizeReduction: 50,
      confidenceThreshold: 90
    });
  }

  private async reducePositionSize(): Promise<void> {
    console.log('📉 REDUCING POSITION SIZES');
    console.log('💰 Position sizes reduced by 25% due to high volatility');
    
    this.emit('position_size_reduction', {
      reduction: 25,
      reason: 'High market volatility detected'
    });
  }

  private async harvestProfits(): Promise<void> {
    console.log('💰 PROFIT HARVEST ACTIVATED');
    console.log('🎯 Target reached - harvesting 40% of profits');
    
    this.emit('profit_harvest', {
      percentage: 40,
      targetReached: this.tradingMetrics.currentCapital
    });
  }

  public getProtectionStatus() {
    return {
      isActive: this.isActive,
      currentMetrics: this.tradingMetrics,
      activeTriggers: this.protectionTriggers.filter(t => 
        t.condition(this.tradingMetrics)
      ).map(t => t.name),
      protectionLevel: this.getCurrentProtectionLevel()
    };
  }

  private getCurrentProtectionLevel(): string {
    const { solBalance } = this.tradingMetrics;
    
    if (solBalance < this.protectionLevels.CRITICAL.threshold) return 'CRITICAL';
    if (solBalance < this.protectionLevels.HIGH.threshold) return 'HIGH';
    if (solBalance < this.protectionLevels.MEDIUM.threshold) return 'MEDIUM';
    if (solBalance < this.protectionLevels.LOW.threshold) return 'LOW';
    
    return 'SAFE';
  }

  public disable(): void {
    this.isActive = false;
    console.log('⚠️ Capital protection system disabled');
  }

  public enable(): void {
    this.isActive = true;
    console.log('✅ Capital protection system enabled');
  }
}

export const capitalProtectionSystem = new CapitalProtectionSystem();
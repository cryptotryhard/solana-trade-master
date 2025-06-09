interface PanicTrigger {
  id: string;
  name: string;
  description: string;
  condition: 'consecutive_losses' | 'drawdown_threshold' | 'liquidity_drop' | 'volume_anomaly';
  threshold: number;
  timeWindow: number; // minutes
  severity: 'warning' | 'moderate' | 'critical';
  action: 'reduce_size' | 'safe_mode' | 'emergency_stop';
  isActive: boolean;
}

interface SafeModeConfig {
  isActive: boolean;
  enteredAt: Date;
  reason: string;
  restrictions: {
    tradingDisabled: boolean;
    maxPositionSize: number; // percentage
    allowedTokens: string[]; // whitelist
    cooldownMinutes: number;
  };
  exitConditions: {
    stabilizationPeriod: number; // minutes
    requiredWinRate: number; // percentage
    maxDrawdown: number; // percentage
  };
}

interface CapitalLock {
  tokenSymbol: string;
  mintAddress: string;
  lockedAt: Date;
  reason: string;
  failureCount: number;
  lockDuration: number; // minutes
  unlockAt: Date;
}

interface ThreatLevel {
  level: 'safe' | 'elevated' | 'high' | 'critical';
  score: number; // 0-100
  indicators: string[];
  recommendations: string[];
}

interface ProtectionEvent {
  id: string;
  timestamp: Date;
  type: 'trigger_activated' | 'safe_mode_entered' | 'capital_locked' | 'recovery_initiated';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    trigger?: string;
    reason: string;
    metrics: any;
    action: string;
  };
}

class CrashShield {
  private isEnabled: boolean = true;
  private panicTriggers: Map<string, PanicTrigger> = new Map();
  private safeModeConfig: SafeModeConfig;
  private capitalLocks: Map<string, CapitalLock> = new Map();
  private protectionEvents: ProtectionEvent[] = [];
  private consecutiveLosses: number = 0;
  private lastTrades: any[] = [];
  private portfolioHighWaterMark: number = 0;

  constructor() {
    this.initializePanicTriggers();
    this.initializeSafeMode();
    this.startMonitoring();
    console.log('🛡️ Crash Shield Auto-Protect System initialized');
  }

  private initializePanicTriggers(): void {
    const triggers: PanicTrigger[] = [
      {
        id: 'consecutive_losses',
        name: 'Consecutive Loss Streak',
        description: 'Triggered when multiple trades fail in succession',
        condition: 'consecutive_losses',
        threshold: 4,
        timeWindow: 60, // 1 hour
        severity: 'critical',
        action: 'safe_mode',
        isActive: true
      },
      {
        id: 'rapid_drawdown',
        name: 'Rapid Portfolio Drawdown',
        description: 'Triggered when portfolio loses significant value quickly',
        condition: 'drawdown_threshold',
        threshold: 20, // 20% drawdown
        timeWindow: 360, // 6 hours
        severity: 'critical',
        action: 'emergency_stop',
        isActive: true
      },
      {
        id: 'liquidity_crisis',
        name: 'Position Liquidity Drop',
        description: 'Triggered when position liquidity falls dangerously low',
        condition: 'liquidity_drop',
        threshold: 50, // 50% liquidity drop
        timeWindow: 30, // 30 minutes
        severity: 'moderate',
        action: 'reduce_size',
        isActive: true
      },
      {
        id: 'volume_anomaly',
        name: 'Trading Volume Anomaly',
        description: 'Triggered when volume patterns indicate market manipulation',
        condition: 'volume_anomaly',
        threshold: 80, // 80% volume drop
        timeWindow: 15, // 15 minutes
        severity: 'warning',
        action: 'reduce_size',
        isActive: true
      }
    ];

    triggers.forEach(trigger => {
      this.panicTriggers.set(trigger.id, trigger);
    });
  }

  private initializeSafeMode(): void {
    this.safeModeConfig = {
      isActive: false,
      enteredAt: new Date(),
      reason: '',
      restrictions: {
        tradingDisabled: false,
        maxPositionSize: 1.0, // 1% max position
        allowedTokens: [], // empty = all allowed
        cooldownMinutes: 30
      },
      exitConditions: {
        stabilizationPeriod: 120, // 2 hours
        requiredWinRate: 60, // 60% win rate
        maxDrawdown: 5 // 5% max drawdown
      }
    };
  }

  async recordTrade(trade: any): Promise<void> {
    this.lastTrades.push({
      ...trade,
      timestamp: new Date(),
      isLoss: parseFloat(trade.pnl || '0') < 0
    });

    // Keep only last 50 trades
    if (this.lastTrades.length > 50) {
      this.lastTrades = this.lastTrades.slice(-50);
    }

    // Update consecutive losses counter
    if (trade.side === 'sell') {
      const isLoss = parseFloat(trade.pnl || '0') < 0;
      if (isLoss) {
        this.consecutiveLosses++;
      } else {
        this.consecutiveLosses = 0;
      }
    }

    // Check for panic triggers
    await this.checkPanicTriggers(trade);
  }

  private async checkPanicTriggers(trade: any): Promise<void> {
    for (const [triggerId, trigger] of this.panicTriggers) {
      if (!trigger.isActive || !this.isEnabled) continue;

      let shouldTrigger = false;
      let triggerReason = '';

      switch (trigger.condition) {
        case 'consecutive_losses':
          if (this.consecutiveLosses >= trigger.threshold) {
            shouldTrigger = true;
            triggerReason = `${this.consecutiveLosses} consecutive losses detected`;
          }
          break;

        case 'drawdown_threshold':
          const currentDrawdown = await this.calculateCurrentDrawdown();
          if (currentDrawdown >= trigger.threshold) {
            shouldTrigger = true;
            triggerReason = `Portfolio drawdown ${currentDrawdown.toFixed(1)}% exceeds ${trigger.threshold}%`;
          }
          break;

        case 'liquidity_drop':
          // This would be checked when monitoring positions
          break;

        case 'volume_anomaly':
          // This would be checked with real-time volume data
          break;
      }

      if (shouldTrigger) {
        await this.activatePanicTrigger(trigger, triggerReason, trade);
      }
    }
  }

  private async activatePanicTrigger(trigger: PanicTrigger, reason: string, trade: any): Promise<void> {
    const event: ProtectionEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'trigger_activated',
      severity: trigger.severity as any,
      details: {
        trigger: trigger.name,
        reason,
        metrics: {
          consecutiveLosses: this.consecutiveLosses,
          portfolioValue: trade.portfolioValue || 0,
          lastTrade: trade
        },
        action: trigger.action
      }
    };

    this.protectionEvents.push(event);
    this.trimEventHistory();

    console.log(`🚨 CRASH SHIELD ACTIVATED: ${trigger.name} - ${reason}`);

    switch (trigger.action) {
      case 'safe_mode':
        await this.enterSafeMode(reason);
        break;
      case 'emergency_stop':
        await this.emergencyStop(reason);
        break;
      case 'reduce_size':
        await this.reducePositionSizing(reason);
        break;
    }
  }

  private async enterSafeMode(reason: string): Promise<void> {
    this.safeModeConfig = {
      isActive: true,
      enteredAt: new Date(),
      reason,
      restrictions: {
        tradingDisabled: false,
        maxPositionSize: 1.0, // Reduce to 1%
        allowedTokens: ['SOL', 'USDC'], // Only safe assets
        cooldownMinutes: 30
      },
      exitConditions: {
        stabilizationPeriod: 120,
        requiredWinRate: 60,
        maxDrawdown: 5
      }
    };

    const event: ProtectionEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'safe_mode_entered',
      severity: 'high',
      details: {
        reason,
        metrics: {},
        action: 'Safe mode activated with restricted trading'
      }
    };

    this.protectionEvents.push(event);
    console.log(`🛡️ SAFE MODE ACTIVATED: ${reason}`);
  }

  private async emergencyStop(reason: string): Promise<void> {
    this.safeModeConfig.isActive = true;
    this.safeModeConfig.restrictions.tradingDisabled = true;
    this.safeModeConfig.reason = reason;

    console.log(`🔴 EMERGENCY STOP: ${reason}`);
  }

  private async reducePositionSizing(reason: string): Promise<void> {
    // Reduce position sizing by 50%
    this.safeModeConfig.restrictions.maxPositionSize *= 0.5;
    console.log(`⚠️ POSITION SIZE REDUCED: ${reason}`);
  }

  async lockCapital(tokenSymbol: string, mintAddress: string, reason: string, duration: number = 720): Promise<void> {
    const lock: CapitalLock = {
      tokenSymbol,
      mintAddress,
      lockedAt: new Date(),
      reason,
      failureCount: (this.capitalLocks.get(tokenSymbol)?.failureCount || 0) + 1,
      lockDuration: duration,
      unlockAt: new Date(Date.now() + duration * 60 * 1000)
    };

    this.capitalLocks.set(tokenSymbol, lock);

    const event: ProtectionEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'capital_locked',
      severity: 'medium',
      details: {
        reason,
        metrics: { tokenSymbol, failureCount: lock.failureCount },
        action: `Capital locked for ${duration} minutes`
      }
    };

    this.protectionEvents.push(event);
    console.log(`🔒 CAPITAL LOCKED: ${tokenSymbol} - ${reason}`);
  }

  isTokenLocked(tokenSymbol: string): boolean {
    const lock = this.capitalLocks.get(tokenSymbol);
    if (!lock) return false;

    if (new Date() > lock.unlockAt) {
      this.capitalLocks.delete(tokenSymbol);
      return false;
    }

    return true;
  }

  private async calculateCurrentDrawdown(): Promise<number> {
    // This would calculate drawdown from recent portfolio values
    const recentTrades = this.lastTrades.slice(-10);
    if (recentTrades.length === 0) return 0;

    const profits = recentTrades.map(t => parseFloat(t.pnl || '0'));
    const totalPnL = profits.reduce((sum, pnl) => sum + pnl, 0);
    const maxProfit = Math.max(...profits, 0);

    return maxProfit > 0 ? ((maxProfit - totalPnL) / maxProfit) * 100 : 0;
  }

  async assessThreatLevel(): Promise<ThreatLevel> {
    let score = 0;
    const indicators: string[] = [];
    const recommendations: string[] = [];

    // Consecutive losses assessment
    if (this.consecutiveLosses >= 3) {
      score += 30;
      indicators.push(`${this.consecutiveLosses} consecutive losses`);
      recommendations.push('Consider reducing position sizes');
    }

    // Safe mode assessment
    if (this.safeModeConfig.isActive) {
      score += 40;
      indicators.push('Safe mode active');
      recommendations.push('Wait for stabilization before resuming normal trading');
    }

    // Capital locks assessment
    const activeLocks = Array.from(this.capitalLocks.values()).filter(
      lock => new Date() < lock.unlockAt
    );
    if (activeLocks.length > 0) {
      score += activeLocks.length * 10;
      indicators.push(`${activeLocks.length} tokens locked`);
      recommendations.push('Diversify into unlocked tokens');
    }

    // Recent protection events
    const recentEvents = this.protectionEvents.filter(
      event => new Date().getTime() - event.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );
    if (recentEvents.length > 0) {
      score += recentEvents.length * 5;
      indicators.push(`${recentEvents.length} recent protection events`);
    }

    let level: ThreatLevel['level'];
    if (score >= 70) {
      level = 'critical';
      recommendations.push('Emergency protocols may be necessary');
    } else if (score >= 40) {
      level = 'high';
      recommendations.push('Implement conservative trading strategies');
    } else if (score >= 20) {
      level = 'elevated';
      recommendations.push('Monitor closely and reduce risk exposure');
    } else {
      level = 'safe';
      if (recommendations.length === 0) {
        recommendations.push('Normal trading operations can continue');
      }
    }

    return { level, score, indicators, recommendations };
  }

  async checkRecoveryConditions(): Promise<boolean> {
    if (!this.safeModeConfig.isActive) return true;

    const stabilizationTime = this.safeModeConfig.exitConditions.stabilizationPeriod * 60 * 1000;
    const timeInSafeMode = new Date().getTime() - this.safeModeConfig.enteredAt.getTime();

    if (timeInSafeMode < stabilizationTime) return false;

    const recentTrades = this.lastTrades.slice(-10);
    if (recentTrades.length < 5) return false;

    const winningTrades = recentTrades.filter(t => !t.isLoss).length;
    const winRate = (winningTrades / recentTrades.length) * 100;

    const currentDrawdown = await this.calculateCurrentDrawdown();

    if (winRate >= this.safeModeConfig.exitConditions.requiredWinRate && 
        currentDrawdown <= this.safeModeConfig.exitConditions.maxDrawdown) {
      await this.exitSafeMode();
      return true;
    }

    return false;
  }

  private async exitSafeMode(): Promise<void> {
    this.safeModeConfig.isActive = false;
    this.consecutiveLosses = 0;

    const event: ProtectionEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date(),
      type: 'recovery_initiated',
      severity: 'low',
      details: {
        reason: 'Recovery conditions met',
        metrics: {},
        action: 'Normal trading resumed'
      }
    };

    this.protectionEvents.push(event);
    console.log('✅ RECOVERY COMPLETE: Safe mode deactivated, normal trading resumed');
  }

  private startMonitoring(): void {
    // Check recovery conditions every 5 minutes
    setInterval(async () => {
      if (this.isEnabled) {
        await this.checkRecoveryConditions();
        
        // Clean up expired capital locks
        for (const [symbol, lock] of this.capitalLocks) {
          if (new Date() > lock.unlockAt) {
            this.capitalLocks.delete(symbol);
            console.log(`🔓 Capital lock expired for ${symbol}`);
          }
        }
      }
    }, 5 * 60 * 1000);
  }

  private trimEventHistory(): void {
    // Keep only last 100 events
    if (this.protectionEvents.length > 100) {
      this.protectionEvents = this.protectionEvents.slice(-100);
    }
  }

  // Public API methods
  getProtectionStatus() {
    return {
      isEnabled: this.isEnabled,
      safeModeActive: this.safeModeConfig.isActive,
      consecutiveLosses: this.consecutiveLosses,
      activeLocks: Array.from(this.capitalLocks.values()).filter(
        lock => new Date() < lock.unlockAt
      ),
      recentEvents: this.protectionEvents.slice(-10)
    };
  }

  getSafeModeConfig(): SafeModeConfig {
    return { ...this.safeModeConfig };
  }

  getPanicTriggers(): PanicTrigger[] {
    return Array.from(this.panicTriggers.values());
  }

  getCapitalLocks(): CapitalLock[] {
    return Array.from(this.capitalLocks.values());
  }

  getProtectionEvents(limit: number = 20): ProtectionEvent[] {
    return this.protectionEvents.slice(-limit).reverse();
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    console.log(`🛡️ Crash Shield ${enabled ? 'enabled' : 'disabled'}`);
  }

  updateTrigger(triggerId: string, updates: Partial<PanicTrigger>): boolean {
    const trigger = this.panicTriggers.get(triggerId);
    if (!trigger) return false;

    Object.assign(trigger, updates);
    this.panicTriggers.set(triggerId, trigger);
    return true;
  }

  async forceSafeMode(reason: string): Promise<void> {
    await this.enterSafeMode(`Manual activation: ${reason}`);
  }

  async manualRecovery(): Promise<void> {
    await this.exitSafeMode();
  }
}

export const crashShield = new CrashShield();
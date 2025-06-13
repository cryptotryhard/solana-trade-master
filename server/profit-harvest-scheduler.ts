/**
 * PROFIT HARVEST SCHEDULER
 * Automatické plánování výběru zisků při dosažení cílových úrovní
 */

import { EventEmitter } from 'events';

interface HarvestTarget {
  id: string;
  threshold: number;
  percentage: number;
  enabled: boolean;
  triggered: boolean;
  createdAt: Date;
}

interface HarvestEvent {
  targetId: string;
  threshold: number;
  percentage: number;
  actualValue: number;
  solHarvested: number;
  timestamp: Date;
}

class ProfitHarvestScheduler extends EventEmitter {
  private harvestTargets: HarvestTarget[] = [];
  private harvestHistory: HarvestEvent[] = [];
  private isActive: boolean = true;
  private currentCapital: number = 0;

  constructor() {
    super();
    this.initializeDefaultTargets();
    this.startMonitoring();
  }

  private initializeDefaultTargets(): void {
    // Přednastavené cíle podle tvých požadavků
    this.harvestTargets = [
      {
        id: 'target_750',
        threshold: 750,
        percentage: 30,
        enabled: true,
        triggered: false,
        createdAt: new Date()
      },
      {
        id: 'target_1000',
        threshold: 1000,
        percentage: 40,
        enabled: true,
        triggered: false,
        createdAt: new Date()
      },
      {
        id: 'target_2500',
        threshold: 2500,
        percentage: 25,
        enabled: true,
        triggered: false,
        createdAt: new Date()
      },
      {
        id: 'target_5000',
        threshold: 5000,
        percentage: 35,
        enabled: true,
        triggered: false,
        createdAt: new Date()
      },
      {
        id: 'target_10000',
        threshold: 10000,
        percentage: 20,
        enabled: true,
        triggered: false,
        createdAt: new Date()
      }
    ];
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.checkHarvestTriggers();
    }, 10000); // Check every 10 seconds
  }

  public updateCapital(capital: number): void {
    this.currentCapital = capital;
    this.checkHarvestTriggers();
  }

  private checkHarvestTriggers(): void {
    if (!this.isActive) return;

    const triggeredTargets = this.harvestTargets.filter(target => 
      target.enabled && 
      !target.triggered && 
      this.currentCapital >= target.threshold
    );

    for (const target of triggeredTargets) {
      this.executeHarvest(target);
    }
  }

  private async executeHarvest(target: HarvestTarget): Promise<void> {
    console.log(`💰 PROFIT HARVEST TRIGGERED`);
    console.log(`🎯 Target: $${target.threshold} reached (Current: $${this.currentCapital})`);
    console.log(`📊 Harvesting ${target.percentage}% of profits`);

    const profitAmount = (this.currentCapital - 500) * (target.percentage / 100); // 500 = initial capital
    const solToHarvest = profitAmount / 200; // Approximate SOL value

    const harvestEvent: HarvestEvent = {
      targetId: target.id,
      threshold: target.threshold,
      percentage: target.percentage,
      actualValue: this.currentCapital,
      solHarvested: solToHarvest,
      timestamp: new Date()
    };

    this.harvestHistory.push(harvestEvent);
    target.triggered = true;

    console.log(`✅ Harvest executed: ${solToHarvest.toFixed(6)} SOL`);
    console.log(`📈 Remaining capital: $${(this.currentCapital - profitAmount).toFixed(2)}`);

    this.emit('harvest_executed', harvestEvent);

    // Reset target for next cycle (higher threshold)
    setTimeout(() => {
      target.triggered = false;
      target.threshold *= 1.5; // Increase threshold by 50% for next harvest
      console.log(`🔄 Target reset: Next harvest at $${target.threshold}`);
    }, 60000); // Reset after 1 minute
  }

  public addCustomTarget(threshold: number, percentage: number): string {
    const targetId = `custom_${Date.now()}`;
    
    const newTarget: HarvestTarget = {
      id: targetId,
      threshold,
      percentage,
      enabled: true,
      triggered: false,
      createdAt: new Date()
    };

    this.harvestTargets.push(newTarget);
    console.log(`➕ Custom harvest target added: $${threshold} (${percentage}%)`);

    return targetId;
  }

  public removeTarget(targetId: string): boolean {
    const index = this.harvestTargets.findIndex(t => t.id === targetId);
    if (index > -1) {
      this.harvestTargets.splice(index, 1);
      console.log(`➖ Harvest target removed: ${targetId}`);
      return true;
    }
    return false;
  }

  public toggleTarget(targetId: string): boolean {
    const target = this.harvestTargets.find(t => t.id === targetId);
    if (target) {
      target.enabled = !target.enabled;
      console.log(`🔄 Target ${targetId} ${target.enabled ? 'enabled' : 'disabled'}`);
      return target.enabled;
    }
    return false;
  }

  public getNextHarvestInfo() {
    const activeTargets = this.harvestTargets
      .filter(t => t.enabled && !t.triggered)
      .sort((a, b) => a.threshold - b.threshold);

    const nextTarget = activeTargets[0];
    
    if (!nextTarget) {
      return {
        hasNext: false,
        message: 'No active harvest targets'
      };
    }

    const progressPercent = (this.currentCapital / nextTarget.threshold) * 100;
    const remainingAmount = nextTarget.threshold - this.currentCapital;

    return {
      hasNext: true,
      threshold: nextTarget.threshold,
      percentage: nextTarget.percentage,
      progress: Math.min(progressPercent, 100),
      remaining: Math.max(remainingAmount, 0),
      estimatedHarvest: ((nextTarget.threshold - 500) * (nextTarget.percentage / 100)) / 200
    };
  }

  public getHarvestSummary() {
    const totalHarvested = this.harvestHistory.reduce((sum, event) => sum + event.solHarvested, 0);
    const completedTargets = this.harvestHistory.length;
    const activeTargets = this.harvestTargets.filter(t => t.enabled && !t.triggered).length;

    return {
      totalHarvested: totalHarvested,
      totalHarvestedUSD: totalHarvested * 200,
      completedTargets,
      activeTargets,
      nextHarvest: this.getNextHarvestInfo(),
      recentHarvests: this.harvestHistory.slice(-5).reverse()
    };
  }

  public getStatus() {
    return {
      isActive: this.isActive,
      currentCapital: this.currentCapital,
      targets: this.harvestTargets.map(t => ({
        id: t.id,
        threshold: t.threshold,
        percentage: t.percentage,
        enabled: t.enabled,
        triggered: t.triggered,
        progress: Math.min((this.currentCapital / t.threshold) * 100, 100)
      })),
      summary: this.getHarvestSummary()
    };
  }

  public enable(): void {
    this.isActive = true;
    console.log('✅ Profit Harvest Scheduler activated');
  }

  public disable(): void {
    this.isActive = false;
    console.log('⏸️ Profit Harvest Scheduler deactivated');
  }
}

export const profitHarvestScheduler = new ProfitHarvestScheduler();
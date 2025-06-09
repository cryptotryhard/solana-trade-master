import { signalOptimizer } from './signal-optimizer';
import { adaptiveStrategyEngine } from './adaptive-strategy-engine';

interface ReinforcementCycle {
  id: string;
  startTime: Date;
  endTime?: Date;
  signalPerformance: Map<string, number>;
  weightAdjustments: Map<string, number>;
  overallImprovement: number;
  cycleType: 'learning' | 'exploitation' | 'exploration';
}

interface OptimizationTarget {
  signalId: string;
  currentWeight: number;
  targetWeight: number;
  performanceRatio: number;
  adjustmentReason: string;
}

class ReinforcementOptimizer {
  private optimizationCycles: ReinforcementCycle[] = [];
  private isOptimizing: boolean = false;
  private optimizationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private lastOptimization: Date | null = null;
  private performanceThreshold: number = 0.05; // 5% improvement threshold
  private explorationRate: number = 0.1; // 10% exploration vs exploitation

  constructor() {
    this.startReinforcementLoop();
    console.log('🔄 Reinforcement Optimizer initialized with 24-hour cycles');
  }

  private startReinforcementLoop(): void {
    setInterval(async () => {
      if (this.shouldOptimize()) {
        await this.performReinforcementOptimization();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private shouldOptimize(): boolean {
    if (this.isOptimizing) return false;
    
    if (!this.lastOptimization) return true;
    
    const timeSinceLastOptimization = Date.now() - this.lastOptimization.getTime();
    return timeSinceLastOptimization >= this.optimizationInterval;
  }

  async performReinforcementOptimization(): Promise<void> {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    this.lastOptimization = new Date();

    console.log('🎯 Starting 24-hour reinforcement optimization cycle...');

    try {
      // Get comprehensive signal performance data
      const optimizationReport = await signalOptimizer.getSignalOptimizationReport();
      const currentWeights = adaptiveStrategyEngine.getCurrentWeights();
      
      // Determine cycle type based on recent performance
      const cycleType = this.determineCycleType(optimizationReport);
      
      // Create new reinforcement cycle
      const cycle: ReinforcementCycle = {
        id: `cycle_${Date.now()}`,
        startTime: new Date(),
        signalPerformance: new Map(),
        weightAdjustments: new Map(),
        overallImprovement: 0,
        cycleType
      };

      // Analyze signal performance and determine adjustments
      const optimizationTargets = await this.analyzeSignalPerformance(optimizationReport, cycleType);
      
      // Apply reinforcement learning adjustments
      const adjustments = await this.calculateReinforcementAdjustments(optimizationTargets, cycleType);
      
      // Execute weight adjustments
      await this.applyWeightAdjustments(adjustments);
      
      // Record cycle results
      cycle.endTime = new Date();
      cycle.weightAdjustments = adjustments;
      cycle.overallImprovement = this.calculateOverallImprovement(optimizationReport);
      
      this.optimizationCycles.push(cycle);
      
      // Log optimization results
      this.logOptimizationResults(cycle, optimizationTargets);
      
      // Trigger signal weight optimization
      await signalOptimizer.optimizeSignalWeights();
      
    } catch (error) {
      console.error('Failed to perform reinforcement optimization:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private determineCycleType(report: any): 'learning' | 'exploitation' | 'exploration' {
    const avgPerformance = report.topPerformers.length > 0 
      ? report.topPerformers.reduce((sum: number, signal: any) => sum + signal.metrics.avgROI, 0) / report.topPerformers.length
      : 0;

    // Exploration: when performance is poor or we need to discover new patterns
    if (avgPerformance < 5 || Math.random() < this.explorationRate) {
      return 'exploration';
    }
    
    // Learning: when we have mixed signals and need to optimize
    if (report.worstPerformers.length > report.topPerformers.length) {
      return 'learning';
    }
    
    // Exploitation: when we have clear winners and want to maximize
    return 'exploitation';
  }

  private async analyzeSignalPerformance(report: any, cycleType: string): Promise<OptimizationTarget[]> {
    const targets: OptimizationTarget[] = [];
    const allSignals = await signalOptimizer.getSignalSubtypes();

    for (const signal of allSignals) {
      if (signal.metrics.totalTrades < 2) continue; // Skip signals with insufficient data

      const performanceRatio = signal.metrics.avgROI / Math.max(signal.metrics.maxDrawdown, 1);
      let targetWeight = signal.weight;
      let adjustmentReason = 'No adjustment needed';

      // Apply cycle-specific logic
      switch (cycleType) {
        case 'exploitation':
          // Boost high performers, reduce poor performers
          if (signal.metrics.avgROI > 10 && signal.metrics.winRate > 70) {
            targetWeight = Math.min(signal.weight * 1.3, 0.8);
            adjustmentReason = 'Boosting high performer';
          } else if (signal.metrics.avgROI < -5) {
            targetWeight = Math.max(signal.weight * 0.7, 0.05);
            adjustmentReason = 'Reducing poor performer';
          }
          break;

        case 'learning':
          // Moderate adjustments based on win rate and consistency
          if (signal.metrics.winRate > 60 && performanceRatio > 2) {
            targetWeight = Math.min(signal.weight * 1.15, 0.6);
            adjustmentReason = 'Rewarding consistency';
          } else if (signal.metrics.winRate < 40) {
            targetWeight = Math.max(signal.weight * 0.85, 0.1);
            adjustmentReason = 'Penalizing inconsistency';
          }
          break;

        case 'exploration':
          // Give underutilized signals a chance, reduce overweight signals
          if (signal.weight < 0.1 && signal.metrics.totalTrades > 0) {
            targetWeight = Math.min(signal.weight * 1.5, 0.3);
            adjustmentReason = 'Exploring underutilized signal';
          } else if (signal.weight > 0.5) {
            targetWeight = Math.max(signal.weight * 0.9, 0.3);
            adjustmentReason = 'Reducing overweight signal';
          }
          break;
      }

      if (Math.abs(targetWeight - signal.weight) > 0.01) {
        targets.push({
          signalId: signal.id,
          currentWeight: signal.weight,
          targetWeight,
          performanceRatio,
          adjustmentReason
        });
      }
    }

    return targets;
  }

  private async calculateReinforcementAdjustments(
    targets: OptimizationTarget[], 
    cycleType: string
  ): Promise<Map<string, number>> {
    const adjustments = new Map<string, number>();
    
    for (const target of targets) {
      // Apply reinforcement learning dampening to prevent oscillation
      const learningRate = this.getLearningRate(cycleType);
      const adjustment = (target.targetWeight - target.currentWeight) * learningRate;
      
      adjustments.set(target.signalId, target.currentWeight + adjustment);
    }

    return adjustments;
  }

  private getLearningRate(cycleType: string): number {
    switch (cycleType) {
      case 'exploration': return 0.3; // More aggressive changes
      case 'learning': return 0.2; // Moderate changes
      case 'exploitation': return 0.15; // Conservative changes
      default: return 0.2;
    }
  }

  private async applyWeightAdjustments(adjustments: Map<string, number>): Promise<void> {
    const allSignals = await signalOptimizer.getSignalSubtypes();
    
    for (const signal of allSignals) {
      const newWeight = adjustments.get(signal.id);
      if (newWeight !== undefined) {
        signal.weight = Math.max(0.05, Math.min(0.8, newWeight));
        signal.lastUpdated = new Date();
      }
    }

    console.log(`⚖️ Applied weight adjustments to ${adjustments.size} signals`);
  }

  private calculateOverallImprovement(report: any): number {
    const avgTopPerformance = report.topPerformers.length > 0
      ? report.topPerformers.reduce((sum: number, signal: any) => sum + signal.metrics.avgROI, 0) / report.topPerformers.length
      : 0;

    const avgWorstPerformance = report.worstPerformers.length > 0
      ? report.worstPerformers.reduce((sum: number, signal: any) => sum + signal.metrics.avgROI, 0) / report.worstPerformers.length
      : 0;

    return avgTopPerformance - Math.abs(avgWorstPerformance);
  }

  private logOptimizationResults(cycle: ReinforcementCycle, targets: OptimizationTarget[]): void {
    console.log(`🎯 Reinforcement Optimization Complete:`);
    console.log(`   Cycle Type: ${cycle.cycleType.toUpperCase()}`);
    console.log(`   Duration: ${cycle.endTime!.getTime() - cycle.startTime.getTime()}ms`);
    console.log(`   Signals Adjusted: ${cycle.weightAdjustments.size}`);
    console.log(`   Overall Improvement: ${cycle.overallImprovement.toFixed(2)}%`);
    
    if (targets.length > 0) {
      console.log(`   Top Adjustments:`);
      targets.slice(0, 3).forEach(target => {
        const change = ((target.targetWeight - target.currentWeight) / target.currentWeight * 100).toFixed(1);
        console.log(`     ${target.signalId}: ${change}% (${target.adjustmentReason})`);
      });
    }
  }

  async getOptimizationHistory(): Promise<ReinforcementCycle[]> {
    return this.optimizationCycles.slice(-10); // Return last 10 cycles
  }

  async getOptimizationStatus(): Promise<{
    isOptimizing: boolean;
    lastOptimization: Date | null;
    nextOptimization: Date | null;
    cycleCount: number;
    avgImprovement: number;
  }> {
    const nextOptimization = this.lastOptimization 
      ? new Date(this.lastOptimization.getTime() + this.optimizationInterval)
      : new Date();

    const avgImprovement = this.optimizationCycles.length > 0
      ? this.optimizationCycles.reduce((sum, cycle) => sum + cycle.overallImprovement, 0) / this.optimizationCycles.length
      : 0;

    return {
      isOptimizing: this.isOptimizing,
      lastOptimization: this.lastOptimization,
      nextOptimization,
      cycleCount: this.optimizationCycles.length,
      avgImprovement
    };
  }

  setOptimizationInterval(hours: number): void {
    this.optimizationInterval = hours * 60 * 60 * 1000;
    console.log(`🔄 Reinforcement optimization interval set to ${hours} hours`);
  }

  setExplorationRate(rate: number): void {
    this.explorationRate = Math.max(0, Math.min(1, rate));
    console.log(`🎲 Exploration rate set to ${(this.explorationRate * 100).toFixed(1)}%`);
  }

  async forceOptimization(): Promise<void> {
    if (!this.isOptimizing) {
      console.log('🚀 Forcing immediate reinforcement optimization...');
      await this.performReinforcementOptimization();
    }
  }
}

export const reinforcementOptimizer = new ReinforcementOptimizer();
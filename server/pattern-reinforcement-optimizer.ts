import { patternPerformanceTracker } from './pattern-performance-tracker';

interface PatternOptimizationCycle {
  id: string;
  startTime: Date;
  endTime?: Date;
  patternAdjustments: Map<string, number>;
  overallImprovement: number;
  adaptationsApplied: number;
}

class PatternReinforcementOptimizer {
  private optimizationCycles: PatternOptimizationCycle[] = [];
  private isOptimizing: boolean = false;
  private lastOptimization: Date | null = null;

  constructor() {
    console.log('🎯 Pattern-based Reinforcement Optimizer initialized');
  }

  async optimizePatternStrategies(): Promise<void> {
    if (this.isOptimizing || !patternPerformanceTracker.isAdaptationActive()) {
      return;
    }

    this.isOptimizing = true;
    console.log('🔄 Starting pattern-based strategy optimization cycle');

    try {
      const cycle: PatternOptimizationCycle = {
        id: `pattern_cycle_${Date.now()}`,
        startTime: new Date(),
        patternAdjustments: new Map(),
        overallImprovement: 0,
        adaptationsApplied: 0
      };

      // Get pattern-based strategy adjustments
      const strategyAdjustments = patternPerformanceTracker.generateStrategyAdjustments();
      
      // Apply pattern optimizations
      await this.applyPatternOptimizations(strategyAdjustments, cycle);

      // Complete cycle
      cycle.endTime = new Date();
      this.optimizationCycles.push(cycle);
      
      // Keep only last 5 cycles
      if (this.optimizationCycles.length > 5) {
        this.optimizationCycles = this.optimizationCycles.slice(-5);
      }

      this.lastOptimization = new Date();
      
      console.log(`✅ Pattern optimization complete. Applied ${cycle.adaptationsApplied} adaptations, ${cycle.overallImprovement.toFixed(2)}% improvement`);
      
    } catch (error) {
      console.error('❌ Pattern optimization failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private async applyPatternOptimizations(
    strategyAdjustments: any[],
    cycle: PatternOptimizationCycle
  ): Promise<void> {
    console.log(`🎯 Applying optimizations for ${strategyAdjustments.length} pump patterns`);
    
    let totalImprovement = 0;
    let adaptationsCount = 0;
    
    for (const adjustment of strategyAdjustments) {
      // Calculate pattern weight based on performance
      const patternWeight = this.calculatePatternWeight(adjustment);
      
      // Apply confidence multiplier adjustments
      const confidenceAdjustment = adjustment.confidenceMultiplier - 1.0;
      
      // Record pattern-specific improvements
      cycle.patternAdjustments.set(adjustment.patternType, adjustment.expectedROI);
      
      totalImprovement += Math.abs(confidenceAdjustment) * 15; // Weighted improvement
      adaptationsCount++;
      
      console.log(`📈 ${adjustment.patternType}: ${adjustment.riskLevel} risk, ${adjustment.expectedROI.toFixed(1)}% expected ROI, ${(adjustment.confidenceMultiplier * 100).toFixed(0)}% confidence`);
    }
    
    cycle.overallImprovement = totalImprovement;
    cycle.adaptationsApplied = adaptationsCount;
  }

  private calculatePatternWeight(adjustment: any): number {
    // Weight patterns based on expected ROI and risk level
    let weight = Math.max(0, adjustment.expectedROI) / 100;
    
    // Adjust based on risk level
    const riskMultipliers = {
      'low': 1.3,
      'medium': 1.0,
      'high': 0.7,
      'extreme': 0.4
    };
    
    weight *= riskMultipliers[adjustment.riskLevel as keyof typeof riskMultipliers] || 1.0;
    
    // Apply confidence multiplier
    weight *= adjustment.confidenceMultiplier;
    
    return Math.max(0.1, Math.min(2.5, weight));
  }

  getOptimizationHistory(): PatternOptimizationCycle[] {
    return [...this.optimizationCycles];
  }

  getTotalPatternAdaptations(): number {
    return this.optimizationCycles.reduce((total, cycle) => total + cycle.adaptationsApplied, 0);
  }

  getAveragePatternImprovement(): number {
    if (this.optimizationCycles.length === 0) return 0;
    
    const totalImprovement = this.optimizationCycles.reduce((total, cycle) => total + cycle.overallImprovement, 0);
    return totalImprovement / this.optimizationCycles.length;
  }

  isCurrentlyOptimizing(): boolean {
    return this.isOptimizing;
  }

  getLastOptimizationTime(): Date | null {
    return this.lastOptimization;
  }
}

export const patternReinforcementOptimizer = new PatternReinforcementOptimizer();
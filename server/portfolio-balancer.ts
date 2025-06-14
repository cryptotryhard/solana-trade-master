/**
 * PORTFOLIO BALANCER
 * Advanced position management with automatic profit rebalancing and loss cutting
 */

interface BalancerPosition {
  mint: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  entryTime: number;
  lastUpdate: number;
  entryAmount: number;
  currentValue: number;
  pnlPercent: number;
  daysSinceEntry: number;
  isStagnant: boolean;
}

interface BalancerAction {
  type: 'LIQUIDATE' | 'REBALANCE' | 'HOLD';
  reason: string;
  mint: string;
  symbol: string;
  priority: number;
  expectedAction: string;
}

interface BalancerMetrics {
  totalPositions: number;
  profitablePositions: number;
  losingPositions: number;
  stagnantPositions: number;
  totalUnrealizedPnL: number;
  averageHoldTime: number;
  liquidationsToday: number;
  rebalancesToday: number;
  lastRebalance: number;
}

export class PortfolioBalancer {
  private positions: Map<string, BalancerPosition> = new Map();
  private liquidationThreshold: number = -30; // -30% loss triggers liquidation
  private stagnationDays: number = 3; // 3 days without significant movement
  private profitRebalanceThreshold: number = 100; // 2x profit triggers rebalancing
  private minMovementPercent: number = 5; // Minimum 5% movement to not be stagnant
  private isActive: boolean = true;
  private metrics: BalancerMetrics = {
    totalPositions: 0,
    profitablePositions: 0,
    losingPositions: 0,
    stagnantPositions: 0,
    totalUnrealizedPnL: 0,
    averageHoldTime: 0,
    liquidationsToday: 0,
    rebalancesToday: 0,
    lastRebalance: Date.now()
  };

  constructor() {
    console.log('🎯 Portfolio Balancer initialized');
    this.startContinuousMonitoring();
  }

  /**
   * Add or update position in balancer
   */
  public addPosition(mint: string, symbol: string, entryPrice: number, entryAmount: number): void {
    const position: BalancerPosition = {
      mint,
      symbol,
      entryPrice,
      currentPrice: entryPrice,
      entryTime: Date.now(),
      lastUpdate: Date.now(),
      entryAmount,
      currentValue: entryAmount,
      pnlPercent: 0,
      daysSinceEntry: 0,
      isStagnant: false
    };

    this.positions.set(mint, position);
    console.log(`🎯 Added position to balancer: ${symbol} (${mint.slice(0, 8)}...)`);
    this.updateMetrics();
  }

  /**
   * Update position price and calculate PnL
   */
  public updatePosition(mint: string, currentPrice: number): void {
    const position = this.positions.get(mint);
    if (!position) return;

    const previousPrice = position.currentPrice;
    position.currentPrice = currentPrice;
    position.currentValue = (currentPrice / position.entryPrice) * position.entryAmount;
    position.pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
    position.daysSinceEntry = (Date.now() - position.entryTime) / (1000 * 60 * 60 * 24);
    position.lastUpdate = Date.now();

    // Check if position is stagnant (less than 5% movement in last 24h)
    const priceMovement = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
    position.isStagnant = position.daysSinceEntry >= 1 && priceMovement < this.minMovementPercent;

    this.positions.set(mint, position);
    this.updateMetrics();
  }

  /**
   * Remove position from balancer
   */
  public removePosition(mint: string): void {
    this.positions.delete(mint);
    console.log(`🎯 Removed position from balancer: ${mint.slice(0, 8)}...`);
    this.updateMetrics();
  }

  /**
   * Analyze all positions and generate recommended actions
   */
  public analyzePositions(): BalancerAction[] {
    const actions: BalancerAction[] = [];

    for (const [mint, position] of this.positions) {
      // Check for liquidation conditions
      if (position.pnlPercent <= this.liquidationThreshold) {
        actions.push({
          type: 'LIQUIDATE',
          reason: `Loss threshold reached: ${position.pnlPercent.toFixed(1)}%`,
          mint,
          symbol: position.symbol,
          priority: 1,
          expectedAction: `Sell ${position.symbol} to cut losses`
        });
        continue;
      }

      // Check for stagnation liquidation
      if (position.daysSinceEntry >= this.stagnationDays && position.isStagnant) {
        actions.push({
          type: 'LIQUIDATE',
          reason: `Stagnant for ${position.daysSinceEntry.toFixed(1)} days`,
          mint,
          symbol: position.symbol,
          priority: 2,
          expectedAction: `Sell ${position.symbol} - no momentum`
        });
        continue;
      }

      // Check for profit rebalancing
      if (position.pnlPercent >= this.profitRebalanceThreshold) {
        actions.push({
          type: 'REBALANCE',
          reason: `High profit: ${position.pnlPercent.toFixed(1)}% - reinvest gains`,
          mint,
          symbol: position.symbol,
          priority: 3,
          expectedAction: `Sell 50% of ${position.symbol}, reinvest in new opportunities`
        });
        continue;
      }

      // Position is healthy - hold
      actions.push({
        type: 'HOLD',
        reason: `Healthy position: ${position.pnlPercent.toFixed(1)}%`,
        mint,
        symbol: position.symbol,
        priority: 4,
        expectedAction: `Continue holding ${position.symbol}`
      });
    }

    // Sort by priority (1 = highest priority)
    return actions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute automatic rebalancing based on analysis
   */
  public async executeAutomaticRebalancing(): Promise<{
    liquidated: string[];
    rebalanced: string[];
    errors: string[];
  }> {
    const actions = this.analyzePositions();
    const liquidated: string[] = [];
    const rebalanced: string[] = [];
    const errors: string[] = [];

    console.log('🎯 Executing automatic portfolio rebalancing...');

    for (const action of actions) {
      try {
        if (action.type === 'LIQUIDATE') {
          // Execute liquidation
          await this.executeLiquidation(action.mint, action.symbol, action.reason);
          liquidated.push(`${action.symbol}: ${action.reason}`);
          this.metrics.liquidationsToday++;
        } else if (action.type === 'REBALANCE') {
          // Execute partial sale and reinvestment
          await this.executeRebalancing(action.mint, action.symbol, action.reason);
          rebalanced.push(`${action.symbol}: ${action.reason}`);
          this.metrics.rebalancesToday++;
        }
      } catch (error) {
        const errorMsg = `Failed to ${action.type.toLowerCase()} ${action.symbol}: ${(error as Error).message}`;
        errors.push(errorMsg);
        console.error('❌', errorMsg);
      }
    }

    this.metrics.lastRebalance = Date.now();
    
    console.log(`🎯 Rebalancing complete: ${liquidated.length} liquidated, ${rebalanced.length} rebalanced`);
    
    return { liquidated, rebalanced, errors };
  }

  /**
   * Execute position liquidation
   */
  private async executeLiquidation(mint: string, symbol: string, reason: string): Promise<void> {
    console.log(`💰 LIQUIDATING: ${symbol} - ${reason}`);
    
    // Here would be actual Jupiter swap execution
    // For now, simulate the liquidation
    await this.simulateSwapExecution(mint, 'SELL', 100);
    
    // Remove from positions
    this.removePosition(mint);
    
    console.log(`✅ Liquidated ${symbol} successfully`);
  }

  /**
   * Execute position rebalancing (partial sale)
   */
  private async executeRebalancing(mint: string, symbol: string, reason: string): Promise<void> {
    console.log(`⚖️ REBALANCING: ${symbol} - ${reason}`);
    
    const position = this.positions.get(mint);
    if (!position) return;

    // Sell 50% of position to lock in profits
    await this.simulateSwapExecution(mint, 'PARTIAL_SELL', 50);
    
    // Update position size
    position.currentValue *= 0.5;
    position.entryAmount *= 0.5;
    this.positions.set(mint, position);
    
    console.log(`✅ Rebalanced ${symbol} - 50% sold for profit taking`);
  }

  /**
   * Simulate swap execution (would be replaced with real Jupiter calls)
   */
  private async simulateSwapExecution(mint: string, action: string, percentage: number): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🔄 ${action}: ${mint.slice(0, 8)}... (${percentage}%)`);
    // This would execute actual Jupiter swap
  }

  /**
   * Update portfolio metrics
   */
  private updateMetrics(): void {
    const positions = Array.from(this.positions.values());
    
    this.metrics.totalPositions = positions.length;
    this.metrics.profitablePositions = positions.filter(p => p.pnlPercent > 0).length;
    this.metrics.losingPositions = positions.filter(p => p.pnlPercent < 0).length;
    this.metrics.stagnantPositions = positions.filter(p => p.isStagnant).length;
    this.metrics.totalUnrealizedPnL = positions.reduce((sum, p) => sum + p.pnlPercent, 0);
    this.metrics.averageHoldTime = positions.length > 0 
      ? positions.reduce((sum, p) => sum + p.daysSinceEntry, 0) / positions.length 
      : 0;
  }

  /**
   * Start continuous monitoring and rebalancing
   */
  private startContinuousMonitoring(): void {
    setInterval(async () => {
      if (!this.isActive) return;

      try {
        // Update all position prices (would get from price API)
        await this.updateAllPositionPrices();
        
        // Check if rebalancing is needed (every 30 minutes)
        const timeSinceLastRebalance = Date.now() - this.metrics.lastRebalance;
        if (timeSinceLastRebalance > 30 * 60 * 1000) {
          await this.executeAutomaticRebalancing();
        }
      } catch (error) {
        console.error('❌ Portfolio balancer error:', (error as Error).message);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Update all position prices from market data
   */
  private async updateAllPositionPrices(): Promise<void> {
    // This would fetch real prices from Jupiter/Birdeye API
    for (const [mint, position] of this.positions) {
      // Simulate price update with random movement
      const randomChange = (Math.random() - 0.5) * 0.1; // ±5% random change
      const newPrice = position.currentPrice * (1 + randomChange);
      this.updatePosition(mint, newPrice);
    }
  }

  /**
   * Get current balancer status and metrics
   */
  public getBalancerStatus(): {
    isActive: boolean;
    metrics: BalancerMetrics;
    positions: BalancerPosition[];
    pendingActions: BalancerAction[];
  } {
    return {
      isActive: this.isActive,
      metrics: this.metrics,
      positions: Array.from(this.positions.values()),
      pendingActions: this.analyzePositions()
    };
  }

  /**
   * Enable or disable balancer
   */
  public setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🎯 Portfolio Balancer ${active ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Configure balancer parameters
   */
  public configure(config: {
    liquidationThreshold?: number;
    stagnationDays?: number;
    profitRebalanceThreshold?: number;
    minMovementPercent?: number;
  }): void {
    if (config.liquidationThreshold !== undefined) {
      this.liquidationThreshold = config.liquidationThreshold;
    }
    if (config.stagnationDays !== undefined) {
      this.stagnationDays = config.stagnationDays;
    }
    if (config.profitRebalanceThreshold !== undefined) {
      this.profitRebalanceThreshold = config.profitRebalanceThreshold;
    }
    if (config.minMovementPercent !== undefined) {
      this.minMovementPercent = config.minMovementPercent;
    }

    console.log('🎯 Portfolio Balancer configuration updated');
  }
}

// Export singleton instance
export const portfolioBalancer = new PortfolioBalancer();
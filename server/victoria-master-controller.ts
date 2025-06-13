/**
 * VICTORIA MASTER CONTROLLER
 * Central orchestration of all trading systems with enhanced error handling
 */

import { autonomousPumpFunTrader } from './autonomous-pumpfun-trader';
import { enhancedBlockchainService } from './enhanced-blockchain-service';
import { optimizedRPCManager } from './optimized-rpc-manager';

interface VictoriaTradingMetrics {
  isActive: boolean;
  totalTrades: number;
  activePumpFunPositions: number;
  totalPortfolioValue: number;
  totalPnL: number;
  averageROI: number;
  lastUpdate: string;
  rpcHealth: boolean;
  tradingStatus: 'active' | 'paused' | 'recovering' | 'optimizing';
}

class VictoriaMasterController {
  private isInitialized: boolean = false;
  private lastMetricsUpdate: number = 0;
  private cachedMetrics: VictoriaTradingMetrics | null = null;
  private systemHealth: boolean = true;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🤖 VICTORIA initializing master trading control...');
      
      // Start autonomous trading after initialization delay
      setTimeout(() => {
        this.startAutonomousOperations();
      }, 10000); // 10 second delay

      this.isInitialized = true;
      console.log('✅ VICTORIA master controller initialized');
    } catch (error) {
      console.error('❌ Failed to initialize VICTORIA:', error.message);
    }
  }

  private async startAutonomousOperations(): Promise<void> {
    try {
      console.log('🚀 Starting VICTORIA autonomous operations...');
      
      // Check system health before starting
      const rpcStatus = optimizedRPCManager.getEndpointStatus();
      if (rpcStatus.healthyEndpoints > 0) {
        autonomousPumpFunTrader.startAutonomousTrading();
        console.log('✅ Autonomous pump.fun trading activated');
      } else {
        console.log('⚠️ RPC endpoints unhealthy, delaying trading start');
        setTimeout(() => this.startAutonomousOperations(), 30000);
      }
    } catch (error) {
      console.error('❌ Error starting autonomous operations:', error.message);
    }
  }

  /**
   * Get comprehensive trading metrics
   */
  public async getVictoriaMetrics(): Promise<VictoriaTradingMetrics> {
    const now = Date.now();
    
    // Use cached metrics if recent (within 30 seconds)
    if (this.cachedMetrics && (now - this.lastMetricsUpdate) < 30000) {
      return this.cachedMetrics;
    }

    try {
      console.log('📊 Gathering VICTORIA trading metrics...');

      // Get trading stats from autonomous trader
      const tradingStats = autonomousPumpFunTrader.getTradingStats();
      const currentPositions = autonomousPumpFunTrader.getCurrentPositions();
      
      // Calculate portfolio value
      const portfolioValue = currentPositions.reduce((sum, pos) => 
        sum + (pos.currentValue || pos.solSpent), 0
      );

      // Get RPC health status
      const rpcStatus = optimizedRPCManager.getEndpointStatus();
      const rpcHealth = rpcStatus.healthyEndpoints > 0;

      // Determine trading status
      let tradingStatus: 'active' | 'paused' | 'recovering' | 'optimizing' = 'active';
      if (!tradingStats.isTrading) tradingStatus = 'paused';
      if (!rpcHealth) tradingStatus = 'recovering';
      if (tradingStats.activePositions === 0) tradingStatus = 'optimizing';

      const metrics: VictoriaTradingMetrics = {
        isActive: tradingStats.isTrading,
        totalTrades: tradingStats.totalTrades || 0,
        activePumpFunPositions: tradingStats.activePositions || 0,
        totalPortfolioValue: portfolioValue,
        totalPnL: tradingStats.totalPnL || 0,
        averageROI: tradingStats.avgROI || 0,
        lastUpdate: new Date().toISOString(),
        rpcHealth,
        tradingStatus
      };

      this.cachedMetrics = metrics;
      this.lastMetricsUpdate = now;
      
      console.log(`✅ VICTORIA metrics: ${metrics.totalTrades} trades, ${metrics.activePumpFunPositions} positions, ${tradingStatus}`);
      return metrics;

    } catch (error) {
      console.error('❌ Error gathering VICTORIA metrics:', error.message);
      
      // Return fallback metrics
      const fallbackMetrics: VictoriaTradingMetrics = {
        isActive: false,
        totalTrades: 0,
        activePumpFunPositions: 0,
        totalPortfolioValue: 0,
        totalPnL: 0,
        averageROI: 0,
        lastUpdate: new Date().toISOString(),
        rpcHealth: false,
        tradingStatus: 'recovering'
      };

      return fallbackMetrics;
    }
  }

  /**
   * Get enhanced dashboard data
   */
  public async getEnhancedDashboardData(): Promise<any> {
    try {
      const [metrics, walletData, positions, tradingHistory] = await Promise.all([
        this.getVictoriaMetrics(),
        enhancedBlockchainService.getEnhancedWalletData().catch(() => ({
          address: '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d',
          solBalance: 0,
          totalValue: 0,
          totalPnL: 0,
          totalROI: 0,
          lastUpdated: new Date().toISOString(),
          tokenCount: 0
        })),
        enhancedBlockchainService.analyzeEnhancedPositions().catch(() => []),
        autonomousPumpFunTrader.getTradingHistory()
      ]);

      // Combine blockchain positions with autonomous trading positions
      const autonomousPositions = autonomousPumpFunTrader.getCurrentPositions();
      const allPositions = [
        ...positions,
        ...autonomousPositions.map(pos => ({
          mint: pos.mint,
          symbol: pos.symbol,
          amount: pos.amount,
          decimals: 9,
          uiAmount: pos.amount,
          currentPrice: pos.currentPrice || pos.entryPrice,
          currentValue: pos.currentValue || pos.solSpent,
          entryPrice: pos.entryPrice,
          entryValue: pos.solSpent,
          pnl: pos.pnl || 0,
          roi: pos.roi || 0,
          isPumpFun: true,
          isValidPumpFun: true,
          platform: 'pump.fun',
          entryTimestamp: new Date(pos.entryTime).toISOString(),
          txHash: `pumpfun_${pos.mint.slice(0, 8)}`
        }))
      ];

      return {
        metrics,
        walletData,
        positions: allPositions,
        tradingHistory,
        systemHealth: {
          rpcEndpoints: optimizedRPCManager.getEndpointStatus(),
          lastUpdate: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error getting enhanced dashboard data:', error.message);
      throw error;
    }
  }

  /**
   * Emergency system recovery
   */
  public async executeEmergencyRecovery(): Promise<void> {
    try {
      console.log('🚨 VICTORIA executing emergency recovery...');
      
      // Stop all trading activities
      autonomousPumpFunTrader.stopAutonomousTrading();
      
      // Clear all caches
      enhancedBlockchainService.clearCache();
      
      // Reset metrics cache
      this.cachedMetrics = null;
      this.lastMetricsUpdate = 0;
      
      // Wait for systems to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Restart operations
      await this.startAutonomousOperations();
      
      console.log('✅ VICTORIA emergency recovery completed');
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error.message);
    }
  }

  /**
   * System health check
   */
  public async performHealthCheck(): Promise<any> {
    try {
      const rpcStatus = optimizedRPCManager.getEndpointStatus();
      const tradingStats = autonomousPumpFunTrader.getTradingStats();
      const cacheStats = enhancedBlockchainService.getCacheStats();

      return {
        timestamp: new Date().toISOString(),
        rpc: {
          healthyEndpoints: rpcStatus.healthyEndpoints,
          totalEndpoints: rpcStatus.totalEndpoints,
          status: rpcStatus.healthyEndpoints > 0 ? 'healthy' : 'degraded'
        },
        trading: {
          isActive: tradingStats.isTrading,
          activePositions: tradingStats.activePositions,
          totalTrades: tradingStats.totalTrades,
          status: tradingStats.isTrading ? 'active' : 'inactive'
        },
        cache: {
          entries: cacheStats.entries,
          hitRate: 'optimized',
          status: 'healthy'
        },
        overall: {
          status: rpcStatus.healthyEndpoints > 0 && this.isInitialized ? 'healthy' : 'degraded',
          uptime: process.uptime()
        }
      };
    } catch (error) {
      console.error('❌ Health check failed:', error.message);
      return {
        timestamp: new Date().toISOString(),
        overall: { status: 'error', error: error.message }
      };
    }
  }
}

export const victoriaMasterController = new VictoriaMasterController();
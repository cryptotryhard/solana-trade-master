import { EventEmitter } from 'events';
import { copyTradingEngine } from './copytrading-engine';

interface TopWallet {
  id: string;
  address: string;
  winRate: number;
  totalTrades: number;
  avgROI: number;
  recentProfit: number;
  followedAt: Date;
  isActive: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  tags: string[];
}

interface AutoFollowConfig {
  enabled: boolean;
  minWinRate: number;
  minTrades: number;
  minROI: number;
  maxWallets: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  autoRemoveUnderperformers: boolean;
  notificationsEnabled: boolean;
}

class AlphaAutoFollowEngine extends EventEmitter {
  private followedWallets: Map<string, TopWallet> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;
  
  private config: AutoFollowConfig = {
    enabled: true,
    minWinRate: 70,
    minTrades: 10,
    minROI: 25,
    maxWallets: 5,
    riskTolerance: 'moderate',
    autoRemoveUnderperformers: true,
    notificationsEnabled: true
  };

  constructor() {
    super();
    this.initializeWithSampleData();
    this.startAutoFollow();
  }

  private initializeWithSampleData(): void {
    const sampleWallets: Omit<TopWallet, 'id' | 'followedAt'>[] = [
      {
        address: 'ALPHA1ProTrader789XYZ',
        winRate: 87.5,
        totalTrades: 45,
        avgROI: 145.2,
        recentProfit: 12.75,
        isActive: true,
        riskLevel: 'medium',
        tags: ['pro_trader', 'consistent', 'momentum_expert']
      },
      {
        address: 'WHALE2MegaGains456ABC',
        winRate: 92.1,
        totalTrades: 28,
        avgROI: 234.8,
        recentProfit: 8.95,
        isActive: true,
        riskLevel: 'high',
        tags: ['whale', 'high_roi', 'risk_taker']
      },
      {
        address: 'SMART3SafePlayer123DEF',
        winRate: 78.3,
        totalTrades: 67,
        avgROI: 89.4,
        recentProfit: 6.32,
        isActive: true,
        riskLevel: 'low',
        tags: ['safe_player', 'volume_trader', 'steady_gains']
      }
    ];

    sampleWallets.forEach((wallet, index) => {
      const topWallet: TopWallet = {
        ...wallet,
        id: `auto_wallet_${Date.now()}_${index}`,
        followedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      };
      
      this.followedWallets.set(topWallet.address, topWallet);
    });
  }

  private startAutoFollow(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }

    this.scanInterval = setInterval(() => {
      if (this.config.enabled) {
        this.scanForTopPerformers();
        if (this.config.autoRemoveUnderperformers) {
          this.removeUnderperformers();
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async scanForTopPerformers(): Promise<void> {
    try {
      // Get top performing wallets from copy trading engine
      const topWallets = await this.identifyTopPerformers();
      
      for (const wallet of topWallets) {
        if (this.shouldAutoFollow(wallet)) {
          await this.autoFollowWallet(wallet);
        }
      }
    } catch (error) {
      console.error('Error scanning for top performers:', error);
    }
  }

  private async identifyTopPerformers(): Promise<Partial<TopWallet>[]> {
    // Simulate discovering new high-performing wallets
    const mockTopPerformers: Partial<TopWallet>[] = [
      {
        address: `DISCOVERY_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        winRate: 75 + Math.random() * 20,
        totalTrades: 15 + Math.floor(Math.random() * 50),
        avgROI: 50 + Math.random() * 150,
        recentProfit: Math.random() * 20,
        riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        tags: ['discovered', 'new_talent']
      }
    ];

    return mockTopPerformers;
  }

  private shouldAutoFollow(wallet: Partial<TopWallet>): boolean {
    if (!wallet.winRate || !wallet.totalTrades || !wallet.avgROI) return false;
    if (this.followedWallets.size >= this.config.maxWallets) return false;
    if (this.followedWallets.has(wallet.address!)) return false;

    const meetsWinRate = wallet.winRate >= this.config.minWinRate;
    const meetsTradeCount = wallet.totalTrades >= this.config.minTrades;
    const meetsROI = wallet.avgROI >= this.config.minROI;
    
    const riskCompatible = this.isRiskCompatible(wallet.riskLevel!);

    return meetsWinRate && meetsTradeCount && meetsROI && riskCompatible;
  }

  private isRiskCompatible(walletRisk: 'low' | 'medium' | 'high'): boolean {
    switch (this.config.riskTolerance) {
      case 'conservative': return walletRisk === 'low';
      case 'moderate': return walletRisk === 'low' || walletRisk === 'medium';
      case 'aggressive': return true;
      default: return false;
    }
  }

  private async autoFollowWallet(wallet: Partial<TopWallet>): Promise<void> {
    const newWallet: TopWallet = {
      id: `auto_follow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      address: wallet.address!,
      winRate: wallet.winRate!,
      totalTrades: wallet.totalTrades!,
      avgROI: wallet.avgROI!,
      recentProfit: wallet.recentProfit || 0,
      followedAt: new Date(),
      isActive: true,
      riskLevel: wallet.riskLevel!,
      tags: [...(wallet.tags || []), 'auto_followed']
    };

    this.followedWallets.set(newWallet.address, newWallet);

    // Add to copy trading engine
    await copyTradingEngine.addWallet({
      address: newWallet.address,
      name: `Auto-Follow ${newWallet.winRate.toFixed(1)}%`,
      allocation: this.calculateAllocation(newWallet),
      isActive: true
    });

    this.emit('walletAutoFollowed', newWallet);

    if (this.config.notificationsEnabled) {
      console.log(`🤖 Auto-followed high-performer: ${newWallet.address} (${newWallet.winRate.toFixed(1)}% win rate)`);
    }
  }

  private calculateAllocation(wallet: TopWallet): number {
    const baseAllocation = 0.1; // 10% base
    const riskMultiplier = wallet.riskLevel === 'low' ? 1.2 : wallet.riskLevel === 'medium' ? 1.0 : 0.8;
    const performanceMultiplier = Math.min(2.0, wallet.winRate / 70);
    
    return Math.min(0.25, baseAllocation * riskMultiplier * performanceMultiplier);
  }

  private removeUnderperformers(): void {
    const threshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [address, wallet] of this.followedWallets.entries()) {
      const shouldRemove = (
        wallet.winRate < this.config.minWinRate * 0.8 || // 20% below threshold
        wallet.avgROI < this.config.minROI * 0.5 || // 50% below threshold
        wallet.followedAt.getTime() < threshold
      );

      if (shouldRemove) {
        this.unfollowWallet(address);
      }
    }
  }

  public async unfollowWallet(address: string): Promise<void> {
    const wallet = this.followedWallets.get(address);
    if (!wallet) return;

    this.followedWallets.delete(address);
    
    // Remove from copy trading engine
    await copyTradingEngine.removeWallet(address);
    
    this.emit('walletUnfollowed', wallet);

    if (this.config.notificationsEnabled) {
      console.log(`🗑️ Unfollowed underperformer: ${address}`);
    }
  }

  public getFollowedWallets(): TopWallet[] {
    return Array.from(this.followedWallets.values())
      .sort((a, b) => b.winRate - a.winRate);
  }

  public getAutoFollowStats(): {
    totalFollowed: number;
    avgWinRate: number;
    avgROI: number;
    totalProfit: number;
    activeWallets: number;
    recentlyAdded: number;
  } {
    const wallets = Array.from(this.followedWallets.values());
    const recentlyAdded = wallets.filter(w => 
      Date.now() - w.followedAt.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      totalFollowed: wallets.length,
      avgWinRate: wallets.length > 0 ? wallets.reduce((sum, w) => sum + w.winRate, 0) / wallets.length : 0,
      avgROI: wallets.length > 0 ? wallets.reduce((sum, w) => sum + w.avgROI, 0) / wallets.length : 0,
      totalProfit: wallets.reduce((sum, w) => sum + w.recentProfit, 0),
      activeWallets: wallets.filter(w => w.isActive).length,
      recentlyAdded
    };
  }

  public updateConfig(newConfig: Partial<AutoFollowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.enabled !== undefined) {
      this.isActive = newConfig.enabled;
    }
  }

  public getConfig(): AutoFollowConfig {
    return { ...this.config };
  }

  public toggleAutoFollow(enabled: boolean): void {
    this.config.enabled = enabled;
    this.isActive = enabled;
  }

  public destroy(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.removeAllListeners();
  }
}

export const alphaAutoFollowEngine = new AlphaAutoFollowEngine();
import { EventEmitter } from 'events';

interface HeatmapEntry {
  id: string;
  type: 'pattern' | 'wallet' | 'token';
  name: string;
  symbol?: string;
  profit: number; // SOL
  profitPercentage: number;
  volume: number; // SOL
  trades: number;
  winRate: number;
  avgHoldTime: number; // minutes
  hotness: number; // 0-100 (heat intensity)
  trend: 'rising' | 'falling' | 'stable';
  lastUpdate: Date;
  sparklineData: number[]; // Last 24 data points
}

interface ProfitMetrics {
  totalProfit: number;
  totalVolume: number;
  totalTrades: number;
  avgWinRate: number;
  topPerformer: HeatmapEntry | null;
  hottestItem: HeatmapEntry | null;
  period: '1h' | '6h' | '24h';
}

interface HeatmapConfig {
  updateInterval: number; // seconds
  maxEntries: number;
  minProfitThreshold: number; // SOL
  hotnessDecayRate: number; // 0-1
}

class RealTimeProfitHeatmap extends EventEmitter {
  private heatmapData: Map<string, HeatmapEntry> = new Map();
  private config: HeatmapConfig;
  private updateTimer: NodeJS.Timeout | null = null;
  private profitHistory: Array<{ timestamp: Date; entries: HeatmapEntry[] }> = [];

  constructor() {
    super();
    this.config = {
      updateInterval: 30, // 30 seconds
      maxEntries: 50,
      minProfitThreshold: 0.01, // 0.01 SOL minimum
      hotnessDecayRate: 0.95 // 5% decay per update
    };
    
    this.initializeHeatmap();
    this.startRealTimeUpdates();
  }

  private initializeHeatmap(): void {
    // Initialize with sample high-performing entries
    const sampleEntries: Omit<HeatmapEntry, 'id' | 'lastUpdate' | 'sparklineData'>[] = [
      {
        type: 'pattern',
        name: 'Volume Spike Momentum',
        profit: 2.34,
        profitPercentage: 78.3,
        volume: 12.5,
        trades: 8,
        winRate: 87.5,
        avgHoldTime: 42,
        hotness: 95,
        trend: 'rising'
      },
      {
        type: 'wallet',
        name: 'Alpha Hunter Pro',
        profit: 1.89,
        profitPercentage: 63.2,
        volume: 8.7,
        trades: 5,
        winRate: 80,
        avgHoldTime: 55,
        hotness: 88,
        trend: 'rising'
      },
      {
        type: 'token',
        name: 'BONK',
        symbol: 'BONK',
        profit: 1.45,
        profitPercentage: 45.6,
        volume: 15.2,
        trades: 12,
        winRate: 66.7,
        avgHoldTime: 38,
        hotness: 82,
        trend: 'stable'
      },
      {
        type: 'pattern',
        name: 'Social Buzz Breakout',
        profit: 1.23,
        profitPercentage: 156.7,
        volume: 3.2,
        trades: 3,
        winRate: 66.7,
        avgHoldTime: 25,
        hotness: 79,
        trend: 'rising'
      },
      {
        type: 'wallet',
        name: 'Memecoin Wizard',
        profit: 0.98,
        profitPercentage: 42.1,
        volume: 6.8,
        trades: 7,
        winRate: 71.4,
        avgHoldTime: 67,
        hotness: 75,
        trend: 'stable'
      }
    ];

    sampleEntries.forEach((entry, index) => {
      const heatmapEntry: HeatmapEntry = {
        ...entry,
        id: `entry_${index + 1}`,
        lastUpdate: new Date(),
        sparklineData: this.generateSparklineData()
      };
      
      this.heatmapData.set(heatmapEntry.id, heatmapEntry);
    });
  }

  private generateSparklineData(): number[] {
    // Generate 24 data points representing profit changes over time
    const data: number[] = [];
    let value = 50 + Math.random() * 20; // Start between 50-70
    
    for (let i = 0; i < 24; i++) {
      const change = (Math.random() - 0.5) * 10; // Random change ±5
      value = Math.max(0, Math.min(100, value + change));
      data.push(Math.round(value * 100) / 100);
    }
    
    return data;
  }

  private startRealTimeUpdates(): void {
    this.updateTimer = setInterval(() => {
      this.updateHeatmapData();
    }, this.config.updateInterval * 1000);
  }

  private updateHeatmapData(): void {
    const currentEntries = Array.from(this.heatmapData.values());
    
    // Update existing entries
    currentEntries.forEach(entry => {
      this.simulateEntryUpdate(entry);
    });
    
    // Occasionally add new entries
    if (Math.random() < 0.3 && this.heatmapData.size < this.config.maxEntries) {
      this.addRandomEntry();
    }
    
    // Remove low-performing entries
    this.pruneEntries();
    
    // Decay hotness
    this.applyHotnessDecay();
    
    // Store history snapshot
    this.storeHistorySnapshot();
    
    // Emit update event
    this.emit('heatmapUpdated', this.getHeatmapData());
  }

  private simulateEntryUpdate(entry: HeatmapEntry): void {
    // Simulate profit changes
    const profitChange = (Math.random() - 0.4) * 0.1; // Slight bias toward profit
    entry.profit = Math.max(0, entry.profit + profitChange);
    
    // Update percentage based on new profit
    entry.profitPercentage += (Math.random() - 0.5) * 5;
    entry.profitPercentage = Math.max(-50, Math.min(200, entry.profitPercentage));
    
    // Simulate volume changes
    entry.volume += (Math.random() - 0.3) * 0.5;
    entry.volume = Math.max(0.1, entry.volume);
    
    // Occasionally update trades and win rate
    if (Math.random() < 0.2) {
      entry.trades += 1;
      entry.winRate = Math.max(0, Math.min(100, entry.winRate + (Math.random() - 0.5) * 5));
    }
    
    // Update hotness based on recent performance
    if (entry.profitPercentage > 20) {
      entry.hotness = Math.min(100, entry.hotness + 2);
    } else if (entry.profitPercentage < 0) {
      entry.hotness = Math.max(0, entry.hotness - 3);
    }
    
    // Update trend
    const recentSparkline = entry.sparklineData.slice(-5);
    const trend = recentSparkline[recentSparkline.length - 1] - recentSparkline[0];
    
    if (trend > 5) entry.trend = 'rising';
    else if (trend < -5) entry.trend = 'falling';
    else entry.trend = 'stable';
    
    // Update sparkline
    entry.sparklineData.shift();
    entry.sparklineData.push(50 + entry.profitPercentage / 4);
    
    entry.lastUpdate = new Date();
  }

  private addRandomEntry(): void {
    const types: Array<'pattern' | 'wallet' | 'token'> = ['pattern', 'wallet', 'token'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const names = {
      pattern: ['Liquidity Injection', 'Whale Accumulation', 'Dev Activity Surge', 'Pump Launch'],
      wallet: ['Smart Trader X', 'Alpha Seeker', 'Profit Hunter', 'Risk Master'],
      token: ['SOLANA', 'PEPE', 'DOGE', 'SHIB', 'WIF']
    };
    
    const name = names[type][Math.floor(Math.random() * names[type].length)];
    
    const newEntry: HeatmapEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      symbol: type === 'token' ? name : undefined,
      profit: Math.random() * 0.5 + 0.1, // 0.1-0.6 SOL
      profitPercentage: Math.random() * 80 + 10, // 10-90%
      volume: Math.random() * 5 + 1, // 1-6 SOL
      trades: Math.floor(Math.random() * 5) + 1, // 1-5 trades
      winRate: Math.random() * 40 + 50, // 50-90%
      avgHoldTime: Math.floor(Math.random() * 60) + 20, // 20-80 minutes
      hotness: Math.random() * 30 + 40, // 40-70 initial hotness
      trend: 'rising',
      lastUpdate: new Date(),
      sparklineData: this.generateSparklineData()
    };
    
    this.heatmapData.set(newEntry.id, newEntry);
  }

  private pruneEntries(): void {
    const entries = Array.from(this.heatmapData.values());
    
    // Remove entries below minimum profit threshold
    entries.forEach(entry => {
      if (entry.profit < this.config.minProfitThreshold || entry.hotness < 10) {
        this.heatmapData.delete(entry.id);
      }
    });
    
    // If still too many entries, remove lowest performing ones
    if (this.heatmapData.size > this.config.maxEntries) {
      const sortedEntries = entries
        .sort((a, b) => (b.hotness * b.profitPercentage) - (a.hotness * a.profitPercentage))
        .slice(this.config.maxEntries);
      
      sortedEntries.forEach(entry => {
        this.heatmapData.delete(entry.id);
      });
    }
  }

  private applyHotnessDecay(): void {
    Array.from(this.heatmapData.values()).forEach(entry => {
      entry.hotness *= this.config.hotnessDecayRate;
      entry.hotness = Math.max(0, entry.hotness);
    });
  }

  private storeHistorySnapshot(): void {
    const snapshot = {
      timestamp: new Date(),
      entries: Array.from(this.heatmapData.values()).map(entry => ({ ...entry }))
    };
    
    this.profitHistory.push(snapshot);
    
    // Keep only last 24 hours of history (assuming updates every 30 seconds)
    const maxHistory = (24 * 60 * 60) / this.config.updateInterval;
    if (this.profitHistory.length > maxHistory) {
      this.profitHistory = this.profitHistory.slice(-maxHistory);
    }
  }

  public getHeatmapData(): HeatmapEntry[] {
    return Array.from(this.heatmapData.values())
      .sort((a, b) => b.hotness - a.hotness);
  }

  public getTopPerformers(limit: number = 10): HeatmapEntry[] {
    return Array.from(this.heatmapData.values())
      .sort((a, b) => b.profitPercentage - a.profitPercentage)
      .slice(0, limit);
  }

  public getHottestItems(limit: number = 10): HeatmapEntry[] {
    return Array.from(this.heatmapData.values())
      .sort((a, b) => b.hotness - a.hotness)
      .slice(0, limit);
  }

  public getProfitMetrics(period: '1h' | '6h' | '24h' = '24h'): ProfitMetrics {
    const entries = Array.from(this.heatmapData.values());
    
    const totalProfit = entries.reduce((sum, entry) => sum + entry.profit, 0);
    const totalVolume = entries.reduce((sum, entry) => sum + entry.volume, 0);
    const totalTrades = entries.reduce((sum, entry) => sum + entry.trades, 0);
    const avgWinRate = entries.length > 0 ? 
      entries.reduce((sum, entry) => sum + entry.winRate, 0) / entries.length : 0;
    
    const topPerformer = entries.length > 0 ? 
      entries.reduce((best, current) => 
        current.profitPercentage > best.profitPercentage ? current : best
      ) : null;
    
    const hottestItem = entries.length > 0 ?
      entries.reduce((hottest, current) => 
        current.hotness > hottest.hotness ? current : hottest
      ) : null;
    
    return {
      totalProfit,
      totalVolume,
      totalTrades,
      avgWinRate,
      topPerformer,
      hottestItem,
      period
    };
  }

  public getHeatmapByType(type: 'pattern' | 'wallet' | 'token'): HeatmapEntry[] {
    return Array.from(this.heatmapData.values())
      .filter(entry => entry.type === type)
      .sort((a, b) => b.hotness - a.hotness);
  }

  public getHeatmapHistory(hoursBack: number = 6): Array<{ timestamp: Date; entries: HeatmapEntry[] }> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    return this.profitHistory.filter(snapshot => snapshot.timestamp >= cutoffTime);
  }

  public updateConfig(newConfig: Partial<HeatmapConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart timer if update interval changed
    if (newConfig.updateInterval && this.updateTimer) {
      clearInterval(this.updateTimer);
      this.startRealTimeUpdates();
    }
    
    this.emit('configUpdated', this.config);
  }

  public getConfig(): HeatmapConfig {
    return { ...this.config };
  }

  public addCustomEntry(entry: Omit<HeatmapEntry, 'id' | 'lastUpdate' | 'sparklineData'>): void {
    const heatmapEntry: HeatmapEntry = {
      ...entry,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdate: new Date(),
      sparklineData: this.generateSparklineData()
    };
    
    this.heatmapData.set(heatmapEntry.id, heatmapEntry);
    this.emit('entryAdded', heatmapEntry);
  }

  public removeEntry(id: string): boolean {
    const removed = this.heatmapData.delete(id);
    if (removed) {
      this.emit('entryRemoved', id);
    }
    return removed;
  }

  public getGlobalHeatmap(): {
    patterns: HeatmapEntry[];
    wallets: HeatmapEntry[];
    tokens: HeatmapEntry[];
    metrics: ProfitMetrics;
  } {
    return {
      patterns: this.getHeatmapByType('pattern'),
      wallets: this.getHeatmapByType('wallet'),
      tokens: this.getHeatmapByType('token'),
      metrics: this.getProfitMetrics()
    };
  }

  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.heatmapData.clear();
    this.profitHistory = [];
    this.removeAllListeners();
  }
}

export const realTimeProfitHeatmap = new RealTimeProfitHeatmap();
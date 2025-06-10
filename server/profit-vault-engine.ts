interface VaultMetrics {
  totalValue: number;
  totalProfits: number;
  totalLosses: number;
  netProfit: number;
  profitToday: number;
  profitThisWeek: number;
  profitThisMonth: number;
  stablecoinBalance: number;
  solanBalance: number;
  reinvestmentRate: number;
  compoundingEnabled: boolean;
  autoWithdrawThreshold: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  lastWithdrawal: Date | null;
  totalWithdrawn: number;
}

interface ProfitEntry {
  id: string;
  timestamp: Date;
  symbol: string;
  profit: number;
  roi: number;
  source: 'trading' | 'staking' | 'fees';
  reinvested: boolean;
  withdrawn: boolean;
}

interface VaultSettings {
  autoReinvest: boolean;
  reinvestmentPercentage: number;
  withdrawalThreshold: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  compoundingEnabled: boolean;
  profitLockEnabled: boolean;
  emergencyStop: boolean;
}

class ProfitVaultEngine {
  private vaultMetrics: VaultMetrics;
  private profitHistory: ProfitEntry[] = [];
  private vaultSettings: VaultSettings;

  constructor() {
    this.vaultMetrics = {
      totalValue: 1547.32,
      totalProfits: 892.45,
      totalLosses: 234.67,
      netProfit: 657.78,
      profitToday: 89.34,
      profitThisWeek: 245.67,
      profitThisMonth: 567.89,
      stablecoinBalance: 1250.00,
      solanBalance: 297.32,
      reinvestmentRate: 0.7,
      compoundingEnabled: true,
      autoWithdrawThreshold: 1000,
      riskLevel: 'balanced',
      lastWithdrawal: new Date(Date.now() - 86400000 * 3),
      totalWithdrawn: 2450.00
    };

    this.vaultSettings = {
      autoReinvest: true,
      reinvestmentPercentage: 70,
      withdrawalThreshold: 1000,
      riskProfile: 'balanced',
      compoundingEnabled: true,
      profitLockEnabled: false,
      emergencyStop: false
    };

    this.generateSampleProfitHistory();
  }

  private generateSampleProfitHistory(): void {
    const symbols = ['BONK', 'WIF', 'POPCAT', 'BOME', 'JUP'];
    const sources: ('trading' | 'staking' | 'fees')[] = ['trading', 'staking', 'fees'];
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(Date.now() - (i * 3600000) - Math.random() * 3600000);
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const profit = (Math.random() - 0.3) * 200; // Mix of profits and losses
      const roi = profit > 0 ? Math.random() * 0.5 : -Math.random() * 0.3;
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      this.profitHistory.push({
        id: `profit_${Date.now()}_${i}`,
        timestamp,
        symbol,
        profit: parseFloat(profit.toFixed(2)),
        roi: parseFloat(roi.toFixed(4)),
        source,
        reinvested: profit > 0 && Math.random() > 0.3,
        withdrawn: profit > 50 && Math.random() > 0.7
      });
    }

    // Sort by timestamp descending
    this.profitHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getVaultMetrics(): Promise<VaultMetrics> {
    // Update real-time metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const todayProfits = this.profitHistory
      .filter(entry => entry.timestamp >= todayStart)
      .reduce((sum, entry) => sum + entry.profit, 0);

    const weekProfits = this.profitHistory
      .filter(entry => entry.timestamp >= weekStart)
      .reduce((sum, entry) => sum + entry.profit, 0);

    const monthProfits = this.profitHistory
      .filter(entry => entry.timestamp >= monthStart)
      .reduce((sum, entry) => sum + entry.profit, 0);

    this.vaultMetrics.profitToday = parseFloat(todayProfits.toFixed(2));
    this.vaultMetrics.profitThisWeek = parseFloat(weekProfits.toFixed(2));
    this.vaultMetrics.profitThisMonth = parseFloat(monthProfits.toFixed(2));

    return this.vaultMetrics;
  }

  async getProfitHistory(limit: number = 100): Promise<ProfitEntry[]> {
    return this.profitHistory.slice(0, limit);
  }

  async updateSettings(newSettings: Partial<VaultSettings>): Promise<void> {
    this.vaultSettings = { ...this.vaultSettings, ...newSettings };
    
    // Update related metrics
    if (newSettings.reinvestmentPercentage !== undefined) {
      this.vaultMetrics.reinvestmentRate = newSettings.reinvestmentPercentage / 100;
    }
    
    if (newSettings.withdrawalThreshold !== undefined) {
      this.vaultMetrics.autoWithdrawThreshold = newSettings.withdrawalThreshold;
    }

    if (newSettings.riskProfile !== undefined) {
      this.vaultMetrics.riskLevel = newSettings.riskProfile;
    }
  }

  async recordProfit(entry: Omit<ProfitEntry, 'id'>): Promise<void> {
    const profitEntry: ProfitEntry = {
      ...entry,
      id: `profit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.profitHistory.unshift(profitEntry);
    
    // Update metrics
    if (entry.profit > 0) {
      this.vaultMetrics.totalProfits += entry.profit;
    } else {
      this.vaultMetrics.totalLosses += Math.abs(entry.profit);
    }
    
    this.vaultMetrics.netProfit = this.vaultMetrics.totalProfits - this.vaultMetrics.totalLosses;
    this.vaultMetrics.totalValue = this.vaultMetrics.stablecoinBalance + this.vaultMetrics.solanBalance;

    // Auto-reinvestment logic
    if (this.vaultSettings.autoReinvest && entry.profit > 0) {
      const reinvestAmount = entry.profit * (this.vaultSettings.reinvestmentPercentage / 100);
      this.vaultMetrics.stablecoinBalance += reinvestAmount;
      profitEntry.reinvested = true;
    }

    // Keep only last 1000 entries
    if (this.profitHistory.length > 1000) {
      this.profitHistory = this.profitHistory.slice(0, 1000);
    }
  }

  async withdrawProfits(amount: number): Promise<void> {
    if (amount > this.vaultMetrics.stablecoinBalance) {
      throw new Error('Insufficient balance for withdrawal');
    }

    this.vaultMetrics.stablecoinBalance -= amount;
    this.vaultMetrics.totalWithdrawn += amount;
    this.vaultMetrics.lastWithdrawal = new Date();
    this.vaultMetrics.totalValue = this.vaultMetrics.stablecoinBalance + this.vaultMetrics.solanBalance;

    // Record withdrawal in history
    await this.recordProfit({
      timestamp: new Date(),
      symbol: 'WITHDRAWAL',
      profit: -amount,
      roi: 0,
      source: 'trading',
      reinvested: false,
      withdrawn: true
    });
  }

  async emergencyStop(): Promise<void> {
    this.vaultSettings.emergencyStop = true;
    this.vaultSettings.autoReinvest = false;
    this.vaultSettings.compoundingEnabled = false;
    
    console.log('🚨 Emergency stop activated - All automated trading halted');
  }

  getVaultSettings(): VaultSettings {
    return this.vaultSettings;
  }

  async calculateProjectedReturns(timeframe: '1d' | '7d' | '30d'): Promise<{
    conservative: number;
    realistic: number;
    optimistic: number;
  }> {
    const currentBalance = this.vaultMetrics.totalValue;
    const recentROI = this.profitHistory
      .slice(0, 20)
      .reduce((sum, entry) => sum + entry.roi, 0) / 20;

    const multipliers = {
      '1d': { conservative: 0.1, realistic: 0.3, optimistic: 0.8 },
      '7d': { conservative: 0.7, realistic: 2.1, optimistic: 5.6 },
      '30d': { conservative: 3.0, realistic: 9.0, optimistic: 24.0 }
    };

    const timeMultiplier = multipliers[timeframe];
    
    return {
      conservative: currentBalance * (1 + recentROI * timeMultiplier.conservative / 100),
      realistic: currentBalance * (1 + recentROI * timeMultiplier.realistic / 100),
      optimistic: currentBalance * (1 + recentROI * timeMultiplier.optimistic / 100)
    };
  }
}

export const profitVaultEngine = new ProfitVaultEngine();
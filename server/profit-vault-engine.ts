import { storage } from './storage';

interface VaultAllocation {
  stablecoins: number; // percentage
  lowRiskTokens: number; // percentage
  reinvestment: number; // percentage
}

interface VaultSettings {
  autoAllocate: boolean;
  allocationStrategy: 'conservative' | 'balanced' | 'aggressive';
  minimumProfitThreshold: number; // USD
  stablecoinRatio: number; // 0-100
  reinvestmentRatio: number; // 0-100
  emergencyReserve: number; // percentage to keep as emergency fund
}

interface VaultTransaction {
  id: string;
  userId: number;
  type: 'PROFIT_ALLOCATION' | 'REINVESTMENT' | 'EMERGENCY_WITHDRAWAL';
  amount: number;
  fromAsset: string;
  toAsset: string;
  timestamp: Date;
  reason: string;
}

interface VaultStatus {
  totalValue: number;
  stablecoinBalance: number;
  lowRiskBalance: number;
  availableForReinvestment: number;
  emergencyReserve: number;
  lastAllocation: Date | null;
  allocationHistory: VaultTransaction[];
  currentSettings: VaultSettings;
}

class ProfitVaultEngine {
  private defaultSettings: VaultSettings = {
    autoAllocate: true,
    allocationStrategy: 'balanced',
    minimumProfitThreshold: 50, // $50 minimum profit to trigger allocation
    stablecoinRatio: 40, // 40% to stablecoins
    reinvestmentRatio: 50, // 50% back to trading
    emergencyReserve: 10 // 10% emergency reserve
  };

  private allocationStrategies: Record<string, VaultAllocation> = {
    conservative: {
      stablecoins: 60,
      lowRiskTokens: 30,
      reinvestment: 10
    },
    balanced: {
      stablecoins: 40,
      lowRiskTokens: 20,
      reinvestment: 40
    },
    aggressive: {
      stablecoins: 20,
      lowRiskTokens: 10,
      reinvestment: 70
    }
  };

  async processRealizedProfit(userId: number, profitAmount: number, fromTrade: string): Promise<VaultTransaction[]> {
    try {
      const settings = await this.getUserSettings(userId);
      
      if (!settings.autoAllocate || profitAmount < settings.minimumProfitThreshold) {
        console.log(`Profit $${profitAmount} below threshold or auto-allocation disabled`);
        return [];
      }

      const allocation = this.allocationStrategies[settings.allocationStrategy];
      const transactions: VaultTransaction[] = [];

      // Calculate allocation amounts
      const stablecoinAmount = (profitAmount * allocation.stablecoins) / 100;
      const lowRiskAmount = (profitAmount * allocation.lowRiskTokens) / 100;
      const reinvestmentAmount = (profitAmount * allocation.reinvestment) / 100;

      // Execute allocations
      if (stablecoinAmount > 0) {
        const tx = await this.allocateToStablecoins(userId, stablecoinAmount, fromTrade);
        transactions.push(tx);
      }

      if (lowRiskAmount > 0) {
        const tx = await this.allocateToLowRisk(userId, lowRiskAmount, fromTrade);
        transactions.push(tx);
      }

      if (reinvestmentAmount > 0) {
        const tx = await this.allocateToReinvestment(userId, reinvestmentAmount, fromTrade);
        transactions.push(tx);
      }

      console.log(`💰 Profit Vault: Allocated $${profitAmount} across ${transactions.length} assets`);
      
      return transactions;
    } catch (error) {
      console.error('Error processing realized profit:', error);
      return [];
    }
  }

  private async allocateToStablecoins(userId: number, amount: number, fromTrade: string): Promise<VaultTransaction> {
    const transaction: VaultTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'PROFIT_ALLOCATION',
      amount,
      fromAsset: 'SOL',
      toAsset: 'USDC',
      timestamp: new Date(),
      reason: `Profit allocation to stablecoin from trade ${fromTrade}`
    };

    // In production, execute actual USDC purchase via Jupiter
    console.log(`🏦 Vault: $${amount} allocated to USDC`);
    
    return transaction;
  }

  private async allocateToLowRisk(userId: number, amount: number, fromTrade: string): Promise<VaultTransaction> {
    // Low-risk tokens: SOL, ETH, BTC-equivalent tokens
    const lowRiskTokens = ['SOL', 'BONK', 'RAY'];
    const selectedToken = lowRiskTokens[Math.floor(Math.random() * lowRiskTokens.length)];

    const transaction: VaultTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'PROFIT_ALLOCATION',
      amount,
      fromAsset: 'SOL',
      toAsset: selectedToken,
      timestamp: new Date(),
      reason: `Profit allocation to low-risk asset from trade ${fromTrade}`
    };

    console.log(`🛡️ Vault: $${amount} allocated to ${selectedToken}`);
    
    return transaction;
  }

  private async allocateToReinvestment(userId: number, amount: number, fromTrade: string): Promise<VaultTransaction> {
    const transaction: VaultTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'REINVESTMENT',
      amount,
      fromAsset: 'PROFIT',
      toAsset: 'TRADING_CAPITAL',
      timestamp: new Date(),
      reason: `Profit reinvestment from trade ${fromTrade}`
    };

    // Add back to trading balance
    const portfolio = await storage.getPortfolio(userId);
    const currentBalance = parseFloat(portfolio?.totalBalance || '0');
    
    await storage.updatePortfolio(userId, {
      totalBalance: (currentBalance + amount).toString()
    });

    console.log(`🔄 Vault: $${amount} reinvested to trading capital`);
    
    return transaction;
  }

  async getVaultStatus(userId: number): Promise<VaultStatus> {
    try {
      const settings = await this.getUserSettings(userId);
      const transactions = await this.getVaultTransactions(userId);
      
      // Calculate vault balances
      const stablecoinBalance = this.calculateAssetBalance(transactions, 'USDC');
      const lowRiskBalance = this.calculateAssetBalance(transactions, ['SOL', 'BONK', 'RAY']);
      const reinvestmentTotal = this.calculateReinvestmentTotal(transactions);
      
      const totalValue = stablecoinBalance + lowRiskBalance;
      const emergencyReserve = totalValue * (settings.emergencyReserve / 100);
      
      return {
        totalValue,
        stablecoinBalance,
        lowRiskBalance,
        availableForReinvestment: reinvestmentTotal,
        emergencyReserve,
        lastAllocation: transactions.length > 0 ? transactions[0].timestamp : null,
        allocationHistory: transactions.slice(0, 10), // Last 10 transactions
        currentSettings: settings
      };
    } catch (error) {
      console.error('Error getting vault status:', error);
      return this.getDefaultVaultStatus(userId);
    }
  }

  private calculateAssetBalance(transactions: VaultTransaction[], assets: string | string[]): number {
    const targetAssets = Array.isArray(assets) ? assets : [assets];
    
    return transactions
      .filter(tx => targetAssets.includes(tx.toAsset) && tx.type === 'PROFIT_ALLOCATION')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  private calculateReinvestmentTotal(transactions: VaultTransaction[]): number {
    return transactions
      .filter(tx => tx.type === 'REINVESTMENT')
      .reduce((sum, tx) => sum + tx.amount, 0);
  }

  private async getVaultTransactions(userId: number): Promise<VaultTransaction[]> {
    // In production, fetch from database
    // For demo, return mock transactions
    return [
      {
        id: 'tx_001',
        userId,
        type: 'PROFIT_ALLOCATION',
        amount: 125.50,
        fromAsset: 'SOL',
        toAsset: 'USDC',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reason: 'Profit allocation to stablecoin from trade BONK_001'
      },
      {
        id: 'tx_002',
        userId,
        type: 'REINVESTMENT',
        amount: 87.25,
        fromAsset: 'PROFIT',
        toAsset: 'TRADING_CAPITAL',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        reason: 'Profit reinvestment from trade WIF_002'
      }
    ];
  }

  async updateVaultSettings(userId: number, settings: Partial<VaultSettings>): Promise<VaultSettings> {
    const currentSettings = await this.getUserSettings(userId);
    const updatedSettings = { ...currentSettings, ...settings };
    
    // Validate settings
    if (updatedSettings.stablecoinRatio + updatedSettings.reinvestmentRatio > 100) {
      throw new Error('Total allocation cannot exceed 100%');
    }
    
    // In production, save to database
    console.log(`⚙️ Vault Settings Updated for user ${userId}:`, updatedSettings);
    
    return updatedSettings;
  }

  private async getUserSettings(userId: number): Promise<VaultSettings> {
    // In production, fetch from database
    // For demo, return default settings
    return { ...this.defaultSettings };
  }

  async triggerEmergencyWithdrawal(userId: number, amount: number, reason: string): Promise<VaultTransaction> {
    const transaction: VaultTransaction = {
      id: this.generateTransactionId(),
      userId,
      type: 'EMERGENCY_WITHDRAWAL',
      amount,
      fromAsset: 'VAULT',
      toAsset: 'SOL',
      timestamp: new Date(),
      reason: `Emergency withdrawal: ${reason}`
    };

    // Convert vault assets back to SOL
    const portfolio = await storage.getPortfolio(userId);
    const currentBalance = parseFloat(portfolio?.totalBalance || '0');
    
    await storage.updatePortfolio(userId, {
      totalBalance: (currentBalance + amount).toString()
    });

    console.log(`🚨 Emergency Withdrawal: $${amount} - ${reason}`);
    
    return transaction;
  }

  async calculateOptimalAllocation(userId: number, currentProfit: number): Promise<{
    recommended: VaultAllocation;
    reasoning: string;
    projectedReturns: {
      conservative: number;
      balanced: number;
      aggressive: number;
    };
  }> {
    const portfolio = await storage.getPortfolio(userId);
    const portfolioValue = parseFloat(portfolio?.totalBalance || '0');
    const trades = await storage.getTrades(userId);
    
    // Analyze recent performance
    const recentTrades = trades.slice(0, 20);
    const winRate = recentTrades.length > 0 
      ? recentTrades.filter(t => parseFloat(t.pnl || '0') > 0).length / recentTrades.length 
      : 0;

    let recommendedStrategy: keyof typeof this.allocationStrategies = 'balanced';
    let reasoning = '';

    if (winRate > 0.8 && portfolioValue > 5000) {
      recommendedStrategy = 'aggressive';
      reasoning = 'High win rate and sufficient capital suggests aggressive reinvestment';
    } else if (winRate < 0.6 || portfolioValue < 1000) {
      recommendedStrategy = 'conservative';
      reasoning = 'Lower win rate or limited capital suggests conservative allocation';
    } else {
      reasoning = 'Balanced approach recommended based on current performance';
    }

    return {
      recommended: this.allocationStrategies[recommendedStrategy],
      reasoning,
      projectedReturns: {
        conservative: currentProfit * 1.05, // 5% growth
        balanced: currentProfit * 1.12, // 12% growth
        aggressive: currentProfit * 1.25  // 25% growth potential
      }
    };
  }

  private getDefaultVaultStatus(userId: number): VaultStatus {
    return {
      totalValue: 0,
      stablecoinBalance: 0,
      lowRiskBalance: 0,
      availableForReinvestment: 0,
      emergencyReserve: 0,
      lastAllocation: null,
      allocationHistory: [],
      currentSettings: this.defaultSettings
    };
  }

  private generateTransactionId(): string {
    return `vault_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async simulateVaultGrowth(initialAmount: number, days: number, strategy: string): Promise<{
    finalValue: number;
    breakdown: {
      stablecoins: number;
      lowRisk: number;
      reinvested: number;
    };
    growthRate: number;
  }> {
    const allocation = this.allocationStrategies[strategy] || this.allocationStrategies.balanced;
    
    // Growth rates (annualized)
    const growthRates = {
      stablecoins: 0.05, // 5% APY
      lowRisk: 0.15, // 15% APY
      reinvestment: 0.35 // 35% APY from active trading
    };
    
    const dailyRates = {
      stablecoins: Math.pow(1 + growthRates.stablecoins, 1/365) - 1,
      lowRisk: Math.pow(1 + growthRates.lowRisk, 1/365) - 1,
      reinvestment: Math.pow(1 + growthRates.reinvestment, 1/365) - 1
    };
    
    const stablecoinAmount = initialAmount * (allocation.stablecoins / 100);
    const lowRiskAmount = initialAmount * (allocation.lowRiskTokens / 100);
    const reinvestmentAmount = initialAmount * (allocation.reinvestment / 100);
    
    const finalStablecoins = stablecoinAmount * Math.pow(1 + dailyRates.stablecoins, days);
    const finalLowRisk = lowRiskAmount * Math.pow(1 + dailyRates.lowRisk, days);
    const finalReinvested = reinvestmentAmount * Math.pow(1 + dailyRates.reinvestment, days);
    
    const finalValue = finalStablecoins + finalLowRisk + finalReinvested;
    const growthRate = ((finalValue - initialAmount) / initialAmount) * 100;
    
    return {
      finalValue,
      breakdown: {
        stablecoins: finalStablecoins,
        lowRisk: finalLowRisk,
        reinvested: finalReinvested
      },
      growthRate
    };
  }
}

export const profitVaultEngine = new ProfitVaultEngine();
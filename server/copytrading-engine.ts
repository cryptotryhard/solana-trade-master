import { EventEmitter } from 'events';

interface SmartWallet {
  id: string;
  address: string;
  name: string;
  totalTrades: number;
  winRate: number;
  avgROI: number;
  currentROI: number;
  isActive: boolean;
  confidence: number;
  weight: number;
  lastActivity: Date;
  addedAt: Date;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  tags: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface WalletTrade {
  id: string;
  walletId: string;
  tokenSymbol: string;
  mintAddress: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: Date;
  txHash: string;
  outcome?: 'win' | 'loss' | 'open';
  roi?: number;
  followedByEngine: boolean;
  engineDecision?: {
    action: 'follow' | 'ignore';
    reason: string;
    confidence: number;
  };
}

interface CopyDecision {
  walletId: string;
  trade: WalletTrade;
  action: 'copy' | 'ignore' | 'partial_copy';
  reason: string;
  confidence: number;
  positionSize: number;
  engineAlignment: number; // 0-100% how much our engine agrees
}

interface WalletEligibilityCheck {
  isEligible: boolean;
  reasons: string[];
  score: number;
  requirements: {
    minimumTrades: { required: number; actual: number; passed: boolean };
    minimumWinRate: { required: number; actual: number; passed: boolean };
    minimumROI: { required: number; actual: number; passed: boolean };
    minimumAge: { required: number; actual: number; passed: boolean };
    consistencyScore: { required: number; actual: number; passed: boolean };
  };
}

interface CopyTradingSettings {
  minimumWalletConfidence: number;
  minimumWalletROI: number;
  minimumTradeCount: number;
  minimumWinRate: number;
  minimumWalletAge: number; // days
  maxCopyPercentage: number; // max % of our portfolio to copy
  autoDeactivateThreshold: number; // deactivate wallet if performance drops below this ROI
  consistencyThreshold: number; // minimum consistency score for eligibility
}

interface WalletRanking {
  walletId: string;
  name: string;
  rank: number;
  overallScore: number;
  metrics: {
    profitabilityScore: number;
    consistencyScore: number;
    riskAdjustedReturn: number;
    recentPerformanceScore: number;
    volumeScore: number;
    stabilityScore: number;
  };
  category: 'elite' | 'strong' | 'average' | 'risky';
}

interface CopyTradeReport {
  walletId: string;
  walletName: string;
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalCopies: number;
    successfulCopies: number;
    totalProfit: number;
    totalROI: number;
    winRate: number;
    averageHoldTime: number;
    totalVolume: number;
  };
  bestTrade: {
    symbol: string;
    profit: number;
    roi: number;
    timestamp: string;
  };
  worstTrade: {
    symbol: string;
    profit: number;
    roi: number;
    timestamp: string;
  };
  trades: CopyDecision[];
}

class CopyTradingEngine extends EventEmitter {
  private smartWallets: Map<string, SmartWallet> = new Map();
  private walletTrades: WalletTrade[] = [];
  private copyDecisions: CopyDecision[] = [];
  private isActive: boolean = true;
  private settings: CopyTradingSettings = {
    minimumWalletConfidence: 65,
    minimumWalletROI: 20,
    minimumTradeCount: 25,
    minimumWinRate: 55,
    minimumWalletAge: 14, // days
    maxCopyPercentage: 0.15,
    autoDeactivateThreshold: -10,
    consistencyThreshold: 60
  };

  constructor() {
    super();
    this.initializeWallets();
    this.startMonitoring();
  }

  private initializeWallets(): void {
    // Initialize with demo smart wallets
    const demoWallets: SmartWallet[] = [
      {
        id: 'wallet_001',
        address: 'FVHKSeWfhDQx3nqbBq7s1s7Nw4rZJ9hj8QqDhEbGpump',
        name: 'Alpha Hunter Pro',
        totalTrades: 47,
        winRate: 78.7,
        avgROI: 156.3,
        currentROI: 234.5,
        isActive: true,
        confidence: 89,
        weight: 1.2,
        lastActivity: new Date(),
        addedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        performance: {
          daily: 12.4,
          weekly: 89.2,
          monthly: 234.5
        },
        tags: ['degen', 'memecoin_specialist', 'high_volume'],
        riskLevel: 'medium'
      },
      {
        id: 'wallet_002',
        address: 'DeGEN2x9kVwQxB8fN4pUmP7hL6sR1jK3YvTnMsAoLpump',
        name: 'Memecoin Wizard',
        totalTrades: 89,
        winRate: 82.1,
        avgROI: 98.7,
        currentROI: 187.2,
        isActive: true,
        confidence: 91,
        weight: 1.4,
        lastActivity: new Date(),
        addedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        performance: {
          daily: 8.9,
          weekly: 67.3,
          monthly: 187.2
        },
        tags: ['conservative', 'memecoin_expert', 'consistent'],
        riskLevel: 'low'
      },
      {
        id: 'wallet_003',
        address: 'RiSkY7hQ2mN8vB1cP6tL9fK4jD3eR5wXyZnMpump11',
        name: 'Risk Taker',
        totalTrades: 123,
        winRate: 65.4,
        avgROI: 87.2,
        currentROI: 45.6,
        isActive: true,
        confidence: 72,
        weight: 0.8,
        lastActivity: new Date(),
        addedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        performance: {
          daily: -2.1,
          weekly: 23.4,
          monthly: 45.6
        },
        tags: ['aggressive', 'high_risk', 'volatile'],
        riskLevel: 'high'
      }
    ];

    demoWallets.forEach(wallet => {
      this.smartWallets.set(wallet.id, wallet);
    });

    console.log(`🎯 Initialized copytrading with ${demoWallets.length} smart wallets`);
  }

  private startMonitoring(): void {
    // Simulate wallet monitoring every 30 seconds
    setInterval(() => {
      this.checkWalletActivity();
    }, 30000);

    // Simulate new trades every 2 minutes
    setInterval(() => {
      this.simulateWalletTrade();
    }, 120000);

    // Performance evaluation every hour
    setInterval(() => {
      this.evaluateWalletPerformance();
    }, 3600000);
  }

  private async checkWalletActivity(): Promise<void> {
    // This would check blockchain for actual wallet activity
    console.log('🔍 Monitoring smart wallet activity...');
  }

  private async simulateWalletTrade(): Promise<void> {
    const activeWallets = Array.from(this.smartWallets.values()).filter(w => w.isActive);
    if (activeWallets.length === 0) return;

    const wallet = activeWallets[Math.floor(Math.random() * activeWallets.length)];
    const symbols = ['BONK', 'WIF', 'POPCAT', 'SAMO', 'FROGGY'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];

    const trade: WalletTrade = {
      id: `trade_${Date.now()}`,
      walletId: wallet.id,
      tokenSymbol: symbol,
      mintAddress: `mint_${Math.random().toString(36).substr(2, 9)}`,
      side: 'buy',
      amount: 1000 + Math.random() * 9000,
      price: 0.001 + Math.random() * 0.01,
      timestamp: new Date(),
      txHash: `tx_${Math.random().toString(36).substr(2, 16)}`,
      followedByEngine: false
    };

    await this.processWalletTrade(trade);
  }

  private async processWalletTrade(trade: WalletTrade): Promise<void> {
    this.walletTrades.push(trade);
    
    const wallet = this.smartWallets.get(trade.walletId);
    if (!wallet) return;

    // Make copy decision based on wallet performance and engine alignment
    const decision = await this.makeCopyDecision(trade, wallet);
    this.copyDecisions.push(decision);

    if (decision.action === 'copy' || decision.action === 'partial_copy') {
      await this.executeCopyTrade(decision);
    }

    console.log(`📊 ${wallet.name} traded ${trade.tokenSymbol}: ${decision.action} (${decision.reason})`);
    this.emit('tradeProcessed', { trade, decision, wallet });
  }

  private async makeCopyDecision(trade: WalletTrade, wallet: SmartWallet): Promise<CopyDecision> {
    // Get engine's opinion on this token
    const engineAlignment = await this.getEngineAlignment(trade.tokenSymbol, trade.mintAddress);
    
    let action: 'copy' | 'ignore' | 'partial_copy' = 'ignore';
    let reason = 'Default ignore';
    let confidence = 0;
    let positionSize = 0;

    // Decision logic based on wallet performance and engine alignment
    if (wallet.confidence < this.settings.minimumWalletConfidence) {
      reason = `Wallet confidence too low (${wallet.confidence}%)`;
    } else if (engineAlignment < 50) {
      reason = `Engine disagrees with trade (${engineAlignment}% alignment)`;
    } else if (wallet.performance.daily < -5) {
      reason = `Wallet underperforming today (${wallet.performance.daily}%)`;
    } else {
      // Calculate copy parameters
      const baseConfidence = Math.min(wallet.confidence, engineAlignment);
      confidence = baseConfidence * wallet.weight;
      
      if (confidence >= 80) {
        action = 'copy';
        positionSize = Math.min(this.settings.maxCopyPercentage * confidence / 100, this.settings.maxCopyPercentage);
        reason = `High confidence copy (${confidence.toFixed(1)}%)`;
      } else if (confidence >= 65) {
        action = 'partial_copy';
        positionSize = Math.min(this.settings.maxCopyPercentage * confidence / 100 * 0.5, this.settings.maxCopyPercentage * 0.5);
        reason = `Partial copy due to moderate confidence (${confidence.toFixed(1)}%)`;
      } else {
        reason = `Confidence too low for copy (${confidence.toFixed(1)}%)`;
      }
    }

    return {
      walletId: wallet.id,
      trade,
      action,
      reason,
      confidence,
      positionSize,
      engineAlignment
    };
  }

  private async getEngineAlignment(symbol: string, mintAddress: string): Promise<number> {
    try {
      // Get our adaptive engine's opinion on this token
      const { adaptiveEngine } = await import('./adaptive-trading-engine');
      
      // Simulate token analysis
      const mockTokenData = {
        symbol,
        mintAddress,
        price: 0.001 + Math.random() * 0.01,
        volume24h: 10000 + Math.random() * 90000,
        marketCap: 100000 + Math.random() * 900000,
        holders: 100 + Math.random() * 900,
        liquidity: 50000 + Math.random() * 450000,
        priceChange1h: -5 + Math.random() * 10,
        priceChange24h: -10 + Math.random() * 25,
        priceChange7d: -20 + Math.random() * 50,
        volatilityScore: 40 + Math.random() * 40,
        liquidityScore: 50 + Math.random() * 40,
        momentumScore: 60 + Math.random() * 30,
        technicalScore: 55 + Math.random() * 35,
        socialScore: 50 + Math.random() * 40,
        volumeChange24h: -20 + Math.random() * 60,
        riskScore: 30 + Math.random() * 50
      };

      const decision = await adaptiveEngine.analyzeToken(mockTokenData);
      return decision.confidenceScore;
    } catch (error) {
      console.error('Error getting engine alignment:', error);
      return 50; // Default neutral alignment
    }
  }

  private async executeCopyTrade(decision: CopyDecision): Promise<void> {
    // Mark trade as followed
    const trade = decision.trade;
    trade.followedByEngine = true;
    trade.engineDecision = {
      action: decision.action === 'ignore' ? 'ignore' : 'follow',
      reason: decision.reason,
      confidence: decision.confidence
    };

    // This would execute actual trade through trading engine
    console.log(`🚀 Executing copy trade: ${trade.tokenSymbol} (${(decision.positionSize * 100).toFixed(1)}% position)`);
    
    // Record for learning
    this.recordCopyTradeForLearning(decision);
  }

  private recordCopyTradeForLearning(decision: CopyDecision): void {
    // This would integrate with the learning engine to track copy trade outcomes
    const wallet = this.smartWallets.get(decision.walletId);
    if (wallet) {
      console.log(`📝 Recording copy trade for learning: ${wallet.name} -> ${decision.trade.tokenSymbol}`);
    }
  }

  private evaluateWalletPerformance(): void {
    console.log('📈 Evaluating wallet performance...');
    
    this.smartWallets.forEach((wallet) => {
      // Simulate performance changes
      const performanceChange = -5 + Math.random() * 15; // -5% to +10%
      wallet.performance.daily = performanceChange;
      
      // Adjust confidence based on recent performance
      if (performanceChange > 5) {
        wallet.confidence = Math.min(100, wallet.confidence + 2);
      } else if (performanceChange < -3) {
        wallet.confidence = Math.max(0, wallet.confidence - 3);
      }
      
      // Auto-deactivate poor performing wallets
      if (wallet.confidence < 40 && wallet.performance.weekly < -10) {
        wallet.isActive = false;
        console.log(`⚠️ Auto-deactivated wallet ${wallet.name} due to poor performance`);
      }
    });
  }

  // Public API methods
  public getSmartWallets(): SmartWallet[] {
    return Array.from(this.smartWallets.values());
  }

  public getActiveWallets(): SmartWallet[] {
    return Array.from(this.smartWallets.values()).filter(w => w.isActive);
  }

  public getRecentTrades(limit: number = 20): WalletTrade[] {
    return this.walletTrades.slice(-limit).reverse();
  }

  public getRecentDecisions(limit: number = 20): CopyDecision[] {
    return this.copyDecisions.slice(-limit).reverse();
  }

  public addSmartWallet(address: string, name: string, tags: string[] = []): string {
    const walletId = `wallet_${Date.now()}`;
    const wallet: SmartWallet = {
      id: walletId,
      address,
      name,
      totalTrades: 0,
      winRate: 0,
      avgROI: 0,
      currentROI: 0,
      isActive: true,
      confidence: 50,
      weight: 1.0,
      lastActivity: new Date(),
      addedAt: new Date(),
      performance: { daily: 0, weekly: 0, monthly: 0 },
      tags,
      riskLevel: 'medium'
    };

    this.smartWallets.set(walletId, wallet);
    console.log(`➕ Added new smart wallet: ${name} (${address})`);
    return walletId;
  }

  public removeSmartWallet(walletId: string): boolean {
    const wallet = this.smartWallets.get(walletId);
    if (wallet) {
      this.smartWallets.delete(walletId);
      console.log(`➖ Removed smart wallet: ${wallet.name}`);
      return true;
    }
    return false;
  }

  public updateWalletSettings(walletId: string, settings: Partial<SmartWallet>): boolean {
    const wallet = this.smartWallets.get(walletId);
    if (wallet) {
      Object.assign(wallet, settings);
      console.log(`⚙️ Updated wallet settings: ${wallet.name}`);
      return true;
    }
    return false;
  }

  // Wallet eligibility validation
  public async checkWalletEligibility(address: string): Promise<WalletEligibilityCheck> {
    try {
      const mockWalletData = this.generateMockWalletData(address);
      
      const requirements = {
        minimumTrades: {
          required: this.settings.minimumTradeCount,
          actual: mockWalletData.totalTrades,
          passed: mockWalletData.totalTrades >= this.settings.minimumTradeCount
        },
        minimumWinRate: {
          required: this.settings.minimumWinRate,
          actual: mockWalletData.winRate,
          passed: mockWalletData.winRate >= this.settings.minimumWinRate
        },
        minimumROI: {
          required: this.settings.minimumWalletROI,
          actual: mockWalletData.avgROI,
          passed: mockWalletData.avgROI >= this.settings.minimumWalletROI
        },
        minimumAge: {
          required: this.settings.minimumWalletAge,
          actual: mockWalletData.ageInDays,
          passed: mockWalletData.ageInDays >= this.settings.minimumWalletAge
        },
        consistencyScore: {
          required: this.settings.consistencyThreshold,
          actual: mockWalletData.consistencyScore,
          passed: mockWalletData.consistencyScore >= this.settings.consistencyThreshold
        }
      };

      const passedChecks = Object.values(requirements).filter(r => r.passed).length;
      const totalChecks = Object.keys(requirements).length;
      const score = (passedChecks / totalChecks) * 100;
      
      const isEligible = passedChecks === totalChecks;
      const reasons = [];
      
      if (!requirements.minimumTrades.passed) {
        reasons.push(`Insufficient trade history: ${requirements.minimumTrades.actual} < ${requirements.minimumTrades.required} required`);
      }
      if (!requirements.minimumWinRate.passed) {
        reasons.push(`Low win rate: ${requirements.minimumWinRate.actual.toFixed(1)}% < ${requirements.minimumWinRate.required}% required`);
      }
      if (!requirements.minimumROI.passed) {
        reasons.push(`Low ROI: ${requirements.minimumROI.actual.toFixed(1)}% < ${requirements.minimumROI.required}% required`);
      }
      if (!requirements.minimumAge.passed) {
        reasons.push(`Wallet too new: ${requirements.minimumAge.actual} days < ${requirements.minimumAge.required} days required`);
      }
      if (!requirements.consistencyScore.passed) {
        reasons.push(`Low consistency: ${requirements.consistencyScore.actual.toFixed(1)} < ${requirements.consistencyScore.required} required`);
      }

      if (isEligible) {
        reasons.push('Wallet meets all eligibility requirements');
      }

      return { isEligible, reasons, score, requirements };
    } catch (error) {
      return {
        isEligible: false,
        reasons: ['Failed to analyze wallet - may be invalid address'],
        score: 0,
        requirements: {
          minimumTrades: { required: this.settings.minimumTradeCount, actual: 0, passed: false },
          minimumWinRate: { required: this.settings.minimumWinRate, actual: 0, passed: false },
          minimumROI: { required: this.settings.minimumWalletROI, actual: 0, passed: false },
          minimumAge: { required: this.settings.minimumWalletAge, actual: 0, passed: false },
          consistencyScore: { required: this.settings.consistencyThreshold, actual: 0, passed: false }
        }
      };
    }
  }

  private generateMockWalletData(address: string) {
    const hash = this.simpleHash(address);
    return {
      totalTrades: 15 + (hash % 200),
      winRate: 40 + (hash % 50),
      avgROI: -10 + (hash % 80),
      ageInDays: 7 + (hash % 120),
      consistencyScore: 30 + (hash % 60)
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // Wallet ranking system
  public getWalletRankings(): WalletRanking[] {
    const wallets = Array.from(this.smartWallets.values());
    
    const rankings = wallets.map(wallet => {
      const metrics = this.calculateWalletMetrics(wallet);
      const overallScore = this.calculateOverallScore(metrics);
      const category = this.categorizeWallet(overallScore);
      
      return {
        walletId: wallet.id,
        name: wallet.name,
        rank: 0,
        overallScore,
        metrics,
        category
      };
    });

    rankings.sort((a, b) => b.overallScore - a.overallScore);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });

    return rankings;
  }

  private calculateWalletMetrics(wallet: SmartWallet) {
    return {
      profitabilityScore: Math.min(100, (wallet.currentROI / 200) * 100),
      consistencyScore: wallet.winRate,
      riskAdjustedReturn: this.calculateRiskAdjustedReturn(wallet),
      recentPerformanceScore: this.calculateRecentPerformance(wallet),
      volumeScore: Math.min(100, (wallet.totalTrades / 100) * 100),
      stabilityScore: this.calculateStabilityScore(wallet)
    };
  }

  private calculateRiskAdjustedReturn(wallet: SmartWallet): number {
    const riskMultiplier = wallet.riskLevel === 'low' ? 1.2 : wallet.riskLevel === 'medium' ? 1.0 : 0.8;
    return Math.min(100, (wallet.currentROI * riskMultiplier) / 2);
  }

  private calculateRecentPerformance(wallet: SmartWallet): number {
    const recentWeight = 0.6;
    const weeklyWeight = 0.3;
    const monthlyWeight = 0.1;
    
    return Math.min(100, 
      (wallet.performance.daily * recentWeight + 
       wallet.performance.weekly * weeklyWeight + 
       wallet.performance.monthly * monthlyWeight) / 2
    );
  }

  private calculateStabilityScore(wallet: SmartWallet): number {
    const volatility = Math.abs(wallet.performance.daily - wallet.performance.weekly);
    return Math.max(0, 100 - volatility * 2);
  }

  private calculateOverallScore(metrics: WalletRanking['metrics']): number {
    const weights = {
      profitability: 0.25,
      consistency: 0.20,
      riskAdjusted: 0.20,
      recentPerformance: 0.15,
      volume: 0.10,
      stability: 0.10
    };

    return (
      metrics.profitabilityScore * weights.profitability +
      metrics.consistencyScore * weights.consistency +
      metrics.riskAdjustedReturn * weights.riskAdjusted +
      metrics.recentPerformanceScore * weights.recentPerformance +
      metrics.volumeScore * weights.volume +
      metrics.stabilityScore * weights.stability
    );
  }

  private categorizeWallet(score: number): WalletRanking['category'] {
    if (score >= 80) return 'elite';
    if (score >= 65) return 'strong';
    if (score >= 50) return 'average';
    return 'risky';
  }

  // Report generation
  public generateCopyTradeReport(walletId: string, period: '1d' | '7d' | '30d'): CopyTradeReport {
    const wallet = this.smartWallets.get(walletId);
    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    const relevantDecisions = this.copyDecisions.filter(d => 
      d.walletId === walletId && 
      new Date(d.trade.timestamp) >= startDate
    );

    const copiedTrades = relevantDecisions.filter(d => d.action === 'copy');
    const successfulTrades = copiedTrades.filter(d => d.confidence > 70);
    
    const totalProfit = copiedTrades.reduce((sum, trade) => sum + (trade.trade.amount * 0.1), 0);
    const totalVolume = copiedTrades.reduce((sum, trade) => sum + trade.trade.amount, 0);

    const bestTrade = copiedTrades.reduce((best, current) => 
      !best || current.confidence > best.confidence ? current : best, null
    );

    const worstTrade = copiedTrades.reduce((worst, current) => 
      !worst || current.confidence < worst.confidence ? current : worst, null
    );

    return {
      walletId,
      walletName: wallet.name,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      summary: {
        totalCopies: copiedTrades.length,
        successfulCopies: successfulTrades.length,
        totalProfit,
        totalROI: totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0,
        winRate: copiedTrades.length > 0 ? (successfulTrades.length / copiedTrades.length) * 100 : 0,
        averageHoldTime: 24,
        totalVolume
      },
      bestTrade: bestTrade ? {
        symbol: bestTrade.trade.tokenSymbol,
        profit: bestTrade.trade.amount * 0.15,
        roi: 15,
        timestamp: bestTrade.trade.timestamp
      } : { symbol: 'N/A', profit: 0, roi: 0, timestamp: '' },
      worstTrade: worstTrade ? {
        symbol: worstTrade.trade.tokenSymbol,
        profit: worstTrade.trade.amount * -0.05,
        roi: -5,
        timestamp: worstTrade.trade.timestamp
      } : { symbol: 'N/A', profit: 0, roi: 0, timestamp: '' },
      trades: relevantDecisions
    };
  }

  public exportAllReports(period: '1d' | '7d' | '30d'): CopyTradeReport[] {
    return Array.from(this.smartWallets.keys()).map(walletId => 
      this.generateCopyTradeReport(walletId, period)
    );
  }

  // Settings management
  public updateSettings(newSettings: Partial<CopyTradingSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    console.log('📊 Copy trading settings updated:', this.settings);
  }

  public getSettings(): CopyTradingSettings {
    return { ...this.settings };
  }

  public getCopyTradingStats() {
    const activeWallets = this.getActiveWallets();
    const recentDecisions = this.getRecentDecisions(100);
    const copiedTrades = recentDecisions.filter(d => d.action !== 'ignore');
    
    return {
      totalWallets: this.smartWallets.size,
      activeWallets: activeWallets.length,
      avgWalletConfidence: activeWallets.reduce((sum, w) => sum + w.confidence, 0) / activeWallets.length || 0,
      totalDecisions: recentDecisions.length,
      copiedTrades: copiedTrades.length,
      copyRate: recentDecisions.length > 0 ? (copiedTrades.length / recentDecisions.length) * 100 : 0,
      topPerformer: activeWallets.sort((a, b) => b.currentROI - a.currentROI)[0],
      settings: this.settings
    };
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    console.log(`🎯 Copytrading engine ${active ? 'activated' : 'deactivated'}`);
  }

  public isEngineActive(): boolean {
    return this.isActive;
  }
}

export const copyTradingEngine = new CopyTradingEngine();
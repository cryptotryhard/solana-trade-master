import { storage } from "./storage";

interface PerformanceMetrics {
  netProfit: number;
  portfolioValue: number;
  totalTrades: number;
  winRate: number;
  avgROI: number;
  maxDrawdown: number;
  currentDrawdown: number;
  sharpeRatio: number;
  dailyReturn: number;
  weeklyReturn: number;
  monthlyReturn: number;
}

interface PeriodData {
  date: string;
  netProfit: number;
  portfolioValue: number;
  trades: number;
  winRate: number;
  drawdown: number;
  strategyMode: string;
}

interface TokenPerformance {
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalROI: number;
  avgROI: number;
  bestTrade: number;
  worstTrade: number;
  totalVolume: number;
  lastTraded: Date;
  isLocked: boolean;
  lockReason?: string;
}

interface RiskEvent {
  id: string;
  timestamp: Date;
  type: 'crash_shield_trigger' | 'safe_mode_entry' | 'safe_mode_exit' | 'capital_lock' | 'drawdown_alert' | 'manual_override' | 'pattern_lockout';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  metrics: {
    portfolioValue?: number;
    drawdown?: number;
    consecutiveLosses?: number;
    triggeredBy?: string;
  };
  impact: {
    tradingRestricted: boolean;
    positionSizeReduced: boolean;
    tokensLocked: string[];
  };
  resolution?: {
    timestamp: Date;
    method: 'auto_recovery' | 'manual_intervention' | 'time_based';
    description: string;
  };
}

interface TradeJournalEntry {
  id: string;
  timestamp: Date;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  value: number;
  pnl?: number;
  roi?: number;
  confidence: number;
  signals: string[];
  strategyUsed: string;
  tags: string[];
  outcome: 'win' | 'loss' | 'breakeven' | 'open';
  exitReason?: string;
  portfolioImpact: {
    beforeValue: number;
    afterValue: number;
    percentageChange: number;
  };
}

interface StrategyTransition {
  timestamp: Date;
  fromMode: string;
  toMode: string;
  reason: string;
  metrics: {
    winRate: number;
    drawdown: number;
    confidence: number;
  };
  duration: number; // minutes in previous mode
}

class AccountIntelligence {
  private riskEvents: RiskEvent[] = [];
  private tradeJournal: TradeJournalEntry[] = [];
  private strategyTransitions: StrategyTransition[] = [];
  private performanceHistory: PeriodData[] = [];

  constructor() {
    this.initializeWithSampleData();
    this.startPeriodicCapture();
    console.log('📊 Account Intelligence & Audit System initialized');
  }

  private initializeWithSampleData(): void {
    // Initialize with realistic trading history
    const now = new Date();
    const daysBack = 30;

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const baseValue = 1000 + (daysBack - i) * 50 + Math.random() * 200;
      
      this.performanceHistory.push({
        date: date.toISOString().split('T')[0],
        netProfit: baseValue - 1000 + (Math.random() - 0.3) * 100,
        portfolioValue: baseValue,
        trades: Math.floor(Math.random() * 20) + 5,
        winRate: 40 + Math.random() * 40,
        drawdown: Math.random() * 15,
        strategyMode: Math.random() > 0.7 ? 'hyper' : Math.random() > 0.4 ? 'scaled' : 'conservative'
      });
    }

    // Add sample risk events
    this.riskEvents.push({
      id: 'risk_001',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      type: 'crash_shield_trigger',
      severity: 'high',
      description: 'Consecutive loss trigger activated after 4 losing trades',
      metrics: {
        portfolioValue: 8450,
        consecutiveLosses: 4,
        triggeredBy: 'consecutive_losses'
      },
      impact: {
        tradingRestricted: true,
        positionSizeReduced: true,
        tokensLocked: ['MEME1', 'PUMP2']
      },
      resolution: {
        timestamp: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000),
        method: 'auto_recovery',
        description: 'Win rate improved to 65%, safe mode deactivated'
      }
    });

    // Add sample strategy transitions
    this.strategyTransitions.push({
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      fromMode: 'hyper',
      toMode: 'scaled',
      reason: 'Drawdown threshold exceeded 15%',
      metrics: {
        winRate: 45,
        drawdown: 16.2,
        confidence: 42
      },
      duration: 180 // 3 hours
    });
  }

  async recordTrade(trade: any): Promise<void> {
    const signals = trade.signals || ['ai_score', 'sentiment'];
    const tags = this.generateTradeTags(trade);
    
    const journalEntry: TradeJournalEntry = {
      id: `trade_${Date.now()}`,
      timestamp: new Date(),
      symbol: trade.symbol,
      side: trade.side,
      amount: parseFloat(trade.amount),
      price: parseFloat(trade.price),
      value: parseFloat(trade.amount) * parseFloat(trade.price),
      pnl: trade.pnl ? parseFloat(trade.pnl) : undefined,
      roi: trade.roi,
      confidence: trade.confidence || 50,
      signals,
      strategyUsed: trade.strategy || 'adaptive',
      tags,
      outcome: this.determineOutcome(trade),
      portfolioImpact: {
        beforeValue: trade.portfolioValue || 0,
        afterValue: (trade.portfolioValue || 0) + (trade.pnl ? parseFloat(trade.pnl) : 0),
        percentageChange: trade.pnl ? (parseFloat(trade.pnl) / (trade.portfolioValue || 1)) * 100 : 0
      }
    };

    this.tradeJournal.push(journalEntry);
    
    // Keep only last 1000 entries
    if (this.tradeJournal.length > 1000) {
      this.tradeJournal = this.tradeJournal.slice(-1000);
    }
  }

  async recordRiskEvent(event: Omit<RiskEvent, 'id'>): Promise<void> {
    const riskEvent: RiskEvent = {
      id: `risk_${Date.now()}`,
      ...event
    };

    this.riskEvents.push(riskEvent);
    
    // Keep only last 200 events
    if (this.riskEvents.length > 200) {
      this.riskEvents = this.riskEvents.slice(-200);
    }

    console.log(`🚨 Risk Event Recorded: ${event.type} - ${event.description}`);
  }

  async recordStrategyTransition(transition: Omit<StrategyTransition, 'timestamp'>): Promise<void> {
    const strategyTransition: StrategyTransition = {
      timestamp: new Date(),
      ...transition
    };

    this.strategyTransitions.push(strategyTransition);
    
    // Keep only last 100 transitions
    if (this.strategyTransitions.length > 100) {
      this.strategyTransitions = this.strategyTransitions.slice(-100);
    }

    console.log(`🔄 Strategy Transition: ${transition.fromMode} → ${transition.toMode}`);
  }

  private generateTradeTags(trade: any): string[] {
    const tags: string[] = [];
    
    if (trade.pnl && parseFloat(trade.pnl) > 0) {
      if (parseFloat(trade.pnl) > 100) tags.push('High ROI');
      if (parseFloat(trade.pnl) > 500) tags.push('Mega Profit');
    } else if (trade.pnl && parseFloat(trade.pnl) < 0) {
      tags.push('Loss Cut');
      if (parseFloat(trade.pnl) < -100) tags.push('Major Loss');
    }

    if (trade.confidence && trade.confidence > 80) {
      tags.push('High Confidence');
    }

    if (trade.signals?.includes('sentiment') && trade.confidence > 70) {
      tags.push('Top Sentiment Entry');
    }

    if (trade.protectedByShield) {
      tags.push('Crash Protected');
    }

    if (trade.side === 'buy' && trade.timing === 'early') {
      tags.push('Early Entry');
    }

    return tags;
  }

  private determineOutcome(trade: any): 'win' | 'loss' | 'breakeven' | 'open' {
    if (!trade.pnl) return 'open';
    
    const pnl = parseFloat(trade.pnl);
    if (pnl > 5) return 'win';
    if (pnl < -5) return 'loss';
    return 'breakeven';
  }

  async getPerformanceMetrics(period: '24h' | '7d' | '30d' = '24h'): Promise<PerformanceMetrics> {
    const trades = await this.getTradesForPeriod(period);
    const portfolioHistory = this.getPortfolioHistory(period);
    
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const winningTrades = trades.filter(trade => (trade.pnl || 0) > 0);
    const currentValue = portfolioHistory[portfolioHistory.length - 1]?.portfolioValue || 0;
    const startValue = portfolioHistory[0]?.portfolioValue || currentValue;

    const dailyReturns = this.calculateDailyReturns(portfolioHistory);
    const maxDrawdown = this.calculateMaxDrawdown(portfolioHistory);

    return {
      netProfit: totalPnL,
      portfolioValue: currentValue,
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgROI: trades.length > 0 ? trades.reduce((sum, trade) => sum + (trade.roi || 0), 0) / trades.length : 0,
      maxDrawdown: maxDrawdown.maxDrawdown,
      currentDrawdown: maxDrawdown.currentDrawdown,
      sharpeRatio: this.calculateSharpeRatio(dailyReturns),
      dailyReturn: this.calculatePeriodReturn(portfolioHistory, 1),
      weeklyReturn: this.calculatePeriodReturn(portfolioHistory, 7),
      monthlyReturn: this.calculatePeriodReturn(portfolioHistory, 30)
    };
  }

  async getTokenPerformanceLeaderboard(): Promise<TokenPerformance[]> {
    const tokenMap = new Map<string, TokenPerformance>();

    this.tradeJournal.forEach(trade => {
      if (!tokenMap.has(trade.symbol)) {
        tokenMap.set(trade.symbol, {
          symbol: trade.symbol,
          totalTrades: 0,
          winRate: 0,
          totalROI: 0,
          avgROI: 0,
          bestTrade: 0,
          worstTrade: 0,
          totalVolume: 0,
          lastTraded: trade.timestamp,
          isLocked: false
        });
      }

      const performance = tokenMap.get(trade.symbol)!;
      performance.totalTrades++;
      performance.totalVolume += trade.value;
      
      if (trade.roi) {
        performance.totalROI += trade.roi;
        performance.bestTrade = Math.max(performance.bestTrade, trade.roi);
        performance.worstTrade = Math.min(performance.worstTrade, trade.roi);
      }

      if (trade.timestamp > performance.lastTraded) {
        performance.lastTraded = trade.timestamp;
      }
    });

    // Calculate averages and win rates
    tokenMap.forEach((performance) => {
      const tokenTrades = this.tradeJournal.filter(trade => trade.symbol === performance.symbol);
      const winningTrades = tokenTrades.filter(trade => (trade.roi || 0) > 0);
      
      performance.winRate = tokenTrades.length > 0 ? (winningTrades.length / tokenTrades.length) * 100 : 0;
      performance.avgROI = tokenTrades.length > 0 ? performance.totalROI / tokenTrades.length : 0;
    });

    return Array.from(tokenMap.values())
      .sort((a, b) => b.totalROI - a.totalROI)
      .slice(0, 20);
  }

  private async getTradesForPeriod(period: string): Promise<TradeJournalEntry[]> {
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case '24h':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }

    return this.tradeJournal.filter(trade => trade.timestamp >= cutoff);
  }

  private getPortfolioHistory(period: string): PeriodData[] {
    const now = new Date();
    const cutoff = new Date();
    
    switch (period) {
      case '24h':
        cutoff.setDate(now.getDate() - 1);
        break;
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
    }

    return this.performanceHistory.filter(entry => new Date(entry.date) >= cutoff);
  }

  private calculateDailyReturns(history: PeriodData[]): number[] {
    const returns: number[] = [];
    
    for (let i = 1; i < history.length; i++) {
      const currentValue = history[i].portfolioValue;
      const previousValue = history[i - 1].portfolioValue;
      const dailyReturn = ((currentValue - previousValue) / previousValue) * 100;
      returns.push(dailyReturn);
    }

    return returns;
  }

  private calculateMaxDrawdown(history: PeriodData[]): { maxDrawdown: number; currentDrawdown: number } {
    let maxValue = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;

    history.forEach(entry => {
      if (entry.portfolioValue > maxValue) {
        maxValue = entry.portfolioValue;
        currentDrawdown = 0;
      } else {
        currentDrawdown = ((maxValue - entry.portfolioValue) / maxValue) * 100;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      }
    });

    return { maxDrawdown, currentDrawdown };
  }

  private calculateSharpeRatio(dailyReturns: number[]): number {
    if (dailyReturns.length === 0) return 0;
    
    const avgReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(365); // Annualized
  }

  private calculatePeriodReturn(history: PeriodData[], days: number): number {
    if (history.length < days) return 0;
    
    const endValue = history[history.length - 1].portfolioValue;
    const startValue = history[Math.max(0, history.length - days)].portfolioValue;
    
    return ((endValue - startValue) / startValue) * 100;
  }

  private startPeriodicCapture(): void {
    // Capture daily performance snapshot
    setInterval(async () => {
      try {
        const portfolio = await storage.getPortfolio(1);
        const recentTrades = await storage.getRecentTrades(1);
        
        const todayData: PeriodData = {
          date: new Date().toISOString().split('T')[0],
          netProfit: parseFloat(portfolio?.totalBalance || '0') - 1000, // Assuming 1000 starting balance
          portfolioValue: parseFloat(portfolio?.totalBalance || '0'),
          trades: recentTrades.length,
          winRate: this.calculateRecentWinRate(recentTrades),
          drawdown: 0, // Will be calculated from history
          strategyMode: 'scaled' // Will be updated from portfolio meta manager
        };

        // Replace today's data or add new entry
        const today = new Date().toISOString().split('T')[0];
        const existingIndex = this.performanceHistory.findIndex(entry => entry.date === today);
        
        if (existingIndex >= 0) {
          this.performanceHistory[existingIndex] = todayData;
        } else {
          this.performanceHistory.push(todayData);
        }

        // Keep only last 90 days
        if (this.performanceHistory.length > 90) {
          this.performanceHistory = this.performanceHistory.slice(-90);
        }
      } catch (error) {
        console.error('Error capturing daily performance:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private calculateRecentWinRate(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const winningTrades = trades.filter(trade => parseFloat(trade.pnl || '0') > 0);
    return (winningTrades.length / trades.length) * 100;
  }

  // Public API methods
  getPerformanceHistory(days: number = 30): PeriodData[] {
    return this.performanceHistory.slice(-days);
  }

  getRiskEvents(limit: number = 50): RiskEvent[] {
    return this.riskEvents.slice(-limit).reverse();
  }

  getTradeJournal(limit: number = 100): TradeJournalEntry[] {
    return this.tradeJournal.slice(-limit).reverse();
  }

  getStrategyTransitions(limit: number = 20): StrategyTransition[] {
    return this.strategyTransitions.slice(-limit).reverse();
  }

  async exportTradeJournal(format: 'json' | 'csv' = 'json'): Promise<string> {
    if (format === 'csv') {
      const headers = ['timestamp', 'symbol', 'side', 'amount', 'price', 'pnl', 'roi', 'confidence', 'outcome', 'tags'];
      const rows = this.tradeJournal.map(trade => [
        trade.timestamp.toISOString(),
        trade.symbol,
        trade.side,
        trade.amount,
        trade.price,
        trade.pnl || 0,
        trade.roi || 0,
        trade.confidence,
        trade.outcome,
        trade.tags.join(';')
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
    
    return JSON.stringify(this.tradeJournal, null, 2);
  }
}

export const accountIntelligence = new AccountIntelligence();
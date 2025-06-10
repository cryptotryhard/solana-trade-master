interface TradeLogEntry {
  id: string;
  timestamp: Date;
  txHash: string;
  symbol: string;
  mintAddress: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  valueUSD: number;
  slippage: number;
  gasUsed: number;
  pnlUSD?: number;
  pnlPercent?: number;
  confidence: number;
  signals: string[];
  status: 'pending' | 'confirmed' | 'failed';
  exitReason?: string;
  relatedTradeId?: string; // For linking buy/sell pairs
}

interface TradeSummary {
  totalTrades: number;
  totalVolumeUSD: number;
  totalPnlUSD: number;
  winRate: number;
  avgHoldTime: number;
  bestTrade: TradeLogEntry | null;
  worstTrade: TradeLogEntry | null;
  last24hTrades: number;
  last24hPnl: number;
}

class TradeLogger {
  private trades: TradeLogEntry[] = [];
  private tradePairs: Map<string, { buy: TradeLogEntry; sell?: TradeLogEntry }> = new Map();

  logTrade(trade: {
    txHash: string;
    symbol: string;
    mintAddress: string;
    side: 'buy' | 'sell';
    amount: number;
    price: number;
    valueUSD: number;
    slippage: number;
    gasUsed: number;
    confidence: number;
    signals: string[];
  }): string {
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: TradeLogEntry = {
      id: tradeId,
      timestamp: new Date(),
      status: 'confirmed',
      ...trade
    };

    this.trades.push(entry);

    // Handle trade pairing for P&L calculation
    if (trade.side === 'buy') {
      this.tradePairs.set(trade.mintAddress, { buy: entry });
    } else if (trade.side === 'sell') {
      const pair = this.tradePairs.get(trade.mintAddress);
      if (pair && pair.buy) {
        // Calculate P&L
        const buyValue = pair.buy.valueUSD;
        const sellValue = entry.valueUSD;
        const pnlUSD = sellValue - buyValue;
        const pnlPercent = (pnlUSD / buyValue) * 100;

        entry.pnlUSD = pnlUSD;
        entry.pnlPercent = pnlPercent;
        entry.relatedTradeId = pair.buy.id;

        // Update the buy trade with exit info
        pair.buy.pnlUSD = pnlUSD;
        pair.buy.pnlPercent = pnlPercent;
        pair.buy.relatedTradeId = entry.id;

        pair.sell = entry;
      }
    }

    console.log(`📝 Trade logged: ${trade.side.toUpperCase()} ${trade.symbol} | TX: ${trade.txHash.substring(0, 8)}... | $${trade.valueUSD.toFixed(2)}`);
    
    return tradeId;
  }

  getRecentTrades(limit: number = 50): TradeLogEntry[] {
    return this.trades
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getTradesBySymbol(symbol: string): TradeLogEntry[] {
    return this.trades.filter(t => t.symbol === symbol);
  }

  getTradeSummary(): TradeSummary {
    if (this.trades.length === 0) {
      return {
        totalTrades: 0,
        totalVolumeUSD: 0,
        totalPnlUSD: 0,
        winRate: 0,
        avgHoldTime: 0,
        bestTrade: null,
        worstTrade: null,
        last24hTrades: 0,
        last24hPnl: 0
      };
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent24h = this.trades.filter(t => t.timestamp >= last24h);
    const completedTrades = this.trades.filter(t => t.pnlUSD !== undefined);
    const winningTrades = completedTrades.filter(t => (t.pnlUSD || 0) > 0);

    const totalVolumeUSD = this.trades.reduce((sum, t) => sum + t.valueUSD, 0);
    const totalPnlUSD = completedTrades.reduce((sum, t) => sum + (t.pnlUSD || 0), 0);
    const last24hPnl = recent24h.reduce((sum, t) => sum + (t.pnlUSD || 0), 0);

    const bestTrade = completedTrades.reduce((best, current) => 
      (current.pnlUSD || 0) > (best?.pnlUSD || -Infinity) ? current : best, null as TradeLogEntry | null);
    const worstTrade = completedTrades.reduce((worst, current) => 
      (current.pnlUSD || 0) < (worst?.pnlUSD || Infinity) ? current : worst, null as TradeLogEntry | null);

    // Calculate average hold time for completed trades
    let avgHoldTime = 0;
    if (completedTrades.length > 0) {
      const holdTimes = Array.from(this.tradePairs.values())
        .filter(pair => pair.buy && pair.sell)
        .map(pair => pair.sell!.timestamp.getTime() - pair.buy.timestamp.getTime());
      
      if (holdTimes.length > 0) {
        avgHoldTime = holdTimes.reduce((sum, time) => sum + time, 0) / holdTimes.length;
        avgHoldTime = avgHoldTime / (1000 * 60); // Convert to minutes
      }
    }

    return {
      totalTrades: this.trades.length,
      totalVolumeUSD,
      totalPnlUSD,
      winRate: completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0,
      avgHoldTime,
      bestTrade,
      worstTrade,
      last24hTrades: recent24h.length,
      last24hPnl
    };
  }

  // Get formatted trade log for display
  getFormattedTradeLog(limit: number = 20): any[] {
    return this.getRecentTrades(limit).map(trade => ({
      id: trade.id,
      timestamp: trade.timestamp.toISOString(),
      txHash: trade.txHash,
      symbol: trade.symbol,
      side: trade.side,
      amount: trade.amount,
      price: trade.price,
      valueUSD: trade.valueUSD,
      pnlUSD: trade.pnlUSD,
      pnlPercent: trade.pnlPercent,
      confidence: trade.confidence,
      status: trade.status,
      signals: trade.signals,
      solscanUrl: `https://solscan.io/tx/${trade.txHash}`
    }));
  }

  // Export trade history for analysis
  exportTradeHistory(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      summary: this.getTradeSummary(),
      trades: this.getFormattedTradeLog(1000)
    }, null, 2);
  }

  // Clear old trades (keep last 1000)
  cleanupOldTrades(): void {
    if (this.trades.length > 1000) {
      this.trades = this.trades
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 1000);
    }
  }
}

export const tradeLogger = new TradeLogger();
export { TradeLogEntry, TradeSummary };
interface AlphaWatchlistItem {
  symbol: string;
  mintAddress: string;
  confidence: number;
  signals: string[];
  priceTarget: number;
  currentPrice: number;
  triggerCondition: string;
  estimatedTimeToTrigger: string;
  reasonForWatch: string;
  addedAt: Date;
  lastUpdated: Date;
  status: 'watching' | 'triggered' | 'expired' | 'failed';
  triggerThreshold: number;
}

interface NextTradePreview {
  symbol: string;
  mintAddress: string;
  confidence: number;
  estimatedEntry: number;
  reason: string;
  signals: string[];
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedROI: number;
}

class AlphaWatchlistManager {
  private watchlist: Map<string, AlphaWatchlistItem> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
    this.initializeWithHighConfidenceTokens();
  }

  async initializeWithHighConfidenceTokens(): Promise<void> {
    try {
      const response = await fetch('http://localhost:5000/api/alpha/tokens');
      if (!response.ok) return;

      const alphaTokens = await response.json();
      const highConfidenceTokens = alphaTokens.filter((token: any) => 
        token.confidence >= 75 && !this.watchlist.has(token.mintAddress)
      );

      for (const token of highConfidenceTokens.slice(0, 10)) {
        this.addToWatchlist({
          symbol: token.symbol,
          mintAddress: token.mintAddress,
          confidence: token.confidence,
          signals: token.signals || [],
          triggerThreshold: 85
        });
      }
    } catch (error) {
      console.log('Error initializing watchlist:', error);
    }
  }

  addToWatchlist(params: {
    symbol: string;
    mintAddress: string;
    confidence: number;
    signals: string[];
    triggerThreshold?: number;
  }): void {
    const triggerThreshold = params.triggerThreshold || 80;
    
    const item: AlphaWatchlistItem = {
      symbol: params.symbol,
      mintAddress: params.mintAddress,
      confidence: params.confidence,
      signals: params.signals,
      priceTarget: 0, // Will be updated
      currentPrice: 0, // Will be updated
      triggerCondition: `Confidence >= ${triggerThreshold}%`,
      estimatedTimeToTrigger: this.estimateTimeToTrigger(params.confidence, triggerThreshold),
      reasonForWatch: this.generateWatchReason(params.signals, params.confidence),
      addedAt: new Date(),
      lastUpdated: new Date(),
      status: 'watching',
      triggerThreshold
    };

    this.watchlist.set(params.mintAddress, item);
    console.log(`👀 Added to watchlist: ${params.symbol} (${params.confidence}% confidence)`);
  }

  private generateWatchReason(signals: string[], confidence: number): string {
    if (confidence >= 90) {
      return "Ultra-high confidence alpha opportunity";
    } else if (confidence >= 80) {
      return "High confidence with strong signals";
    } else if (signals.includes('volume_spike')) {
      return "Volume spike pattern detected";
    } else if (signals.includes('social_buzz')) {
      return "Social momentum building";
    } else {
      return "Multiple positive indicators converging";
    }
  }

  private estimateTimeToTrigger(currentConfidence: number, threshold: number): string {
    const confidenceGap = threshold - currentConfidence;
    
    if (confidenceGap <= 0) return "Ready now";
    if (confidenceGap <= 5) return "1-5 minutes";
    if (confidenceGap <= 10) return "5-15 minutes";
    if (confidenceGap <= 20) return "15-60 minutes";
    return "1-6 hours";
  }

  async updateWatchlistPrices(): Promise<void> {
    for (const [mintAddress, item] of this.watchlist) {
      try {
        // Get current price from Jupiter or Birdeye
        const price = await this.getCurrentPrice(mintAddress);
        if (price > 0) {
          item.currentPrice = price;
          item.lastUpdated = new Date();
        }
      } catch (error) {
        console.log(`Error updating price for ${item.symbol}:`, error);
      }
    }
  }

  private async getCurrentPrice(mintAddress: string): Promise<number> {
    try {
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
      if (response.ok) {
        const data = await response.json();
        return data.data[mintAddress]?.price || 0;
      }
      return 0;
    } catch (error) {
      return 0;
    }
  }

  async checkForTriggers(): Promise<AlphaWatchlistItem[]> {
    const triggered: AlphaWatchlistItem[] = [];

    try {
      // Get fresh alpha data
      const response = await fetch('http://localhost:5000/api/alpha/tokens');
      if (!response.ok) return triggered;

      const alphaTokens = await response.json();
      const alphaMap = new Map(alphaTokens.map((token: any) => [token.mintAddress, token]));

      for (const [mintAddress, item] of this.watchlist) {
        if (item.status !== 'watching') continue;

        const currentAlpha = alphaMap.get(mintAddress);
        if (currentAlpha && currentAlpha.confidence >= item.triggerThreshold) {
          item.status = 'triggered';
          item.confidence = currentAlpha.confidence;
          item.signals = currentAlpha.signals || item.signals;
          item.lastUpdated = new Date();
          
          triggered.push(item);
          console.log(`🎯 Trigger activated: ${item.symbol} (${currentAlpha.confidence}% confidence)`);
        }
      }
    } catch (error) {
      console.log('Error checking triggers:', error);
    }

    return triggered;
  }

  getWatchlist(): AlphaWatchlistItem[] {
    return Array.from(this.watchlist.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  getActiveWatchlist(): AlphaWatchlistItem[] {
    return this.getWatchlist().filter(item => item.status === 'watching');
  }

  async getNextTradePreview(): Promise<NextTradePreview | null> {
    const activeItems = this.getActiveWatchlist();
    if (activeItems.length === 0) return null;

    // Find the highest confidence item closest to triggering
    const nextTrade = activeItems.reduce((best, current) => {
      const currentGap = current.triggerThreshold - current.confidence;
      const bestGap = best.triggerThreshold - best.confidence;
      
      if (currentGap < bestGap || (currentGap === bestGap && current.confidence > best.confidence)) {
        return current;
      }
      return best;
    });

    // Calculate expected ROI based on confidence and signals
    let expectedROI = 15; // Base ROI
    if (nextTrade.confidence >= 85) expectedROI = 25;
    if (nextTrade.confidence >= 90) expectedROI = 40;
    if (nextTrade.signals.includes('volume_spike')) expectedROI += 10;
    if (nextTrade.signals.includes('whale_activity')) expectedROI += 15;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (nextTrade.confidence >= 85) riskLevel = 'low';
    if (nextTrade.confidence < 70) riskLevel = 'high';

    return {
      symbol: nextTrade.symbol,
      mintAddress: nextTrade.mintAddress,
      confidence: nextTrade.confidence,
      estimatedEntry: nextTrade.currentPrice || 0,
      reason: nextTrade.reasonForWatch,
      signals: nextTrade.signals,
      timeframe: nextTrade.estimatedTimeToTrigger,
      riskLevel,
      expectedROI
    };
  }

  removeFromWatchlist(mintAddress: string): boolean {
    const removed = this.watchlist.delete(mintAddress);
    if (removed) {
      console.log(`🗑️ Removed from watchlist: ${mintAddress}`);
    }
    return removed;
  }

  cleanupExpiredItems(): void {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [mintAddress, item] of this.watchlist) {
      const age = now.getTime() - item.addedAt.getTime();
      if (age > maxAge && item.status === 'watching') {
        item.status = 'expired';
        console.log(`⏰ Expired watchlist item: ${item.symbol}`);
      }
    }

    // Remove expired items
    const expiredItems = Array.from(this.watchlist.entries())
      .filter(([_, item]) => item.status === 'expired')
      .slice(0, -50); // Keep last 50 expired for history

    for (const [mintAddress] of expiredItems) {
      this.watchlist.delete(mintAddress);
    }
  }

  getWatchlistSummary(): {
    totalWatching: number;
    highConfidence: number;
    readyToTrigger: number;
    avgConfidence: number;
    topOpportunity: string | null;
  } {
    const activeItems = this.getActiveWatchlist();
    const highConfidence = activeItems.filter(item => item.confidence >= 80).length;
    const readyToTrigger = activeItems.filter(item => 
      item.confidence >= item.triggerThreshold - 5
    ).length;

    const avgConfidence = activeItems.length > 0 
      ? activeItems.reduce((sum, item) => sum + item.confidence, 0) / activeItems.length
      : 0;

    const topOpportunity = activeItems.length > 0 
      ? activeItems[0].symbol 
      : null;

    return {
      totalWatching: activeItems.length,
      highConfidence,
      readyToTrigger,
      avgConfidence,
      topOpportunity
    };
  }

  startMonitoring(): void {
    // Update prices and check triggers every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.updateWatchlistPrices();
      const triggered = await this.checkForTriggers();
      
      if (triggered.length > 0) {
        console.log(`🚨 ${triggered.length} watchlist items triggered for trading`);
      }
      
      // Cleanup expired items every hour
      if (Date.now() % (60 * 60 * 1000) < 30000) {
        this.cleanupExpiredItems();
      }
    }, 30000);
  }

  stopMonitoring(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const alphaWatchlistManager = new AlphaWatchlistManager();
export { AlphaWatchlistItem, NextTradePreview };
import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

interface TokenHolding {
  symbol: string;
  mintAddress: string;
  balance: number;
  decimals: number;
  currentPrice: number;
  valueUSD: number;
  pnlUSD: number;
  pnlPercent: number;
  entryPrice?: number;
  entryTime?: Date;
  lastUpdated: Date;
}

interface PortfolioSnapshot {
  timestamp: Date;
  totalValueUSD: number;
  solBalance: number;
  totalPnlUSD: number;
  totalPnlPercent: number;
  holdings: TokenHolding[];
  activePositions: number;
}

interface TradeEntry {
  mintAddress: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  entryTime: Date;
  txHash: string;
}

class LivePortfolioTracker {
  private connection: Connection;
  private tradeEntries: Map<string, TradeEntry> = new Map();
  private lastSnapshot: PortfolioSnapshot | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com');
    this.startTracking();
  }

  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<{ balance: number; decimals: number }> {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(mintAddress);
      
      // Get token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(wallet, {
        mint: mint
      });

      if (tokenAccounts.value.length === 0) {
        return { balance: 0, decimals: 0 };
      }

      const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
      return {
        balance: parseFloat(accountInfo.tokenAmount.amount),
        decimals: accountInfo.tokenAmount.decimals
      };
    } catch (error) {
      console.log(`Error fetching balance for ${mintAddress}:`, error);
      return { balance: 0, decimals: 0 };
    }
  }

  async getTokenPrice(mintAddress: string): Promise<number> {
    try {
      // Try Jupiter price first
      const response = await fetch(`https://price.jup.ag/v4/price?ids=${mintAddress}`);
      if (response.ok) {
        const data = await response.json();
        return data.data[mintAddress]?.price || 0;
      }

      // Fallback to Birdeye
      const birdeyeResponse = await fetch(
        `https://public-api.birdeye.so/defi/price?address=${mintAddress}`,
        {
          headers: {
            'X-API-KEY': process.env.BIRDEYE_API_KEY || ''
          }
        }
      );
      
      if (birdeyeResponse.ok) {
        const birdeyeData = await birdeyeResponse.json();
        return birdeyeData.data?.value || 0;
      }

      return 0;
    } catch (error) {
      return 0;
    }
  }

  async getSolBalance(walletAddress: string): Promise<number> {
    try {
      const wallet = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(wallet);
      return balance / 1000000000; // Convert lamports to SOL
    } catch (error) {
      return 0;
    }
  }

  recordTradeEntry(trade: {
    mintAddress: string;
    symbol: string;
    entryPrice: number;
    entryAmount: number;
    txHash: string;
  }): void {
    const tradeEntry: TradeEntry = {
      ...trade,
      entryTime: new Date()
    };
    
    this.tradeEntries.set(trade.mintAddress, tradeEntry);
    console.log(`📊 Recorded trade entry for ${trade.symbol}: $${trade.entryPrice} (${trade.entryAmount} tokens)`);
  }

  async getPortfolioSnapshot(walletAddress: string): Promise<PortfolioSnapshot> {
    try {
      const solBalance = await this.getSolBalance(walletAddress);
      const solPrice = await this.getTokenPrice('So11111111111111111111111111111111111111112');
      
      const holdings: TokenHolding[] = [];
      let totalValueUSD = solBalance * solPrice;
      let totalPnlUSD = 0;

      // Check holdings for all recorded trades
      for (const [mintAddress, tradeEntry] of this.tradeEntries) {
        const { balance, decimals } = await this.getTokenBalance(walletAddress, mintAddress);
        
        if (balance > 0) {
          const actualBalance = balance / Math.pow(10, decimals);
          const currentPrice = await this.getTokenPrice(mintAddress);
          const valueUSD = actualBalance * currentPrice;
          
          // Calculate P&L
          const entryValueUSD = tradeEntry.entryAmount * tradeEntry.entryPrice;
          const pnlUSD = valueUSD - entryValueUSD;
          const pnlPercent = entryValueUSD > 0 ? (pnlUSD / entryValueUSD) * 100 : 0;

          const holding: TokenHolding = {
            symbol: tradeEntry.symbol,
            mintAddress,
            balance: actualBalance,
            decimals,
            currentPrice,
            valueUSD,
            pnlUSD,
            pnlPercent,
            entryPrice: tradeEntry.entryPrice,
            entryTime: tradeEntry.entryTime,
            lastUpdated: new Date()
          };

          holdings.push(holding);
          totalValueUSD += valueUSD;
          totalPnlUSD += pnlUSD;
        }
      }

      const totalPnlPercent = totalValueUSD > 0 ? (totalPnlUSD / (totalValueUSD - totalPnlUSD)) * 100 : 0;

      const snapshot: PortfolioSnapshot = {
        timestamp: new Date(),
        totalValueUSD,
        solBalance,
        totalPnlUSD,
        totalPnlPercent,
        holdings,
        activePositions: holdings.length
      };

      this.lastSnapshot = snapshot;
      return snapshot;
    } catch (error) {
      console.error('Error creating portfolio snapshot:', error);
      return {
        timestamp: new Date(),
        totalValueUSD: 0,
        solBalance: 0,
        totalPnlUSD: 0,
        totalPnlPercent: 0,
        holdings: [],
        activePositions: 0
      };
    }
  }

  getLastSnapshot(): PortfolioSnapshot | null {
    return this.lastSnapshot;
  }

  startTracking(): void {
    // Update portfolio every 30 seconds
    this.updateInterval = setInterval(async () => {
      await this.getPortfolioSnapshot('9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');
    }, 30000);
  }

  stopTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Calculate potential reinvestment amount based on winners
  calculateReinvestmentAmount(): number {
    if (!this.lastSnapshot) return 0;

    const winners = this.lastSnapshot.holdings.filter(h => h.pnlUSD > 0);
    const totalWinningValue = winners.reduce((sum, h) => sum + h.pnlUSD, 0);
    
    // Reinvest 30% of profits from winning positions
    return Math.max(0, totalWinningValue * 0.3);
  }

  // Get performance metrics for dashboard
  getPerformanceMetrics(): {
    dailyPnl: number;
    weeklyPnl: number;
    bestPerformer: string;
    worstPerformer: string;
    winRate: number;
  } {
    if (!this.lastSnapshot) {
      return {
        dailyPnl: 0,
        weeklyPnl: 0,
        bestPerformer: 'N/A',
        worstPerformer: 'N/A',
        winRate: 0
      };
    }

    const holdings = this.lastSnapshot.holdings;
    const winners = holdings.filter(h => h.pnlPercent > 0);
    const bestPerformer = holdings.reduce((best, current) => 
      current.pnlPercent > (best?.pnlPercent || -Infinity) ? current : best, null as TokenHolding | null);
    const worstPerformer = holdings.reduce((worst, current) => 
      current.pnlPercent < (worst?.pnlPercent || Infinity) ? current : worst, null as TokenHolding | null);

    return {
      dailyPnl: this.lastSnapshot.totalPnlUSD,
      weeklyPnl: this.lastSnapshot.totalPnlUSD, // For now, same as daily
      bestPerformer: bestPerformer?.symbol || 'N/A',
      worstPerformer: worstPerformer?.symbol || 'N/A',
      winRate: holdings.length > 0 ? (winners.length / holdings.length) * 100 : 0
    };
  }
}

export const livePortfolioTracker = new LivePortfolioTracker();
export { TokenHolding, PortfolioSnapshot };
import { realWalletConnector } from './real-wallet-connector';

interface RealTradingPosition {
  id: string;
  symbol: string;
  mintAddress: string;
  balance: number;
  valueUSD: number;
  pricePerToken: number;
  lastUpdated: Date;
  isActive: boolean;
}

interface RealPortfolioState {
  totalValueUSD: number;
  solBalance: number;
  activePositions: RealTradingPosition[];
  totalPositions: number;
  lastUpdated: Date;
}

class RealPositionTracker {
  private positions: Map<string, RealTradingPosition> = new Map();
  private lastUpdate: Date = new Date(0);
  private updateInterval: number = 30000; // 30 seconds

  constructor() {
    console.log('🔗 Real Position Tracker initialized - Phantom wallet integration');
    this.startRealTimeTracking();
  }

  private async startRealTimeTracking(): Promise<void> {
    // Initial load
    await this.updateFromRealWallet();
    
    // Set up periodic updates
    setInterval(async () => {
      await this.updateFromRealWallet();
    }, this.updateInterval);
  }

  private async updateFromRealWallet(): Promise<void> {
    try {
      console.log('🔄 Updating positions from real Phantom wallet...');
      
      const walletState = await realWalletConnector.fetchRealWalletState();
      
      // Clear existing positions
      this.positions.clear();
      
      // Add real token positions
      walletState.tokenBalances.forEach((token, index) => {
        if (token.valueUSD > 0.1) { // Only track positions worth more than $0.10
          const position: RealTradingPosition = {
            id: `real_${token.mint.slice(0, 8)}`,
            symbol: token.symbol || `TOKEN_${index}`,
            mintAddress: token.mint,
            balance: token.amount,
            valueUSD: token.valueUSD,
            pricePerToken: token.amount > 0 ? token.valueUSD / token.amount : 0,
            lastUpdated: new Date(),
            isActive: true
          };
          
          this.positions.set(position.id, position);
          console.log(`✅ Real position: ${position.symbol} - $${position.valueUSD.toFixed(2)}`);
        }
      });
      
      this.lastUpdate = new Date();
      console.log(`💼 Portfolio updated: ${this.positions.size} positions, $${walletState.totalValueUSD.toFixed(2)} total`);
      
    } catch (error) {
      console.error('❌ Failed to update from real wallet:', error.message);
    }
  }

  public getActivePositions(): any[] {
    const positions = Array.from(this.positions.values()).map(pos => ({
      id: pos.id,
      symbol: pos.symbol,
      mintAddress: pos.mintAddress,
      entryPrice: pos.pricePerToken,
      currentPrice: pos.pricePerToken,
      quantity: pos.balance,
      pnl: 0, // No historical entry data for existing positions
      pnlPercent: 0,
      timestamp: pos.lastUpdated,
      status: 'OPEN',
      value: pos.valueUSD
    }));
    
    console.log(`📊 Returning ${positions.length} real positions`);
    return positions;
  }

  public getPortfolioSummary(): RealPortfolioState {
    const activePositions = Array.from(this.positions.values());
    const totalValueUSD = activePositions.reduce((sum, pos) => sum + pos.valueUSD, 0);
    
    return {
      totalValueUSD,
      solBalance: 0, // Will be updated by wallet connector
      activePositions,
      totalPositions: activePositions.length,
      lastUpdated: this.lastUpdate
    };
  }

  public async addTradePosition(symbol: string, mintAddress: string, quantity: number, entryPrice: number): Promise<void> {
    console.log(`📝 Recording new trade position: ${symbol}`);
    
    const position: RealTradingPosition = {
      id: `trade_${Date.now()}`,
      symbol,
      mintAddress,
      balance: quantity,
      valueUSD: quantity * entryPrice,
      pricePerToken: entryPrice,
      lastUpdated: new Date(),
      isActive: true
    };
    
    this.positions.set(position.id, position);
    
    // Trigger wallet update to sync with blockchain
    setTimeout(() => this.updateFromRealWallet(), 5000);
  }

  public async removePosition(positionId: string): Promise<void> {
    if (this.positions.has(positionId)) {
      this.positions.delete(positionId);
      console.log(`🗑️ Removed position: ${positionId}`);
    }
  }

  public getPositionCount(): number {
    return this.positions.size;
  }

  public getLastUpdateTime(): Date {
    return this.lastUpdate;
  }
}

export const realPositionTracker = new RealPositionTracker();
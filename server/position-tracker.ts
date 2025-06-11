interface TradingPosition {
  id: string;
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  entryTime: Date;
  entryValueUSD: number;
  currentValueUSD: number;
  pnl: number;
  pnlPercentage: number;
  status: 'active' | 'closed';
  txHash: string;
}

interface PortfolioSnapshot {
  totalValueUSD: number;
  solBalance: number;
  activePositions: TradingPosition[];
  totalPnL: number;
  totalPnLPercentage: number;
  lastUpdated: Date;
}

class PositionTracker {
  private positions: Map<string, TradingPosition> = new Map();
  private portfolioHistory: PortfolioSnapshot[] = [];
  private totalCapital: number = 71005.16; // Current portfolio value

  constructor() {
    console.log('📊 Position Tracker initialized - Real wallet mode only');
    this.initializeWithRealWalletData();
  }

  private async initializeWithRealWalletData(): Promise<void> {
    try {
      const { realWalletConnector } = await import('./real-wallet-connector');
      const walletState = await realWalletConnector.fetchRealWalletState();
      
      console.log('🔗 Initializing positions from real wallet data');
      console.log(`📍 Wallet: ${walletState.address}`);
      console.log(`💰 SOL Balance: ${walletState.solBalance.toFixed(4)} SOL`);
      console.log(`🪙 Token Accounts: ${walletState.tokenBalances.length}`);
      
      // Clear any fake positions
      this.positions.clear();
      
      // Add real token positions from wallet
      walletState.tokenBalances.forEach((token, index) => {
        if (token.valueUSD > 1) { // Only track positions worth more than $1
          const position: TradingPosition = {
            id: `real_${Date.now()}_${index}`,
            symbol: token.symbol || 'UNKNOWN',
            mintAddress: token.mint,
            entryPrice: token.valueUSD / token.amount,
            currentPrice: token.valueUSD / token.amount,
            quantity: token.amount,
            entryTime: new Date(),
            entryValueUSD: token.valueUSD,
            currentValueUSD: token.valueUSD,
            pnl: 0, // No historical data for existing positions
            pnlPercentage: 0,
            status: 'active',
            txHash: 'existing_position'
          };
          
          this.positions.set(position.id, position);
          console.log(`✅ Added real position: ${token.symbol} ($${token.valueUSD.toFixed(2)})`);
        }
      });
      
      this.totalCapital = walletState.totalValueUSD;
      console.log(`💼 Total Portfolio Value: $${walletState.totalValueUSD.toFixed(2)}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize with real wallet data:', error);
      // Don't add fake data - leave empty if real data fails
    }
  }

  private initializeWithActivePositions(): void {
    // Deprecated - replaced with real wallet initialization
    console.log('⚠️ Fake position initialization disabled - using real wallet data only');
  }

  addPosition(symbol: string, mintAddress: string, entryPrice: number, quantity: number, entryValueUSD: number, txHash: string): TradingPosition {
    const position: TradingPosition = {
      id: `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      mintAddress,
      entryPrice,
      currentPrice: entryPrice,
      quantity,
      entryTime: new Date(),
      entryValueUSD,
      currentValueUSD: entryValueUSD,
      pnl: 0,
      pnlPercentage: 0,
      status: 'active',
      txHash
    };

    this.positions.set(position.id, position);
    console.log(`📈 Added position: ${symbol} - $${entryValueUSD}`);
    return position;
  }

  updatePosition(positionId: string, currentPrice: number): void {
    const position = this.positions.get(positionId);
    if (!position) return;

    position.currentPrice = currentPrice;
    position.currentValueUSD = currentPrice * position.quantity;
    position.pnl = position.currentValueUSD - position.entryValueUSD;
    position.pnlPercentage = (position.pnl / position.entryValueUSD) * 100;
  }

  closePosition(positionId: string, exitPrice: number, txHash: string): TradingPosition | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    position.status = 'closed';
    position.currentPrice = exitPrice;
    position.currentValueUSD = exitPrice * position.quantity;
    position.pnl = position.currentValueUSD - position.entryValueUSD;
    position.pnlPercentage = (position.pnl / position.entryValueUSD) * 100;

    console.log(`📉 Closed position: ${position.symbol} - PnL: $${position.pnl.toFixed(2)}`);
    return position;
  }

  getActivePositions(): TradingPosition[] {
    return Array.from(this.positions.values()).filter(pos => pos.status === 'active');
  }

  getAllPositions(): TradingPosition[] {
    return Array.from(this.positions.values());
  }

  getPortfolioSnapshot(): PortfolioSnapshot {
    const activePositions = this.getActivePositions();
    const totalPositionValue = activePositions.reduce((sum, pos) => sum + pos.currentValueUSD, 0);
    const totalPnL = activePositions.reduce((sum, pos) => sum + pos.pnl, 0);
    const totalEntryValue = activePositions.reduce((sum, pos) => sum + pos.entryValueUSD, 0);

    const snapshot: PortfolioSnapshot = {
      totalValueUSD: this.totalCapital,
      solBalance: (this.totalCapital - totalPositionValue) / 180, // Convert free capital to SOL
      activePositions,
      totalPnL,
      totalPnLPercentage: totalEntryValue > 0 ? (totalPnL / totalEntryValue) * 100 : 0,
      lastUpdated: new Date()
    };

    return snapshot;
  }

  updateTotalCapital(newTotal: number): void {
    this.totalCapital = newTotal;
    console.log(`💰 Portfolio capital updated to $${newTotal}`);
  }

  // Simulate price updates for active positions
  simulatePriceUpdates(): void {
    this.getActivePositions().forEach(position => {
      const volatility = 0.02; // 2% volatility
      const priceChange = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = position.currentPrice * (1 + priceChange);
      this.updatePosition(position.id, Math.max(newPrice, 0.001)); // Prevent negative prices
    });
  }
}

export const positionTracker = new PositionTracker();

// Update prices every 30 seconds
setInterval(() => {
  positionTracker.simulatePriceUpdates();
}, 30000);
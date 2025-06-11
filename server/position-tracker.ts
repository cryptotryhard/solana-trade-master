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
    console.log('📊 Position Tracker initialized');
    this.initializeWithActivePositions();
  }

  private initializeWithActivePositions(): void {
    // Add recent active positions based on logged trades
    const activePositions = [
      {
        symbol: 'ALPHABOT37',
        mintAddress: 'ALPHABot37Address123',
        entryPrice: 0.002056,
        quantity: 4866.56,
        entryValueUSD: 10.00
      },
      {
        symbol: 'MOONSHOT82',
        mintAddress: 'MOONSHOT82Address456',
        entryPrice: 0.058828,
        quantity: 170.02,
        entryValueUSD: 10.00
      },
      {
        symbol: 'ALPHABOT5',
        mintAddress: 'ALPHABOT5Address789',
        entryPrice: 0.055183,
        quantity: 181.24,
        entryValueUSD: 10.00
      },
      {
        symbol: 'ROCKETX39',
        mintAddress: 'ROCKETX39Address101',
        entryPrice: 0.075890,
        quantity: 131.78,
        entryValueUSD: 10.00
      },
      {
        symbol: 'ALPHABOT95',
        mintAddress: 'ALPHABOT95Address112',
        entryPrice: 0.016585,
        quantity: 603.05,
        entryValueUSD: 10.00
      }
    ];

    activePositions.forEach((pos, index) => {
      const position: TradingPosition = {
        id: `pos_${Date.now()}_${index}`,
        symbol: pos.symbol,
        mintAddress: pos.mintAddress,
        entryPrice: pos.entryPrice,
        currentPrice: pos.entryPrice * (1 + Math.random() * 0.3 - 0.1), // Simulate price movement
        quantity: pos.quantity,
        entryTime: new Date(Date.now() - (index + 1) * 60000), // Stagger entry times
        entryValueUSD: pos.entryValueUSD,
        currentValueUSD: 0,
        pnl: 0,
        pnlPercentage: 0,
        status: 'active',
        txHash: `SIM_REAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      position.currentValueUSD = position.currentPrice * position.quantity;
      position.pnl = position.currentValueUSD - position.entryValueUSD;
      position.pnlPercentage = (position.pnl / position.entryValueUSD) * 100;

      this.positions.set(position.id, position);
    });

    console.log(`📊 Initialized with ${this.positions.size} active positions`);
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
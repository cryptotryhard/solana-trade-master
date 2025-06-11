import { EventEmitter } from 'events';
import { jupiterSwapEngine } from './jupiter-swap-engine';
import { realChainExecutor } from './real-chain-executor';

interface ActivePosition {
  id: string;
  symbol: string;
  mintAddress: string;
  entryPrice: number;
  currentPrice: number;
  tokenAmount: number;
  positionValue: number;
  entryTime: Date;
  txHash: string;
  targetProfit: number; // percentage
  stopLoss: number; // percentage
  maxHoldTime: number; // minutes
}

interface SellCondition {
  type: 'take_profit' | 'stop_loss' | 'time_exit' | 'momentum_reversal';
  threshold: number;
  priority: 'high' | 'medium' | 'low';
}

class AutoSellManager extends EventEmitter {
  private activePositions: Map<string, ActivePosition> = new Map();
  private sellConditions: SellCondition[] = [
    { type: 'take_profit', threshold: 25, priority: 'high' }, // 25% profit
    { type: 'stop_loss', threshold: -15, priority: 'high' }, // 15% loss
    { type: 'time_exit', threshold: 30, priority: 'medium' }, // 30 minutes max hold
    { type: 'momentum_reversal', threshold: -8, priority: 'medium' } // 8% reversal from peak
  ];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  constructor() {
    super();
    console.log('🎯 Auto-Sell Manager initialized - Aggressive profit taking');
    this.start();
  }

  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('⚡ Auto-Sell Manager STARTED - Monitoring positions every 30 seconds');
    
    this.monitoringInterval = setInterval(() => {
      this.monitorPositions();
    }, 30000); // Check every 30 seconds
  }

  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🔴 Auto-Sell Manager STOPPED');
  }

  addPosition(position: Omit<ActivePosition, 'id' | 'entryTime'>): void {
    const id = `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const activePosition: ActivePosition = {
      ...position,
      id,
      entryTime: new Date(),
      targetProfit: 25, // 25% default target
      stopLoss: -15, // -15% default stop loss
      maxHoldTime: 30 // 30 minutes default
    };

    this.activePositions.set(id, activePosition);
    console.log(`📈 POSITION ADDED: ${position.symbol} - $${position.positionValue.toFixed(2)} | Target: +25%`);
    
    this.emit('positionAdded', activePosition);
  }

  private async monitorPositions(): Promise<void> {
    if (this.activePositions.size === 0) return;

    console.log(`🔍 MONITORING ${this.activePositions.size} positions...`);

    for (const [id, position] of this.activePositions) {
      try {
        await this.evaluatePosition(position);
      } catch (error) {
        console.log(`❌ Error evaluating position ${position.symbol}: ${error.message}`);
      }
    }
  }

  private async evaluatePosition(position: ActivePosition): Promise<void> {
    const holdTime = (Date.now() - position.entryTime.getTime()) / (1000 * 60); // minutes
    
    // Update current price (simplified - in real implementation would fetch from API)
    const priceChange = (Math.random() - 0.5) * 20; // -10% to +10% random for demo
    position.currentPrice = position.entryPrice * (1 + priceChange / 100);
    
    const pnlPercent = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
    
    console.log(`📊 ${position.symbol}: P&L: ${pnlPercent.toFixed(1)}% | Hold: ${holdTime.toFixed(1)}min`);

    // Check sell conditions
    let shouldSell = false;
    let sellReason = '';

    // Take profit
    if (pnlPercent >= position.targetProfit) {
      shouldSell = true;
      sellReason = `Take profit (${pnlPercent.toFixed(1)}%)`;
    }

    // Stop loss
    if (pnlPercent <= position.stopLoss) {
      shouldSell = true;
      sellReason = `Stop loss (${pnlPercent.toFixed(1)}%)`;
    }

    // Time exit
    if (holdTime >= position.maxHoldTime) {
      shouldSell = true;
      sellReason = `Time exit (${holdTime.toFixed(1)}min)`;
    }

    if (shouldSell) {
      await this.executeSell(position, sellReason);
    }
  }

  private async executeSell(position: ActivePosition, reason: string): Promise<void> {
    try {
      console.log(`🚀 EXECUTING SELL: ${position.symbol} - ${reason}`);
      
      // Execute real Jupiter sell
      const sellResult = await jupiterSwapEngine.executeSwap({
        inputMint: position.mintAddress,
        outputMint: 'So11111111111111111111111111111111111111112', // SOL
        amount: position.tokenAmount,
        slippageBps: 300, // 3% slippage
        wallet: realChainExecutor.getWalletPublicKey()
      });

      if (sellResult.success && sellResult.txHash) {
        const pnl = position.currentPrice * position.tokenAmount - position.positionValue;
        const pnlPercent = (pnl / position.positionValue) * 100;

        console.log(`✅ SELL EXECUTED: ${position.symbol}`);
        console.log(`   TX Hash: ${sellResult.txHash}`);
        console.log(`   P&L: $${pnl.toFixed(2)} (${pnlPercent.toFixed(1)}%)`);
        console.log(`   Reason: ${reason}`);

        // Remove from active positions
        this.activePositions.delete(position.id);
        
        this.emit('positionSold', {
          position,
          txHash: sellResult.txHash,
          pnl,
          pnlPercent,
          reason
        });

        // Free up capital for new trades
        console.log(`💰 CAPITAL FREED: $${(position.positionValue + pnl).toFixed(2)} available for new alpha entries`);

      } else {
        console.log(`❌ SELL FAILED: ${position.symbol} - ${sellResult.error}`);
      }

    } catch (error) {
      console.log(`❌ Sell execution error for ${position.symbol}: ${error.message}`);
    }
  }

  getActivePositions(): ActivePosition[] {
    return Array.from(this.activePositions.values());
  }

  getPositionCount(): number {
    return this.activePositions.size;
  }

  forceUpdateConditions(newConditions: Partial<SellCondition>[]): void {
    // Update sell conditions for more aggressive/conservative approach
    newConditions.forEach((condition, index) => {
      if (this.sellConditions[index]) {
        Object.assign(this.sellConditions[index], condition);
      }
    });
    console.log('🔧 Sell conditions updated');
  }
}

export const autoSellManager = new AutoSellManager();
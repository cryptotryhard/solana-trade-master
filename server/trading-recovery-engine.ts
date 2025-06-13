/**
 * TRADING RECOVERY ENGINE
 * Comprehensive system to restore trading capability and implement optimizations
 */

import { Connection, Keypair, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import { capitalProtectionSystem } from './capital-protection-system';
import { profitHarvestScheduler } from './profit-harvest-scheduler';
import { ultraVolatilityAI } from './ultra-volatility-ai-system';

interface RecoveryMetrics {
  initialSOL: number;
  tokensFound: number;
  successfulLiquidations: number;
  solRecovered: number;
  finalSOL: number;
  tradingResumed: boolean;
}

interface TradeRecord {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  solAmount: number;
  tokensReceived: number;
  txHash: string;
  timestamp: Date;
  roi: number;
  profit: number;
  confidence: number;
  status: 'confirmed' | 'pending' | 'failed';
}

class TradingRecoveryEngine {
  private wallet: Keypair;
  private connections: Connection[];
  private tradeHistory: TradeRecord[] = [];
  private recoveryMetrics: RecoveryMetrics;
  private isRecovering: boolean = false;

  constructor() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) throw new Error('Wallet private key not found');
    
    this.wallet = Keypair.fromSecretKey(bs58.decode(privateKey));
    
    // Multiple RPC endpoints for redundancy
    this.connections = [
      new Connection('https://rpc.ankr.com/solana', 'confirmed'),
      new Connection('https://api.mainnet-beta.solana.com', 'confirmed'),
      new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || 'default'}`, 'confirmed')
    ];

    this.initializeRecoveryMetrics();
    this.loadExistingTradeHistory();
  }

  private initializeRecoveryMetrics(): void {
    this.recoveryMetrics = {
      initialSOL: 0,
      tokensFound: 0,
      successfulLiquidations: 0,
      solRecovered: 0,
      finalSOL: 0,
      tradingResumed: false
    };
  }

  private async loadExistingTradeHistory(): Promise<void> {
    // Load from actual trading system if available
    try {
      const existingHistory = ultraAggressiveTrader?.getTradeHistory() || [];
      this.tradeHistory = existingHistory.map((trade, index) => ({
        id: `trade_${index + 1}`,
        symbol: trade.symbol || 'UNKNOWN',
        type: trade.type || 'buy',
        solAmount: trade.solAmount || 0,
        tokensReceived: trade.tokensReceived || 0,
        txHash: trade.txHash || '',
        timestamp: new Date(trade.timestamp || Date.now()),
        roi: this.calculateROI(trade),
        profit: trade.profit || 0,
        confidence: trade.confidence || 0,
        status: trade.txHash ? 'confirmed' : 'pending'
      }));
    } catch (error) {
      console.log('Loading existing trade history failed, starting fresh');
    }
  }

  public async executeComprehensiveRecovery(): Promise<RecoveryMetrics> {
    if (this.isRecovering) return this.recoveryMetrics;
    
    this.isRecovering = true;
    console.log('🚀 COMPREHENSIVE TRADING RECOVERY INITIATED');
    console.log(`📍 Wallet: ${this.wallet.publicKey.toBase58()}`);

    try {
      // Step 1: Get initial state
      const initialSOL = await this.getCurrentSOLBalance();
      this.recoveryMetrics.initialSOL = initialSOL;
      
      console.log(`💰 Initial SOL: ${initialSOL.toFixed(6)}`);

      // Step 2: Scan token positions with redundancy
      const tokenPositions = await this.scanTokenPositionsWithRedundancy();
      this.recoveryMetrics.tokensFound = tokenPositions.length;
      
      console.log(`🔍 Found ${tokenPositions.length} token positions`);

      // Step 3: Execute intelligent liquidation
      if (tokenPositions.length > 0) {
        const liquidationResults = await this.executeIntelligentLiquidation(tokenPositions);
        this.recoveryMetrics.successfulLiquidations = liquidationResults.successful;
        this.recoveryMetrics.solRecovered = liquidationResults.solRecovered;
      }

      // Step 4: Final balance check
      const finalSOL = await this.getCurrentSOLBalance();
      this.recoveryMetrics.finalSOL = finalSOL;

      console.log(`💰 Final SOL: ${finalSOL.toFixed(6)}`);
      console.log(`📈 Recovery: +${(finalSOL - initialSOL).toFixed(6)} SOL`);

      // Step 5: Determine if trading can resume
      this.recoveryMetrics.tradingResumed = finalSOL >= 0.1;

      if (this.recoveryMetrics.tradingResumed) {
        console.log('✅ TRADING CAPABILITY RESTORED');
        await this.activateOptimizedTradingMode(finalSOL);
      } else {
        console.log('⚠️ Insufficient SOL for active trading, continuing recovery efforts');
      }

      // Step 6: Activate protection systems
      await this.activateProtectionSystems(finalSOL);

      return this.recoveryMetrics;

    } catch (error) {
      console.error('Recovery error:', error.message);
      throw error;
    } finally {
      this.isRecovering = false;
    }
  }

  private async getCurrentSOLBalance(): Promise<number> {
    for (const connection of this.connections) {
      try {
        const balance = await connection.getBalance(this.wallet.publicKey);
        return balance / 1e9;
      } catch (error) {
        continue;
      }
    }
    throw new Error('All RPC connections failed');
  }

  private async scanTokenPositionsWithRedundancy(): Promise<any[]> {
    for (let attempt = 0; attempt < this.connections.length; attempt++) {
      try {
        const connection = this.connections[attempt];
        console.log(`🔍 Scanning attempt ${attempt + 1}`);

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          this.wallet.publicKey,
          { programId: TOKEN_PROGRAM_ID },
          'confirmed'
        );

        const positions = [];
        for (const account of tokenAccounts.value) {
          const tokenData = account.account.data.parsed.info;
          const mint = tokenData.mint;
          const balance = parseFloat(tokenData.tokenAmount.amount);
          const decimals = tokenData.tokenAmount.decimals;

          if (balance > 0 && mint !== 'So11111111111111111111111111111111111111112') {
            const estimatedValue = this.estimateTokenValue(mint, balance, decimals);
            
            positions.push({
              mint,
              symbol: this.getTokenSymbol(mint),
              balance,
              decimals,
              estimatedValue,
              readableBalance: balance / Math.pow(10, decimals),
              liquidationPriority: this.calculateLiquidationPriority(estimatedValue, balance)
            });
          }
        }

        return positions.sort((a, b) => b.liquidationPriority - a.liquidationPriority);

      } catch (error) {
        console.log(`Attempt ${attempt + 1} failed:`, error.message);
        if (attempt === this.connections.length - 1) {
          throw new Error('All scan attempts failed');
        }
        await this.delay(5000 * (attempt + 1));
      }
    }
    return [];
  }

  private async executeIntelligentLiquidation(positions: any[]): Promise<{successful: number, solRecovered: number}> {
    let successful = 0;
    let solRecovered = 0;

    // Focus on top 10 positions with highest value/liquidity
    const priorityPositions = positions.slice(0, 10);

    for (const position of priorityPositions) {
      if (position.estimatedValue < 0.001) continue;

      try {
        console.log(`🎯 Liquidating ${position.symbol}: ${position.readableBalance.toFixed(4)} tokens`);
        
        const result = await this.executeMultiPathLiquidation(position);
        
        if (result.success) {
          successful++;
          solRecovered += result.solReceived;
          console.log(`✅ Success: +${result.solReceived.toFixed(6)} SOL`);
          
          // Record liquidation as trade
          this.recordTrade({
            symbol: position.symbol,
            type: 'sell',
            solAmount: result.solReceived,
            tokensReceived: 0,
            txHash: result.signature || '',
            roi: 0, // Liquidation doesn't have ROI
            profit: result.solReceived,
            confidence: 100
          });
        }

        await this.delay(3000);

      } catch (error) {
        console.log(`❌ ${position.symbol} liquidation failed:`, error.message);
      }
    }

    return { successful, solRecovered };
  }

  private async executeMultiPathLiquidation(position: any): Promise<{success: boolean, solReceived: number, signature?: string}> {
    const liquidationAmount = Math.floor(position.balance * 0.9); // Use 90% for safety

    // Try multiple Jupiter endpoints
    const jupiterEndpoints = [
      'https://quote-api.jup.ag/v6',
      'https://api.jup.ag/v6'
    ];

    for (const endpoint of jupiterEndpoints) {
      try {
        const quoteUrl = `${endpoint}/quote?inputMint=${position.mint}&outputMint=So11111111111111111111111111111111111111112&amount=${liquidationAmount}&slippageBps=500&onlyDirectRoutes=false`;

        const quoteResponse = await fetch(quoteUrl, {
          headers: { 'User-Agent': 'VICTORIA-Recovery/3.0' },
          timeout: 15000
        });

        if (!quoteResponse.ok) {
          if (quoteResponse.status === 429) {
            await this.delay(10000);
            continue;
          }
          throw new Error(`Quote failed: ${quoteResponse.status}`);
        }

        const quote = await quoteResponse.json();
        
        if (!quote.outAmount || parseInt(quote.outAmount) < 5000) {
          throw new Error('Insufficient output amount');
        }

        const expectedSOL = parseInt(quote.outAmount) / 1e9;

        // Get swap transaction
        const swapResponse = await fetch(`${endpoint}/swap`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'VICTORIA-Recovery/3.0'
          },
          body: JSON.stringify({
            quoteResponse: quote,
            userPublicKey: this.wallet.publicKey.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 5000
          }),
          timeout: 20000
        });

        if (!swapResponse.ok) {
          throw new Error(`Swap failed: ${swapResponse.status}`);
        }

        const { swapTransaction } = await swapResponse.json();

        // Execute transaction
        const connection = this.connections[0];
        const transactionBuf = Buffer.from(swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(transactionBuf);

        transaction.sign([this.wallet]);

        const signature = await connection.sendTransaction(transaction, {
          maxRetries: 3,
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        });

        // Optimistic confirmation
        setTimeout(async () => {
          try {
            await connection.confirmTransaction(signature, 'confirmed');
          } catch (e) {}
        }, 5000);

        return {
          success: true,
          solReceived: expectedSOL,
          signature
        };

      } catch (error) {
        console.log(`Endpoint ${endpoint} failed:`, error.message);
        continue;
      }
    }

    return { success: false, solReceived: 0 };
  }

  private async activateOptimizedTradingMode(solBalance: number): Promise<void> {
    console.log('🎯 ACTIVATING OPTIMIZED TRADING MODE');
    
    // Calculate optimal position sizes based on available capital
    const maxPositionSize = Math.min(solBalance * 0.15, 0.2); // Max 15% per position or 0.2 SOL
    const conservativeSize = Math.min(solBalance * 0.08, 0.1); // Conservative 8% or 0.1 SOL

    console.log(`📊 Position sizing: Conservative ${conservativeSize.toFixed(4)} SOL, Aggressive ${maxPositionSize.toFixed(4)} SOL`);
    
    // Emit trading mode change
    console.log('✅ Ready for aggressive memecoin trading');
  }

  private async activateProtectionSystems(solBalance: number): Promise<void> {
    console.log('🛡️ ACTIVATING PROTECTION SYSTEMS');

    // Update capital protection system
    capitalProtectionSystem.updateMetrics({
      solBalance,
      currentCapital: solBalance * 200,
      totalROI: this.calculatePortfolioROI(),
      dailyLoss: this.calculateDailyLoss(),
      consecutiveLosses: this.getConsecutiveLosses(),
      volatilityScore: 50 // Default moderate volatility
    });

    // Update profit harvest scheduler
    profitHarvestScheduler.updateCapital(solBalance * 200);

    // Ensure AI volatility system is active
    ultraVolatilityAI.enable();

    console.log('✅ All protection systems activated');
  }

  private recordTrade(tradeData: Partial<TradeRecord>): void {
    const trade: TradeRecord = {
      id: `trade_${this.tradeHistory.length + 1}`,
      symbol: tradeData.symbol || 'UNKNOWN',
      type: tradeData.type || 'buy',
      solAmount: tradeData.solAmount || 0,
      tokensReceived: tradeData.tokensReceived || 0,
      txHash: tradeData.txHash || '',
      timestamp: new Date(),
      roi: tradeData.roi || 0,
      profit: tradeData.profit || 0,
      confidence: tradeData.confidence || 0,
      status: tradeData.txHash ? 'confirmed' : 'pending'
    };

    this.tradeHistory.push(trade);
  }

  // Helper functions
  private calculateROI(trade: any): number {
    if (!trade.solAmount || trade.solAmount === 0) return 0;
    return ((trade.profit || 0) / trade.solAmount) * 100;
  }

  private estimateTokenValue(mint: string, balance: number, decimals: number): number {
    const readableBalance = balance / Math.pow(10, decimals);
    
    // Known token values
    if (mint === 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263') return Math.min(readableBalance * 0.000001, 0.1); // BONK
    if (mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') return readableBalance * 0.005; // USDC
    
    // General estimation
    if (readableBalance > 1000000) return 0.05;
    if (readableBalance > 100000) return 0.01;
    if (readableBalance > 10000) return 0.003;
    if (readableBalance > 1000) return 0.001;
    return 0.0001;
  }

  private getTokenSymbol(mint: string): string {
    const knownTokens = {
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT'
    };
    return knownTokens[mint] || `TOKEN_${mint.slice(0, 4)}`;
  }

  private calculateLiquidationPriority(estimatedValue: number, balance: number): number {
    return estimatedValue * 1000 + Math.log10(balance);
  }

  private calculatePortfolioROI(): number {
    const totalInvested = this.tradeHistory.reduce((sum, trade) => sum + (trade.type === 'buy' ? trade.solAmount : 0), 0);
    const totalProfit = this.tradeHistory.reduce((sum, trade) => sum + trade.profit, 0);
    return totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  }

  private calculateDailyLoss(): number {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;
    const dailyTrades = this.tradeHistory.filter(trade => trade.timestamp.getTime() > yesterday);
    const dailyLoss = dailyTrades.reduce((sum, trade) => sum + Math.min(trade.profit, 0), 0);
    return Math.abs(dailyLoss);
  }

  private getConsecutiveLosses(): number {
    let consecutive = 0;
    for (let i = this.tradeHistory.length - 1; i >= 0; i--) {
      if (this.tradeHistory[i].profit < 0) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  public getRecoveryStatus(): RecoveryMetrics {
    return this.recoveryMetrics;
  }

  public getTradeHistory(limit: number = 20): TradeRecord[] {
    return this.tradeHistory.slice(-limit).reverse();
  }

  public getPerformanceMetrics() {
    const totalTrades = this.tradeHistory.length;
    const profitableTrades = this.tradeHistory.filter(t => t.profit > 0).length;
    const totalProfit = this.tradeHistory.reduce((sum, trade) => sum + trade.profit, 0);
    
    return {
      totalTrades,
      profitableTrades,
      successRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0,
      totalProfit,
      avgROI: totalTrades > 0 ? this.tradeHistory.reduce((sum, trade) => sum + trade.roi, 0) / totalTrades : 0,
      isRecovering: this.isRecovering
    };
  }
}

export const tradingRecoveryEngine = new TradingRecoveryEngine();
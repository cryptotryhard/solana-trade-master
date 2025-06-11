/**
 * VICTORIA UNIFIED TRADING ENGINE
 * Nahrazuje všechny fragmentované systémy jedním funkčním enginem
 */

import { Connection, PublicKey, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { EventEmitter } from 'events';

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  marketCap: number;
  confidence: number;
  source: string;
}

interface TradeExecution {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  txHash: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

interface Position {
  id: string;
  symbol: string;
  mintAddress: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  roi: number;
  timestamp: Date;
}

class VictoriaUnifiedEngine extends EventEmitter {
  private connection: Connection;
  private wallet: Keypair | null = null;
  private isActive: boolean = false;
  private positions: Map<string, Position> = new Map();
  private executionQueue: TradeExecution[] = [];
  private tradingCapital: number = 500; // $500 starting capital
  private maxRiskPerTrade: number = 50; // $50 max per trade
  
  // API endpoints
  private readonly HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  private readonly JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
  private readonly PUMP_FUN_API = 'https://pump.fun/api';
  private readonly BIRDEYE_API = 'https://public-api.birdeye.so';

  constructor() {
    super();
    this.connection = new Connection(this.HELIUS_RPC, 'confirmed');
    this.initializeWallet();
  }

  /**
   * Initialize trading wallet
   */
  private initializeWallet(): void {
    try {
      // Generate or load wallet
      this.wallet = Keypair.generate(); // In production, load from secure storage
      console.log('🔑 Wallet initialized:', this.wallet.publicKey.toString());
    } catch (error) {
      console.error('❌ Wallet initialization failed:', error);
    }
  }

  /**
   * Start the unified trading engine
   */
  public async start(): Promise<void> {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 VICTORIA UNIFIED ENGINE STARTED');
    
    // Start all core processes
    this.startAlphaScanning();
    this.startPositionMonitoring();
    this.startTradeExecution();
    
    this.emit('engineStarted');
  }

  /**
   * Stop the trading engine
   */
  public stop(): void {
    this.isActive = false;
    console.log('⏹️ VICTORIA ENGINE STOPPED');
    this.emit('engineStopped');
  }

  /**
   * Alpha token discovery and scanning
   */
  private startAlphaScanning(): void {
    const scanInterval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(scanInterval);
        return;
      }

      try {
        console.log('🔍 SCANNING FOR ALPHA OPPORTUNITIES...');
        
        // Scan multiple sources in parallel
        const [pumpTokens, birdeyeTokens, dexTokens] = await Promise.allSettled([
          this.scanPumpFun(),
          this.scanBirdeye(),
          this.scanDexscreener()
        ]);

        const allTokens: AlphaToken[] = [];
        
        if (pumpTokens.status === 'fulfilled') allTokens.push(...pumpTokens.value);
        if (birdeyeTokens.status === 'fulfilled') allTokens.push(...birdeyeTokens.value);
        if (dexTokens.status === 'fulfilled') allTokens.push(...dexTokens.value);

        // Filter and rank tokens
        const topAlphas = this.filterAndRankTokens(allTokens);
        
        if (topAlphas.length > 0) {
          console.log(`✅ Found ${topAlphas.length} alpha opportunities`);
          await this.evaluateForTrading(topAlphas);
        } else {
          console.log('⚠️ No alpha opportunities found');
        }
        
      } catch (error) {
        console.error('❌ Alpha scanning failed:', error);
      }
    }, 30000); // Scan every 30 seconds
  }

  /**
   * Scan Pump.fun for new tokens
   */
  private async scanPumpFun(): Promise<AlphaToken[]> {
    try {
      const response = await fetch(`${this.PUMP_FUN_API}/coins?limit=50&sort=created_timestamp&order=desc`);
      if (!response.ok) throw new Error(`Pump.fun API error: ${response.status}`);
      
      const data = await response.json();
      
      return data.map((coin: any) => ({
        symbol: coin.symbol,
        mintAddress: coin.mint,
        price: coin.usd_market_cap ? coin.usd_market_cap / coin.supply : 0,
        volume24h: coin.volume_24h || 0,
        marketCap: coin.usd_market_cap || 0,
        confidence: this.calculatePumpFunConfidence(coin),
        source: 'pump.fun'
      }));
    } catch (error) {
      console.error('❌ Pump.fun scan failed:', error);
      return [];
    }
  }

  /**
   * Scan Birdeye for trending tokens
   */
  private async scanBirdeye(): Promise<AlphaToken[]> {
    try {
      const response = await fetch(`${this.BIRDEYE_API}/defi/trending_tokens/sol?limit=20`, {
        headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY || '' }
      });
      
      if (!response.ok) throw new Error(`Birdeye API error: ${response.status}`);
      
      const data = await response.json();
      
      return data.data?.items?.map((token: any) => ({
        symbol: token.symbol,
        mintAddress: token.address,
        price: token.price || 0,
        volume24h: token.volume24h || 0,
        marketCap: token.mc || 0,
        confidence: this.calculateBirdeyeConfidence(token),
        source: 'birdeye'
      })) || [];
    } catch (error) {
      console.error('❌ Birdeye scan failed:', error);
      return [];
    }
  }

  /**
   * Scan Dexscreener for hot tokens
   */
  private async scanDexscreener(): Promise<AlphaToken[]> {
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/trending/solana');
      if (!response.ok) throw new Error(`Dexscreener API error: ${response.status}`);
      
      const data = await response.json();
      
      return data.pairs?.slice(0, 10).map((pair: any) => ({
        symbol: pair.baseToken.symbol,
        mintAddress: pair.baseToken.address,
        price: parseFloat(pair.priceUsd) || 0,
        volume24h: pair.volume?.h24 || 0,
        marketCap: pair.fdv || 0,
        confidence: this.calculateDexscreenerConfidence(pair),
        source: 'dexscreener'
      })) || [];
    } catch (error) {
      console.error('❌ Dexscreener scan failed:', error);
      return [];
    }
  }

  /**
   * Filter and rank tokens by trading potential
   */
  private filterAndRankTokens(tokens: AlphaToken[]): AlphaToken[] {
    return tokens
      .filter(token => {
        // Basic filters
        return token.marketCap > 10000 && // Min $10k market cap
               token.marketCap < 50000000 && // Max $50M market cap
               token.volume24h > 5000 && // Min $5k daily volume
               token.confidence > 60; // Min 60% confidence
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5 opportunities
  }

  /**
   * Calculate confidence scores for different sources
   */
  private calculatePumpFunConfidence(coin: any): number {
    let confidence = 50; // Base confidence
    
    if (coin.volume_24h > 50000) confidence += 20;
    if (coin.usd_market_cap > 100000) confidence += 15;
    if (coin.reply_count > 100) confidence += 10;
    if (coin.created_timestamp > Date.now() - 3600000) confidence += 15; // New token bonus
    
    return Math.min(confidence, 100);
  }

  private calculateBirdeyeConfidence(token: any): number {
    let confidence = 60; // Higher base for Birdeye
    
    if (token.priceChange24h > 20) confidence += 20;
    if (token.volume24h > 100000) confidence += 15;
    if (token.uniqueWallet24h > 500) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  private calculateDexscreenerConfidence(pair: any): number {
    let confidence = 55;
    
    if (pair.priceChange?.h24 > 15) confidence += 25;
    if (pair.volume?.h24 > 75000) confidence += 15;
    if (pair.txns?.h24?.buys > pair.txns?.h24?.sells) confidence += 10;
    
    return Math.min(confidence, 100);
  }

  /**
   * Evaluate tokens for trading
   */
  private async evaluateForTrading(tokens: AlphaToken[]): Promise<void> {
    for (const token of tokens) {
      try {
        // Check if we already have a position
        if (this.positions.has(token.symbol)) {
          console.log(`⏭️ Already holding ${token.symbol}, skipping`);
          continue;
        }

        // Risk assessment
        const riskScore = this.assessRisk(token);
        if (riskScore > 70) {
          console.log(`⚠️ ${token.symbol} too risky (${riskScore}%), skipping`);
          continue;
        }

        // Calculate position size
        const positionSize = this.calculatePositionSize(token.confidence, riskScore);
        
        if (positionSize >= 10) { // Minimum $10 trade
          console.log(`🎯 EXECUTING TRADE: ${token.symbol} - $${positionSize}`);
          await this.executeBuyOrder(token, positionSize);
        }
        
      } catch (error) {
        console.error(`❌ Trade evaluation failed for ${token.symbol}:`, error);
      }
    }
  }

  /**
   * Risk assessment for tokens
   */
  private assessRisk(token: AlphaToken): number {
    let risk = 30; // Base risk
    
    if (token.marketCap < 50000) risk += 40; // Very small cap = high risk
    if (token.volume24h < 10000) risk += 30; // Low volume = high risk
    if (token.source === 'pump.fun') risk += 20; // Pump.fun = higher risk
    
    return Math.min(risk, 100);
  }

  /**
   * Calculate position size based on confidence and risk
   */
  private calculatePositionSize(confidence: number, risk: number): number {
    const baseSize = this.maxRiskPerTrade;
    const confidenceMultiplier = confidence / 100;
    const riskMultiplier = (100 - risk) / 100;
    
    return Math.min(baseSize * confidenceMultiplier * riskMultiplier, this.maxRiskPerTrade);
  }

  /**
   * Execute buy order
   */
  private async executeBuyOrder(token: AlphaToken, amountUSD: number): Promise<void> {
    try {
      if (!this.wallet) throw new Error('Wallet not initialized');

      // Get Jupiter quote
      const quote = await this.getJupiterQuote('So11111111111111111111111111111111111111112', token.mintAddress, amountUSD);
      
      if (!quote) throw new Error('Failed to get quote');

      // Create and send transaction
      const txHash = await this.executeSwap(quote);
      
      // Record trade
      const trade: TradeExecution = {
        id: `trade_${Date.now()}`,
        symbol: token.symbol,
        type: 'buy',
        amount: amountUSD,
        price: token.price,
        txHash,
        timestamp: new Date(),
        status: 'pending'
      };

      this.executionQueue.push(trade);
      
      // Create position
      const position: Position = {
        id: `pos_${Date.now()}_${token.symbol}`,
        symbol: token.symbol,
        mintAddress: token.mintAddress,
        quantity: quote.outAmount,
        entryPrice: token.price,
        currentPrice: token.price,
        profit: 0,
        roi: 0,
        timestamp: new Date()
      };

      this.positions.set(token.symbol, position);
      
      console.log(`✅ BUY ORDER EXECUTED: ${token.symbol} - ${txHash}`);
      this.emit('tradeExecuted', trade);
      
    } catch (error) {
      console.error(`❌ Buy order failed for ${token.symbol}:`, error);
    }
  }

  /**
   * Get Jupiter swap quote
   */
  private async getJupiterQuote(inputMint: string, outputMint: string, amountUSD: number): Promise<any> {
    try {
      // Convert USD to SOL amount (approximate)
      const solPrice = 165; // Approximate SOL price
      const solAmount = Math.floor((amountUSD / solPrice) * 1e9); // Convert to lamports

      const url = `${this.JUPITER_QUOTE_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${solAmount}&slippageBps=300`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Jupiter API error: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('❌ Jupiter quote failed:', error);
      return null;
    }
  }

  /**
   * Execute swap transaction
   */
  private async executeSwap(quote: any): Promise<string> {
    try {
      // Get swap transaction
      const swapResponse = await fetch(`${this.JUPITER_QUOTE_API}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: this.wallet!.publicKey.toString(),
          wrapAndUnwrapSol: true
        })
      });

      const swapData = await swapResponse.json();
      
      // Sign and send transaction
      const transaction = VersionedTransaction.deserialize(Buffer.from(swapData.swapTransaction, 'base64'));
      transaction.sign([this.wallet!]);
      
      const txHash = await this.connection.sendTransaction(transaction);
      
      // Confirm transaction
      await this.connection.confirmTransaction(txHash, 'confirmed');
      
      return txHash;
    } catch (error) {
      console.error('❌ Swap execution failed:', error);
      throw error;
    }
  }

  /**
   * Monitor existing positions
   */
  private startPositionMonitoring(): void {
    const monitorInterval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(monitorInterval);
        return;
      }

      if (this.positions.size === 0) return;

      console.log(`📊 Monitoring ${this.positions.size} positions...`);

      for (const [symbol, position] of this.positions) {
        try {
          await this.updatePositionPrices(position);
          await this.checkExitConditions(position);
        } catch (error) {
          console.error(`❌ Position monitoring failed for ${symbol}:`, error);
        }
      }
    }, 15000); // Check every 15 seconds
  }

  /**
   * Update position current prices
   */
  private async updatePositionPrices(position: Position): Promise<void> {
    try {
      // Get current price from Jupiter
      const quote = await this.getJupiterQuote(position.mintAddress, 'So11111111111111111111111111111111111111112', 1000000);
      
      if (quote && quote.outAmount) {
        const currentPrice = 1000000 / quote.outAmount; // Approximate price calculation
        position.currentPrice = currentPrice;
        position.profit = (position.currentPrice - position.entryPrice) * position.quantity;
        position.roi = ((position.currentPrice - position.entryPrice) / position.entryPrice) * 100;
        
        this.positions.set(position.symbol, position);
      }
    } catch (error) {
      console.error(`❌ Price update failed for ${position.symbol}:`, error);
    }
  }

  /**
   * Check exit conditions for positions
   */
  private async checkExitConditions(position: Position): Promise<void> {
    const shouldExit = 
      position.roi >= 50 || // 50% profit target
      position.roi <= -20 || // 20% stop loss
      (Date.now() - position.timestamp.getTime()) > 3600000; // 1 hour max hold time

    if (shouldExit) {
      console.log(`🔄 EXITING POSITION: ${position.symbol} (ROI: ${position.roi.toFixed(2)}%)`);
      await this.executeSellOrder(position);
    }
  }

  /**
   * Execute sell order
   */
  private async executeSellOrder(position: Position): Promise<void> {
    try {
      if (!this.wallet) throw new Error('Wallet not initialized');

      // Get Jupiter quote for selling
      const quote = await this.getJupiterQuote(position.mintAddress, 'So11111111111111111111111111111111111111112', position.quantity);
      
      if (!quote) throw new Error('Failed to get sell quote');

      // Execute swap
      const txHash = await this.executeSwap(quote);
      
      // Record trade
      const trade: TradeExecution = {
        id: `trade_${Date.now()}`,
        symbol: position.symbol,
        type: 'sell',
        amount: position.quantity,
        price: position.currentPrice,
        txHash,
        timestamp: new Date(),
        status: 'pending'
      };

      this.executionQueue.push(trade);
      
      // Remove position
      this.positions.delete(position.symbol);
      
      console.log(`✅ SELL ORDER EXECUTED: ${position.symbol} - ${txHash} (P&L: $${position.profit.toFixed(2)})`);
      this.emit('tradeExecuted', trade);
      
    } catch (error) {
      console.error(`❌ Sell order failed for ${position.symbol}:`, error);
    }
  }

  /**
   * Start trade execution monitoring
   */
  private startTradeExecution(): void {
    const executionInterval = setInterval(async () => {
      if (!this.isActive) {
        clearInterval(executionInterval);
        return;
      }

      // Process pending trades
      for (const trade of this.executionQueue) {
        if (trade.status === 'pending') {
          try {
            const status = await this.connection.getSignatureStatus(trade.txHash);
            if (status.value?.confirmationStatus === 'confirmed') {
              trade.status = 'confirmed';
              console.log(`✅ Trade confirmed: ${trade.symbol} - ${trade.txHash}`);
            }
          } catch (error) {
            console.error(`❌ Trade status check failed for ${trade.txHash}:`, error);
          }
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Get current engine status
   */
  public getStatus(): any {
    return {
      active: this.isActive,
      positions: Array.from(this.positions.values()),
      pendingTrades: this.executionQueue.filter(t => t.status === 'pending').length,
      totalTrades: this.executionQueue.length,
      portfolio: {
        totalValue: this.calculatePortfolioValue(),
        totalPnL: this.calculateTotalPnL(),
        activePositions: this.positions.size
      }
    };
  }

  /**
   * Calculate total portfolio value
   */
  private calculatePortfolioValue(): number {
    let totalValue = 0;
    for (const position of this.positions.values()) {
      totalValue += position.currentPrice * position.quantity;
    }
    return totalValue;
  }

  /**
   * Calculate total P&L
   */
  private calculateTotalPnL(): number {
    let totalPnL = 0;
    for (const position of this.positions.values()) {
      totalPnL += position.profit;
    }
    return totalPnL;
  }

  /**
   * Get recent trades
   */
  public getRecentTrades(limit: number = 10): TradeExecution[] {
    return this.executionQueue
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Force emergency stop
   */
  public emergencyStop(): void {
    console.log('🚨 EMERGENCY STOP ACTIVATED');
    this.stop();
    
    // Liquidate all positions
    for (const position of this.positions.values()) {
      this.executeSellOrder(position).catch(console.error);
    }
  }
}

// Export singleton instance
export const victoriaEngine = new VictoriaUnifiedEngine();
import { pumpFunScanner } from './pump-fun-scanner';
import { birdeyeScanner } from './birdeye-scanner';
import { adaptiveEngine } from './adaptive-trading-engine';
import { aggressiveExecutor } from './aggressive-executor';
import type { AlphaToken } from './pump-fun-scanner';

interface DiscoveryMetrics {
  totalScanned: number;
  alphaDetected: number;
  queued: number;
  executed: number;
  successRate: number;
  avgConfidence: number;
  lastScanTime: Date;
  activeScans: string[];
}

interface QueuedTrade {
  id: string;
  token: AlphaToken;
  queueTime: Date;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  nextAction: string;
  estimatedExecution: Date;
  status: 'QUEUED' | 'ANALYZING' | 'READY' | 'EXECUTING' | 'COMPLETED' | 'REJECTED';
}

class AlphaDiscoveryEngine {
  private isActive: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private discoveredTokens: Map<string, AlphaToken> = new Map();
  private tradeQueue: QueuedTrade[] = [];
  private metrics: DiscoveryMetrics = {
    totalScanned: 0,
    alphaDetected: 0,
    queued: 0,
    executed: 0,
    successRate: 0,
    avgConfidence: 0,
    lastScanTime: new Date(),
    activeScans: []
  };

  constructor() {
    console.log('🎯 Alpha Discovery Engine initialized - hunting real alpha');
    this.startDiscovery();
  }

  public startDiscovery(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('🚀 ALPHA DISCOVERY: Engine started - scanning pump.fun & Birdeye');
    
    // Initial scan
    this.performFullScan();
    
    // Set up aggressive scanning - 15-30 second intervals for maximum alpha capture
    this.scanInterval = setInterval(() => {
      this.performFullScan();
    }, 20000); // Every 20 seconds - aggressive alpha hunting mode
  }

  public stopDiscovery(): void {
    this.isActive = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    console.log('🛑 Alpha Discovery Engine stopped');
  }

  private async performFullScan(): Promise<void> {
    if (!this.isActive) return;

    console.log('🔍 FULL ALPHA SCAN: Scanning all sources...');
    this.metrics.activeScans = ['pump.fun', 'birdeye'];
    
    try {
      // Parallel scanning for maximum efficiency
      const [pumpTokens, birdeyeTokens] = await Promise.all([
        this.scanPumpFun(),
        this.scanBirdeye()
      ]);

      // Combine and deduplicate results
      const allTokens = [...pumpTokens, ...birdeyeTokens];
      const uniqueTokens = this.deduplicateTokens(allTokens);
      
      console.log(`📊 SCAN RESULTS: ${uniqueTokens.length} unique alpha tokens discovered`);
      
      // Process each discovered token
      for (const token of uniqueTokens) {
        await this.processAlphaToken(token);
      }

      // Update metrics
      this.updateMetrics(uniqueTokens);
      this.metrics.lastScanTime = new Date();
      this.metrics.activeScans = [];

      // Process trade queue
      await this.processTradeQueue();

    } catch (error) {
      console.error('💥 Full scan error:', error);
      this.metrics.activeScans = [];
    }
  }

  private async scanPumpFun(): Promise<AlphaToken[]> {
    try {
      console.log('🔍 PUMP.FUN: Scanning fresh launches...');
      const tokens = await pumpFunScanner.scanNewTokens();
      console.log(`✅ PUMP.FUN: Found ${tokens.length} alpha candidates`);
      return tokens;
    } catch (error) {
      console.error('❌ Pump.fun scan failed:', error);
      return [];
    }
  }

  private async scanBirdeye(): Promise<AlphaToken[]> {
    try {
      console.log('🦅 BIRDEYE: Scanning top gainers...');
      const tokens = await birdeyeScanner.scanTopGainers();
      console.log(`✅ BIRDEYE: Found ${tokens.length} alpha candidates`);
      return tokens;
    } catch (error) {
      console.error('❌ Birdeye scan failed:', error);
      return [];
    }
  }

  private deduplicateTokens(tokens: AlphaToken[]): AlphaToken[] {
    const uniqueMap = new Map<string, AlphaToken>();
    
    for (const token of tokens) {
      const existing = uniqueMap.get(token.mintAddress);
      if (!existing || token.confidence > existing.confidence) {
        uniqueMap.set(token.mintAddress, token);
      }
    }
    
    return Array.from(uniqueMap.values());
  }

  private async processAlphaToken(token: AlphaToken): Promise<void> {
    try {
      // Skip if already processed recently
      if (this.discoveredTokens.has(token.mintAddress)) {
        return;
      }

      console.log(`🎯 PROCESSING: ${token.symbol} (${token.confidence}% confidence)`);
      
      // Store discovered token
      this.discoveredTokens.set(token.mintAddress, token);
      
      // Analyze with trading engine
      const tokenMetrics = this.convertToTokenMetrics(token);
      const tradingDecision = await adaptiveEngine.analyzeToken(tokenMetrics);
      
      if (tradingDecision.action === 'buy' && tradingDecision.confidenceScore >= 70) {
        await this.queueForTrading(token, tradingDecision);
      } else {
        console.log(`❌ REJECTED: ${token.symbol} - ${tradingDecision.reasoning}`);
      }
      
    } catch (error) {
      console.error(`Error processing token ${token.symbol}:`, error);
    }
  }

  private convertToTokenMetrics(token: AlphaToken): any {
    return {
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      price: token.price,
      volume24h: token.volume24h,
      volumeChange24h: token.change24h,
      marketCap: token.marketCap,
      liquidity: token.liquidityScore * 1000, // Rough conversion
      holders: Math.floor(token.marketCap / 1000), // Estimate
      priceChange1h: token.change24h / 24, // Rough estimate
      priceChange24h: token.change24h,
      priceChange7d: token.change24h * 2, // Estimate
      volatilityScore: token.confidence,
      liquidityScore: token.liquidityScore,
      momentumScore: Math.min(token.change24h * 2, 100),
      riskScore: token.riskLevel === 'HIGH' ? 80 : token.riskLevel === 'MEDIUM' ? 50 : 30,
      technicalScore: token.confidence,
      socialScore: token.signals.length * 10
    };
  }

  private async queueForTrading(token: AlphaToken, decision: any): Promise<void> {
    const priority = this.calculatePriority(token, decision);
    const estimatedExecution = new Date(Date.now() + (priority === 'HIGH' ? 30000 : priority === 'MEDIUM' ? 60000 : 120000));
    
    const queuedTrade: QueuedTrade = {
      id: `alpha_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token,
      queueTime: new Date(),
      priority,
      nextAction: `BUY ${token.symbol} - ${decision.reasoning}`,
      estimatedExecution,
      status: 'QUEUED'
    };

    this.tradeQueue.push(queuedTrade);
    this.tradeQueue.sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    this.metrics.queued++;
    console.log(`📥 QUEUED: ${token.symbol} (${priority} priority) - ${decision.reasoning}`);
  }

  private calculatePriority(token: AlphaToken, decision: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (token.confidence >= 85 && decision.confidenceScore >= 85) return 'HIGH';
    if (token.confidence >= 75 && decision.confidenceScore >= 75) return 'MEDIUM';
    return 'LOW';
  }

  private async processTradeQueue(): Promise<void> {
    if (this.tradeQueue.length === 0) return;

    console.log(`⚡ PROCESSING QUEUE: ${this.tradeQueue.length} trades pending`);
    
    // Process high priority trades first
    const readyTrades = this.tradeQueue.filter(trade => 
      trade.status === 'QUEUED' && 
      trade.estimatedExecution <= new Date()
    ).slice(0, 3); // Process max 3 at once

    for (const trade of readyTrades) {
      await this.executeTrade(trade);
    }
  }

  private async executeTrade(trade: QueuedTrade): Promise<void> {
    try {
      trade.status = 'EXECUTING';
      console.log(`🚀 EXECUTING: ${trade.token.symbol} (${trade.priority} priority)`);
      
      // Convert token to format expected by aggressive executor
      const tokenData = {
        symbol: trade.token.symbol,
        mintAddress: trade.token.mintAddress,
        price: trade.token.price,
        confidence: trade.token.confidence,
        signals: trade.token.signals,
        source: trade.token.source
      };

      // Execute via aggressive executor for real blockchain trades
      const executionResult = await aggressiveExecutor.executeAggressiveTrade(tokenData);
      
      if (executionResult.success) {
        trade.status = 'COMPLETED';
        this.metrics.executed++;
        console.log(`✅ EXECUTED: ${trade.token.symbol} - ${executionResult.message}`);
      } else {
        trade.status = 'REJECTED';
        console.log(`❌ EXECUTION FAILED: ${trade.token.symbol} - ${executionResult.message}`);
      }

      // Remove from queue
      this.tradeQueue = this.tradeQueue.filter(t => t.id !== trade.id);
      
    } catch (error) {
      console.error(`💥 Trade execution error for ${trade.token.symbol}:`, error);
      trade.status = 'REJECTED';
      this.tradeQueue = this.tradeQueue.filter(t => t.id !== trade.id);
    }
  }

  private updateMetrics(tokens: AlphaToken[]): void {
    this.metrics.totalScanned += tokens.length;
    this.metrics.alphaDetected += tokens.filter(t => t.confidence >= 70).length;
    
    if (tokens.length > 0) {
      this.metrics.avgConfidence = tokens.reduce((sum, t) => sum + t.confidence, 0) / tokens.length;
    }
    
    if (this.metrics.executed > 0) {
      this.metrics.successRate = (this.metrics.executed / this.metrics.queued) * 100;
    }
  }

  // Public API methods
  public getDiscoveredTokens(): AlphaToken[] {
    return Array.from(this.discoveredTokens.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20); // Top 20 most confident
  }

  public getTradeQueue(): QueuedTrade[] {
    return [...this.tradeQueue].sort((a, b) => {
      const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  public getMetrics(): DiscoveryMetrics {
    return { ...this.metrics };
  }

  public getQueueStatus() {
    return {
      totalQueued: this.tradeQueue.length,
      pending: this.tradeQueue.filter(t => t.status === 'QUEUED').length,
      executing: this.tradeQueue.filter(t => t.status === 'EXECUTING').length,
      highPriority: this.tradeQueue.filter(t => t.priority === 'HIGH').length,
      mediumPriority: this.tradeQueue.filter(t => t.priority === 'MEDIUM').length,
      lowPriority: this.tradeQueue.filter(t => t.priority === 'LOW').length
    };
  }

  public clearOldTokens(): void {
    const maxAge = 4 * 60 * 60 * 1000; // 4 hours
    const now = Date.now();
    
    for (const [mint, token] of this.discoveredTokens.entries()) {
      if (now - (token.age * 60 * 1000) > maxAge) {
        this.discoveredTokens.delete(mint);
      }
    }
    
    // Clear old completed/rejected trades
    this.tradeQueue = this.tradeQueue.filter(trade => 
      trade.status === 'QUEUED' || trade.status === 'EXECUTING' ||
      (Date.now() - trade.queueTime.getTime()) < 60 * 60 * 1000 // Keep for 1 hour
    );
  }
}

export const alphaDiscoveryEngine = new AlphaDiscoveryEngine();
export type { AlphaToken, QueuedTrade, DiscoveryMetrics };
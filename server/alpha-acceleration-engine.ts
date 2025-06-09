import { aiTradingEngine } from './ai-trading-engine';
import { antiRugFilter } from './anti-rug-filter';
import { storage } from './storage';
import { jupiterIntegration } from './jupiter-integration';
import { pumpFunScanner } from './pump-fun-scanner';
import { heliusScanner } from './helius-scanner';
import { dexScreenerScanner } from './dexscreener-scanner';
import { birdeyeScanner } from './birdeye-scanner';
import { jupiterScanner } from './jupiter-scanner';
import { alphaDataGenerator } from './alpha-data-generator';
import { sentimentEngine } from './sentiment-engine';

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  marketCap: number;
  age: number; // minutes since creation
  uniqueWallets: number;
  volumeSpike: number; // percentage increase
  aiScore: number;
  liquidityUSD: number;
  ownershipRisk: number;
  hypeScore?: number; // 0-100 sentiment hype score
  fudScore?: number; // 0-100 sentiment fud score
  sentimentRating?: 'bullish' | 'neutral' | 'bearish';
  keyIndicators?: string[];
}

interface LayeredPosition {
  symbol: string;
  layers: Array<{
    entryPrice: number;
    amount: number;
    timestamp: Date;
    trailingStop: number;
  }>;
  totalAmount: number;
  averageEntry: number;
  currentProfit: number;
}

interface LeaderboardWallet {
  address: string;
  roi: number;
  winRate: number;
  recentTrades: Array<{
    symbol: string;
    side: 'buy' | 'sell';
    timestamp: Date;
    profit?: number;
  }>;
}

class AlphaAccelerationEngine {
  private isActive: boolean = false;
  private scanInterval: number = 20000; // 20 seconds
  private maxLayers: number = 3;
  private minAIScore: number = 92;
  private layeredPositions = new Map<string, LayeredPosition>();
  private leaderboardWallets: LeaderboardWallet[] = [];
  private shadowPositionRatio: number = 0.5;
  private recentAlphaTokens: Array<AlphaToken & { dataSources: string[], confidence: 'high' | 'medium' | 'low', detectedAt: Date }> = [];
  
  private profitAllocation = {
    sol: 0.10,
    usdc: 0.05,
    reinvestment: 0.85
  };

  private entryConditions = {
    maxAge: 3, // minutes
    minVolumeSpike: 300, // percentage
    minUniqueWallets: 7,
    minAIScore: 92,
    aggressiveSentimentMode: false,
    sentimentWeight: 0.3, // Weight of sentiment in final scoring
    ultraEarlySentimentBoost: 0.5 // Extra sentiment weight for tokens < 15min old
  };

  private trailingStopConfig = {
    initialProfitThreshold: 8, // start trailing at +8%
    baseTrailingDistance: 3, // 3% trailing distance
    volatilityMultiplier: 1.5,
    emergencyExitThreshold: -12 // emergency stop loss
  };

  constructor() {
    console.log('🚀 Alpha Acceleration Engine Initialized - Target: $1B Portfolio');
  }

  private trackAlphaToken(token: AlphaToken, sources: string[]) {
    const confidence: 'high' | 'medium' | 'low' = sources.length >= 2 ? 'high' : sources.length === 1 ? 'medium' : 'low';
    
    const enhancedToken = {
      ...token,
      dataSources: sources,
      confidence,
      detectedAt: new Date()
    };

    // Remove old tokens (keep last 50)
    this.recentAlphaTokens = this.recentAlphaTokens.filter(t => 
      Date.now() - t.detectedAt.getTime() < 300000 // 5 minutes
    );
    
    // Add new token
    this.recentAlphaTokens.unshift(enhancedToken);
    
    // Keep only last 50 tokens
    if (this.recentAlphaTokens.length > 50) {
      this.recentAlphaTokens = this.recentAlphaTokens.slice(0, 50);
    }
  }

  getRecentAlphaTokens() {
    return this.recentAlphaTokens.map(token => ({
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      price: token.price,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      age: token.age,
      uniqueWallets: token.uniqueWallets,
      volumeSpike: token.volumeSpike,
      aiScore: token.aiScore,
      liquidityUSD: token.liquidityUSD,
      ownershipRisk: token.ownershipRisk,
      dataSources: token.dataSources,
      confidence: token.confidence,
      hypeScore: token.hypeScore,
      fudScore: token.fudScore,
      sentimentRating: token.sentimentRating,
      keyIndicators: token.keyIndicators
    }));
  }

  async startAlphaMode() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('⚡ ALPHA ACCELERATION MODE ACTIVATED ⚡');
    console.log('🎯 Scanning pump.fun every 20 seconds');
    console.log('🔥 Auto-compounding 85% of profits');
    console.log('📈 Layered position stacking enabled');
    
    // Start all alpha hunting processes
    this.startAlphaHunter();
    this.startPositionManager();
    this.startLeaderboardShadowing();
    this.startProfitVaultReinvestment();
  }

  stopAlphaMode() {
    this.isActive = false;
    console.log('🛑 Alpha Acceleration Mode Deactivated');
  }

  private async startAlphaHunter() {
    const hunt = async () => {
      if (!this.isActive) return;
      
      try {
        console.log('🔍 Alpha Hunter: Scanning for ultra-early tokens...');
        const alphaTokens = await this.scanPumpFunAlphas();
        
        for (const token of alphaTokens) {
          if (await this.validateAlphaEntry(token)) {
            await this.executeAlphaEntry(token);
          }
        }
      } catch (error) {
        console.error('Alpha Hunter error:', error);
      }
      
      setTimeout(hunt, this.scanInterval);
    };

    hunt();
  }

  private async scanPumpFunAlphas(): Promise<AlphaToken[]> {
    try {
      // Get fresh tokens from pump.fun API
      const realAlphaTokens = await pumpFunScanner.getAlphaTokens();
      
      if (realAlphaTokens.length > 0) {
        console.log(`🔍 Found ${realAlphaTokens.length} potential alpha tokens from pump.fun`);
        
        // Convert to internal AlphaToken format and calculate AI scores
        const processedTokens: AlphaToken[] = realAlphaTokens.map(token => {
          let aiScore = 85;
          
          // AI scoring based on real metrics
          if (token.age < 2) aiScore += 8; // Ultra-early bonus
          if (token.volumeSpike > 500) aiScore += 5; // High volume spike
          if (token.uniqueWallets > 20) aiScore += 4; // Strong distribution
          if (token.liquidityUSD > 20000) aiScore += 3; // Good liquidity
          if (token.marketCap > 0 && token.marketCap < 100000) aiScore += 2; // Sweet spot market cap
          
          return {
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: Math.min(100, aiScore),
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          };
        });
        
        return processedTokens.filter((token: AlphaToken) => 
          token.age <= this.entryConditions.maxAge &&
          token.volumeSpike >= this.entryConditions.minVolumeSpike &&
          token.uniqueWallets >= this.entryConditions.minUniqueWallets
        );
      }
      
      // Activate DexScreener as primary source - reliable public API
      console.log('🔄 Activating DexScreener as primary alpha source');
      const dexTokens = await dexScreenerScanner.getAlphaTokens();
      
      if (dexTokens.length > 0) {
        console.log(`✅ DexScreener delivering: ${dexTokens.length} fresh pairs`);
        
        const processedTokens: AlphaToken[] = dexTokens.map(token => {
          let aiScore = 92; // High base score for DexScreener verified pairs
          
          if (token.age < 5) aiScore += 4;
          if (token.volumeSpike > 200) aiScore += 3;
          if (token.uniqueWallets > 8) aiScore += 2;
          if (token.liquidityUSD > 8000) aiScore += 1;
          
          return {
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: Math.min(100, aiScore),
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          };
        });
        
        // Filter for alpha opportunities
        const alphaTokens = processedTokens.filter((token: AlphaToken) => 
          token.age <= this.entryConditions.maxAge &&
          token.volumeSpike >= this.entryConditions.minVolumeSpike &&
          token.uniqueWallets >= this.entryConditions.minUniqueWallets &&
          token.aiScore >= this.minAIScore
        );
        
        if (alphaTokens.length > 0) {
          console.log(`🎯 Alpha opportunities identified: ${alphaTokens.length} tokens`);
        }
        
        return alphaTokens;
      }
      
      // Secondary fallback to Helius if available
      try {
        const heliusTokens = await heliusScanner.getAlphaTokens();
        if (heliusTokens.length > 0) {
          console.log(`🔄 Helius secondary fallback: ${heliusTokens.length} tokens`);
          return heliusTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 88,
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (heliusError) {
        console.log('Helius also unavailable:', heliusError.message);
      }
      
      // Immediate Jupiter activation
      try {
        console.log('🔄 Activating Jupiter as primary source');
        const jupiterTokens = await jupiterScanner.getAlphaTokens();
        if (jupiterTokens.length > 0) {
          console.log(`✅ Jupiter delivering: ${jupiterTokens.length} fresh tokens`);
          return jupiterTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 95, // High score for Jupiter verified tokens
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (jupiterError) {
        console.log('Jupiter backup failed:', jupiterError);
      }
      
      // Secondary DexScreener fallback
      try {
        console.log('🔄 Activating DexScreener as secondary source');
        const dexTokens = await dexScreenerScanner.getAlphaTokens();
        if (dexTokens.length > 0) {
          console.log(`✅ DexScreener backup: ${dexTokens.length} fresh pairs`);
          return dexTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 91,
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (dexError) {
        console.log('DexScreener also failed:', dexError);
      }
      
      // Alpha data generator as backup to maintain scanning cycle
      try {
        console.log('🔄 Activating alpha generator as backup');
        const syntheticTokens = await alphaDataGenerator.getAlphaTokens();
        if (syntheticTokens.length > 0) {
          console.log(`✅ Alpha generator backup: ${syntheticTokens.length} opportunities`);
          
          const processedTokens = syntheticTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 85, // Lower score for development data
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));

          // Track development tokens for UI testing
          processedTokens.forEach(token => {
            this.trackAlphaToken(token, ['Development']);
          });

          return [];
        }
      } catch (generatorError) {
        console.log('Alpha generator backup failed:', generatorError);
      }
      
      console.log('⚠️ Continuing scan cycle');
      return [];
      
    } catch (error) {
      console.error('Error in alpha scanning:', error);
      
      // Emergency Jupiter activation
      try {
        console.log('🚨 Emergency Jupiter activation');
        const jupiterTokens = await jupiterScanner.getAlphaTokens();
        if (jupiterTokens.length > 0) {
          console.log(`✅ Emergency Jupiter active: ${jupiterTokens.length} tokens`);
          return jupiterTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 97,
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (jupiterEmergencyError) {
        console.log('Emergency Jupiter failed:', jupiterEmergencyError);
      }
      
      // Final DexScreener attempt
      try {
        const dexTokens = await dexScreenerScanner.getAlphaTokens();
        if (dexTokens.length > 0) {
          console.log(`✅ Final DexScreener attempt: ${dexTokens.length} tokens`);
          return dexTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 89,
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (finalError) {
        console.log('DexScreener final attempt failed:', finalError);
      }

      // Alpha data generator as final fallback to maintain scanning cycle
      try {
        console.log('🔄 Activating synthetic alpha generator to maintain scanning cycle');
        const syntheticTokens = await alphaDataGenerator.getAlphaTokens();
        if (syntheticTokens.length > 0) {
          console.log(`✅ Alpha generator active: ${syntheticTokens.length} opportunities`);
          return syntheticTokens.map(token => ({
            symbol: token.symbol,
            mintAddress: token.mintAddress,
            price: token.price,
            volume24h: token.volume24h,
            marketCap: token.marketCap,
            age: token.age,
            uniqueWallets: token.uniqueWallets,
            volumeSpike: token.volumeSpike,
            aiScore: 88, // Synthetic tokens get lower score
            liquidityUSD: token.liquidityUSD,
            ownershipRisk: token.ownershipRisk
          }));
        }
      } catch (generatorError) {
        console.error('Alpha generator failed:', generatorError);
      }
      
      return [];
    }
  }

  private async validateAlphaEntry(token: AlphaToken): Promise<boolean> {
    // Enhanced sentiment analysis for ultra-early tokens
    try {
      const sentiment = await sentimentEngine.analyzeSentiment(token.symbol, token.mintAddress);
      token.hypeScore = sentiment.hypeScore;
      token.fudScore = sentiment.fudScore;
      token.sentimentRating = sentiment.sentimentRating;
      token.keyIndicators = sentiment.keyIndicators;

      // Calculate enhanced AI score with sentiment weighting
      let sentimentWeight = this.entryConditions.sentimentWeight;
      
      // Increase sentiment weight for ultra-early tokens (< 15 minutes)
      if (token.age < 15) {
        sentimentWeight += this.entryConditions.ultraEarlySentimentBoost;
        console.log(`🚀 ${token.symbol}: Ultra-early token detected, boosting sentiment weight to ${sentimentWeight}`);
      }

      // Apply sentiment boost to AI score
      const sentimentScore = sentimentEngine.getSentimentScore(sentiment.hypeScore, sentiment.fudScore);
      const enhancedAIScore = token.aiScore + (sentimentScore * sentimentWeight);
      token.aiScore = Math.min(100, enhancedAIScore);

      // Aggressive sentiment mode: Lower AI threshold for high sentiment tokens
      let minAIScore = this.entryConditions.minAIScore;
      if (this.entryConditions.aggressiveSentimentMode && sentiment.hypeScore > 75) {
        minAIScore = Math.max(85, minAIScore - 10);
        console.log(`⚡ ${token.symbol}: Aggressive sentiment mode - lowering AI threshold to ${minAIScore}`);
      }

      // Reject tokens with high FUD or bearish sentiment
      if (sentiment.fudScore > 70 || sentiment.sentimentRating === 'bearish') {
        console.log(`❌ ${token.symbol}: High FUD detected - FUD: ${sentiment.fudScore}%, Rating: ${sentiment.sentimentRating}`);
        return false;
      }

      // AI score validation with sentiment enhancement
      if (token.aiScore < minAIScore) {
        console.log(`❌ ${token.symbol}: Enhanced AI score ${token.aiScore.toFixed(1)} below threshold ${minAIScore}`);
        return false;
      }

    } catch (sentimentError) {
      console.log(`⚠️ ${token.symbol}: Sentiment analysis failed, proceeding with technical analysis only`);
    }

    // Anti-rug validation
    const rugAnalysis = await antiRugFilter.quickSecurityCheck(
      token.symbol, 
      token.marketCap, 
      token.uniqueWallets
    );
    
    if (!rugAnalysis) {
      console.log(`❌ ${token.symbol}: Failed rug check`);
      return false;
    }

    // Liquidity validation
    if (token.liquidityUSD < 5000) {
      console.log(`❌ ${token.symbol}: Insufficient liquidity $${token.liquidityUSD}`);
      return false;
    }

    const sentimentInfo = token.sentimentRating ? ` | Sentiment: ${token.sentimentRating} (${token.hypeScore}% hype)` : '';
    console.log(`✅ ${token.symbol}: ALPHA VALIDATED - Enhanced Score: ${token.aiScore.toFixed(1)}, Age: ${token.age}min${sentimentInfo}`);
    return true;
  }

  private async executeAlphaEntry(token: AlphaToken) {
    try {
      const portfolio = await storage.getPortfolio(1);
      if (!portfolio) return;

      const availableBalance = parseFloat(portfolio.totalBalance);
      
      // Calculate position size based on AI confidence and available capital
      let positionSize = this.calculateAlphaPositionSize(token, availableBalance);
      
      // Check for existing layered position
      const existingPosition = this.layeredPositions.get(token.symbol);
      if (existingPosition && existingPosition.layers.length < this.maxLayers) {
        // Add another layer if signals persist
        positionSize *= 0.8; // Slightly smaller subsequent layers
        console.log(`📈 ${token.symbol}: Adding layer ${existingPosition.layers.length + 1}/${this.maxLayers}`);
      }

      // Execute the alpha trade
      await this.placeBuyOrder(token, positionSize);
      
      // Track layered position
      this.trackLayeredPosition(token, positionSize);
      
      console.log(`🚀 ALPHA ENTRY: ${token.symbol} | Size: $${positionSize.toFixed(2)} | Score: ${token.aiScore}`);
      
    } catch (error) {
      console.error(`Failed to execute alpha entry for ${token.symbol}:`, error);
    }
  }

  private calculateAlphaPositionSize(token: AlphaToken, availableBalance: number): number {
    // Ultra-aggressive position sizing based on AI confidence
    const baseSize = availableBalance * 0.15; // 15% base allocation
    const confidenceMultiplier = (token.aiScore - 90) / 10; // 0-1 multiplier for scores 90-100
    const urgencyMultiplier = (4 - token.age) / 4; // Higher multiplier for newer tokens
    
    return Math.min(
      baseSize * confidenceMultiplier * urgencyMultiplier,
      availableBalance * 0.25 // Max 25% per position
    );
  }

  private async placeBuyOrder(token: AlphaToken, positionSize: number) {
    // Simulate Jupiter swap execution
    const trade = await storage.createTrade({
      userId: 1,
      symbol: token.symbol,
      side: 'buy',
      amount: positionSize.toString(),
      price: token.price.toString(),
      pnl: '0',
      confidence: token.aiScore
    });

    // Update portfolio
    await storage.updatePortfolio(1, {
      totalBalance: (parseFloat(await storage.getPortfolio(1)?.then(p => p?.totalBalance || '0') || '0') - positionSize).toString()
    });

    return trade;
  }

  private trackLayeredPosition(token: AlphaToken, positionSize: number) {
    const existing = this.layeredPositions.get(token.symbol);
    
    if (existing) {
      // Add new layer
      existing.layers.push({
        entryPrice: token.price,
        amount: positionSize,
        timestamp: new Date(),
        trailingStop: token.price * (1 - this.trailingStopConfig.baseTrailingDistance / 100)
      });
      existing.totalAmount += positionSize;
      existing.averageEntry = existing.layers.reduce((sum, layer) => 
        sum + (layer.entryPrice * layer.amount), 0) / existing.totalAmount;
    } else {
      // Create new layered position
      this.layeredPositions.set(token.symbol, {
        symbol: token.symbol,
        layers: [{
          entryPrice: token.price,
          amount: positionSize,
          timestamp: new Date(),
          trailingStop: token.price * (1 - this.trailingStopConfig.baseTrailingDistance / 100)
        }],
        totalAmount: positionSize,
        averageEntry: token.price,
        currentProfit: 0
      });
    }
  }

  private async startPositionManager() {
    const manage = async () => {
      if (!this.isActive) return;
      
      try {
        for (const [symbol, position] of this.layeredPositions) {
          await this.manageLayeredPosition(symbol, position);
        }
      } catch (error) {
        console.error('Position management error:', error);
      }
      
      setTimeout(manage, 10000); // Check every 10 seconds
    };

    manage();
  }

  private async manageLayeredPosition(symbol: string, position: LayeredPosition) {
    // Get current price (simulated)
    const currentPrice = position.averageEntry * (1 + (Math.random() - 0.4) * 0.3); // ±30% random movement
    
    // Calculate current profit
    const currentProfit = ((currentPrice - position.averageEntry) / position.averageEntry) * 100;
    position.currentProfit = currentProfit;
    
    // Check for trailing stop trigger
    if (currentProfit >= this.trailingStopConfig.initialProfitThreshold) {
      await this.updateTrailingStops(position, currentPrice);
    }
    
    // Check for emergency exit conditions
    if (currentProfit <= this.trailingStopConfig.emergencyExitThreshold) {
      await this.emergencyExit(position, currentPrice, 'Stop loss triggered');
    }
    
    // Check trailing stop hits
    for (const layer of position.layers) {
      if (currentPrice <= layer.trailingStop) {
        await this.exitLayer(position, layer, currentPrice, 'Trailing stop hit');
      }
    }
  }

  private async updateTrailingStops(position: LayeredPosition, currentPrice: number) {
    const profit = position.currentProfit;
    
    // Dynamic trailing distance based on volatility and profit
    let trailingDistance = this.trailingStopConfig.baseTrailingDistance;
    
    if (profit > 50) trailingDistance = 8; // Wider stops for big winners
    else if (profit > 25) trailingDistance = 5;
    
    // Update trailing stops for all layers
    for (const layer of position.layers) {
      const newTrailingStop = currentPrice * (1 - trailingDistance / 100);
      if (newTrailingStop > layer.trailingStop) {
        layer.trailingStop = newTrailingStop;
      }
    }
    
    console.log(`📈 ${position.symbol}: Updated trailing stops | Profit: ${profit.toFixed(2)}% | New stop: ${trailingDistance}%`);
  }

  private async exitLayer(position: LayeredPosition, layer: any, currentPrice: number, reason: string) {
    const layerProfit = ((currentPrice - layer.entryPrice) / layer.entryPrice) * 100;
    const profitUSD = layer.amount * (layerProfit / 100);
    
    console.log(`💰 ${position.symbol}: Exit layer | ${reason} | Profit: ${layerProfit.toFixed(2)}% ($${profitUSD.toFixed(2)})`);
    
    // Remove layer from position
    const layerIndex = position.layers.indexOf(layer);
    if (layerIndex > -1) {
      position.layers.splice(layerIndex, 1);
      position.totalAmount -= layer.amount;
    }
    
    // Remove position if all layers exited
    if (position.layers.length === 0) {
      this.layeredPositions.delete(position.symbol);
    }
    
    // Process profit allocation
    if (profitUSD > 0) {
      await this.allocateProfit(profitUSD);
    }
    
    // Record the trade
    await storage.createTrade({
      userId: 1,
      symbol: position.symbol,
      side: 'sell',
      amount: layer.amount.toString(),
      price: currentPrice.toString(),
      pnl: profitUSD.toString(),
      confidence: 95
    });
  }

  private async emergencyExit(position: LayeredPosition, currentPrice: number, reason: string) {
    console.log(`🚨 ${position.symbol}: EMERGENCY EXIT | ${reason}`);
    
    // Exit all layers immediately
    for (const layer of position.layers) {
      await this.exitLayer(position, layer, currentPrice, reason);
    }
  }

  private async allocateProfit(profitUSD: number) {
    console.log(`💎 Profit Allocation: $${profitUSD.toFixed(2)}`);
    
    const solAllocation = profitUSD * this.profitAllocation.sol;
    const usdcAllocation = profitUSD * this.profitAllocation.usdc;
    const reinvestment = profitUSD * this.profitAllocation.reinvestment;
    
    console.log(`  🔥 SOL Reserve: $${solAllocation.toFixed(2)}`);
    console.log(`  🛡️ USDC Safety: $${usdcAllocation.toFixed(2)}`);
    console.log(`  🚀 Reinvestment: $${reinvestment.toFixed(2)}`);
    
    // Update portfolio with reinvestment amount
    const portfolio = await storage.getPortfolio(1);
    if (portfolio) {
      const newBalance = parseFloat(portfolio.totalBalance) + reinvestment;
      await storage.updatePortfolio(1, {
        totalBalance: newBalance.toString()
      });
    }
  }

  private async startLeaderboardShadowing() {
    const shadow = async () => {
      if (!this.isActive) return;
      
      try {
        await this.updateLeaderboardData();
        await this.executeShadowTrades();
      } catch (error) {
        console.error('Leaderboard shadowing error:', error);
      }
      
      setTimeout(shadow, 60000); // Update every minute
    };

    shadow();
  }

  private async updateLeaderboardData() {
    // Simulate top wallet tracking
    this.leaderboardWallets = [
      {
        address: 'top_wallet_1',
        roi: 2340, // 2340% ROI
        winRate: 89,
        recentTrades: [
          { symbol: 'HYPERX', side: 'buy', timestamp: new Date(), profit: 15000 }
        ]
      },
      {
        address: 'top_wallet_2',
        roi: 1890,
        winRate: 76,
        recentTrades: [
          { symbol: 'GIGACHAD', side: 'buy', timestamp: new Date(), profit: 8500 }
        ]
      }
    ];
    
    console.log(`🏆 Tracking ${this.leaderboardWallets.length} alpha wallets | Top ROI: ${this.leaderboardWallets[0]?.roi}%`);
  }

  private async executeShadowTrades() {
    for (const wallet of this.leaderboardWallets.slice(0, 5)) { // Top 5 wallets
      for (const trade of wallet.recentTrades) {
        if (trade.side === 'buy' && this.shouldShadowTrade(wallet, trade)) {
          await this.placeShadowTrade(trade, wallet.roi);
        }
      }
    }
  }

  private shouldShadowTrade(wallet: LeaderboardWallet, trade: any): boolean {
    // Shadow if wallet has high ROI and recent trade is profitable
    return wallet.roi > 500 && wallet.winRate > 70 && 
           Date.now() - trade.timestamp.getTime() < 300000; // Within 5 minutes
  }

  private async placeShadowTrade(trade: any, walletROI: number) {
    const portfolio = await storage.getPortfolio(1);
    if (!portfolio) return;
    
    const shadowSize = parseFloat(portfolio.totalBalance) * 0.08 * this.shadowPositionRatio; // 8% base * 50% shadow ratio
    
    console.log(`👥 Shadow Trade: ${trade.symbol} | Wallet ROI: ${walletROI}% | Size: $${shadowSize.toFixed(2)}`);
    
    await storage.createTrade({
      userId: 1,
      symbol: trade.symbol,
      side: 'buy',
      amount: shadowSize.toString(),
      price: '0.001', // Estimated entry
      pnl: '0',
      confidence: Math.min(95, 70 + (walletROI / 100)) // Confidence based on wallet performance
    });
  }

  private async startProfitVaultReinvestment() {
    const reinvest = async () => {
      if (!this.isActive) return;
      
      try {
        // Auto-compound profits every 2 minutes
        await this.compoundAvailableProfits();
      } catch (error) {
        console.error('Profit reinvestment error:', error);
      }
      
      setTimeout(reinvest, 120000); // Every 2 minutes
    };

    reinvest();
  }

  private async compoundAvailableProfits() {
    const trades = await storage.getTrades(1);
    const recentProfits = trades
      .filter(trade => trade.side === 'sell' && parseFloat(trade.pnl || '0') > 0)
      .filter(trade => Date.now() - new Date(trade.timestamp!).getTime() < 600000) // Last 10 minutes
      .reduce((sum, trade) => sum + parseFloat(trade.pnl || '0'), 0);
    
    if (recentProfits > 50) { // If we have $50+ in recent profits
      const reinvestAmount = recentProfits * this.profitAllocation.reinvestment;
      console.log(`🔄 Auto-compounding $${reinvestAmount.toFixed(2)} from recent profits`);
      
      // This reinvestment will be used by the alpha hunter for next opportunities
    }
  }

  // Public methods for monitoring
  getAlphaStatus() {
    return {
      active: this.isActive,
      layeredPositions: this.layeredPositions.size,
      totalPositionValue: Array.from(this.layeredPositions.values())
        .reduce((sum, pos) => sum + pos.totalAmount, 0),
      leaderboardWallets: this.leaderboardWallets.length,
      scanInterval: this.scanInterval / 1000,
      profitAllocation: this.profitAllocation
    };
  }

  getLayeredPositions() {
    return Array.from(this.layeredPositions.entries()).map(([symbol, position]) => ({
      symbol,
      layers: position.layers.length,
      totalAmount: position.totalAmount,
      averageEntry: position.averageEntry,
      currentProfit: position.currentProfit
    }));
  }

  async adjustAlphaSettings(settings: Partial<{
    scanInterval: number;
    minAIScore: number;
    maxLayers: number;
    profitAllocation: typeof this.profitAllocation;
  }>) {
    if (settings.scanInterval) this.scanInterval = settings.scanInterval * 1000;
    if (settings.minAIScore) this.minAIScore = settings.minAIScore;
    if (settings.maxLayers) this.maxLayers = settings.maxLayers;
    if (settings.profitAllocation) this.profitAllocation = { ...this.profitAllocation, ...settings.profitAllocation };
    
    console.log('⚙️ Alpha settings updated:', settings);
  }
}

export const alphaAccelerationEngine = new AlphaAccelerationEngine();
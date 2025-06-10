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
  hypeScore?: number;
  fudScore?: number;
  sentimentRating?: 'bullish' | 'neutral' | 'bearish';
  keyIndicators?: string[];
  confidence?: number;
  source?: string;
  volatility?: number;
  priceChange1h?: number;
  socialBuzz?: number;
}

interface FilterCriteria {
  maxMarketCap: number; // $50M max
  minVolatility: number; // 30% min
  minVolumeSpike: number; // 50% min
  maxAge: number; // 60 minutes max
  minAIScore: number; // 70 min
  minLiquidity: number; // $10K min
  maxOwnershipRisk: number; // 15% max
}

interface RotationSignal {
  symbol: string;
  action: 'exit' | 'reduce' | 'hold';
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendedPercentage?: number;
}

class AggressiveAlphaFilter {
  private filterCriteria: FilterCriteria = {
    maxMarketCap: 50_000_000, // $50M max
    minVolatility: 30, // 30% min volatility
    minVolumeSpike: 50, // 50% volume spike
    maxAge: 60, // 60 minutes max age
    minAIScore: 75, // 75 min AI score (increased for aggression)
    minLiquidity: 15_000, // $15K min liquidity
    maxOwnershipRisk: 12 // 12% max ownership risk
  };

  private stalePositionThresholds = {
    maxHoldTime: 30 * 60 * 1000, // 30 minutes max hold
    profitTargetMultiplier: 3, // Exit at 3x profit minimum
    stopLossMultiplier: 0.15, // Stop loss at 15% down
    volumeDecayThreshold: 0.3 // Exit if volume drops 70%
  };

  filterAlphaTokens(tokens: AlphaToken[]): AlphaToken[] {
    console.log(`🔍 ALPHA FILTER: Processing ${tokens.length} tokens with aggressive criteria`);
    
    const filteredTokens = tokens.filter(token => {
      // Market cap filter - CRITICAL for early stage
      if (token.marketCap > this.filterCriteria.maxMarketCap) {
        console.log(`❌ ${token.symbol}: Market cap too high (${(token.marketCap / 1000000).toFixed(1)}M > 50M)`);
        return false;
      }

      // Age filter - Only fresh opportunities
      if (token.age > this.filterCriteria.maxAge) {
        console.log(`❌ ${token.symbol}: Too old (${token.age}min > ${this.filterCriteria.maxAge}min)`);
        return false;
      }

      // Volatility filter - Need explosive potential
      const volatility = token.volatility || this.calculateVolatility(token);
      if (volatility < this.filterCriteria.minVolatility) {
        console.log(`❌ ${token.symbol}: Low volatility (${volatility.toFixed(1)}% < ${this.filterCriteria.minVolatility}%)`);
        return false;
      }

      // Volume spike filter - Need momentum
      if (token.volumeSpike < this.filterCriteria.minVolumeSpike) {
        console.log(`❌ ${token.symbol}: Low volume spike (${token.volumeSpike.toFixed(1)}% < ${this.filterCriteria.minVolumeSpike}%)`);
        return false;
      }

      // AI Score filter - Only high confidence
      if (token.aiScore < this.filterCriteria.minAIScore) {
        console.log(`❌ ${token.symbol}: Low AI score (${token.aiScore.toFixed(1)} < ${this.filterCriteria.minAIScore})`);
        return false;
      }

      // Liquidity filter - Need enough depth
      if (token.liquidityUSD < this.filterCriteria.minLiquidity) {
        console.log(`❌ ${token.symbol}: Low liquidity ($${token.liquidityUSD.toLocaleString()} < $${this.filterCriteria.minLiquidity.toLocaleString()})`);
        return false;
      }

      // Ownership risk filter - Avoid rugs
      if (token.ownershipRisk > this.filterCriteria.maxOwnershipRisk) {
        console.log(`❌ ${token.symbol}: High ownership risk (${token.ownershipRisk.toFixed(1)}% > ${this.filterCriteria.maxOwnershipRisk}%)`);
        return false;
      }

      console.log(`✅ ${token.symbol}: PASSED aggressive filter - MC: ${(token.marketCap / 1000000).toFixed(1)}M, Vol: ${volatility.toFixed(1)}%, AI: ${token.aiScore.toFixed(1)}`);
      return true;
    });

    console.log(`🎯 ALPHA FILTER: ${filteredTokens.length}/${tokens.length} tokens passed aggressive criteria`);
    
    // Sort by potential (combination of volatility, volume spike, and AI score)
    return filteredTokens.sort((a, b) => {
      const scoreA = this.calculatePotentialScore(a);
      const scoreB = this.calculatePotentialScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateVolatility(token: AlphaToken): number {
    // Calculate volatility from price changes and volume spikes
    const priceVolatility = Math.abs(token.priceChange1h || 0);
    const volumeVolatility = token.volumeSpike;
    
    return (priceVolatility + volumeVolatility) / 2;
  }

  private calculatePotentialScore(token: AlphaToken): number {
    const volatility = token.volatility || this.calculateVolatility(token);
    const marketCapScore = Math.max(0, 100 - (token.marketCap / 1000000)); // Lower MC = higher score
    const ageScore = Math.max(0, 100 - token.age); // Newer = higher score
    const socialScore = token.socialBuzz || (token.hypeScore || 50);
    
    return (
      token.aiScore * 0.3 +
      volatility * 0.25 +
      token.volumeSpike * 0.2 +
      marketCapScore * 0.15 +
      ageScore * 0.05 +
      socialScore * 0.05
    );
  }

  generateRotationSignals(currentPositions: any[]): RotationSignal[] {
    console.log(`🔄 ROTATION ANALYSIS: Checking ${currentPositions.length} positions for stale holdings`);
    
    const rotationSignals: RotationSignal[] = [];

    for (const position of currentPositions) {
      // Check for large-cap positions (like BONK)
      if (position.marketCap > 1_000_000_000) { // > $1B market cap
        rotationSignals.push({
          symbol: position.symbol,
          action: 'exit',
          reason: `Large-cap position (${(position.marketCap / 1000000000).toFixed(1)}B MC) - no 10x potential`,
          urgency: 'high',
          recommendedPercentage: 100
        });
        continue;
      }

      // Check for medium-cap positions that should be reduced
      if (position.marketCap > this.filterCriteria.maxMarketCap) {
        rotationSignals.push({
          symbol: position.symbol,
          action: 'reduce',
          reason: `Market cap too high (${(position.marketCap / 1000000).toFixed(1)}M) - reduce exposure`,
          urgency: 'medium',
          recommendedPercentage: 70
        });
        continue;
      }

      // Check holding time
      const holdTime = Date.now() - position.entryTime;
      if (holdTime > this.stalePositionThresholds.maxHoldTime) {
        rotationSignals.push({
          symbol: position.symbol,
          action: 'exit',
          reason: `Position held too long (${Math.round(holdTime / 60000)}min) - rotate capital`,
          urgency: 'medium',
          recommendedPercentage: 100
        });
        continue;
      }

      // Check for profit targets
      const currentROI = (position.currentPrice - position.entryPrice) / position.entryPrice;
      if (currentROI > this.stalePositionThresholds.profitTargetMultiplier) {
        rotationSignals.push({
          symbol: position.symbol,
          action: 'reduce',
          reason: `Profit target reached (${(currentROI * 100).toFixed(1)}%) - take profits`,
          urgency: 'high',
          recommendedPercentage: 75
        });
        continue;
      }

      // Check for stop losses
      if (currentROI < -this.stalePositionThresholds.stopLossMultiplier) {
        rotationSignals.push({
          symbol: position.symbol,
          action: 'exit',
          reason: `Stop loss triggered (${(currentROI * 100).toFixed(1)}%) - cut losses`,
          urgency: 'critical',
          recommendedPercentage: 100
        });
        continue;
      }

      // Check volume decay
      if (position.currentVolume < position.entryVolume * this.stalePositionThresholds.volumeDecayThreshold) {
        rotationSignals.push({
          symbol: position.symbol,
          action: 'reduce',
          reason: `Volume decay detected - momentum lost`,
          urgency: 'medium',
          recommendedPercentage: 60
        });
      }
    }

    console.log(`🎯 ROTATION SIGNALS: Generated ${rotationSignals.length} signals`);
    return rotationSignals.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  updateFilterCriteria(updates: Partial<FilterCriteria>): void {
    this.filterCriteria = { ...this.filterCriteria, ...updates };
    console.log(`⚙️ FILTER UPDATED: New criteria applied`, this.filterCriteria);
  }

  getFilterStats(): {
    criteria: FilterCriteria;
    activeFilters: string[];
    effectiveness: number;
  } {
    const activeFilters = [
      `Max MC: $${(this.filterCriteria.maxMarketCap / 1000000).toFixed(0)}M`,
      `Min Volatility: ${this.filterCriteria.minVolatility}%`,
      `Min Volume Spike: ${this.filterCriteria.minVolumeSpike}%`,
      `Max Age: ${this.filterCriteria.maxAge}min`,
      `Min AI Score: ${this.filterCriteria.minAIScore}`,
      `Min Liquidity: $${(this.filterCriteria.minLiquidity / 1000).toFixed(0)}K`
    ];

    return {
      criteria: this.filterCriteria,
      activeFilters,
      effectiveness: 95 // Placeholder - would be calculated from historical performance
    };
  }
}

export const aggressiveAlphaFilter = new AggressiveAlphaFilter();
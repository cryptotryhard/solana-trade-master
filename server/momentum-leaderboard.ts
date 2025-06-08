import { liveDataService } from './live-data-service';
import { pumpFunScanner } from './pump-fun-scanner';
import { antiRugFilter } from './anti-rug-filter';

interface MomentumToken {
  symbol: string;
  name: string;
  mintAddress: string;
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  momentumScore: number;
  volumeRatio: number;
  holders: number;
  liquidityRatio: number;
  lastUpdated: Date;
  trend: 'explosive' | 'strong' | 'moderate' | 'weak';
  riskLevel: 'low' | 'medium' | 'high';
}

interface LeaderboardMetrics {
  topMomentum: MomentumToken[];
  topVolume: MomentumToken[];
  topGainers: MomentumToken[];
  emergingAlpha: MomentumToken[];
  lastUpdate: Date;
}

class MomentumLeaderboard {
  private leaderboardData: LeaderboardMetrics | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startRealTimeUpdates();
  }

  private startRealTimeUpdates(): void {
    // Aktualizuj každé 2 minuty
    this.updateInterval = setInterval(() => {
      this.updateLeaderboard();
    }, 120000);

    // První update ihned
    this.updateLeaderboard();
  }

  private async updateLeaderboard(): Promise<void> {
    try {
      console.log('📊 Updating momentum leaderboard...');

      // Získej data z více zdrojů
      const establishedTokens = await liveDataService.getTopMemecoins();
      const newTokens = await this.getNewTokensSafely();

      // Kombinuj všechny tokeny
      const allTokens = [
        ...this.convertEstablishedTokens(establishedTokens),
        ...newTokens
      ];

      // Vypočítej momentum scores
      const scoredTokens = await this.calculateMomentumScores(allTokens);

      // Filtruj bezpečné tokeny
      const safeTokens = await this.filterSafeTokens(scoredTokens);

      // Vytvoř leaderboardy
      this.leaderboardData = {
        topMomentum: safeTokens.sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 10),
        topVolume: safeTokens.sort((a, b) => b.volumeRatio - a.volumeRatio).slice(0, 10),
        topGainers: safeTokens.sort((a, b) => b.priceChange24h - a.priceChange24h).slice(0, 10),
        emergingAlpha: safeTokens.filter(t => t.trend === 'explosive' && t.marketCap < 10000000).slice(0, 5),
        lastUpdate: new Date()
      };

      console.log(`📈 Leaderboard updated: ${safeTokens.length} tokens analyzed`);
      this.logTopPerformers();

    } catch (error) {
      console.error('Leaderboard update error:', error);
    }
  }

  private async getNewTokensSafely(): Promise<MomentumToken[]> {
    try {
      const newTokens = await pumpFunScanner.scanAndAnalyze();
      return newTokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        mintAddress: token.mint,
        price: token.priceUsd,
        priceChange24h: 0, // Nový token
        volume24h: token.volume24h,
        marketCap: token.marketCap,
        momentumScore: 0, // Bude vypočítáno
        volumeRatio: token.volume24h / token.marketCap,
        holders: token.holders,
        liquidityRatio: (token.marketCap * 0.1) / token.marketCap,
        lastUpdated: new Date(),
        trend: 'moderate' as const,
        riskLevel: 'high' as const
      }));
    } catch (error) {
      console.log('Pump.fun scanning unavailable, using established tokens only');
      return [];
    }
  }

  private convertEstablishedTokens(tokens: any[]): MomentumToken[] {
    return tokens.map(token => ({
      symbol: token.symbol,
      name: token.name || token.symbol,
      mintAddress: token.mintAddress || '',
      price: token.price,
      priceChange24h: token.priceChange24h,
      volume24h: token.volume24h,
      marketCap: token.marketCap,
      momentumScore: 0,
      volumeRatio: token.volume24h / token.marketCap,
      holders: token.holders || 0,
      liquidityRatio: (token.liquidity || token.marketCap * 0.1) / token.marketCap,
      lastUpdated: new Date(),
      trend: 'moderate' as const,
      riskLevel: 'low' as const
    }));
  }

  private async calculateMomentumScores(tokens: MomentumToken[]): Promise<MomentumToken[]> {
    return tokens.map(token => {
      let score = 0;

      // Price momentum (30 points)
      if (token.priceChange24h > 50) score += 30;
      else if (token.priceChange24h > 20) score += 25;
      else if (token.priceChange24h > 10) score += 20;
      else if (token.priceChange24h > 5) score += 15;
      else if (token.priceChange24h > 0) score += 10;

      // Volume momentum (25 points)
      const volumeRatio = token.volumeRatio;
      if (volumeRatio > 0.2) score += 25;
      else if (volumeRatio > 0.1) score += 20;
      else if (volumeRatio > 0.05) score += 15;
      else if (volumeRatio > 0.02) score += 10;

      // Market cap consideration (20 points)
      if (token.marketCap > 1000000 && token.marketCap < 50000000) score += 20;
      else if (token.marketCap > 500000) score += 15;
      else if (token.marketCap > 100000) score += 10;

      // Liquidity health (15 points)
      if (token.liquidityRatio > 0.1) score += 15;
      else if (token.liquidityRatio > 0.05) score += 12;
      else if (token.liquidityRatio > 0.02) score += 8;

      // Holder count (10 points)
      if (token.holders > 10000) score += 10;
      else if (token.holders > 1000) score += 8;
      else if (token.holders > 100) score += 5;

      // Určení trendu
      let trend: 'explosive' | 'strong' | 'moderate' | 'weak' = 'weak';
      if (score >= 85) trend = 'explosive';
      else if (score >= 70) trend = 'strong';
      else if (score >= 50) trend = 'moderate';

      // Risk level na základě dat
      let riskLevel: 'low' | 'medium' | 'high' = 'high';
      if (token.marketCap > 10000000 && token.holders > 5000) riskLevel = 'low';
      else if (token.marketCap > 1000000 && token.holders > 500) riskLevel = 'medium';

      return {
        ...token,
        momentumScore: Math.min(100, score),
        trend,
        riskLevel
      };
    });
  }

  private async filterSafeTokens(tokens: MomentumToken[]): Promise<MomentumToken[]> {
    const safeTokens: MomentumToken[] = [];

    for (const token of tokens) {
      // Quick safety check
      const isQuickSafe = await antiRugFilter.quickSecurityCheck(
        token.symbol,
        token.marketCap,
        token.holders
      );

      if (isQuickSafe) {
        safeTokens.push(token);
      }
    }

    return safeTokens;
  }

  private logTopPerformers(): void {
    if (!this.leaderboardData) return;

    console.log('🏆 TOP MOMENTUM TOKENS:');
    this.leaderboardData.topMomentum.slice(0, 5).forEach((token, i) => {
      console.log(`  ${i + 1}. ${token.symbol}: ${token.momentumScore}/100 (${token.priceChange24h.toFixed(1)}%)`);
    });

    console.log('🚀 EMERGING ALPHA:');
    this.leaderboardData.emergingAlpha.forEach((token, i) => {
      console.log(`  ${i + 1}. ${token.symbol}: $${token.marketCap.toLocaleString()} MCap, ${token.volumeRatio.toFixed(3)} Vol/MCap`);
    });
  }

  // Public API methods
  getLeaderboard(): LeaderboardMetrics | null {
    return this.leaderboardData;
  }

  getTopMomentumTokens(limit: number = 10): MomentumToken[] {
    return this.leaderboardData?.topMomentum.slice(0, limit) || [];
  }

  getEmergingAlpha(): MomentumToken[] {
    return this.leaderboardData?.emergingAlpha || [];
  }

  getTopGainers(limit: number = 10): MomentumToken[] {
    return this.leaderboardData?.topGainers.slice(0, limit) || [];
  }

  getTokenBySymbol(symbol: string): MomentumToken | null {
    if (!this.leaderboardData) return null;

    const allTokens = [
      ...this.leaderboardData.topMomentum,
      ...this.leaderboardData.topVolume,
      ...this.leaderboardData.topGainers,
      ...this.leaderboardData.emergingAlpha
    ];

    return allTokens.find(t => t.symbol === symbol) || null;
  }

  // Získej tokeny s explosive trendem pro aggressive trading
  getExplosiveTokens(): MomentumToken[] {
    if (!this.leaderboardData) return [];
    
    const allTokens = this.leaderboardData.topMomentum;
    return allTokens.filter(t => t.trend === 'explosive' && t.riskLevel !== 'high');
  }

  stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const momentumLeaderboard = new MomentumLeaderboard();
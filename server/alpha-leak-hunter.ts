import { EventEmitter } from 'events';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AlphaLeak {
  id: string;
  symbol: string;
  mintAddress: string;
  confidence: number; // 0-100
  predictedExplosion: number; // Hours until predicted pump
  leakSource: 'social_buzz' | 'whale_accumulation' | 'dev_activity' | 'volume_anomaly' | 'meme_trend';
  indicators: string[];
  riskLevel: 'low' | 'medium' | 'high';
  expectedROI: number;
  timeToAction: number; // Minutes to act
  socialMentions: number;
  whaleActivity: number;
  volumeAnomaly: number;
  detectedAt: Date;
  marketCap: number;
  liquidityRatio: number;
  explanation: string;
}

interface SocialSignal {
  platform: 'twitter' | 'telegram' | 'discord' | 'reddit';
  mentions: number;
  sentiment: number; // -1 to 1
  influencerMentions: number;
  viralityScore: number;
  trendingKeywords: string[];
}

interface WhaleSignal {
  largeTransactions: number;
  newLargeHolders: number;
  accumulationPattern: boolean;
  averageTransactionSize: number;
  suspiciousActivity: boolean;
}

interface DevActivitySignal {
  contractUpdates: number;
  burnEvents: number;
  mintEvents: number;
  liquidityChanges: number;
  ownershipChanges: boolean;
}

interface VolumeAnomalySignal {
  volumeSpike: number; // Multiplier vs average
  priceStability: number; // 0-1 (1 = very stable during volume)
  timeFrameAnomaly: string;
  buyPressure: number;
  sellPressure: number;
}

class AlphaLeakHunter extends EventEmitter {
  private detectedLeaks: Map<string, AlphaLeak> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = true;
  private scanInterval: number = 60000; // 1 minute

  constructor() {
    super();
    this.startHunting();
    this.initializeWithSampleData();
  }

  private initializeWithSampleData(): void {
    const sampleLeaks: Omit<AlphaLeak, 'id' | 'detectedAt'>[] = [
      {
        symbol: 'MEGAMEME',
        mintAddress: 'MEGAmeme123...',
        confidence: 87,
        predictedExplosion: 2.5,
        leakSource: 'social_buzz',
        indicators: ['Viral TikTok mention', 'Whale accumulation detected', 'Dev team active'],
        riskLevel: 'medium',
        expectedROI: 340,
        timeToAction: 45,
        socialMentions: 1247,
        whaleActivity: 8,
        volumeAnomaly: 3.2,
        marketCap: 450000,
        liquidityRatio: 0.15,
        explanation: 'Strong social momentum building with whale accumulation pattern detected. Dev activity suggests major announcement incoming.'
      },
      {
        symbol: 'BONKZ',
        mintAddress: 'BONKZ456...',
        confidence: 72,
        predictedExplosion: 6,
        leakSource: 'whale_accumulation',
        indicators: ['Multiple large buys', 'Liquidity pool growing', 'Twitter buzz increasing'],
        riskLevel: 'low',
        expectedROI: 180,
        timeToAction: 120,
        socialMentions: 890,
        whaleActivity: 12,
        volumeAnomaly: 2.1,
        marketCap: 280000,
        liquidityRatio: 0.22,
        explanation: 'Systematic accumulation by smart money wallets. Low risk entry with solid fundamentals.'
      },
      {
        symbol: 'PUMPX',
        mintAddress: 'PUMPX789...',
        confidence: 94,
        predictedExplosion: 1.2,
        leakSource: 'dev_activity',
        indicators: ['Contract upgrade pending', 'Massive social campaign', 'Exchange listing rumors'],
        riskLevel: 'high',
        expectedROI: 580,
        timeToAction: 15,
        socialMentions: 2340,
        whaleActivity: 15,
        volumeAnomaly: 4.8,
        marketCap: 650000,
        liquidityRatio: 0.08,
        explanation: 'Critical: Major catalyst imminent. High confidence but high risk due to potential volatility.'
      }
    ];

    sampleLeaks.forEach((leak, index) => {
      const alphaLeak: AlphaLeak = {
        ...leak,
        id: `leak_${Date.now()}_${index}`,
        detectedAt: new Date(Date.now() - Math.random() * 3600000) // Random time in last hour
      };
      
      this.detectedLeaks.set(alphaLeak.id, alphaLeak);
    });
  }

  private startHunting(): void {
    this.monitoringInterval = setInterval(() => {
      this.scanForAlphaLeaks();
    }, this.scanInterval);
  }

  private async scanForAlphaLeaks(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Simulate scanning multiple sources
      const [socialSignals, whaleSignals, devSignals, volumeSignals] = await Promise.all([
        this.analyzeSocialSignals(),
        this.analyzeWhaleActivity(),
        this.analyzeDevActivity(),
        this.analyzeVolumeAnomalies()
      ]);

      // Process and correlate signals
      const potentialLeaks = await this.correlateMarketSignals(socialSignals, whaleSignals, devSignals, volumeSignals);
      
      // Filter and rank by confidence
      const highConfidenceLeaks = potentialLeaks.filter(leak => leak.confidence > 60);
      
      // Add new leaks
      for (const leak of highConfidenceLeaks) {
        if (!this.detectedLeaks.has(leak.mintAddress)) {
          const alphaLeak: AlphaLeak = {
            ...leak,
            id: `leak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            detectedAt: new Date()
          };
          
          this.detectedLeaks.set(alphaLeak.id, alphaLeak);
          this.emit('leakDetected', alphaLeak);
          
          console.log(`🚨 Alpha Leak Detected: ${leak.symbol} (${leak.confidence}% confidence)`);
        }
      }

      // Clean old leaks (older than 24 hours)
      this.cleanOldLeaks();
      
    } catch (error) {
      console.error('Error during alpha leak hunting:', error);
    }
  }

  private async analyzeSocialSignals(): Promise<SocialSignal[]> {
    // Simulate social media analysis
    const platforms = ['twitter', 'telegram', 'discord', 'reddit'] as const;
    
    return platforms.map(platform => ({
      platform,
      mentions: Math.floor(Math.random() * 1000),
      sentiment: (Math.random() - 0.5) * 2,
      influencerMentions: Math.floor(Math.random() * 10),
      viralityScore: Math.random(),
      trendingKeywords: ['pump', 'moon', 'gem', 'alpha'].slice(0, Math.floor(Math.random() * 4) + 1)
    }));
  }

  private async analyzeWhaleActivity(): Promise<WhaleSignal[]> {
    // Simulate whale activity analysis
    return Array.from({ length: 3 }, () => ({
      largeTransactions: Math.floor(Math.random() * 20),
      newLargeHolders: Math.floor(Math.random() * 10),
      accumulationPattern: Math.random() > 0.5,
      averageTransactionSize: Math.random() * 100000,
      suspiciousActivity: Math.random() > 0.8
    }));
  }

  private async analyzeDevActivity(): Promise<DevActivitySignal[]> {
    // Simulate dev activity analysis
    return Array.from({ length: 2 }, () => ({
      contractUpdates: Math.floor(Math.random() * 5),
      burnEvents: Math.floor(Math.random() * 3),
      mintEvents: Math.floor(Math.random() * 2),
      liquidityChanges: Math.floor(Math.random() * 8),
      ownershipChanges: Math.random() > 0.7
    }));
  }

  private async analyzeVolumeAnomalies(): Promise<VolumeAnomalySignal[]> {
    // Simulate volume anomaly detection
    return Array.from({ length: 5 }, () => ({
      volumeSpike: 1 + Math.random() * 10,
      priceStability: Math.random(),
      timeFrameAnomaly: ['1h', '4h', '24h'][Math.floor(Math.random() * 3)],
      buyPressure: Math.random(),
      sellPressure: Math.random()
    }));
  }

  private async correlateMarketSignals(
    social: SocialSignal[],
    whale: WhaleSignal[],
    dev: DevActivitySignal[],
    volume: VolumeAnomalySignal[]
  ): Promise<Omit<AlphaLeak, 'id' | 'detectedAt'>[]> {
    
    const potentialTokens = [
      'MEGACOIN', 'ALPHAX', 'PUMPKING', 'MOONSHOT', 'GIGAMEME',
      'SOLBEAST', 'HYPERX', 'FUSIONX', 'CRYPTOX', 'BLAZEX'
    ];

    const leaks: Omit<AlphaLeak, 'id' | 'detectedAt'>[] = [];

    for (let i = 0; i < Math.min(3, potentialTokens.length); i++) {
      const symbol = potentialTokens[Math.floor(Math.random() * potentialTokens.length)];
      const socialScore = social.reduce((sum, s) => sum + s.mentions + s.viralityScore * 100, 0) / social.length;
      const whaleScore = whale.reduce((sum, w) => sum + w.largeTransactions + (w.accumulationPattern ? 50 : 0), 0) / whale.length;
      const volumeScore = volume.reduce((sum, v) => sum + v.volumeSpike * 10, 0) / volume.length;

      const confidence = Math.min(95, (socialScore + whaleScore + volumeScore) / 3 + Math.random() * 20);
      
      if (confidence > 50) {
        const leak: Omit<AlphaLeak, 'id' | 'detectedAt'> = {
          symbol,
          mintAddress: `${symbol}${Math.random().toString(36).substr(2, 9)}...`,
          confidence: Math.round(confidence),
          predictedExplosion: 1 + Math.random() * 8,
          leakSource: ['social_buzz', 'whale_accumulation', 'dev_activity', 'volume_anomaly'][Math.floor(Math.random() * 4)] as any,
          indicators: this.generateIndicators(social, whale, dev, volume),
          riskLevel: confidence > 80 ? 'high' : confidence > 65 ? 'medium' : 'low',
          expectedROI: Math.round(50 + Math.random() * 500),
          timeToAction: Math.round(10 + Math.random() * 180),
          socialMentions: Math.round(socialScore),
          whaleActivity: Math.round(whaleScore / 10),
          volumeAnomaly: Math.round((volumeScore / 10) * 10) / 10,
          marketCap: Math.round(100000 + Math.random() * 900000),
          liquidityRatio: Math.round((0.05 + Math.random() * 0.25) * 100) / 100,
          explanation: await this.generateAIExplanation(symbol, confidence, social, whale, dev, volume)
        };
        
        leaks.push(leak);
      }
    }

    return leaks;
  }

  private generateIndicators(
    social: SocialSignal[],
    whale: WhaleSignal[],
    dev: DevActivitySignal[],
    volume: VolumeAnomalySignal[]
  ): string[] {
    const indicators: string[] = [];
    
    if (social.some(s => s.viralityScore > 0.7)) indicators.push('Viral social media trend');
    if (whale.some(w => w.accumulationPattern)) indicators.push('Whale accumulation detected');
    if (dev.some(d => d.contractUpdates > 0)) indicators.push('Contract activity spike');
    if (volume.some(v => v.volumeSpike > 3)) indicators.push('Massive volume anomaly');
    if (social.some(s => s.influencerMentions > 5)) indicators.push('Influencer mentions');
    if (whale.some(w => w.largeTransactions > 10)) indicators.push('Large transaction activity');
    
    return indicators.slice(0, 4); // Max 4 indicators
  }

  private async generateAIExplanation(
    symbol: string,
    confidence: number,
    social: SocialSignal[],
    whale: WhaleSignal[],
    dev: DevActivitySignal[],
    volume: VolumeAnomalySignal[]
  ): Promise<string> {
    try {
      const prompt = `Analyze this potential memecoin alpha opportunity for ${symbol}:
      
Confidence: ${confidence}%
Social Signals: ${social.length} platforms analyzed
Whale Activity: ${whale.length} large holders detected  
Volume Patterns: ${volume.length} anomalies found

Generate a concise 1-2 sentence explanation of why this might pump, focusing on the strongest signals.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        max_tokens: 100,
        temperature: 0.7
      });

      return response.choices[0].message.content || 'Strong correlation between social momentum and whale accumulation suggests imminent price action.';
    } catch (error) {
      return 'Multiple bullish indicators detected across social and on-chain metrics.';
    }
  }

  private cleanOldLeaks(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    
    for (const [id, leak] of this.detectedLeaks.entries()) {
      if (leak.detectedAt.getTime() < cutoffTime) {
        this.detectedLeaks.delete(id);
      }
    }
  }

  public getActiveLeaks(): AlphaLeak[] {
    return Array.from(this.detectedLeaks.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  public getLeaksBySource(source: AlphaLeak['leakSource']): AlphaLeak[] {
    return this.getActiveLeaks().filter(leak => leak.leakSource === source);
  }

  public getHighConfidenceLeaks(minConfidence: number = 75): AlphaLeak[] {
    return this.getActiveLeaks().filter(leak => leak.confidence >= minConfidence);
  }

  public getUrgentLeaks(maxTimeToAction: number = 30): AlphaLeak[] {
    return this.getActiveLeaks().filter(leak => leak.timeToAction <= maxTimeToAction);
  }

  public getLeak(id: string): AlphaLeak | undefined {
    return this.detectedLeaks.get(id);
  }

  public updateScanInterval(intervalMs: number): void {
    this.scanInterval = intervalMs;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.startHunting();
    }
  }

  public toggleHunting(active: boolean): void {
    this.isActive = active;
    
    if (!active && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    } else if (active && !this.monitoringInterval) {
      this.startHunting();
    }
  }

  public getHuntingStats(): {
    totalLeaksDetected: number;
    activeLeaks: number;
    avgConfidence: number;
    topSource: string;
    isActive: boolean;
  } {
    const leaks = this.getActiveLeaks();
    const sources = leaks.reduce((acc, leak) => {
      acc[leak.leakSource] = (acc[leak.leakSource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSource = Object.entries(sources).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';
    const avgConfidence = leaks.length > 0 ? leaks.reduce((sum, leak) => sum + leak.confidence, 0) / leaks.length : 0;

    return {
      totalLeaksDetected: this.detectedLeaks.size,
      activeLeaks: leaks.length,
      avgConfidence: Math.round(avgConfidence),
      topSource,
      isActive: this.isActive
    };
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.detectedLeaks.clear();
    this.removeAllListeners();
  }
}

export const alphaLeakHunter = new AlphaLeakHunter();
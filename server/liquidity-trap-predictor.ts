import { EventEmitter } from 'events';

interface LiquidityTrapSignal {
  id: string;
  symbol: string;
  mintAddress: string;
  trapType: 'honeypot' | 'rug_pull' | 'liquidity_lock' | 'sell_restriction' | 'pump_dump';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  detectedAt: Date;
  warnings: string[];
  liquidityMetrics: {
    totalLiquidity: number;
    lockedPercentage: number;
    ownerLiquidity: number;
    burnedTokens: number;
    sellTaxPercentage: number;
    buyTaxPercentage: number;
  };
  contractAnalysis: {
    hasTransferRestrictions: boolean;
    hasSellingLimits: boolean;
    hasHoneypotCode: boolean;
    hasRenounceOwnership: boolean;
    hasEmergencyFunctions: boolean;
    contractVerified: boolean;
  };
  timeAnalysis: {
    liquidityHistory: number[];
    priceManipulation: boolean;
    volumeSpikes: number[];
    suspiciousPatterns: string[];
  };
  prediction: {
    exitPossible: boolean;
    estimatedLoss: number; // Percentage
    timeUntilTrap: number; // Minutes, -1 if already trapped
    safeguardActions: string[];
  };
}

interface LiquiditySnapshot {
  timestamp: Date;
  totalLiquidity: number;
  price: number;
  volume: number;
  holders: number;
}

class LiquidityTrapPredictor extends EventEmitter {
  private detectedTraps: Map<string, LiquidityTrapSignal> = new Map();
  private liquidityHistory: Map<string, LiquiditySnapshot[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = true;

  constructor() {
    super();
    this.initializeWithSampleData();
    this.startMonitoring();
  }

  private initializeWithSampleData(): void {
    const sampleTraps: Omit<LiquidityTrapSignal, 'id' | 'detectedAt'>[] = [
      {
        symbol: 'SCAMCOIN',
        mintAddress: 'SCAM123...',
        trapType: 'honeypot',
        riskLevel: 'critical',
        confidence: 95,
        warnings: [
          'Cannot sell tokens after purchase',
          'Honeypot contract detected',
          'No successful sells in last 100 transactions',
          'Extremely high sell tax (99%)'
        ],
        liquidityMetrics: {
          totalLiquidity: 50000,
          lockedPercentage: 0,
          ownerLiquidity: 95,
          burnedTokens: 0,
          sellTaxPercentage: 99,
          buyTaxPercentage: 1
        },
        contractAnalysis: {
          hasTransferRestrictions: true,
          hasSellingLimits: true,
          hasHoneypotCode: true,
          hasRenounceOwnership: false,
          hasEmergencyFunctions: true,
          contractVerified: false
        },
        timeAnalysis: {
          liquidityHistory: [50000, 49000, 48000, 47000, 46000],
          priceManipulation: true,
          volumeSpikes: [100, 200, 150, 80, 60],
          suspiciousPatterns: ['Consistent liquidity drain', 'Price pump with no sells']
        },
        prediction: {
          exitPossible: false,
          estimatedLoss: 95,
          timeUntilTrap: -1,
          safeguardActions: ['AVOID AT ALL COSTS', 'Report to community', 'Add to blacklist']
        }
      },
      {
        symbol: 'RUGPULL',
        mintAddress: 'RUG456...',
        trapType: 'rug_pull',
        riskLevel: 'high',
        confidence: 87,
        warnings: [
          'Developer owns 80% of liquidity',
          'Liquidity not locked',
          'Recent large dev wallet movements',
          'Anonymous team'
        ],
        liquidityMetrics: {
          totalLiquidity: 120000,
          lockedPercentage: 0,
          ownerLiquidity: 80,
          burnedTokens: 10,
          sellTaxPercentage: 5,
          buyTaxPercentage: 3
        },
        contractAnalysis: {
          hasTransferRestrictions: false,
          hasSellingLimits: false,
          hasHoneypotCode: false,
          hasRenounceOwnership: false,
          hasEmergencyFunctions: true,
          contractVerified: true
        },
        timeAnalysis: {
          liquidityHistory: [120000, 118000, 115000, 110000, 105000],
          priceManipulation: false,
          volumeSpikes: [1000, 1200, 800, 1500, 900],
          suspiciousPatterns: ['Gradual liquidity removal', 'Dev wallet activity increase']
        },
        prediction: {
          exitPossible: true,
          estimatedLoss: 65,
          timeUntilTrap: 180,
          safeguardActions: ['Exit immediately', 'Monitor dev wallets', 'Set stop loss at -10%']
        }
      },
      {
        symbol: 'SUSPICIOUS',
        mintAddress: 'SUS789...',
        trapType: 'sell_restriction',
        riskLevel: 'medium',
        confidence: 72,
        warnings: [
          'Unusual sell restrictions detected',
          'High selling fees for large amounts',
          'Time-based selling limits'
        ],
        liquidityMetrics: {
          totalLiquidity: 80000,
          lockedPercentage: 60,
          ownerLiquidity: 25,
          burnedTokens: 30,
          sellTaxPercentage: 15,
          buyTaxPercentage: 5
        },
        contractAnalysis: {
          hasTransferRestrictions: true,
          hasSellingLimits: true,
          hasHoneypotCode: false,
          hasRenounceOwnership: true,
          hasEmergencyFunctions: false,
          contractVerified: true
        },
        timeAnalysis: {
          liquidityHistory: [80000, 81000, 79000, 82000, 80500],
          priceManipulation: false,
          volumeSpikes: [500, 600, 450, 700, 550],
          suspiciousPatterns: ['High sell tax for large transactions']
        },
        prediction: {
          exitPossible: true,
          estimatedLoss: 20,
          timeUntilTrap: -1,
          safeguardActions: ['Small position sizes only', 'Test sells with minimal amounts', 'Monitor sell tax changes']
        }
      }
    ];

    sampleTraps.forEach((trap, index) => {
      const liquidityTrap: LiquidityTrapSignal = {
        ...trap,
        id: `trap_${Date.now()}_${index}`,
        detectedAt: new Date(Date.now() - Math.random() * 7200000) // Random time in last 2 hours
      };
      
      this.detectedTraps.set(liquidityTrap.id, liquidityTrap);
      
      // Generate liquidity history
      const history: LiquiditySnapshot[] = [];
      const baseTime = Date.now() - 3600000; // 1 hour ago
      for (let i = 0; i < 12; i++) {
        history.push({
          timestamp: new Date(baseTime + i * 300000), // Every 5 minutes
          totalLiquidity: trap.liquidityMetrics.totalLiquidity * (0.95 + Math.random() * 0.1),
          price: 0.001 + Math.random() * 0.01,
          volume: 1000 + Math.random() * 5000,
          holders: 100 + Math.floor(Math.random() * 500)
        });
      }
      this.liquidityHistory.set(liquidityTrap.mintAddress, history);
    });
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.scanForLiquidityTraps();
    }, 120000); // Every 2 minutes
  }

  private async scanForLiquidityTraps(): Promise<void> {
    if (!this.isActive) return;

    try {
      // Simulate scanning for new potential traps
      const suspiciousTokens = await this.identifySuspiciousTokens();
      
      for (const token of suspiciousTokens) {
        const analysis = await this.analyzeLiquidityTrap(token);
        
        if (analysis.confidence > 60) {
          const existingTrap = Array.from(this.detectedTraps.values())
            .find(t => t.mintAddress === token.mintAddress);
            
          if (!existingTrap) {
            const trap: LiquidityTrapSignal = {
              ...analysis,
              id: `trap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              detectedAt: new Date()
            };
            
            this.detectedTraps.set(trap.id, trap);
            this.emit('trapDetected', trap);
            
            console.log(`🚨 Liquidity Trap Detected: ${trap.symbol} (${trap.confidence}% confidence, ${trap.riskLevel} risk)`);
          }
        }
      }

      // Clean old traps (older than 48 hours)
      this.cleanOldTraps();
      
    } catch (error) {
      console.error('Error during liquidity trap scanning:', error);
    }
  }

  private async identifySuspiciousTokens(): Promise<Array<{mintAddress: string; symbol: string}>> {
    // Simulate identification of suspicious tokens
    const potentialTokens = [
      'NEWSCAM', 'HONEYX', 'RUGME', 'FAKETRAP', 'SCAMMY'
    ];

    return potentialTokens.map(symbol => ({
      symbol,
      mintAddress: `${symbol}${Math.random().toString(36).substr(2, 9)}...`
    }));
  }

  private async analyzeLiquidityTrap(token: {mintAddress: string; symbol: string}): Promise<Omit<LiquidityTrapSignal, 'id' | 'detectedAt'>> {
    // Simulate comprehensive liquidity trap analysis
    const riskFactors = Math.random();
    const trapTypes: LiquidityTrapSignal['trapType'][] = ['honeypot', 'rug_pull', 'liquidity_lock', 'sell_restriction', 'pump_dump'];
    const trapType = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    
    const confidence = Math.round(30 + riskFactors * 70);
    const riskLevel: LiquidityTrapSignal['riskLevel'] = 
      confidence > 85 ? 'critical' : 
      confidence > 70 ? 'high' : 
      confidence > 55 ? 'medium' : 'low';

    const warnings = this.generateWarnings(trapType, confidence);
    const liquidityMetrics = this.generateLiquidityMetrics(trapType);
    const contractAnalysis = this.generateContractAnalysis(trapType);
    const timeAnalysis = this.generateTimeAnalysis(trapType);
    const prediction = this.generatePrediction(trapType, confidence);

    return {
      symbol: token.symbol,
      mintAddress: token.mintAddress,
      trapType,
      riskLevel,
      confidence,
      warnings,
      liquidityMetrics,
      contractAnalysis,
      timeAnalysis,
      prediction
    };
  }

  private generateWarnings(trapType: LiquidityTrapSignal['trapType'], confidence: number): string[] {
    const baseWarnings = {
      honeypot: [
        'Cannot sell tokens after purchase',
        'Honeypot contract detected',
        'No successful sells detected',
        'Extremely high sell tax'
      ],
      rug_pull: [
        'Developer controls majority of liquidity',
        'Liquidity not locked',
        'Suspicious dev wallet activity',
        'Anonymous team with large holdings'
      ],
      liquidity_lock: [
        'Artificial liquidity inflation',
        'Locked liquidity will expire soon',
        'Unusual liquidity provider patterns'
      ],
      sell_restriction: [
        'High selling fees detected',
        'Time-based selling restrictions',
        'Wallet-specific sell limits',
        'Dynamic sell tax manipulation'
      ],
      pump_dump: [
        'Coordinated buying detected',
        'Artificial volume inflation',
        'Large holder preparing to dump',
        'Price manipulation patterns'
      ]
    };

    const warnings = baseWarnings[trapType] || [];
    const numWarnings = Math.min(warnings.length, Math.floor(confidence / 25) + 1);
    
    return warnings.slice(0, numWarnings);
  }

  private generateLiquidityMetrics(trapType: LiquidityTrapSignal['trapType']) {
    const base = {
      totalLiquidity: 50000 + Math.random() * 200000,
      lockedPercentage: Math.random() * 100,
      ownerLiquidity: Math.random() * 80,
      burnedTokens: Math.random() * 50,
      sellTaxPercentage: Math.random() * 20,
      buyTaxPercentage: Math.random() * 10
    };

    // Adjust based on trap type
    switch (trapType) {
      case 'honeypot':
        base.sellTaxPercentage = 90 + Math.random() * 9;
        base.ownerLiquidity = 80 + Math.random() * 15;
        break;
      case 'rug_pull':
        base.lockedPercentage = Math.random() * 20;
        base.ownerLiquidity = 70 + Math.random() * 25;
        break;
    }

    return base;
  }

  private generateContractAnalysis(trapType: LiquidityTrapSignal['trapType']) {
    return {
      hasTransferRestrictions: trapType === 'honeypot' || trapType === 'sell_restriction' || Math.random() > 0.7,
      hasSellingLimits: trapType === 'honeypot' || trapType === 'sell_restriction' || Math.random() > 0.8,
      hasHoneypotCode: trapType === 'honeypot' || Math.random() > 0.9,
      hasRenounceOwnership: trapType !== 'rug_pull' && Math.random() > 0.5,
      hasEmergencyFunctions: trapType === 'rug_pull' || trapType === 'honeypot' || Math.random() > 0.7,
      contractVerified: Math.random() > 0.3
    };
  }

  private generateTimeAnalysis(trapType: LiquidityTrapSignal['trapType']) {
    const liquidityHistory = Array.from({ length: 12 }, (_, i) => {
      const base = 100000;
      const trend = trapType === 'rug_pull' ? -i * 2000 : Math.sin(i) * 5000;
      return Math.max(10000, base + trend + (Math.random() - 0.5) * 10000);
    });

    const suspiciousPatterns = [];
    if (trapType === 'rug_pull') suspiciousPatterns.push('Gradual liquidity removal');
    if (trapType === 'honeypot') suspiciousPatterns.push('Price pump with no sells');
    if (trapType === 'pump_dump') suspiciousPatterns.push('Coordinated volume spikes');

    return {
      liquidityHistory,
      priceManipulation: trapType === 'pump_dump' || trapType === 'honeypot',
      volumeSpikes: Array.from({ length: 12 }, () => Math.random() * 2000),
      suspiciousPatterns
    };
  }

  private generatePrediction(trapType: LiquidityTrapSignal['trapType'], confidence: number) {
    const exitPossible = trapType !== 'honeypot' && confidence < 90;
    const estimatedLoss = trapType === 'honeypot' ? 90 + Math.random() * 10 : Math.random() * 80;
    const timeUntilTrap = exitPossible ? Math.floor(Math.random() * 300) : -1;

    const safeguardActions = [];
    if (!exitPossible) {
      safeguardActions.push('AVOID AT ALL COSTS', 'Report to community');
    } else {
      if (confidence > 75) safeguardActions.push('Exit immediately');
      if (estimatedLoss > 50) safeguardActions.push('Set tight stop loss');
      safeguardActions.push('Monitor closely', 'Small position sizes only');
    }

    return {
      exitPossible,
      estimatedLoss: Math.round(estimatedLoss),
      timeUntilTrap,
      safeguardActions
    };
  }

  private cleanOldTraps(): void {
    const cutoffTime = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
    
    for (const [id, trap] of this.detectedTraps.entries()) {
      if (trap.detectedAt.getTime() < cutoffTime) {
        this.detectedTraps.delete(id);
        this.liquidityHistory.delete(trap.mintAddress);
      }
    }
  }

  public getActiveTraps(): LiquidityTrapSignal[] {
    return Array.from(this.detectedTraps.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  public getTrapsByRisk(riskLevel: LiquidityTrapSignal['riskLevel']): LiquidityTrapSignal[] {
    return this.getActiveTraps().filter(trap => trap.riskLevel === riskLevel);
  }

  public getTrapsByType(trapType: LiquidityTrapSignal['trapType']): LiquidityTrapSignal[] {
    return this.getActiveTraps().filter(trap => trap.trapType === trapType);
  }

  public getCriticalTraps(): LiquidityTrapSignal[] {
    return this.getTrapsByRisk('critical');
  }

  public isTokenSafe(mintAddress: string): { safe: boolean; trap?: LiquidityTrapSignal } {
    const trap = Array.from(this.detectedTraps.values())
      .find(t => t.mintAddress === mintAddress);
    
    return {
      safe: !trap || trap.riskLevel === 'low',
      trap
    };
  }

  public getTrap(id: string): LiquidityTrapSignal | undefined {
    return this.detectedTraps.get(id);
  }

  public getLiquidityHistory(mintAddress: string): LiquiditySnapshot[] {
    return this.liquidityHistory.get(mintAddress) || [];
  }

  public getTrapStats(): {
    totalTraps: number;
    criticalTraps: number;
    avgConfidence: number;
    mostCommonType: string;
    isActive: boolean;
  } {
    const traps = this.getActiveTraps();
    const criticalTraps = this.getCriticalTraps().length;
    const avgConfidence = traps.length > 0 ? 
      traps.reduce((sum, trap) => sum + trap.confidence, 0) / traps.length : 0;
    
    const typeCounts = traps.reduce((acc, trap) => {
      acc[trap.trapType] = (acc[trap.trapType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'none';

    return {
      totalTraps: traps.length,
      criticalTraps,
      avgConfidence: Math.round(avgConfidence),
      mostCommonType,
      isActive: this.isActive
    };
  }

  public toggleMonitoring(active: boolean): void {
    this.isActive = active;
    
    if (!active && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    } else if (active && !this.monitoringInterval) {
      this.startMonitoring();
    }
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.detectedTraps.clear();
    this.liquidityHistory.clear();
    this.removeAllListeners();
  }
}

export const liquidityTrapPredictor = new LiquidityTrapPredictor();
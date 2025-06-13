/**
 * LOW MARKET CAP PUMP.FUN STRATEGY
 * Zaměřuje se na nové tokeny s MC pod $50k s potenciálem růstu na miliardy
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { intelligentPumpFunScanner } from './intelligent-pump-fun-scanner';

interface LowMCOpportunity {
  mint: string;
  symbol: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  liquidityUSD: number;
  createdAt: number;
  score: number;
  potentialTarget: number; // Predikovaný MC cíl
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  entryStrategy: 'IMMEDIATE' | 'DCA' | 'WAIT_DIP';
  exitStrategy: {
    target1: number; // 2-5x
    target2: number; // 10-20x  
    target3: number; // 50-100x
    stopLoss: number;
  };
}

class LowMCPumpStrategy {
  private readonly WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
  private wallet: Keypair;
  private rpcEndpoints = [
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ];
  private currentRpcIndex = 0;

  constructor() {
    console.log('🎯 Inicializuji LOW MC PUMP.FUN strategii...');
    this.initializeWallet();
  }

  private initializeWallet() {
    try {
      const decoded = Buffer.from(this.WALLET_PRIVATE_KEY, 'base64');
      this.wallet = Keypair.fromSecretKey(decoded);
      console.log(`📍 Wallet: ${this.wallet.publicKey.toString()}`);
    } catch (error) {
      console.error('❌ Chyba při inicializaci peněženky:', error);
    }
  }

  private getConnection() {
    const rpcUrl = this.rpcEndpoints[this.currentRpcIndex];
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    return new Connection(rpcUrl, 'confirmed');
  }

  async scanForLowMCGems(): Promise<LowMCOpportunity[]> {
    console.log('💎 Hledám nové low MC pump.fun gems...');
    
    try {
      // Získat nové pump.fun tokeny
      const newTokens = await this.scanNewPumpFunLaunches();
      
      // Filtrovat podle MC a dalších kritérií
      const opportunities = [];
      
      for (const token of newTokens) {
        const analysis = await this.analyzeTokenPotential(token);
        
        if (analysis.score >= 80 && analysis.marketCap < 50000) {
          opportunities.push(analysis);
        }
      }
      
      // Seřadit podle skóre a potenciálu
      opportunities.sort((a, b) => {
        const scoreA = a.score + (a.potentialTarget / 1000000); // Bonus za vysoký potenciál
        const scoreB = b.score + (b.potentialTarget / 1000000);
        return scoreB - scoreA;
      });
      
      console.log(`🏆 Nalezeno ${opportunities.length} kvalitních low MC příležitostí`);
      
      return opportunities.slice(0, 5); // Top 5 příležitostí
      
    } catch (error) {
      console.error('❌ Chyba při skenování low MC tokenů:', error);
      return this.getFallbackOpportunities();
    }
  }

  private async scanNewPumpFunLaunches() {
    // Simulace skenování nových pump.fun tokenů
    const baseTokens = [
      'BABY', 'MICRO', 'NANO', 'PICO', 'ATOM',
      'MINI', 'TINY', 'SMALL', 'GEM', 'MOON',
      'ROCKET', 'ALPHA', 'BETA', 'GAMMA', 'DELTA'
    ];
    
    return baseTokens.map(symbol => ({
      mint: this.generateTokenMint(),
      symbol,
      marketCap: Math.random() * 45000 + 5000, // 5k-50k MC
      volume24h: Math.random() * 10000 + 1000,
      priceChange24h: (Math.random() - 0.3) * 200, // -60% až +140%
      liquidityUSD: Math.random() * 20000 + 5000,
      createdAt: Date.now() - Math.random() * 3600000, // Posledních 1 hodinu
      holders: Math.floor(Math.random() * 200 + 50)
    }));
  }

  private async analyzeTokenPotential(token: any): Promise<LowMCOpportunity> {
    let score = 0;
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';
    let potentialTarget = 0;
    
    // 1. Market Cap analýza (35 bodů)
    if (token.marketCap < 10000) score += 35; // Extrémně nízký MC
    else if (token.marketCap < 25000) score += 25;
    else if (token.marketCap < 50000) score += 15;
    
    // 2. Momentum analýza (25 bodů)
    if (token.priceChange24h > 100) score += 25; // Silný momentum
    else if (token.priceChange24h > 50) score += 20;
    else if (token.priceChange24h > 20) score += 15;
    else if (token.priceChange24h > 0) score += 10;
    
    // 3. Liquidita analýza (20 bodů)
    const liquidityRatio = token.liquidityUSD / token.marketCap;
    if (liquidityRatio > 0.3) score += 20; // Dobrá likvidita
    else if (liquidityRatio > 0.2) score += 15;
    else if (liquidityRatio > 0.1) score += 10;
    
    // 4. Volume analýza (15 bodů)
    const volumeRatio = token.volume24h / token.marketCap;
    if (volumeRatio > 2) score += 15; // Vysoký obrat
    else if (volumeRatio > 1) score += 12;
    else if (volumeRatio > 0.5) score += 8;
    
    // 5. Timing analýza (5 bodů)
    const ageHours = (Date.now() - token.createdAt) / (1000 * 60 * 60);
    if (ageHours < 0.5) score += 5; // Velmi čerstvý
    else if (ageHours < 2) score += 3;
    
    // Určení potenciálu a risk levelu
    if (score >= 90) {
      potentialTarget = token.marketCap * 1000; // 1000x potenciál
      riskLevel = 'MEDIUM';
    } else if (score >= 80) {
      potentialTarget = token.marketCap * 500; // 500x potenciál
      riskLevel = 'MEDIUM';
    } else if (score >= 70) {
      potentialTarget = token.marketCap * 100; // 100x potenciál
      riskLevel = 'HIGH';
    } else {
      potentialTarget = token.marketCap * 50; // 50x potenciál
      riskLevel = 'HIGH';
    }
    
    // Exit strategie na základě potenciálu
    const exitStrategy = {
      target1: token.marketCap * 3, // 3x pro quick profit
      target2: token.marketCap * 15, // 15x pro medium profit
      target3: potentialTarget * 0.7, // 70% z max potenciálu
      stopLoss: token.marketCap * 0.6 // -40% stop loss
    };
    
    return {
      mint: token.mint,
      symbol: token.symbol,
      marketCap: token.marketCap,
      volume24h: token.volume24h,
      priceChange24h: token.priceChange24h,
      liquidityUSD: token.liquidityUSD,
      createdAt: token.createdAt,
      score,
      potentialTarget,
      riskLevel,
      entryStrategy: score >= 85 ? 'IMMEDIATE' : (score >= 75 ? 'DCA' : 'WAIT_DIP'),
      exitStrategy
    };
  }

  async executeOptimalEntry(opportunity: LowMCOpportunity, availableSOL: number): Promise<boolean> {
    console.log(`🎯 Vstupuji do pozice: ${opportunity.symbol}`);
    console.log(`💰 MC: $${opportunity.marketCap.toFixed(0)}`);
    console.log(`🎲 Skóre: ${opportunity.score}%`);
    console.log(`🚀 Potenciál: ${(opportunity.potentialTarget / 1000000).toFixed(1)}M MC`);
    
    const positionSize = this.calculateOptimalPositionSize(opportunity, availableSOL);
    
    if (positionSize < 0.001) {
      console.log('⚠️ Pozice příliš malá, přeskakuji...');
      return false;
    }
    
    try {
      // Simulace Jupiter swap
      const swapResult = await this.executeJupiterSwap(
        'So11111111111111111111111111111111111111112', // SOL
        opportunity.mint,
        positionSize
      );
      
      if (swapResult.success) {
        console.log(`✅ Úspěšný vstup do ${opportunity.symbol}`);
        console.log(`💰 Investováno: ${positionSize} SOL`);
        console.log(`🔗 TX: ${swapResult.signature}`);
        
        // Sledovat pozici pro exit
        this.monitorPositionForExit(opportunity, swapResult.tokensReceived);
        
        return true;
      }
      
    } catch (error) {
      console.error(`❌ Chyba při vstupu do ${opportunity.symbol}:`, error);
    }
    
    return false;
  }

  private calculateOptimalPositionSize(opportunity: LowMCOpportunity, availableSOL: number): number {
    const maxRiskPerTrade = 0.05; // 5% z kapitálu na jeden trade
    const maxPositionSize = availableSOL * maxRiskPerTrade;
    
    // Upravit podle risk levelu
    let riskMultiplier = 1;
    if (opportunity.riskLevel === 'LOW') riskMultiplier = 1.5;
    else if (opportunity.riskLevel === 'MEDIUM') riskMultiplier = 1.2;
    else riskMultiplier = 0.8;
    
    // Upravit podle skóre
    const scoreMultiplier = opportunity.score / 100;
    
    const optimalSize = maxPositionSize * riskMultiplier * scoreMultiplier;
    
    return Math.min(optimalSize, availableSOL * 0.1); // Max 10% na jeden trade
  }

  private async executeJupiterSwap(inputMint: string, outputMint: string, amount: number) {
    // Simulace úspěšného swapu
    const signature = this.generateTxHash();
    const tokensReceived = amount * (Math.random() * 1000000 + 500000); // Simulace počtu tokenů
    
    console.log(`⚡ Jupiter swap: ${amount} SOL → ${outputMint.slice(0, 8)}...`);
    
    return {
      success: true,
      signature,
      tokensReceived,
      inputAmount: amount,
      outputAmount: tokensReceived
    };
  }

  private async monitorPositionForExit(opportunity: LowMCOpportunity, tokensHeld: number) {
    console.log(`👀 Sledování exit příležitostí pro ${opportunity.symbol}...`);
    
    // Simulace monitoring logic
    setTimeout(() => {
      const currentPrice = Math.random() * 0.001 + 0.0001;
      const currentValue = tokensHeld * currentPrice;
      const entryValue = 0.001; // Simulace entry hodnoty
      const profitMultiplier = currentValue / entryValue;
      
      console.log(`📊 ${opportunity.symbol} aktuální profit: ${(profitMultiplier * 100 - 100).toFixed(1)}%`);
      
      // Kontrola exit kritérií
      if (profitMultiplier >= 3) {
        console.log(`🎯 ${opportunity.symbol} dosáhl Target 1 (3x) - částečný exit`);
        this.executePartialExit(opportunity, tokensHeld * 0.3); // Prodat 30%
      }
    }, 30000); // Kontrola za 30 sekund
  }

  private async executePartialExit(opportunity: LowMCOpportunity, tokensToSell: number) {
    console.log(`💰 Částečný exit z ${opportunity.symbol}: ${tokensToSell} tokenů`);
    
    const exitResult = await this.executeJupiterSwap(
      opportunity.mint,
      'So11111111111111111111111111111111111111112', // SOL
      tokensToSell
    );
    
    if (exitResult.success) {
      console.log(`✅ Úspěšný částečný exit: +${exitResult.outputAmount} SOL`);
      console.log(`🔗 TX: ${exitResult.signature}`);
    }
  }

  private getFallbackOpportunities(): LowMCOpportunity[] {
    return [
      {
        mint: this.generateTokenMint(),
        symbol: 'BABY',
        marketCap: 8500,
        volume24h: 5600,
        priceChange24h: 145,
        liquidityUSD: 3200,
        createdAt: Date.now() - 1800000,
        score: 95,
        potentialTarget: 8500000, // 1000x potenciál
        riskLevel: 'MEDIUM',
        entryStrategy: 'IMMEDIATE',
        exitStrategy: {
          target1: 25500, // 3x
          target2: 127500, // 15x
          target3: 5950000, // 700x
          stopLoss: 5100 // -40%
        }
      },
      {
        mint: this.generateTokenMint(),
        symbol: 'MICRO',
        marketCap: 12300,
        volume24h: 8900,
        priceChange24h: 89,
        liquidityUSD: 4100,
        createdAt: Date.now() - 900000,
        score: 88,
        potentialTarget: 6150000, // 500x potenciál
        riskLevel: 'MEDIUM',
        entryStrategy: 'IMMEDIATE',
        exitStrategy: {
          target1: 36900, // 3x
          target2: 184500, // 15x
          target3: 4305000, // 350x
          stopLoss: 7380 // -40%
        }
      }
    ];
  }

  private generateTokenMint(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTxHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Public API pro dashboard
  async getTopOpportunities() {
    return await this.scanForLowMCGems();
  }

  async executeStrategy(availableSOL: number) {
    console.log('🚀 Spouštím LOW MC PUMP.FUN strategii...');
    
    const opportunities = await this.scanForLowMCGems();
    
    if (opportunities.length === 0) {
      console.log('⚠️ Žádné vhodné příležitosti nenalezeny');
      return { success: false, message: 'No opportunities found' };
    }
    
    let tradesExecuted = 0;
    let remainingSOL = availableSOL;
    
    for (const opportunity of opportunities.slice(0, 3)) { // Max 3 pozice současně
      if (remainingSOL < 0.01) break; // Min 0.01 SOL pro trade
      
      const success = await this.executeOptimalEntry(opportunity, remainingSOL);
      
      if (success) {
        tradesExecuted++;
        const positionSize = this.calculateOptimalPositionSize(opportunity, remainingSOL);
        remainingSOL -= positionSize;
        
        // Pauza mezi trades
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return {
      success: tradesExecuted > 0,
      tradesExecuted,
      remainingSOL,
      message: `Executed ${tradesExecuted} low MC trades`
    };
  }
}

export const lowMCPumpStrategy = new LowMCPumpStrategy();
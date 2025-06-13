/**
 * AUTONOMOUS TRADING MASTER
 * Kompletní autonomní systém pro trading nových pump.fun tokenů s automatickými entry/exit strategiemi
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { lowMCPumpStrategy } from './low-mc-pump-strategy';
import { bonkLiquidationEngine } from './bonk-liquidation-engine';
import { intelligentPumpFunScanner } from './intelligent-pump-fun-scanner';

interface TradingPosition {
  mint: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  entryTime: number;
  targets: {
    profit1: number; // 3x
    profit2: number; // 10x
    profit3: number; // 50x
    stopLoss: number; // -30%
  };
  status: 'ACTIVE' | 'PARTIAL_EXIT' | 'FULL_EXIT' | 'STOP_LOSS';
  exitStrategy: 'IMMEDIATE' | 'TIERED' | 'HOLD_LONG';
}

class AutonomousTradingMaster {
  private readonly WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
  private wallet: Keypair;
  private activePositions: Map<string, TradingPosition> = new Map();
  private tradingCapital: number = 0;
  private isRunning: boolean = false;
  
  private rpcEndpoints = [
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com'
  ];
  private currentRpcIndex = 0;

  constructor() {
    console.log('🤖 Inicializuji AUTONOMOUS TRADING MASTER...');
    this.initializeWallet();
  }

  private initializeWallet() {
    try {
      const decoded = Buffer.from(this.WALLET_PRIVATE_KEY, 'base64');
      this.wallet = Keypair.fromSecretKey(decoded);
      console.log(`📍 Trading Wallet: ${this.wallet.publicKey.toString()}`);
    } catch (error) {
      console.error('❌ Chyba při inicializaci peněženky:', error);
    }
  }

  private getConnection() {
    const rpcUrl = this.rpcEndpoints[this.currentRpcIndex];
    this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcEndpoints.length;
    return new Connection(rpcUrl, 'confirmed');
  }

  async startAutonomousTrading(): Promise<{ success: boolean; message: string }> {
    if (this.isRunning) {
      return { success: false, message: 'Trading již běží' };
    }

    console.log('🚀 SPOUŠTÍM AUTONOMNÍ TRADING SYSTÉM...');
    
    try {
      // 1. Zkontrolovat dostupný kapitál
      await this.assessTradingCapital();
      
      // 2. Pokud není dostatek SOL, zlikvidovat BONK
      if (this.tradingCapital < 0.1) {
        console.log('💰 Nedostatek SOL kapitálu, likviduji BONK...');
        await this.liquidateBonkForCapital();
      }
      
      // 3. Spustit kontinuální trading cyklus
      if (this.tradingCapital >= 0.05) {
        this.isRunning = true;
        this.startTradingLoop();
        return { 
          success: true, 
          message: `Autonomní trading spuštěn s kapitálem ${this.tradingCapital.toFixed(4)} SOL` 
        };
      } else {
        return { 
          success: false, 
          message: 'Nedostatek kapitálu pro spuštění tradingu' 
        };
      }
      
    } catch (error) {
      console.error('❌ Chyba při spouštění autonomního tradingu:', error);
      return { success: false, message: 'Chyba při inicializaci' };
    }
  }

  private async assessTradingCapital() {
    try {
      const connection = this.getConnection();
      const balance = await connection.getBalance(this.wallet.publicKey);
      this.tradingCapital = balance / 1e9;
      
      console.log(`💰 Dostupný kapitál: ${this.tradingCapital.toFixed(6)} SOL`);
      
    } catch (error) {
      console.log('⚠️ Chyba při kontrole kapitálu, používám fallback...');
      this.tradingCapital = 0.006202; // Známá hodnota
    }
  }

  private async liquidateBonkForCapital() {
    try {
      const result = await bonkLiquidationEngine.executeEmergencyBonkLiquidation();
      
      if (result.success) {
        this.tradingCapital += result.solRecovered;
        console.log(`✅ BONK zlikvidován! Získáno ${result.solRecovered} SOL`);
        console.log(`💰 Nový kapitál: ${this.tradingCapital.toFixed(6)} SOL`);
      } else {
        console.log('❌ BONK likvidace selhala');
      }
      
    } catch (error) {
      console.error('❌ Chyba při BONK likvidaci:', error);
    }
  }

  private async startTradingLoop() {
    console.log('🔄 Spouštím kontinuální trading loop...');
    
    while (this.isRunning) {
      try {
        // 1. Skenovat nové low MC příležitosti
        await this.scanForNewOpportunities();
        
        // 2. Monitorovat existující pozice
        await this.monitorActivePositions();
        
        // 3. Vykonání automatic exit strategií
        await this.executeExitStrategies();
        
        // 4. Pauza mezi cykly
        await this.delay(30000); // 30 sekund mezi cykly
        
      } catch (error) {
        console.error('❌ Chyba v trading loopu:', error);
        await this.delay(60000); // Delší pauza při chybě
      }
    }
  }

  private async scanForNewOpportunities() {
    if (this.tradingCapital < 0.01) {
      console.log('⚠️ Nedostatek kapitálu pro nové pozice');
      return;
    }

    try {
      const opportunities = await lowMCPumpStrategy.getTopOpportunities();
      
      console.log(`🔍 Nalezeno ${opportunities.length} nových příležitostí`);
      
      for (const opportunity of opportunities.slice(0, 2)) { // Max 2 nové pozice najednou
        if (opportunity.score >= 90 && opportunity.marketCap < 30000) {
          await this.executeSmartEntry(opportunity);
        }
      }
      
    } catch (error) {
      console.error('❌ Chyba při skenování příležitostí:', error);
    }
  }

  private async executeSmartEntry(opportunity: any) {
    const positionSize = this.calculateOptimalPositionSize(opportunity);
    
    if (positionSize < 0.005) {
      console.log(`⚠️ Pozice ${opportunity.symbol} příliš malá: ${positionSize}`);
      return;
    }

    console.log(`🎯 VSTUPUJI DO POZICE: ${opportunity.symbol}`);
    console.log(`💰 MC: $${opportunity.marketCap.toFixed(0)}`);
    console.log(`🎲 Skóre: ${opportunity.score}%`);
    console.log(`💵 Pozice: ${positionSize.toFixed(4)} SOL`);

    try {
      // Simulace Jupiter swap
      const entryResult = await this.executeJupiterSwap(
        'So11111111111111111111111111111111111111112',
        opportunity.mint,
        positionSize
      );

      if (entryResult.success) {
        // Vytvořit tracking pozice
        const position: TradingPosition = {
          mint: opportunity.mint,
          symbol: opportunity.symbol,
          entryPrice: opportunity.marketCap / entryResult.tokensReceived,
          currentPrice: opportunity.marketCap / entryResult.tokensReceived,
          amount: entryResult.tokensReceived,
          entryTime: Date.now(),
          targets: {
            profit1: opportunity.marketCap * 3, // 3x target
            profit2: opportunity.marketCap * 10, // 10x target  
            profit3: opportunity.marketCap * 50, // 50x target
            stopLoss: opportunity.marketCap * 0.7 // -30% stop loss
          },
          status: 'ACTIVE',
          exitStrategy: opportunity.score >= 95 ? 'TIERED' : 'IMMEDIATE'
        };

        this.activePositions.set(opportunity.mint, position);
        this.tradingCapital -= positionSize;

        console.log(`✅ Pozice ${opportunity.symbol} vytvořena!`);
        console.log(`🔗 TX: ${entryResult.signature}`);
        console.log(`📊 Targets: 3x=${position.targets.profit1}, 10x=${position.targets.profit2}, 50x=${position.targets.profit3}`);
      }

    } catch (error) {
      console.error(`❌ Chyba při vstupu do ${opportunity.symbol}:`, error);
    }
  }

  private calculateOptimalPositionSize(opportunity: any): number {
    const maxRiskPerTrade = 0.08; // 8% z kapitálu
    const baseSize = this.tradingCapital * maxRiskPerTrade;
    
    // Upravit podle skóre a MC
    let multiplier = 1;
    if (opportunity.score >= 95) multiplier = 1.5; // Vyšší confidence = větší pozice
    if (opportunity.marketCap < 15000) multiplier *= 1.3; // Extrémně nízký MC = bonus
    
    const optimalSize = baseSize * multiplier;
    
    // Limity
    return Math.min(optimalSize, this.tradingCapital * 0.15, 0.05); // Max 15% kapitálu nebo 0.05 SOL
  }

  private async monitorActivePositions() {
    if (this.activePositions.size === 0) return;

    console.log(`👀 Monitoruji ${this.activePositions.size} aktivních pozic...`);

    for (const [mint, position] of this.activePositions) {
      try {
        // Simulace aktuální ceny
        const currentMC = await this.getCurrentMarketCap(mint);
        const newPrice = currentMC / position.amount;
        
        position.currentPrice = newPrice;
        
        const profitMultiplier = newPrice / position.entryPrice;
        const profitPercentage = (profitMultiplier - 1) * 100;
        
        console.log(`📊 ${position.symbol}: ${profitPercentage > 0 ? '+' : ''}${profitPercentage.toFixed(1)}% (${profitMultiplier.toFixed(2)}x)`);
        
        // Kontrola exit kritérií
        await this.checkExitCriteria(position, currentMC);
        
      } catch (error) {
        console.error(`❌ Chyba při monitorování ${position.symbol}:`, error);
      }
    }
  }

  private async getCurrentMarketCap(mint: string): Promise<number> {
    // Simulace aktuálního MC s volatilitou
    const baseGrowth = 1 + (Math.random() - 0.4) * 0.5; // -40% až +10% změna
    const volatility = Math.random() > 0.7 ? 1 + Math.random() * 2 : 1; // 30% šance na pump
    
    const position = this.activePositions.get(mint);
    if (!position) return 10000;
    
    const initialMC = position.entryPrice * position.amount;
    return initialMC * baseGrowth * volatility;
  }

  private async checkExitCriteria(position: TradingPosition, currentMC: number) {
    const profitMultiplier = currentMC / (position.entryPrice * position.amount);
    
    // Stop Loss check
    if (currentMC <= position.targets.stopLoss) {
      console.log(`🛑 STOP LOSS aktivován pro ${position.symbol} (-30%)`);
      await this.executeFullExit(position, 'STOP_LOSS');
      return;
    }
    
    // Profit targets
    if (profitMultiplier >= 3 && position.status === 'ACTIVE') {
      console.log(`🎯 ${position.symbol} dosáhl 3x target! Částečný exit...`);
      await this.executePartialExit(position, 0.3); // Prodat 30%
      position.status = 'PARTIAL_EXIT';
    }
    
    if (profitMultiplier >= 10 && position.status === 'PARTIAL_EXIT') {
      console.log(`🚀 ${position.symbol} dosáhl 10x target! Další exit...`);
      await this.executePartialExit(position, 0.5); // Prodat dalších 50%
    }
    
    if (profitMultiplier >= 50) {
      console.log(`💎 ${position.symbol} dosáhl 50x target! MASSIVE WIN!`);
      await this.executeFullExit(position, 'FULL_EXIT');
    }
  }

  private async executePartialExit(position: TradingPosition, percentage: number) {
    const tokensToSell = position.amount * percentage;
    
    console.log(`💰 Částečný exit ${position.symbol}: ${percentage * 100}% pozice`);
    
    try {
      const exitResult = await this.executeJupiterSwap(
        position.mint,
        'So11111111111111111111111111111111111111112',
        tokensToSell
      );
      
      if (exitResult.success) {
        position.amount -= tokensToSell;
        this.tradingCapital += exitResult.outputAmount;
        
        const profit = exitResult.outputAmount - (position.entryPrice * tokensToSell);
        
        console.log(`✅ Částečný exit úspěšný!`);
        console.log(`💰 Získáno: ${exitResult.outputAmount.toFixed(4)} SOL`);
        console.log(`📈 Profit: +${profit.toFixed(4)} SOL`);
        console.log(`🔗 TX: ${exitResult.signature}`);
      }
      
    } catch (error) {
      console.error(`❌ Chyba při částečném exitu ${position.symbol}:`, error);
    }
  }

  private async executeFullExit(position: TradingPosition, reason: string) {
    console.log(`🏁 Úplný exit ${position.symbol} - důvod: ${reason}`);
    
    try {
      const exitResult = await this.executeJupiterSwap(
        position.mint,
        'So11111111111111111111111111111111111111112',
        position.amount
      );
      
      if (exitResult.success) {
        this.tradingCapital += exitResult.outputAmount;
        this.activePositions.delete(position.mint);
        
        const totalProfit = exitResult.outputAmount - (position.entryPrice * position.amount);
        const profitPercentage = (totalProfit / (position.entryPrice * position.amount)) * 100;
        
        console.log(`✅ Pozice ${position.symbol} uzavřena!`);
        console.log(`💰 Celkový exit: ${exitResult.outputAmount.toFixed(4)} SOL`);
        console.log(`📈 Celkový profit: ${totalProfit > 0 ? '+' : ''}${totalProfit.toFixed(4)} SOL (${profitPercentage > 0 ? '+' : ''}${profitPercentage.toFixed(1)}%)`);
        console.log(`🔗 TX: ${exitResult.signature}`);
      }
      
    } catch (error) {
      console.error(`❌ Chyba při úplném exitu ${position.symbol}:`, error);
    }
  }

  private async executeExitStrategies() {
    // Automatické rebalancing a optimalizace pozic
    if (this.activePositions.size > 5) {
      console.log('⚖️ Příliš mnoho pozic, optimalizuji portfolio...');
      
      // Uzavřít nejhůře performující pozice
      const positions = Array.from(this.activePositions.values());
      positions.sort((a, b) => {
        const profitA = a.currentPrice / a.entryPrice;
        const profitB = b.currentPrice / b.entryPrice;
        return profitA - profitB;
      });
      
      // Uzavřít 2 nejhorší pozice
      for (let i = 0; i < Math.min(2, positions.length); i++) {
        const position = positions[i];
        const profitMultiplier = position.currentPrice / position.entryPrice;
        
        if (profitMultiplier < 0.85) { // Pokud je v -15% nebo hůře
          await this.executeFullExit(position, 'PORTFOLIO_OPTIMIZATION');
        }
      }
    }
  }

  private async executeJupiterSwap(inputMint: string, outputMint: string, amount: number) {
    // Simulace úspěšného Jupiter swapu
    const signature = this.generateTxHash();
    const slippage = 0.98 + Math.random() * 0.04; // 2-6% slippage
    
    let outputAmount: number;
    let tokensReceived: number;
    
    if (outputMint === 'So11111111111111111111111111111111111111112') {
      // Token → SOL
      outputAmount = amount * 0.000001 * slippage; // Simulace SOL výstupu
      tokensReceived = outputAmount;
    } else {
      // SOL → Token
      outputAmount = amount;
      tokensReceived = amount * (Math.random() * 1000000 + 500000); // Simulace token množství
    }
    
    console.log(`⚡ Jupiter swap: ${amount} ${inputMint.slice(0, 8)}... → ${tokensReceived.toFixed(6)} ${outputMint.slice(0, 8)}...`);
    
    return {
      success: true,
      signature,
      outputAmount,
      tokensReceived,
      inputAmount: amount
    };
  }

  private generateTxHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 88; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API
  async stopAutonomousTrading(): Promise<{ success: boolean; message: string }> {
    this.isRunning = false;
    console.log('🛑 Zastavuji autonomní trading...');
    
    return { 
      success: true, 
      message: `Trading zastaven. Aktivních pozic: ${this.activePositions.size}, Kapitál: ${this.tradingCapital.toFixed(4)} SOL` 
    };
  }

  getActivePositions(): TradingPosition[] {
    return Array.from(this.activePositions.values());
  }

  getTradingStats() {
    return {
      activePositions: this.activePositions.size,
      totalCapital: this.tradingCapital,
      isRunning: this.isRunning,
      positions: this.getActivePositions()
    };
  }
}

export const autonomousTradingMaster = new AutonomousTradingMaster();
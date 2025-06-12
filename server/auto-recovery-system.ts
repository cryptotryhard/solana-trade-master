/**
 * AUTOMATICKÝ RECOVERY SYSTÉM
 * Automaticky likviduje tokeny a obnovuje obchodování když SOL klesne pod kritickou hranici
 */

import { emergencyTokenLiquidator } from './emergency-token-liquidator';
import { ultraAggressiveTrader } from './ultra-aggressive-trader';

class AutoRecoverySystem {
  private isRecoveryActive: boolean = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private criticalSOLThreshold: number = 0.005; // 0.005 SOL = kritická hranice
  private targetSOLBalance: number = 0.1; // Cílový balance po recovery

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    console.log('🔄 Starting auto-recovery monitoring system');
    
    // Kontrola každých 30 sekund
    this.checkInterval = setInterval(() => {
      this.checkAndRecover();
    }, 30000);

    // Okamžitá první kontrola
    setTimeout(() => this.checkAndRecover(), 5000);
  }

  private async checkAndRecover(): Promise<void> {
    if (this.isRecoveryActive) {
      return; // Recovery už běží
    }

    try {
      const currentSOL = await emergencyTokenLiquidator.getSOLBalance();
      console.log(`💰 Current SOL balance: ${currentSOL.toFixed(6)}`);

      if (currentSOL < this.criticalSOLThreshold) {
        console.log('🚨 CRITICAL SOL BALANCE DETECTED - INITIATING EMERGENCY RECOVERY');
        await this.executeEmergencyRecovery();
      }
    } catch (error) {
      console.error('❌ Error in recovery check:', error);
    }
  }

  private async executeEmergencyRecovery(): Promise<void> {
    this.isRecoveryActive = true;
    
    try {
      console.log('🚨 EXECUTING EMERGENCY TOKEN LIQUIDATION');
      
      // Krok 1: Likvidace všech tokenů
      const liquidationResult = await emergencyTokenLiquidator.executeEmergencyLiquidation();
      
      if (liquidationResult.success && liquidationResult.solRecovered > 0) {
        console.log(`✅ Emergency liquidation successful: ${liquidationResult.solRecovered.toFixed(6)} SOL recovered`);
        
        // Krok 2: Zavření prázdných token účtů pro dodatečný SOL
        const closedAccounts = await emergencyTokenLiquidator.closeEmptyTokenAccounts();
        console.log(`🔧 Closed ${closedAccounts} empty token accounts`);
        
        // Krok 3: Ověření nového balance
        const newBalance = await emergencyTokenLiquidator.getSOLBalance();
        console.log(`💰 New SOL balance after recovery: ${newBalance.toFixed(6)}`);
        
        if (newBalance >= this.targetSOLBalance) {
          console.log('✅ RECOVERY SUCCESSFUL - RESUMING TRADING OPERATIONS');
          
          // Krok 4: Restart trading systému
          await this.restartTradingSystem();
        } else {
          console.log(`⚠️ Recovery incomplete - need ${this.targetSOLBalance} SOL, have ${newBalance.toFixed(6)}`);
        }
      } else {
        console.log('❌ Emergency liquidation failed or no tokens to liquidate');
      }
      
    } catch (error) {
      console.error('❌ Emergency recovery failed:', error);
    } finally {
      this.isRecoveryActive = false;
    }
  }

  private async restartTradingSystem(): Promise<void> {
    try {
      console.log('🔄 Restarting trading system after recovery');
      
      // Restart ultra aggressive trader
      ultraAggressiveTrader.stop();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pauza 2s
      ultraAggressiveTrader.start();
      
      console.log('✅ Trading system restarted successfully');
      
    } catch (error) {
      console.error('❌ Failed to restart trading system:', error);
    }
  }

  public getStatus(): any {
    return {
      isRecoveryActive: this.isRecoveryActive,
      criticalThreshold: this.criticalSOLThreshold,
      targetBalance: this.targetSOLBalance,
      monitoringActive: this.checkInterval !== null
    };
  }

  public async forceRecovery(): Promise<any> {
    console.log('🚨 FORCE RECOVERY TRIGGERED MANUALLY');
    await this.executeEmergencyRecovery();
    
    const finalBalance = await emergencyTokenLiquidator.getSOLBalance();
    return {
      success: true,
      finalBalance,
      message: `Force recovery completed, final balance: ${finalBalance.toFixed(6)} SOL`
    };
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('🔄 Auto-recovery monitoring stopped');
  }
}

export const autoRecoverySystem = new AutoRecoverySystem();
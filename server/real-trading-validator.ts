import { realBlockchainTrader } from './real-blockchain-trader';

interface ValidationResult {
  isValid: boolean;
  walletAddress: string;
  actualBalance: number;
  message: string;
}

export class RealTradingValidator {
  private targetWallet = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';

  async validateRealWalletConnection(): Promise<ValidationResult> {
    try {
      const walletAddress = realBlockchainTrader.getWalletAddress();
      const actualBalance = await realBlockchainTrader.getSOLBalance();
      
      const isValid = walletAddress === this.targetWallet;
      
      console.log(`🔍 WALLET VALIDATION:`);
      console.log(`   Expected: ${this.targetWallet}`);
      console.log(`   Actual: ${walletAddress}`);
      console.log(`   Match: ${isValid ? '✅' : '❌'}`);
      console.log(`   SOL Balance: ${actualBalance}`);
      
      return {
        isValid,
        walletAddress,
        actualBalance,
        message: isValid 
          ? `Real wallet connected: ${actualBalance} SOL available`
          : `WALLET MISMATCH! Using ${walletAddress} instead of ${this.targetWallet}`
      };
    } catch (error) {
      console.error('❌ Wallet validation failed:', error);
      return {
        isValid: false,
        walletAddress: 'ERROR',
        actualBalance: 0,
        message: `Wallet connection failed: ${error}`
      };
    }
  }

  async executeTestTransaction(): Promise<string | null> {
    try {
      console.log('🧪 EXECUTING TEST TRANSACTION TO VERIFY REAL TRADING');
      
      // Test with minimal SOL amount (0.001 SOL = ~$0.15)
      const testAmount = 0.001;
      const wifMint = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'; // WIF token
      
      console.log(`🔄 Test buy: ${testAmount} SOL → WIF`);
      const buyTxHash = await realBlockchainTrader.buyToken(wifMint, testAmount);
      
      if (buyTxHash) {
        console.log(`✅ TEST TRANSACTION SUCCESSFUL: ${buyTxHash}`);
        console.log(`🎯 This confirms real blockchain execution is working`);
        return buyTxHash;
      } else {
        console.log(`❌ TEST TRANSACTION FAILED - No real execution`);
        return null;
      }
    } catch (error) {
      console.error('❌ Test transaction failed:', error);
      return null;
    }
  }

  stopAllFakeTrading(): void {
    console.log('🛑 STOPPING ALL FAKE TRADING SYSTEMS');
    console.log('🔥 Only real blockchain transactions will be executed');
    console.log('📍 Target wallet: 9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d');
  }
}

export const realTradingValidator = new RealTradingValidator();
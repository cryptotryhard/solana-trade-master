// Transaction Verification Service
import fetch from 'node-fetch';

interface TransactionVerification {
  txHash: string;
  isReal: boolean;
  senderAddress?: string;
  recipientAddress?: string;
  amount?: number;
  token?: string;
  timestamp?: string;
  confirmations?: number;
  error?: string;
}

class TransactionVerifier {
  private solscanApiBase = 'https://public-api.solscan.io';
  
  async verifyTransaction(txHash: string): Promise<TransactionVerification> {
    try {
      console.log(`🔍 Verifying transaction: ${txHash}`);
      
      // Query Solscan API for transaction details
      const response = await fetch(`${this.solscanApiBase}/transaction/${txHash}`);
      
      if (!response.ok) {
        return {
          txHash,
          isReal: false,
          error: `Transaction not found on Solscan (Status: ${response.status})`
        };
      }
      
      const txData = await response.json();
      
      // Extract transaction details
      const verification: TransactionVerification = {
        txHash,
        isReal: true,
        senderAddress: txData.inputAccount,
        recipientAddress: txData.outputAccount,
        amount: txData.lamport / 1e9, // Convert lamports to SOL
        timestamp: new Date(txData.blockTime * 1000).toISOString(),
        confirmations: txData.confirmation || 0
      };
      
      console.log('✅ Transaction verified on blockchain');
      console.log(`   Sender: ${verification.senderAddress}`);
      console.log(`   Amount: ${verification.amount} SOL`);
      console.log(`   Confirmations: ${verification.confirmations}`);
      
      return verification;
      
    } catch (error) {
      console.error('❌ Transaction verification failed:', error);
      return {
        txHash,
        isReal: false,
        error: `Verification failed: ${error.message}`
      };
    }
  }
  
  async checkWalletBalance(walletAddress: string): Promise<{
    solBalance: number;
    tokens: any[];
    lastUpdated: string;
  }> {
    try {
      console.log(`🔍 Checking wallet balance: ${walletAddress}`);
      
      const response = await fetch(`${this.solscanApiBase}/account/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`Solscan API error: ${response.status}`);
      }
      
      const accountData = await response.json();
      
      return {
        solBalance: accountData.lamports / 1e9,
        tokens: accountData.tokenAccounts || [],
        lastUpdated: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Wallet balance check failed:', error);
      throw error;
    }
  }
  
  // Generate status report for current trading execution
  generateExecutionStatus(): {
    mode: string;
    realExecution: boolean;
    walletConnected: boolean;
    privateKeyAccess: boolean;
    jupiterIntegration: boolean;
    limitations: string[];
  } {
    return {
      mode: 'DEMONSTRATION',
      realExecution: false,
      walletConnected: true, // Read-only connection
      privateKeyAccess: false,
      jupiterIntegration: true, // Quote API only
      limitations: [
        'No private key access - cannot sign transactions',
        'Generating mock transaction hashes for demonstration',
        'Real Jupiter quotes but simulated execution',
        'Requires wallet connection with signing capability for real trades'
      ]
    };
  }
}

export const transactionVerifier = new TransactionVerifier();
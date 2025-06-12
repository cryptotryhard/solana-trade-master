/**
 * EMERGENCY TOKEN LIQUIDATOR
 * Okamžitá likvidace všech tokenů pro obnovení SOL balance
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

interface TokenPosition {
  mint: string;
  balance: number;
  estimatedSOL: number;
}

class EmergencyTokenLiquidator {
  private connection: Connection;
  private wallet: Keypair;
  private walletPubkey: PublicKey;

  constructor() {
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Použití private key z ENV
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not found in environment');
    }
    
    try {
      const privateKeyBytes = bs58.decode(privateKeyString);
      this.wallet = Keypair.fromSecretKey(privateKeyBytes);
      this.walletPubkey = this.wallet.publicKey;
      console.log(`🔑 Wallet loaded: ${this.walletPubkey.toString()}`);
    } catch (error) {
      console.error('❌ Failed to load wallet:', error);
      throw error;
    }
  }

  async getTokenAccounts(): Promise<TokenPosition[]> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const positions: TokenPosition[] = [];
      
      for (const account of tokenAccounts.value) {
        const tokenAmount = account.account.data.parsed.info.tokenAmount;
        const mint = account.account.data.parsed.info.mint;
        const balance = parseFloat(tokenAmount.amount) / Math.pow(10, tokenAmount.decimals);
        
        if (balance > 0) {
          positions.push({
            mint,
            balance,
            estimatedSOL: this.estimateSOLValue(balance, mint)
          });
        }
      }

      console.log(`💰 Found ${positions.length} token positions`);
      return positions;
    } catch (error) {
      console.error('❌ Error getting token accounts:', error);
      return [];
    }
  }

  private estimateSOLValue(balance: number, mint: string): number {
    // Odhad hodnoty na základě známých tokenů
    const knownTokens: Record<string, number> = {
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 0.006, // USDC
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 0.00004, // BONK
      'CSsZtwjMutuYPuJtrcXTBVrievmPwGFf2zCcmLKXpump': 0.000003, // Další token
    };

    const pricePerToken = knownTokens[mint] || 0.000001;
    return balance * pricePerToken;
  }

  async liquidateTokenToSOL(tokenMint: string, amount: number): Promise<boolean> {
    try {
      console.log(`🔥 Liquidating token ${tokenMint.substring(0, 8)}... (${amount} tokens)`);
      
      // Získání Jupiter quote
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${Math.floor(amount * 1000000)}&slippageBps=300`
      );
      
      if (!quoteResponse.ok) {
        console.log(`⚠️ No liquidity for token ${tokenMint.substring(0, 8)}`);
        return false;
      }

      const quoteData = await quoteResponse.json();
      
      // Získání swap transakce
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: this.walletPubkey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 100000
        })
      });

      const swapData = await swapResponse.json();
      const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
      
      // Podepsání a odeslání transakce
      transaction.sign(this.wallet);
      const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      console.log(`✅ Liquidation successful: ${signature}`);
      
      // Čekání na potvrzení
      await this.connection.confirmTransaction(signature, 'confirmed');
      return true;

    } catch (error) {
      console.error(`❌ Liquidation failed for ${tokenMint}:`, error);
      return false;
    }
  }

  async executeEmergencyLiquidation(): Promise<{ success: boolean; solRecovered: number; liquidated: number }> {
    console.log('🚨 EXECUTING EMERGENCY TOKEN LIQUIDATION');
    
    const initialSOL = await this.getSOLBalance();
    console.log(`💰 Initial SOL balance: ${initialSOL.toFixed(6)}`);
    
    const positions = await this.getTokenAccounts();
    const highValuePositions = positions
      .filter(p => p.estimatedSOL > 0.001)
      .sort((a, b) => b.estimatedSOL - a.estimatedSOL);

    let liquidated = 0;
    
    for (const position of highValuePositions) {
      console.log(`🎯 Liquidating: ${position.mint.substring(0, 8)} (${position.balance.toFixed(2)} tokens, ~${position.estimatedSOL.toFixed(4)} SOL)`);
      
      const success = await this.liquidateTokenToSOL(position.mint, position.balance);
      if (success) {
        liquidated++;
        // Pauza mezi liquidacemi
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const finalSOL = await this.getSOLBalance();
    const solRecovered = finalSOL - initialSOL;
    
    console.log(`📊 LIQUIDATION COMPLETE:`);
    console.log(`   Liquidated positions: ${liquidated}/${highValuePositions.length}`);
    console.log(`   SOL recovered: ${solRecovered.toFixed(6)}`);
    console.log(`   Final SOL balance: ${finalSOL.toFixed(6)}`);

    return {
      success: liquidated > 0,
      solRecovered,
      liquidated
    };
  }

  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.walletPubkey);
      return balance / 1e9;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      return 0;
    }
  }

  async closeEmptyTokenAccounts(): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      let closed = 0;
      const transaction = new Transaction();

      for (const account of tokenAccounts.value) {
        const tokenAmount = account.account.data.parsed.info.tokenAmount;
        const balance = parseFloat(tokenAmount.amount);
        
        if (balance === 0) {
          const closeInstruction = createCloseAccountInstruction(
            account.pubkey,
            this.walletPubkey,
            this.walletPubkey
          );
          transaction.add(closeInstruction);
          closed++;
        }
      }

      if (closed > 0) {
        const signature = await this.connection.sendTransaction(transaction, [this.wallet]);
        console.log(`✅ Closed ${closed} empty token accounts: ${signature}`);
        
        // Čekání na potvrzení pro recovery SOL z rent
        await this.connection.confirmTransaction(signature, 'confirmed');
      }

      return closed;
    } catch (error) {
      console.error('❌ Error closing token accounts:', error);
      return 0;
    }
  }
}

export const emergencyTokenLiquidator = new EmergencyTokenLiquidator();
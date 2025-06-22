import dotenv from 'dotenv';
dotenv.config();

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
} from '@solana/web3.js';

import {
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import bs58 from 'bs58';
import fs from 'fs';

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
    this.connection = new Connection(
      process.env.QUICKNODE_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    const privateKeyString = process.env.WALLET_PRIVATE_KEY?.trim();
    if (!privateKeyString || privateKeyString.length < 64) {
      console.error('❌ WALLET_PRIVATE_KEY not found or invalid');
      throw new Error('WALLET_PRIVATE_KEY not found or invalid');
    }

    try {
      const privateKeyBytes = bs58.decode(privateKeyString);
      this.wallet = Keypair.fromSecretKey(privateKeyBytes);
      this.walletPubkey = this.wallet.publicKey;
      console.log(`🔑 Wallet loaded: ${this.walletPubkey.toBase58()}`);
    } catch (err) {
      console.error('❌ Failed to decode wallet private key:', err);
      throw err;
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
        const balance =
          parseFloat(tokenAmount.amount) /
          Math.pow(10, tokenAmount.decimals);

        if (balance > 0) {
          positions.push({
            mint,
            balance,
            estimatedSOL: this.estimateSOLValue(balance, mint),
          });
        }
      }

      console.log(`💰 Found ${positions.length} token positions`);
      return positions;
    } catch (e) {
      console.error('❌ Error getting token accounts:', e);
      return [];
    }
  }

  private estimateSOLValue(balance: number, mint: string): number {
    const knownTokens: Record<string, number> = {
      EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 0.006,
      DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: 0.00004,
      CSsZtwjMutuYPuJtrcXTBVrievmPwGFf2zCcmLKXpump: 0.000003,
    };

    const pricePerToken = knownTokens[mint] || 0.000001;
    return balance * pricePerToken;
  }

  async liquidateTokenToSOL(tokenMint: string, amount: number): Promise<boolean> {
    const trySwap = async (): Promise<boolean> => {
      try {
        console.log(`🔥 Liquidating ${tokenMint.substring(0, 8)}... (${amount})`);
        const quoteResponse = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${Math.floor(
            amount * 1e6
          )}&slippageBps=300`
        );

        if (!quoteResponse.ok) {
          throw new Error('No quote available');
        }

        const quoteData = await quoteResponse.json();

        const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quoteResponse: quoteData,
            userPublicKey: this.walletPubkey.toBase58(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            prioritizationFeeLamports: 100000,
          }),
        });

        const swapData = await swapResponse.json();

        const transaction = Transaction.from(
          Buffer.from(swapData.swapTransaction, 'base64')
        );
        transaction.sign(this.wallet);

        const signature = await this.connection.sendRawTransaction(
          transaction.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        console.log(`✅ Liquidation tx sent: ${signature}`);
        await this.connection.confirmTransaction(signature, 'confirmed');
        return true;
      } catch (e) {
        return false;
      }
    };

    const success = await trySwap();
    if (!success) {
      console.warn(`⚠️ First swap attempt failed for ${tokenMint}, retrying in 3s...`);
      await new Promise((r) => setTimeout(r, 3000));
      const retrySuccess = await trySwap();

      if (!retrySuccess) {
        this.logFailedToken(tokenMint, amount, 'swap failed');
        console.error(`❌ Swap failed for ${tokenMint}`);
        return false;
      }
    }

    return true;
  }

  logFailedToken(mint: string, amount: number, reason: string) {
    const failLog = {
      mint,
      amount,
      reason,
      timestamp: new Date().toISOString(),
    };

    const path = './failed-liquidations.json';
    const existing = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, 'utf-8')) : [];
    existing.push(failLog);
    fs.writeFileSync(path, JSON.stringify(existing, null, 2));
    console.log(`📝 Logged failed token: ${mint}`);
  }

  async executeEmergencyLiquidation(): Promise<{
    success: boolean;
    solRecovered: number;
    liquidated: number;
  }> {
    console.log('🚨 Starting emergency liquidation');

    const initial = await this.getSOLBalance();
    const positions = await this.getTokenAccounts();
    const targets = positions
      .filter((p) => p.estimatedSOL > 0.001)
      .sort((a, b) => b.estimatedSOL - a.estimatedSOL);

    let liquidated = 0;

    for (const pos of targets) {
      const ok = await this.liquidateTokenToSOL(pos.mint, pos.balance);
      if (ok) {
        liquidated++;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const final = await this.getSOLBalance();
    const recovered = final - initial;

    console.log(`📊 Liquidated ${liquidated} positions`);
    console.log(`💸 SOL recovered: ${recovered.toFixed(5)}`);

    return {
      success: liquidated > 0,
      solRecovered: recovered,
      liquidated,
    };
  }

  async getSOLBalance(): Promise<number> {
    try {
      const lamports = await this.connection.getBalance(this.walletPubkey);
      return lamports / 1e9;
    } catch (e) {
      console.error('Error getting SOL balance:', e);
      return 0;
    }
  }

  async closeEmptyTokenAccounts(): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.walletPubkey,
        { programId: TOKEN_PROGRAM_ID }
      );

      const transaction = new Transaction();
      let closed = 0;

      for (const acc of tokenAccounts.value) {
        const amount = parseFloat(acc.account.data.parsed.info.tokenAmount.amount);
        if (amount === 0) {
          const ix = createCloseAccountInstruction(
            acc.pubkey,
            this.walletPubkey,
            this.walletPubkey
          );
          transaction.add(ix);
          closed++;
        }
      }

      if (closed > 0) {
        const sig = await this.connection.sendTransaction(transaction, [this.wallet]);
        console.log(`✅ Closed ${closed} empty token accounts: ${sig}`);
        await this.connection.confirmTransaction(sig, 'confirmed');
      }

      return closed;
    } catch (e) {
      console.error('❌ Failed closing accounts:', e);
      return 0;
    }
  }
}

export const emergencyTokenLiquidator = new EmergencyTokenLiquidator();

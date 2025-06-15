/**
 * GET REAL TOKEN BALANCES
 * Fetch actual token account balances from Phantom wallet
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';

class RealBalanceChecker {
  constructor() {
    this.wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
    this.walletAddress = this.wallet.publicKey.toString();
    
    this.connections = [
      new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed'),
      new Connection(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, 'confirmed')
    ];
    
    console.log(`💼 Checking real balances for: ${this.walletAddress}`);
  }

  async getRealTokenBalances() {
    console.log('\n🔍 FETCHING REAL TOKEN ACCOUNT BALANCES');
    
    const connection = this.connections[0];
    
    try {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        this.wallet.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      console.log(`📊 Found ${tokenAccounts.value.length} token accounts`);
      
      const targetTokens = {
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
        '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'SAMO',
        '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT'
      };
      
      const realBalances = [];
      
      for (const account of tokenAccounts.value) {
        const mint = account.account.data.parsed.info.mint;
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        const decimals = account.account.data.parsed.info.tokenAmount.decimals;
        
        if (targetTokens[mint] && balance > 0) {
          const symbol = targetTokens[mint];
          
          console.log(`\n✅ ${symbol} (${mint}):`);
          console.log(`   Balance: ${balance} tokens`);
          console.log(`   Decimals: ${decimals}`);
          console.log(`   Raw amount: ${account.account.data.parsed.info.tokenAmount.amount}`);
          
          realBalances.push({
            mint,
            symbol,
            balance,
            decimals,
            rawAmount: account.account.data.parsed.info.tokenAmount.amount
          });
        }
      }
      
      // Check SOL balance
      const solBalance = await connection.getBalance(this.wallet.publicKey);
      console.log(`\n💰 SOL Balance: ${solBalance / 1e9} SOL`);
      
      console.log(`\n📋 LIQUIDATION TARGETS:`);
      console.log(`   Tokens with balance: ${realBalances.length}`);
      console.log(`   SOL available: ${solBalance / 1e9}`);
      
      return realBalances;
      
    } catch (error) {
      console.error('❌ Error fetching token balances:', error.message);
      return [];
    }
  }
}

async function main() {
  try {
    const checker = new RealBalanceChecker();
    await checker.getRealTokenBalances();
  } catch (error) {
    console.error('❌ Balance check failed:', error.message);
  }
}

main();
/**
 * EMERGENCY BONK EXIT SCRIPT
 * Force liquidation of BONK position back to SOL for active trading
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';

async function emergencyBonkExit() {
  console.log('🚨 EMERGENCY BONK EXIT INITIATED');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_PRIVATE_KEY));
  
  console.log(`💰 Wallet: ${wallet.publicKey.toString()}`);
  
  // BONK token mint
  const BONK_MINT = new PublicKey('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
  
  try {
    // Get BONK token account
    const bonkTokenAccount = await getAssociatedTokenAddress(BONK_MINT, wallet.publicKey);
    
    console.log('🔍 Checking BONK balance...');
    const accountInfo = await getAccount(connection, bonkTokenAccount);
    const bonkBalance = accountInfo.amount;
    
    console.log(`💎 BONK Balance: ${bonkBalance.toString()} (${Number(bonkBalance) / 1e5} BONK)`);
    
    if (bonkBalance > 0) {
      console.log('🔄 EXECUTING JUPITER SWAP: BONK → SOL');
      
      // Get Jupiter quote for BONK → SOL
      const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${BONK_MINT.toString()}&outputMint=So11111111111111111111111111111111111111112&amount=${bonkBalance.toString()}&slippageBps=500`);
      
      if (!quoteResponse.ok) {
        throw new Error(`Jupiter quote failed: ${quoteResponse.statusText}`);
      }
      
      const quote = await quoteResponse.json();
      console.log(`📊 Quote: ${bonkBalance.toString()} BONK → ${quote.outAmount} SOL`);
      console.log(`💰 Expected SOL output: ${Number(quote.outAmount) / 1e9} SOL`);
      
      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        }),
      });
      
      if (!swapResponse.ok) {
        throw new Error(`Jupiter swap failed: ${swapResponse.statusText}`);
      }
      
      const { swapTransaction } = await swapResponse.json();
      
      // Execute the swap
      const transaction = Buffer.from(swapTransaction, 'base64');
      const signature = await connection.sendRawTransaction(transaction, {
        skipPreflight: false,
        maxRetries: 3
      });
      
      console.log(`🚀 BONK EXIT TRANSACTION SENT: ${signature}`);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      console.log('✅ BONK SUCCESSFULLY LIQUIDATED TO SOL');
      
      // Check new SOL balance
      const newSolBalance = await connection.getBalance(wallet.publicKey);
      console.log(`💰 New SOL balance: ${newSolBalance / 1e9} SOL`);
      
      return {
        success: true,
        solRecovered: newSolBalance / 1e9,
        txHash: signature
      };
      
    } else {
      console.log('❌ No BONK tokens found to liquidate');
      return { success: false, reason: 'No BONK balance' };
    }
    
  } catch (error) {
    console.error('❌ Emergency BONK exit failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  emergencyBonkExit()
    .then(result => {
      console.log('🏁 Emergency BONK exit result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}

export { emergencyBonkExit };
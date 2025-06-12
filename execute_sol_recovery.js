import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { createCloseAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

async function executeSOLRecovery() {
  console.log('🚨 EXECUTING SOL RECOVERY - CLOSING ALL TOKEN ACCOUNTS');
  
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not found');
    }
    
    const privateKeyBytes = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);
    
    // Get initial SOL balance
    const initialBalance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Initial SOL: ${(initialBalance / 1e9).toFixed(6)}`);
    
    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`💎 Found ${tokenAccounts.value.length} token accounts to close`);
    
    let totalClosed = 0;
    let batchCount = 0;
    
    // Process accounts in batches of 3 to avoid transaction size limits
    const batchSize = 3;
    for (let i = 0; i < tokenAccounts.value.length; i += batchSize) {
      const batch = tokenAccounts.value.slice(i, i + batchSize);
      batchCount++;
      
      console.log(`🔧 Processing batch ${batchCount} (${batch.length} accounts)`);
      
      const transaction = new Transaction();
      let accountsInTx = 0;

      for (const account of batch) {
        try {
          const tokenInfo = account.account.data.parsed.info;
          const balance = parseFloat(tokenInfo.tokenAmount.amount);
          
          // Only close accounts with exactly 0 balance
          if (balance === 0) { // Only zero balance accounts
            const closeInstruction = createCloseAccountInstruction(
              account.pubkey,
              wallet.publicKey,
              wallet.publicKey
            );
            transaction.add(closeInstruction);
            accountsInTx++;
            console.log(`   📦 Adding account ${account.pubkey.toString().substring(0, 8)}... to close`);
          } else {
            console.log(`   ⚠️ Skipping ${account.pubkey.toString().substring(0, 8)}... (has balance: ${balance})`);
          }
        } catch (error) {
          console.log(`   ❌ Cannot process account ${account.pubkey.toString().substring(0, 8)}...: ${error.message}`);
        }
      }

      if (accountsInTx > 0) {
        try {
          // Add priority fee to ensure transaction goes through
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = wallet.publicKey;
          
          const signature = await connection.sendTransaction(transaction, [wallet], {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
            maxRetries: 3
          });
          
          console.log(`   ✅ Submitted batch ${batchCount}: ${signature}`);
          
          // Wait for confirmation
          const confirmation = await connection.confirmTransaction(signature, 'confirmed');
          if (confirmation.value.err) {
            console.log(`   ❌ Batch ${batchCount} failed: ${confirmation.value.err}`);
          } else {
            console.log(`   ✅ Batch ${batchCount} confirmed`);
            totalClosed += accountsInTx;
          }
          
          // Delay between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`   ❌ Batch ${batchCount} transaction failed: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ No accounts to close in batch ${batchCount}`);
      }
    }

    // Check final balance
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for blockchain updates
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const recovered = (finalBalance - initialBalance) / 1e9;
    
    console.log(`📊 SOL RECOVERY COMPLETE:`);
    console.log(`   Closed accounts: ${totalClosed}`);
    console.log(`   SOL recovered: ${recovered.toFixed(6)}`);
    console.log(`   Final balance: ${(finalBalance / 1e9).toFixed(6)}`);
    console.log(`   Each account recovered ~0.00203928 SOL in rent`);
    
    return {
      success: totalClosed > 0,
      accountsClosed: totalClosed,
      solRecovered: recovered,
      finalBalance: finalBalance / 1e9
    };
    
  } catch (error) {
    console.error('❌ SOL recovery failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute immediately
executeSOLRecovery().then(result => {
  console.log('📋 Final Result:', result);
  if (result.success) {
    console.log('🎉 SOL RECOVERY SUCCESSFUL - TRADING CAN RESUME');
  } else {
    console.log('💔 SOL RECOVERY FAILED - MANUAL INTERVENTION NEEDED');
  }
  process.exit(result.success ? 0 : 1);
});

export { executeSOLRecovery };
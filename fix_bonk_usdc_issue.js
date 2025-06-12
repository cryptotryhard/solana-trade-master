import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

async function fixBonkUsdcIssue() {
  console.log('🔧 FIXING BONK & USDC ISSUE - CONVERTING BACK TO SOL');
  
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
    
    // Get all token accounts to find BONK and USDC
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`💎 Found ${tokenAccounts.value.length} token accounts`);
    
    let bonkFound = false;
    let usdcFound = false;
    let totalSwapped = 0;
    
    // Known mint addresses
    const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    for (const account of tokenAccounts.value) {
      try {
        const tokenInfo = account.account.data.parsed.info;
        const mint = tokenInfo.mint;
        const balance = parseFloat(tokenInfo.tokenAmount.amount);
        const decimals = tokenInfo.tokenAmount.decimals;
        const actualBalance = balance / Math.pow(10, decimals);
        
        if (balance > 0) {
          console.log(`📊 Token: ${mint.substring(0, 8)}... Balance: ${actualBalance.toFixed(6)}`);
          
          // Check if this is BONK or USDC
          if (mint === BONK_MINT) {
            bonkFound = true;
            console.log(`🎯 FOUND BONK: ${actualBalance.toFixed(0)} tokens`);
            
            // Swap BONK to SOL via Jupiter
            const swapResult = await swapTokenToSOL(mint, Math.floor(balance), decimals, wallet, connection);
            if (swapResult.success) {
              totalSwapped += swapResult.solReceived;
              console.log(`✅ BONK → SOL: ${swapResult.solReceived.toFixed(6)} SOL`);
            }
          }
          
          if (mint === USDC_MINT) {
            usdcFound = true;
            console.log(`🎯 FOUND USDC: ${actualBalance.toFixed(2)} tokens`);
            
            // Swap USDC to SOL via Jupiter
            const swapResult = await swapTokenToSOL(mint, Math.floor(balance), decimals, wallet, connection);
            if (swapResult.success) {
              totalSwapped += swapResult.solReceived;
              console.log(`✅ USDC → SOL: ${swapResult.solReceived.toFixed(6)} SOL`);
            }
          }
        }
      } catch (error) {
        console.log(`⚠️ Error processing account: ${error.message}`);
      }
    }
    
    // Check final balance
    await new Promise(resolve => setTimeout(resolve, 3000));
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const finalSOL = finalBalance / 1e9;
    
    console.log(`📊 BONK & USDC FIX COMPLETE:`);
    console.log(`   BONK found: ${bonkFound ? 'YES' : 'NO'}`);
    console.log(`   USDC found: ${usdcFound ? 'YES' : 'NO'}`);
    console.log(`   Total SOL recovered: ${totalSwapped.toFixed(6)}`);
    console.log(`   Final SOL balance: ${finalSOL.toFixed(6)}`);
    
    if (finalSOL >= 0.01) {
      console.log('🚀 SUFFICIENT SOL - TRADING CAN RESUME PROPERLY');
    } else {
      console.log('⚠️ Still need more SOL for optimal trading');
    }
    
    return {
      success: true,
      bonkFound,
      usdcFound,
      solRecovered: totalSwapped,
      finalBalance: finalSOL
    };
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    return { success: false, error: error.message };
  }
}

async function swapTokenToSOL(tokenMint, amount, decimals, wallet, connection) {
  try {
    console.log(`🔄 Swapping ${tokenMint.substring(0, 8)}... to SOL`);
    
    // Get Jupiter quote
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${tokenMint}&outputMint=So11111111111111111111111111111111111111112&amount=${amount}&slippageBps=1000`;
    
    const quoteResponse = await fetch(quoteUrl);
    
    if (!quoteResponse.ok) {
      console.log(`⚠️ No liquidity for ${tokenMint.substring(0, 8)}...`);
      return { success: false, solReceived: 0 };
    }
    
    const quoteData = await quoteResponse.json();
    const expectedSol = parseInt(quoteData.outAmount) / 1e9;
    
    console.log(`💰 Expected SOL output: ${expectedSol.toFixed(6)}`);
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 100000
      })
    });
    
    if (!swapResponse.ok) {
      console.log(`❌ Failed to get swap transaction for ${tokenMint.substring(0, 8)}...`);
      return { success: false, solReceived: 0 };
    }
    
    const swapData = await swapResponse.json();
    const { Transaction } = await import('@solana/web3.js');
    const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
    
    // Sign and send
    transaction.sign(wallet);
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    console.log(`🔗 Transaction: ${signature}`);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    return { success: true, solReceived: expectedSol, signature };
    
  } catch (error) {
    console.error(`❌ Swap failed for ${tokenMint.substring(0, 8)}...:`, error.message);
    return { success: false, solReceived: 0 };
  }
}

// Execute immediately
fixBonkUsdcIssue().then(result => {
  console.log('📋 Final Result:', result);
  if (result.success) {
    console.log('🎉 BONK & USDC CONVERTED TO SOL - BOT CAN RESUME PROPER TRADING');
  } else {
    console.log('💔 FIX FAILED - MANUAL INTERVENTION NEEDED');
  }
  process.exit(result.success ? 0 : 1);
});

export { fixBonkUsdcIssue };
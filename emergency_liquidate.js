import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';

// NOUZOVÁ LIKVIDACE VŠECH TOKENŮ
async function emergencyLiquidate() {
  console.log('🚨 EMERGENCY LIQUIDATION STARTING...');
  
  try {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Load wallet from ENV
    const privateKeyString = process.env.WALLET_PRIVATE_KEY;
    if (!privateKeyString) {
      throw new Error('WALLET_PRIVATE_KEY not found');
    }
    
    const privateKeyBytes = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    console.log(`🔑 Wallet: ${wallet.publicKey.toString()}`);
    
    // Get current SOL balance
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Current SOL: ${(solBalance / 1e9).toFixed(6)}`);
    
    // Get all token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      wallet.publicKey,
      { programId: TOKEN_PROGRAM_ID }
    );
    
    console.log(`💎 Found ${tokenAccounts.value.length} token accounts`);
    
    let totalRecovered = 0;
    let successCount = 0;
    
    for (const account of tokenAccounts.value) {
      const tokenInfo = account.account.data.parsed.info;
      const mint = tokenInfo.mint;
      const balance = parseFloat(tokenInfo.tokenAmount.amount) / Math.pow(10, tokenInfo.tokenAmount.decimals);
      
      if (balance > 0) {
        console.log(`🔥 Liquidating ${mint.substring(0, 8)}... (${balance.toFixed(2)} tokens)`);
        
        try {
          // Get Jupiter quote
          const quoteResponse = await fetch(
            `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=So11111111111111111111111111111111111111112&amount=${Math.floor(balance * 1000000)}&slippageBps=500`
          );
          
          if (quoteResponse.ok) {
            const quoteData = await quoteResponse.json();
            
            // Get swap transaction
            const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                quoteResponse: quoteData,
                userPublicKey: wallet.publicKey.toString(),
                wrapAndUnwrapSol: true,
                dynamicComputeUnitLimit: true,
                prioritizationFeeLamports: 200000
              })
            });
            
            const swapData = await swapResponse.json();
            const transaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
            
            // Sign and send
            transaction.sign(wallet);
            const signature = await connection.sendRawTransaction(transaction.serialize(), {
              skipPreflight: false,
              preflightCommitment: 'confirmed'
            });
            
            console.log(`✅ Liquidated: ${signature}`);
            successCount++;
            
            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed');
            
            // Small delay between swaps
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            console.log(`⚠️ No liquidity for ${mint.substring(0, 8)}`);
          }
        } catch (error) {
          console.error(`❌ Failed to liquidate ${mint.substring(0, 8)}:`, error.message);
        }
      }
    }
    
    // Check final SOL balance
    const finalBalance = await connection.getBalance(wallet.publicKey);
    const recovered = (finalBalance - solBalance) / 1e9;
    
    console.log(`📊 LIQUIDATION COMPLETE:`);
    console.log(`   Successfully liquidated: ${successCount} tokens`);
    console.log(`   SOL recovered: ${recovered.toFixed(6)}`);
    console.log(`   Final SOL balance: ${(finalBalance / 1e9).toFixed(6)}`);
    
    return {
      success: true,
      liquidated: successCount,
      solRecovered: recovered,
      finalBalance: finalBalance / 1e9
    };
    
  } catch (error) {
    console.error('❌ Emergency liquidation failed:', error);
    return { success: false, error: error.message };
  }
}

// Execute immediately
emergencyLiquidate().then(result => {
  console.log('Result:', result);
  process.exit(result.success ? 0 : 1);
});

export { emergencyLiquidate };
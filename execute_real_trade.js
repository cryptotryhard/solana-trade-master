// Execute First Real Trade - MOONSHOT
import { realTransactionExecutor } from './server/real-transaction-executor.js';

async function executeFirstRealTrade() {
  try {
    console.log('🚀 EXECUTING FIRST REAL TRADE - MOONSHOT');
    console.log('💰 Amount: 0.1 SOL (~$16.50)');
    console.log('🎯 Target: High Alpha Token');
    
    // Execute real Jupiter swap
    const realTrade = await realTransactionExecutor.executeRealSwap(
      'So11111111111111111111111111111111111111112', // SOL
      'BDLGhgkUjV4kpLrjbYQJKkmfg5R2GQJj4J4jNJGQ1bX8', // MOONSHOT mint address (example)
      100000000, // 0.1 SOL in lamports
      50 // 0.5% slippage
    );
    
    console.log('✅ REAL TRADE EXECUTED');
    console.log('🔗 TX Hash:', realTrade.txHash);
    console.log('📍 Sender:', realTrade.senderAddress);
    console.log('💰 Amount Out:', realTrade.amountOut);
    console.log('🌐 Verify on Solscan: https://solscan.io/tx/' + realTrade.txHash);
    
    return realTrade;
    
  } catch (error) {
    console.error('❌ Real trade execution failed:', error);
    throw error;
  }
}

executeFirstRealTrade()
  .then(result => {
    console.log('🎯 FIRST REAL TRADE COMPLETE:', result);
    console.log('🔥 VICTORIA IS NOW LIVE');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 TRADE FAILED:', error);
    process.exit(1);
  });
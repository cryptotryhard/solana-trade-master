/**
 * EXECUTE BONK LIQUIDATION - DIRECT SERVER EXECUTION
 * Bypass rate limits and execute liquidation directly
 */

async function executeBonkLiquidation() {
  console.log('⚡ EXECUTING DIRECT BONK LIQUIDATION');
  
  try {
    // Import the enhanced BONK liquidation engine
    const { bonkLiquidationEngine } = await import('./server/bonk-liquidation-engine.ts');
    
    console.log('🔍 Checking BONK status...');
    const status = await bonkLiquidationEngine.getStatus();
    
    console.log('📊 BONK Status:');
    console.log(`   Wallet Connected: ${status.walletConnected}`);
    console.log(`   BONK Balance: ${status.bonkBalance?.toLocaleString() || 0} tokens`);
    console.log(`   Estimated SOL: ${status.estimatedSOL?.toFixed(4) || 0} SOL`);
    console.log(`   Ready for Liquidation: ${status.readyForLiquidation}`);
    
    if (status.readyForLiquidation) {
      console.log('🚀 Executing BONK liquidation...');
      const result = await bonkLiquidationEngine.executeBonkLiquidation();
      
      if (result.success) {
        console.log('✅ BONK LIQUIDATION SUCCESSFUL!');
        console.log(`💰 SOL Received: ${result.solReceived} SOL`);
        console.log(`🔗 Transaction: ${result.signature}`);
        
        // Activate autonomous trading
        console.log('🤖 Activating autonomous trading with liquidated capital...');
        
        const activationResponse = await fetch('http://localhost:5000/api/autonomous/activate-with-capital', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            capital: result.solReceived,
            source: 'BONK_LIQUIDATION',
            forceActivation: true
          })
        });
        
        if (activationResponse.ok) {
          console.log('✅ VICTORIA activated with liquidated BONK capital');
          console.log('🎯 Autonomous trading now operational with real capital');
        }
        
      } else {
        console.log(`❌ BONK liquidation failed: ${result.error}`);
      }
    } else {
      console.log('⚠️ BONK liquidation not ready - insufficient balance or wallet issues');
    }
    
  } catch (error) {
    console.error('❌ Direct liquidation error:', error.message);
  }
}

executeBonkLiquidation().catch(console.error);
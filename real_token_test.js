/**
 * REAL TOKEN TEST - 0.03 SOL obchod s reálným tokenem
 * Použije skutečný token z pump.fun přes Jupiter API
 */

async function executeRealTokenTest() {
  try {
    console.log('🔍 Testuje reálný token s Jupiter API...');
    
    // Použijeme BONK token - známý memecoin s vhodným market cap
    const realToken = {
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK token
      symbol: 'BONK',
      marketCap: 35000,
      price: 0.000015
    };

    console.log(`🎯 Testovací token: ${realToken.symbol}`);
    console.log(`💰 Market Cap: $${realToken.marketCap.toLocaleString()}`);
    console.log(`💲 Cena: $${realToken.price}`);
    
    // Ověř existenci tokenu na blockchain
    const connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com'
    );
    
    try {
      const tokenInfo = await connection.getAccountInfo(new PublicKey(realToken.mint));
      if (tokenInfo) {
        console.log('✅ Token existuje na blockchain');
      } else {
        console.log('❌ Token nenalezen na blockchain');
        return;
      }
    } catch (error) {
      console.log('⚠️ Chyba při ověřování tokenu, pokračuji s testem...');
    }

    // Proveď reálný obchod přes API
    console.log('\n🧪 Provádím reálný test obchod za 0.03 SOL...');
    
    const response = await fetch('http://localhost:5000/api/streamlined/real-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tokenMint: realToken.mint,
        solAmount: 0.03,
        marketCap: realToken.marketCap,
        symbol: realToken.symbol
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ REÁLNÝ OBCHOD ÚSPĚŠNĚ PROVEDEN!');
      console.log(`🔗 TX Hash: ${result.txHash}`);
      console.log(`💰 Vstup: ${result.entryAmount} SOL`);
      console.log(`🪙 Tokeny získané: ${result.tokensReceived}`);
      console.log(`📊 Cena vstupu: $${result.entryPrice}`);
      
      // Monitoruj pozici
      console.log('\n📈 Monitoruji reálnou pozici...');
      await monitorRealPosition(result.positionId);
    } else {
      console.error('❌ Reálný obchod selhal:', result.error);
    }

  } catch (error) {
    console.error('❌ Chyba při provádění reálného testu:', error.message);
  }
}

async function monitorRealPosition(positionId) {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`http://localhost:5000/api/streamlined/position/${positionId}`);
      const position = await response.json();
      
      if (position.status !== 'ACTIVE') {
        console.log(`🎯 Pozice uzavřena! Status: ${position.status}`);
        console.log(`💰 P&L: ${position.profitLoss?.toFixed(4)} SOL`);
        console.log(`📊 Důvod: ${position.exitReason}`);
        break;
      }
      
      console.log(`📊 Pozice aktivní - Aktuální cena: $${position.currentPrice?.toFixed(6)}`);
      console.log(`💹 P&L: ${((position.currentPrice - position.entryPrice) / position.entryPrice * 100).toFixed(1)}%`);
      
      await delay(5000); // Čekej 5 sekund
      attempts++;
    } catch (error) {
      console.error('❌ Chyba při monitorování:', error.message);
      break;
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Spusť test
executeRealTokenTest();
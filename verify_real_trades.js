/**
 * VERIFY REAL TRADES - BLOCKCHAIN PROOF
 * Query actual Solana blockchain for wallet transactions
 */

import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com');
const walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';

async function verifyRealTrades() {
    try {
        console.log('VERIFYING REAL BLOCKCHAIN TRADES');
        console.log(`Wallet: ${walletAddress}`);
        console.log('='.repeat(80));

        // Get recent transactions
        const signatures = await connection.getSignaturesForAddress(
            new PublicKey(walletAddress),
            { limit: 20 }
        );

        console.log(`Found ${signatures.length} recent transactions:`);
        
        for (let i = 0; i < Math.min(signatures.length, 10); i++) {
            const sig = signatures[i];
            console.log(`${i + 1}. TX: ${sig.signature}`);
            console.log(`   Block: ${sig.slot}`);
            console.log(`   Time: ${new Date(sig.blockTime * 1000).toISOString()}`);
            console.log(`   Status: ${sig.confirmationStatus}`);
            console.log(`   Error: ${sig.err || 'None'}`);
            console.log(`   Solscan: https://solscan.io/tx/${sig.signature}`);
            console.log('');
        }

        // Get current SOL balance
        const balance = await connection.getBalance(new PublicKey(walletAddress));
        console.log(`Current SOL balance: ${balance / 1e9} SOL`);

        // Get token accounts
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(walletAddress),
            { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
        );

        console.log(`\nToken holdings: ${tokenAccounts.value.length} tokens`);
        for (const account of tokenAccounts.value.slice(0, 5)) {
            const info = account.account.data.parsed.info;
            if (info.tokenAmount.uiAmount > 0) {
                console.log(`- ${info.mint}: ${info.tokenAmount.uiAmount} tokens`);
            }
        }

        return {
            recentTransactions: signatures.slice(0, 10),
            solBalance: balance / 1e9,
            tokenCount: tokenAccounts.value.length
        };

    } catch (error) {
        console.error('Error verifying trades:', error);
        return null;
    }
}

// Execute verification
verifyRealTrades().then(result => {
    if (result) {
        console.log('\n✅ BLOCKCHAIN VERIFICATION COMPLETE');
        console.log(`Recent TXs: ${result.recentTransactions.length}`);
        console.log(`SOL Balance: ${result.solBalance}`);
        console.log(`Token Holdings: ${result.tokenCount}`);
    } else {
        console.log('❌ VERIFICATION FAILED');
    }
}).catch(console.error);
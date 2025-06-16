/**
 * ANALYZE SPECIFIC TRADE - BLOCKCHAIN PROOF
 * Get detailed transaction data for verification
 */

import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection(process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com');

async function analyzeTransaction(signature) {
    try {
        console.log(`Analyzing transaction: ${signature}`);
        console.log(`Solscan: https://solscan.io/tx/${signature}`);
        console.log('='.repeat(80));

        const transaction = await connection.getParsedTransaction(signature, {
            maxSupportedTransactionVersion: 0
        });

        if (!transaction) {
            console.log('❌ Transaction not found');
            return null;
        }

        console.log(`Block: ${transaction.slot}`);
        console.log(`Time: ${new Date(transaction.blockTime * 1000).toISOString()}`);
        console.log(`Fee: ${transaction.meta.fee / 1e9} SOL`);
        console.log(`Status: ${transaction.meta.err ? 'Failed' : 'Success'}`);

        // Analyze token transfers
        const preTokenBalances = transaction.meta.preTokenBalances || [];
        const postTokenBalances = transaction.meta.postTokenBalances || [];

        console.log('\nToken Balance Changes:');
        
        // Find balance changes
        const balanceChanges = new Map();
        
        // Process pre-balances
        preTokenBalances.forEach(balance => {
            const key = `${balance.owner}-${balance.mint}`;
            balanceChanges.set(key, {
                mint: balance.mint,
                owner: balance.owner,
                preAmount: balance.uiTokenAmount.uiAmount,
                postAmount: 0
            });
        });

        // Process post-balances
        postTokenBalances.forEach(balance => {
            const key = `${balance.owner}-${balance.mint}`;
            const existing = balanceChanges.get(key) || {
                mint: balance.mint,
                owner: balance.owner,
                preAmount: 0,
                postAmount: 0
            };
            existing.postAmount = balance.uiTokenAmount.uiAmount;
            balanceChanges.set(key, existing);
        });

        // Show changes for our wallet
        const walletAddress = '9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d';
        
        balanceChanges.forEach((change, key) => {
            if (change.owner === walletAddress) {
                const diff = change.postAmount - change.preAmount;
                if (Math.abs(diff) > 0.001) {
                    console.log(`Token: ${change.mint}`);
                    console.log(`  Before: ${change.preAmount}`);
                    console.log(`  After: ${change.postAmount}`);
                    console.log(`  Change: ${diff > 0 ? '+' : ''}${diff}`);
                }
            }
        });

        // Analyze SOL balance changes
        const preBalance = transaction.meta.preBalances[0] / 1e9;
        const postBalance = transaction.meta.postBalances[0] / 1e9;
        const solChange = postBalance - preBalance;

        console.log(`\nSOL Balance Change:`);
        console.log(`  Before: ${preBalance} SOL`);
        console.log(`  After: ${postBalance} SOL`);
        console.log(`  Change: ${solChange > 0 ? '+' : ''}${solChange} SOL`);

        return {
            signature,
            blockTime: transaction.blockTime,
            solChange,
            tokenChanges: Array.from(balanceChanges.values()).filter(c => c.owner === walletAddress)
        };

    } catch (error) {
        console.error('Error analyzing transaction:', error.message);
        return null;
    }
}

// Analyze the most recent transaction
const recentTx = '67PALfuCesdAc2JQdcSPqEWp8dVrgq6zYpi7NHy7pcQVGP5siXuQ55K6r7RkSLejDHHuoXyu4s9ke7vocKNwBQ8d';

analyzeTransaction(recentTx).then(result => {
    if (result) {
        console.log('\n✅ TRANSACTION ANALYSIS COMPLETE');
    } else {
        console.log('\n❌ ANALYSIS FAILED');
    }
}).catch(console.error);
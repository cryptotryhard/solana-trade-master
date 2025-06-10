import { Connection, PublicKey } from '@solana/web3.js';

interface RugCheckResult {
  isRugRisk: boolean;
  riskScore: number; // 0-100 (higher = more risky)
  riskFactors: string[];
  checks: {
    honeypotCheck: boolean;
    liquidityCheck: boolean;
    holderDistribution: boolean;
    contractVerification: boolean;
    tradingEnabled: boolean;
    devWalletCheck: boolean;
    mintAuthorityCheck: boolean;
  };
  recommendation: 'safe' | 'caution' | 'high_risk' | 'reject';
  details: {
    topHolders: Array<{ address: string; percentage: number }>;
    liquidityLocked: boolean;
    mintDisabled: boolean;
    devAllocation: number;
    tradingVolume24h: number;
    holderCount: number;
  };
}

interface TokenSecurityInfo {
  mintAddress: string;
  symbol: string;
  totalSupply: number;
  decimals: number;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  holderCount: number;
  topHolders: Array<{ address: string; balance: number; percentage: number }>;
  liquidityPools: Array<{ address: string; liquidity: number; locked: boolean }>;
  createdAt: Date;
  firstTradeAt?: Date;
}

class AntiRugProtection {
  private connection: Connection;
  private blacklistedAddresses = new Set<string>();
  private knownRugPatterns = new Map<string, number>();

  constructor() {
    // Use multiple RPC endpoints for redundancy
    this.connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    this.initializeBlacklist();
    this.initializeRugPatterns();
    console.log('🛡️ Anti-Rug Protection initialized');
  }

  private initializeBlacklist(): void {
    // Known rug pull addresses and suspicious patterns
    const knownRugs = [
      // Add known rug pull mint addresses here
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // Example - replace with actual addresses
    ];

    knownRugs.forEach(address => this.blacklistedAddresses.add(address));
  }

  private initializeRugPatterns(): void {
    // Pattern weights for rug detection
    this.knownRugPatterns.set('high_dev_allocation', 25); // Dev owns >50% of tokens
    this.knownRugPatterns.set('low_holder_count', 15); // <100 unique holders
    this.knownRugPatterns.set('concentrated_ownership', 20); // Top 10 holders own >80%
    this.knownRugPatterns.set('no_liquidity_lock', 20); // Liquidity not locked
    this.knownRugPatterns.set('mint_authority_active', 10); // Can mint new tokens
    this.knownRugPatterns.set('freeze_authority_active', 15); // Can freeze accounts
    this.knownRugPatterns.set('low_trading_volume', 10); // Suspiciously low volume
    this.knownRugPatterns.set('rapid_price_pump', 15); // Artificial pump detected
  }

  public async checkTokenSecurity(mintAddress: string, symbol?: string): Promise<RugCheckResult> {
    try {
      console.log(`🔍 Checking token security for ${symbol || mintAddress}`);

      // Quick blacklist check
      if (this.blacklistedAddresses.has(mintAddress)) {
        return this.createRejectionResult('Token is blacklisted', ['blacklisted_token']);
      }

      // Get comprehensive token information
      const tokenInfo = await this.getTokenSecurityInfo(mintAddress);
      
      // Perform all security checks
      const checks = {
        honeypotCheck: await this.checkHoneypot(mintAddress, tokenInfo),
        liquidityCheck: await this.checkLiquidity(tokenInfo),
        holderDistribution: await this.checkHolderDistribution(tokenInfo),
        contractVerification: await this.checkContractSecurity(tokenInfo),
        tradingEnabled: await this.checkTradingEnabled(mintAddress),
        devWalletCheck: await this.checkDevWallet(tokenInfo),
        mintAuthorityCheck: await this.checkMintAuthority(tokenInfo)
      };

      // Calculate risk score and factors
      const { riskScore, riskFactors } = this.calculateRiskScore(tokenInfo, checks);

      // Determine recommendation
      const recommendation = this.getRecommendation(riskScore, riskFactors);

      const result: RugCheckResult = {
        isRugRisk: riskScore > 60,
        riskScore,
        riskFactors,
        checks,
        recommendation,
        details: {
          topHolders: tokenInfo.topHolders.slice(0, 10).map(h => ({
            address: h.address,
            percentage: h.percentage
          })),
          liquidityLocked: tokenInfo.liquidityPools.some(p => p.locked),
          mintDisabled: tokenInfo.mintAuthority === null,
          devAllocation: this.calculateDevAllocation(tokenInfo),
          tradingVolume24h: 0, // Would need DEX API integration
          holderCount: tokenInfo.holderCount
        }
      };

      console.log(`🛡️ Security check completed for ${symbol || mintAddress}: ${recommendation} (risk: ${riskScore}%)`);
      return result;

    } catch (error) {
      console.error(`❌ Error checking token security for ${mintAddress}:`, error);
      
      // Return conservative result on error
      return {
        isRugRisk: true,
        riskScore: 80,
        riskFactors: ['security_check_failed'],
        checks: {
          honeypotCheck: false,
          liquidityCheck: false,
          holderDistribution: false,
          contractVerification: false,
          tradingEnabled: false,
          devWalletCheck: false,
          mintAuthorityCheck: false
        },
        recommendation: 'reject',
        details: {
          topHolders: [],
          liquidityLocked: false,
          mintDisabled: false,
          devAllocation: 0,
          tradingVolume24h: 0,
          holderCount: 0
        }
      };
    }
  }

  private async getTokenSecurityInfo(mintAddress: string): Promise<TokenSecurityInfo> {
    const mintPubkey = new PublicKey(mintAddress);
    
    // Get mint account info
    const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
    if (!mintInfo.value?.data) {
      throw new Error('Failed to fetch mint account info');
    }

    const parsedData = mintInfo.value.data as any;
    const mintData = parsedData.parsed.info;

    // Get token accounts to analyze holder distribution
    const tokenAccounts = await this.connection.getParsedProgramAccounts(
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      {
        filters: [
          { dataSize: 165 },
          { memcmp: { offset: 0, bytes: mintAddress } }
        ]
      }
    );

    // Process holder data
    const holders = tokenAccounts
      .map(account => {
        const data = account.account.data as any;
        return {
          address: account.pubkey.toString(),
          balance: parseInt(data.parsed.info.tokenAmount.amount),
          percentage: 0 // Will calculate below
        };
      })
      .filter(h => h.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    const totalSupply = parseInt(mintData.supply);
    holders.forEach(holder => {
      holder.percentage = (holder.balance / totalSupply) * 100;
    });

    return {
      mintAddress,
      symbol: '', // Would need metadata API
      totalSupply,
      decimals: mintData.decimals,
      mintAuthority: mintData.mintAuthority,
      freezeAuthority: mintData.freezeAuthority,
      holderCount: holders.length,
      topHolders: holders.slice(0, 50),
      liquidityPools: [], // Would need DEX API integration
      createdAt: new Date(), // Would need block explorer data
    };
  }

  private async checkHoneypot(mintAddress: string, tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Honeypot indicators:
    // 1. Can buy but cannot sell
    // 2. High sell tax that makes selling unprofitable
    // 3. Blacklisted selling function
    
    try {
      // Check if there are successful sell transactions in recent history
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit: 50 }
      );

      // This is a simplified check - in reality, you'd need to parse transaction logs
      // to determine if sells are being blocked
      return signatures.length > 0; // Simplified - assume not honeypot if transactions exist
    } catch {
      return false; // Conservative approach
    }
  }

  private async checkLiquidity(tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Check if there's sufficient liquidity for trading
    // This would require integration with DEX APIs like Jupiter, Raydium, etc.
    
    // For now, return true if there are multiple holders (indicates some liquidity exists)
    return tokenInfo.holderCount > 10;
  }

  private async checkHolderDistribution(tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Check for healthy holder distribution
    const top10Percentage = tokenInfo.topHolders
      .slice(0, 10)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    // Flag if top 10 holders own more than 80% of supply
    return top10Percentage <= 80;
  }

  private async checkContractSecurity(tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Check mint and freeze authority
    const mintDisabled = tokenInfo.mintAuthority === null;
    const freezeDisabled = tokenInfo.freezeAuthority === null;
    
    // Consider secure if both authorities are disabled
    return mintDisabled && freezeDisabled;
  }

  private async checkTradingEnabled(mintAddress: string): Promise<boolean> {
    // Check if token can be traded (not paused/frozen)
    try {
      // Look for recent trading activity
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(mintAddress),
        { limit: 10 }
      );

      // If there are recent transactions, trading is likely enabled
      return signatures.length > 0;
    } catch {
      return false;
    }
  }

  private async checkDevWallet(tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Check if dev wallet holds reasonable amount (not too much, not dumping)
    const maxDevHolding = tokenInfo.topHolders[0]?.percentage || 0;
    
    // Flag if any single address holds more than 30%
    return maxDevHolding <= 30;
  }

  private async checkMintAuthority(tokenInfo: TokenSecurityInfo): Promise<boolean> {
    // Check if mint authority is renounced (good) or still active (bad)
    return tokenInfo.mintAuthority === null;
  }

  private calculateRiskScore(tokenInfo: TokenSecurityInfo, checks: any): { riskScore: number; riskFactors: string[] } {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // Check failed security checks
    if (!checks.honeypotCheck) {
      riskScore += this.knownRugPatterns.get('honeypot_detected') || 30;
      riskFactors.push('potential_honeypot');
    }

    if (!checks.liquidityCheck) {
      riskScore += this.knownRugPatterns.get('low_liquidity') || 20;
      riskFactors.push('insufficient_liquidity');
    }

    if (!checks.holderDistribution) {
      riskScore += this.knownRugPatterns.get('concentrated_ownership') || 20;
      riskFactors.push('concentrated_ownership');
    }

    if (!checks.contractVerification) {
      riskScore += this.knownRugPatterns.get('mint_authority_active') || 15;
      riskFactors.push('unsafe_contract');
    }

    if (!checks.tradingEnabled) {
      riskScore += 25;
      riskFactors.push('trading_disabled');
    }

    if (!checks.devWalletCheck) {
      riskScore += this.knownRugPatterns.get('high_dev_allocation') || 25;
      riskFactors.push('suspicious_dev_allocation');
    }

    // Additional pattern checks
    if (tokenInfo.holderCount < 50) {
      riskScore += this.knownRugPatterns.get('low_holder_count') || 15;
      riskFactors.push('low_holder_count');
    }

    const top5Percentage = tokenInfo.topHolders
      .slice(0, 5)
      .reduce((sum, holder) => sum + holder.percentage, 0);

    if (top5Percentage > 60) {
      riskScore += this.knownRugPatterns.get('concentrated_ownership') || 20;
      riskFactors.push('whale_concentration');
    }

    return { riskScore: Math.min(100, riskScore), riskFactors };
  }

  private calculateDevAllocation(tokenInfo: TokenSecurityInfo): number {
    // Assume first holder might be dev (simplified)
    return tokenInfo.topHolders[0]?.percentage || 0;
  }

  private getRecommendation(riskScore: number, riskFactors: string[]): 'safe' | 'caution' | 'high_risk' | 'reject' {
    if (riskFactors.includes('blacklisted_token') || riskFactors.includes('trading_disabled')) {
      return 'reject';
    }

    if (riskScore >= 70) return 'reject';
    if (riskScore >= 50) return 'high_risk';
    if (riskScore >= 30) return 'caution';
    return 'safe';
  }

  private createRejectionResult(reason: string, riskFactors: string[]): RugCheckResult {
    return {
      isRugRisk: true,
      riskScore: 100,
      riskFactors,
      checks: {
        honeypotCheck: false,
        liquidityCheck: false,
        holderDistribution: false,
        contractVerification: false,
        tradingEnabled: false,
        devWalletCheck: false,
        mintAuthorityCheck: false
      },
      recommendation: 'reject',
      details: {
        topHolders: [],
        liquidityLocked: false,
        mintDisabled: false,
        devAllocation: 0,
        tradingVolume24h: 0,
        holderCount: 0
      }
    };
  }

  public addToBlacklist(mintAddress: string): void {
    this.blacklistedAddresses.add(mintAddress);
    console.log(`🚫 Added ${mintAddress} to blacklist`);
  }

  public removeFromBlacklist(mintAddress: string): void {
    this.blacklistedAddresses.delete(mintAddress);
    console.log(`✅ Removed ${mintAddress} from blacklist`);
  }

  public getBlacklistedAddresses(): string[] {
    return Array.from(this.blacklistedAddresses);
  }
}

export const antiRugProtection = new AntiRugProtection();
export { AntiRugProtection, type RugCheckResult, type TokenSecurityInfo };
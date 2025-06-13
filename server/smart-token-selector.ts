/**
 * SMART TOKEN SELECTOR
 * Centralized decision engine for pump.fun token selection with comprehensive validation
 */

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image_uri: string;
  metadata_uri: string;
  twitter: string;
  telegram: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  created_timestamp: number;
  raydium_pool: string | null;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website: string;
  show_name: boolean;
  king_of_the_hill_timestamp: number | null;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id: string | null;
  inverted: boolean | null;
  is_currently_live: boolean;
  username: string;
  profile_image: string | null;
  usd_market_cap: number;
}

interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: any;
  priceImpactPct: string;
  routePlan: any[];
}

export interface RecommendedToken {
  mint: string;
  name: string;
  symbol: string;
  score: number;
  reason: string;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  ageHours: number;
  priceChange1h: number;
  bondingCurveProgress: number;
  jupiterRoutesValidated: boolean;
}

class SmartTokenSelector {
  private readonly PUMP_FUN_API = 'https://frontend-api.pump.fun/coins';
  private readonly JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6/quote';
  private readonly SOL_MINT = 'So11111111111111111111111111111111111111112';
  private readonly USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  // Selection criteria
  private readonly MIN_MARKET_CAP = 10000;
  private readonly MAX_MARKET_CAP = 70000;
  private readonly MIN_VOLUME_24H = 40000;
  private readonly MIN_LIQUIDITY = 10000;
  private readonly MIN_AGE_HOURS = 1;
  private readonly MAX_AGE_HOURS = 12;
  private readonly MIN_PRICE_CHANGE_1H = 10;
  private readonly MAX_BONDING_CURVE_PROGRESS = 25;

  constructor() {
    console.log('🧠 Smart Token Selector initialized');
  }

  /**
   * Get the best token recommendation based on comprehensive analysis
   */
  async getBestToken(): Promise<RecommendedToken | null> {
    try {
      console.log('🔍 Starting comprehensive token analysis...');
      
      // Step 1: Fetch recent pump.fun tokens
      const tokens = await this.fetchRecentTokens();
      if (tokens.length === 0) {
        console.log('❌ No tokens retrieved from pump.fun API');
        return null;
      }

      console.log(`📊 Retrieved ${tokens.length} tokens from pump.fun`);

      // Step 2: Apply fundamental filters
      const filtered = await this.applyFilters(tokens);
      if (filtered.length === 0) {
        console.log('❌ No tokens passed fundamental filters');
        return null;
      }

      console.log(`✅ ${filtered.length} tokens passed fundamental filters`);

      // Step 3: Validate Jupiter routes for swapability
      const jupiterValidated = await this.validateJupiterRoutes(filtered);
      if (jupiterValidated.length === 0) {
        console.log('❌ No tokens have valid Jupiter routes');
        return null;
      }

      console.log(`✅ ${jupiterValidated.length} tokens have valid Jupiter routes`);

      // Step 4: Calculate scores and rank
      const scored = this.calculateScores(jupiterValidated);
      
      // Step 5: Return best token
      const bestToken = scored[0];
      
      console.log(`🏆 Best token selected: ${bestToken.symbol} (Score: ${bestToken.score})`);
      console.log(`📈 Reason: ${bestToken.reason}`);
      
      return bestToken;

    } catch (error) {
      console.error('❌ Error in token selection:', error.message);
      return null;
    }
  }

  /**
   * Fetch recent tokens from pump.fun API
   */
  private async fetchRecentTokens(): Promise<PumpFunToken[]> {
    try {
      const response = await fetch(`${this.PUMP_FUN_API}?offset=0&limit=50&sort=created_timestamp&order=DESC`);
      
      if (!response.ok) {
        throw new Error(`Pump.fun API error: ${response.status} ${response.statusText}`);
      }

      const tokens: PumpFunToken[] = await response.json();
      
      // Only return tokens that are currently live and not graduated
      return tokens.filter(token => 
        token.is_currently_live && 
        !token.complete && 
        token.raydium_pool === null &&
        !token.nsfw
      );

    } catch (error) {
      console.error('❌ Error fetching pump.fun tokens:', error.message);
      return [];
    }
  }

  /**
   * Apply fundamental filters to tokens
   */
  private async applyFilters(tokens: PumpFunToken[]): Promise<PumpFunToken[]> {
    const filtered: PumpFunToken[] = [];

    for (const token of tokens) {
      // Market cap check
      if (token.usd_market_cap < this.MIN_MARKET_CAP || token.usd_market_cap > this.MAX_MARKET_CAP) {
        continue;
      }

      // Estimate volume (using virtual reserves as proxy)
      const estimatedVolume = token.virtual_sol_reserves * 145 * 2; // Rough SOL price estimation
      if (estimatedVolume < this.MIN_VOLUME_24H) {
        continue;
      }

      // Liquidity check (SOL reserves)
      const liquidityUSD = token.virtual_sol_reserves * 145;
      if (liquidityUSD < this.MIN_LIQUIDITY) {
        continue;
      }

      // Age check
      const ageHours = (Date.now() - token.created_timestamp) / (1000 * 60 * 60);
      if (ageHours < this.MIN_AGE_HOURS || ageHours > this.MAX_AGE_HOURS) {
        continue;
      }

      // Bonding curve progress check
      const totalSupply = token.total_supply;
      const virtualTokenReserves = token.virtual_token_reserves;
      const bondingProgress = ((totalSupply - virtualTokenReserves) / totalSupply) * 100;
      
      if (bondingProgress > this.MAX_BONDING_CURVE_PROGRESS) {
        continue;
      }

      // Price change estimation (simplified - would need historical data for accuracy)
      // Using market momentum indicators as proxy
      const momentumScore = this.calculateMomentumScore(token);
      if (momentumScore < this.MIN_PRICE_CHANGE_1H) {
        continue;
      }

      console.log(`✅ ${token.symbol} passed filters: MC=$${token.usd_market_cap.toLocaleString()}, Age=${ageHours.toFixed(1)}h, Progress=${bondingProgress.toFixed(1)}%`);
      filtered.push(token);
    }

    return filtered;
  }

  /**
   * Validate Jupiter routes for token swapability
   */
  private async validateJupiterRoutes(tokens: PumpFunToken[]): Promise<PumpFunToken[]> {
    const validated: PumpFunToken[] = [];

    for (const token of tokens) {
      try {
        // Test route: Token -> SOL
        const solRoute = await this.checkJupiterRoute(token.mint, this.SOL_MINT, '1000000'); // 1M tokens
        
        // Test route: Token -> USDC  
        const usdcRoute = await this.checkJupiterRoute(token.mint, this.USDC_MINT, '1000000');

        if (solRoute || usdcRoute) {
          console.log(`✅ ${token.symbol} has valid Jupiter routes`);
          validated.push(token);
        } else {
          console.log(`❌ ${token.symbol} has no valid Jupiter routes`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ ${token.symbol} Jupiter validation failed: ${error.message}`);
      }
    }

    return validated;
  }

  /**
   * Check if Jupiter route exists for a token pair
   */
  private async checkJupiterRoute(inputMint: string, outputMint: string, amount: string): Promise<boolean> {
    try {
      const url = `${this.JUPITER_QUOTE_API}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=300`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return false;
      }

      const quote: JupiterQuoteResponse = await response.json();
      
      // Check if we have valid routes and reasonable output amount
      return quote.routePlan && quote.routePlan.length > 0 && parseInt(quote.outAmount) > 0;

    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate comprehensive scores for tokens
   */
  private calculateScores(tokens: PumpFunToken[]): RecommendedToken[] {
    const scoredTokens: RecommendedToken[] = [];

    for (const token of tokens) {
      const ageHours = (Date.now() - token.created_timestamp) / (1000 * 60 * 60);
      const liquidityUSD = token.virtual_sol_reserves * 145;
      const estimatedVolume = liquidityUSD * 2;
      const bondingProgress = ((token.total_supply - token.virtual_token_reserves) / token.total_supply) * 100;
      const momentumScore = this.calculateMomentumScore(token);

      // Comprehensive scoring algorithm
      let score = 0;

      // Market cap score (sweet spot around 20-30k)
      const mcOptimal = 25000;
      const mcDistance = Math.abs(token.usd_market_cap - mcOptimal) / mcOptimal;
      score += (1 - mcDistance) * 25;

      // Age score (prefer 2-6 hours)
      const ageOptimal = ageHours >= 2 && ageHours <= 6 ? 20 : Math.max(0, 20 - Math.abs(ageHours - 4) * 2);
      score += ageOptimal;

      // Liquidity score
      score += Math.min(20, (liquidityUSD / 15000) * 20);

      // Volume score
      score += Math.min(15, (estimatedVolume / 50000) * 15);

      // Early entry bonus (lower bonding curve progress)
      score += Math.max(0, 15 - bondingProgress);

      // Momentum score
      score += Math.min(15, momentumScore);

      // Name/symbol quality heuristics
      if (this.hasGoodNaming(token)) {
        score += 5;
      }

      const recommendedToken: RecommendedToken = {
        mint: token.mint,
        name: token.name,
        symbol: token.symbol,
        score: Math.round(score),
        reason: this.generateReason(token, score),
        marketCap: token.usd_market_cap,
        volume24h: estimatedVolume,
        liquidity: liquidityUSD,
        ageHours: ageHours,
        priceChange1h: momentumScore,
        bondingCurveProgress: bondingProgress,
        jupiterRoutesValidated: true
      };

      scoredTokens.push(recommendedToken);
    }

    // Sort by score (highest first)
    return scoredTokens.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate momentum score as proxy for price change
   */
  private calculateMomentumScore(token: PumpFunToken): number {
    // Use multiple factors as momentum indicators
    let momentum = 0;

    // Recent activity (reply count and last reply)
    if (token.reply_count > 10) momentum += 10;
    if (token.last_reply && (Date.now() - token.last_reply) < 3600000) momentum += 15; // Recent activity

    // Market position
    if (token.king_of_the_hill_timestamp) momentum += 20;

    // Virtual reserves ratio (indicates trading activity)
    const reserveRatio = token.virtual_sol_reserves / token.virtual_token_reserves;
    if (reserveRatio > 0.00001) momentum += 10;

    return Math.min(50, momentum);
  }

  /**
   * Check for good naming patterns
   */
  private hasGoodNaming(token: PumpFunToken): boolean {
    const name = token.name.toLowerCase();
    const symbol = token.symbol.toLowerCase();
    
    // Avoid obvious rug patterns
    const badPatterns = ['test', 'rug', 'scam', 'fake', 'copy'];
    if (badPatterns.some(pattern => name.includes(pattern) || symbol.includes(pattern))) {
      return false;
    }

    // Prefer tokens with reasonable length and no excessive special characters
    if (symbol.length >= 3 && symbol.length <= 10 && name.length <= 30) {
      return true;
    }

    return false;
  }

  /**
   * Generate explanation for token selection
   */
  private generateReason(token: PumpFunToken, score: number): string {
    const reasons: string[] = [];
    
    if (token.usd_market_cap < 30000) reasons.push('Low market cap entry');
    if (token.virtual_sol_reserves > 10) reasons.push('Strong liquidity');
    
    const ageHours = (Date.now() - token.created_timestamp) / (1000 * 60 * 60);
    if (ageHours < 4) reasons.push('Early discovery');
    
    if (token.reply_count > 15) reasons.push('Community engagement');
    if (token.king_of_the_hill_timestamp) reasons.push('Trending status');

    const bondingProgress = ((token.total_supply - token.virtual_token_reserves) / token.total_supply) * 100;
    if (bondingProgress < 15) reasons.push('Pre-graduation opportunity');

    return reasons.length > 0 ? reasons.join(', ') : 'Comprehensive scoring algorithm selection';
  }

  /**
   * Get current selection criteria for monitoring
   */
  getSelectionCriteria() {
    return {
      marketCap: { min: this.MIN_MARKET_CAP, max: this.MAX_MARKET_CAP },
      volume24h: { min: this.MIN_VOLUME_24H },
      liquidity: { min: this.MIN_LIQUIDITY },
      ageHours: { min: this.MIN_AGE_HOURS, max: this.MAX_AGE_HOURS },
      priceChange1h: { min: this.MIN_PRICE_CHANGE_1H },
      bondingCurveProgress: { max: this.MAX_BONDING_CURVE_PROGRESS }
    };
  }
}

// Export singleton instance
export const smartTokenSelector = new SmartTokenSelector();

// Export main function for easy import
export async function getBestToken(): Promise<RecommendedToken | null> {
  return await smartTokenSelector.getBestToken();
}

// Export types
export type { RecommendedToken };
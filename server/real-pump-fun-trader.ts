import fetch from 'node-fetch';

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  created_timestamp: number;
  raydium_pool?: string;
  complete: boolean;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  total_supply: number;
  website?: string;
  telegram?: string;
  twitter?: string;
  bonding_curve: string;
  associated_bonding_curve: string;
  creator: string;
  market_cap: number;
  reply_count: number;
  last_reply: number;
  nsfw: boolean;
  market_id?: string;
  inverted?: boolean;
  is_currently_live: boolean;
  king_of_the_hill_timestamp?: number;
  show_name: boolean;
  last_trade_timestamp: number;
  usd_market_cap: number;
}

interface AlphaSignal {
  token: PumpFunToken;
  confidence: number;
  signals: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  action: 'BUY' | 'SELL' | 'HOLD';
  reasoning: string;
}

class RealPumpFunTrader {
  private readonly API_BASE = 'https://frontend-api.pump.fun';
  private lastScanTime = 0;
  private scanInterval = 30000; // 30 seconds
  private isActive = true;

  constructor() {
    this.startContinuousScanning();
  }

  private startContinuousScanning(): void {
    console.log('🚀 REAL PUMP.FUN TRADER INITIALIZED');
    setInterval(() => {
      if (this.isActive) {
        this.scanAndTrade();
      }
    }, this.scanInterval);
  }

  async scanAndTrade(): Promise<void> {
    try {
      console.log('🔍 SCANNING PUMP.FUN FOR LIVE OPPORTUNITIES...');
      
      const freshTokens = await this.getFreshTokens();
      if (freshTokens.length === 0) {
        console.log('⚠️ No fresh tokens found');
        return;
      }

      console.log(`📊 Found ${freshTokens.length} fresh tokens, analyzing...`);

      for (const token of freshTokens) {
        const signal = await this.analyzeTokenForTrading(token);
        
        if (signal && signal.action === 'BUY' && signal.confidence > 75) {
          console.log(`🎯 HIGH CONFIDENCE SIGNAL: ${token.symbol} (${signal.confidence}%)`);
          console.log(`💡 Reasoning: ${signal.reasoning}`);
          
          await this.executeRealTrade(signal);
        }
      }

    } catch (error) {
      console.error('❌ Pump.fun scanning error:', error);
    }
  }

  private async getFreshTokens(): Promise<PumpFunToken[]> {
    const endpoints = [
      `${this.API_BASE}/coins?offset=0&limit=20&sort=created_timestamp&order=DESC&includeNsfw=false`,
      `${this.API_BASE}/coins/king-of-the-hill?offset=0&limit=10`,
      `${this.API_BASE}/coins?offset=0&limit=20&sort=last_trade_timestamp&order=DESC&includeNsfw=false`
    ];

    const allTokens: PumpFunToken[] = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Referer': 'https://pump.fun/',
            'Origin': 'https://pump.fun'
          }
        });

        if (response.ok) {
          const data = await response.json() as PumpFunToken[];
          if (Array.isArray(data)) {
            allTokens.push(...data);
          }
        }
      } catch (error) {
        console.log(`⚠️ Endpoint failed: ${endpoint}`);
      }
    }

    // Filter for viable trading candidates
    const now = Date.now();
    return Array.from(
      new Map(allTokens.map(token => [token.mint, token])).values()
    ).filter(token => {
      const ageHours = (now - token.created_timestamp) / (1000 * 60 * 60);
      return (
        ageHours < 6 && // Less than 6 hours old
        token.usd_market_cap > 2000 && // Minimum liquidity
        token.usd_market_cap < 500000 && // Still has moon potential
        !token.nsfw &&
        token.is_currently_live &&
        token.reply_count > 3
      );
    }).slice(0, 10);
  }

  private async analyzeTokenForTrading(token: PumpFunToken): Promise<AlphaSignal | null> {
    try {
      const signals: string[] = [];
      let confidence = 0;
      let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';

      // Age analysis
      const ageHours = (Date.now() - token.created_timestamp) / (1000 * 60 * 60);
      if (ageHours < 1) {
        signals.push('Fresh launch (<1h)');
        confidence += 20;
      } else if (ageHours < 3) {
        signals.push('Early stage (<3h)');
        confidence += 15;
      }

      // Market cap analysis
      if (token.usd_market_cap > 5000 && token.usd_market_cap < 50000) {
        signals.push('Optimal market cap range');
        confidence += 25;
        risk = 'MEDIUM';
      } else if (token.usd_market_cap < 5000) {
        signals.push('Very early stage');
        confidence += 15;
        risk = 'HIGH';
      }

      // Community engagement
      if (token.reply_count > 10) {
        signals.push('High community engagement');
        confidence += 20;
      } else if (token.reply_count > 5) {
        signals.push('Good community interest');
        confidence += 10;
      }

      // Trading activity
      const lastTradeAge = (Date.now() - token.last_trade_timestamp) / (1000 * 60);
      if (lastTradeAge < 5) {
        signals.push('Recent trading activity');
        confidence += 15;
      }

      // Social presence
      if (token.twitter || token.telegram || token.website) {
        signals.push('Has social presence');
        confidence += 10;
        if (risk === 'HIGH') risk = 'MEDIUM';
      }

      // Name and symbol quality
      if (token.symbol.length <= 6 && !token.symbol.includes('$') && 
          !token.name.toLowerCase().includes('test') && 
          !token.name.toLowerCase().includes('coin')) {
        signals.push('Professional branding');
        confidence += 10;
      }

      // Determine action
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (confidence >= 75 && risk !== 'HIGH') {
        action = 'BUY';
      } else if (confidence >= 60 && risk === 'LOW') {
        action = 'BUY';
      }

      const reasoning = `Market Cap: $${token.usd_market_cap.toLocaleString()}, Age: ${ageHours.toFixed(1)}h, Replies: ${token.reply_count}, Signals: ${signals.length}`;

      return {
        token,
        confidence,
        signals,
        risk,
        action,
        reasoning
      };

    } catch (error) {
      console.error(`Error analyzing token ${token.symbol}:`, error);
      return null;
    }
  }

  private async executeRealTrade(signal: AlphaSignal): Promise<void> {
    try {
      console.log(`🚀 EXECUTING REAL TRADE: ${signal.token.symbol}`);
      console.log(`💰 Market Cap: $${signal.token.usd_market_cap.toLocaleString()}`);
      console.log(`🎯 Confidence: ${signal.confidence}%`);
      console.log(`⚠️ Risk: ${signal.risk}`);

      // Calculate position size based on risk
      let positionSizeSOL = 0.05; // Base size
      if (signal.risk === 'LOW') positionSizeSOL = 0.1;
      else if (signal.risk === 'MEDIUM') positionSizeSOL = 0.075;
      else positionSizeSOL = 0.05;

      // Execute trade via existing trade executor
      const tradeRequest = await fetch('http://localhost:3000/api/execute-real-trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: signal.token.symbol,
          mintAddress: signal.token.mint,
          amount: positionSizeSOL,
          type: 'buy',
          source: 'pump_fun_real'
        })
      });

      if (tradeRequest.ok) {
        const result = await tradeRequest.json();
        console.log(`✅ REAL TRADE EXECUTED: ${signal.token.symbol}`);
        console.log(`🔗 TX Hash: ${result.txHash}`);
        
        // Log the successful trade
        this.logSuccessfulTrade(signal, result);
      } else {
        console.error(`❌ Trade execution failed for ${signal.token.symbol}`);
      }

    } catch (error) {
      console.error(`💥 Trade execution error for ${signal.token.symbol}:`, error);
    }
  }

  private logSuccessfulTrade(signal: AlphaSignal, result: any): void {
    const trade = {
      timestamp: new Date().toISOString(),
      symbol: signal.token.symbol,
      mintAddress: signal.token.mint,
      confidence: signal.confidence,
      risk: signal.risk,
      marketCap: signal.token.usd_market_cap,
      txHash: result.txHash,
      reasoning: signal.reasoning,
      source: 'pump_fun_live'
    };

    console.log('📊 TRADE LOGGED:', JSON.stringify(trade, null, 2));
  }

  public getStatus() {
    return {
      active: this.isActive,
      lastScan: this.lastScanTime,
      scanInterval: this.scanInterval,
      mode: 'live_pump_fun_trading'
    };
  }

  public stop(): void {
    this.isActive = false;
    console.log('🛑 Real Pump.fun trader stopped');
  }

  public start(): void {
    this.isActive = true;
    console.log('▶️ Real Pump.fun trader started');
  }
}

export const realPumpFunTrader = new RealPumpFunTrader();
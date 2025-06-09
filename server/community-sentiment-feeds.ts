import fetch from 'node-fetch';

interface CommunityPost {
  source: 'telegram' | 'twitter';
  text: string;
  timestamp: Date;
  author: string;
  engagement: number; // likes, shares, etc.
  tokenMentions: string[];
}

interface SentimentFeedData {
  posts: CommunityPost[];
  tokenMentions: Map<string, {
    hypeCount: number;
    fudCount: number;
    totalMentions: number;
    avgEngagement: number;
  }>;
}

class CommunitySentimentFeeds {
  private telegramChannels = [
    '@SolanaAlpha',
    '@SolanaGems', 
    '@SolanaBets',
    '@SolanaSignals',
    '@SolanaTrading'
  ];

  private twitterAccounts = [
    'SolanaFloor',
    'sol_venues',
    'SolanaDaily',
    'SolanaMemecoins'
  ];

  private hypeKeywords = [
    'moonshot', 'gem found', 'early entry', 'diamond hands', 'degen play',
    'aping in', 'bullish af', 'sending it', 'rocket fuel', 'alpha call',
    'massive pump', 'golden cross', 'breakout incoming', 'whale accumulation'
  ];

  private fudKeywords = [
    'rugpull', 'dumping hard', 'exit scam', 'dead project', 'avoid this',
    'getting rekt', 'honeypot', 'dev dumped', 'liquidity pulled', 'scam alert'
  ];

  async fetchCommunityFeeds(): Promise<SentimentFeedData> {
    const allPosts: CommunityPost[] = [];
    
    // Fetch Telegram feeds (using mock data for development)
    const telegramPosts = await this.fetchTelegramPosts();
    allPosts.push(...telegramPosts);
    
    // Fetch Twitter feeds (using mock data for development)
    const twitterPosts = await this.fetchTwitterPosts();
    allPosts.push(...twitterPosts);
    
    return {
      posts: allPosts,
      tokenMentions: this.analyzeTokenMentions(allPosts)
    };
  }

  private async fetchTelegramPosts(): Promise<CommunityPost[]> {
    // In production, this would use Telegram Bot API or web scraping
    // For development, generating synthetic but realistic community posts
    const mockPosts: CommunityPost[] = [
      {
        source: 'telegram',
        text: 'Just found this gem $ROCKET early entry looking bullish af 🚀',
        timestamp: new Date(Date.now() - 300000), // 5 minutes ago
        author: 'SolanaAlpha_Bot',
        engagement: 15,
        tokenMentions: ['ROCKET']
      },
      {
        source: 'telegram', 
        text: '$MOON showing massive volume spike, whale accumulation detected',
        timestamp: new Date(Date.now() - 600000), // 10 minutes ago
        author: 'SolanaGems_Signal',
        engagement: 32,
        tokenMentions: ['MOON']
      },
      {
        source: 'telegram',
        text: 'Avoid $SCAMCOIN - dev just dumped, liquidity pulled',
        timestamp: new Date(Date.now() - 900000), // 15 minutes ago
        author: 'SolanaAlerts',
        engagement: 8,
        tokenMentions: ['SCAMCOIN']
      }
    ];

    return mockPosts;
  }

  private async fetchTwitterPosts(): Promise<CommunityPost[]> {
    // In production, this would use Twitter API v2
    // For development, generating synthetic community sentiment data
    const mockPosts: CommunityPost[] = [
      {
        source: 'twitter',
        text: '$DEGEN breakout incoming, golden cross on 15m chart 📈',
        timestamp: new Date(Date.now() - 240000), // 4 minutes ago
        author: 'SolTrader_Pro',
        engagement: 45,
        tokenMentions: ['DEGEN']
      },
      {
        source: 'twitter',
        text: 'New alpha call: $ALPHA showing diamond hand pattern, early entry opportunity',
        timestamp: new Date(Date.now() - 480000), // 8 minutes ago
        author: 'SolAnalyst',
        engagement: 78,
        tokenMentions: ['ALPHA']
      }
    ];

    return mockPosts;
  }

  private analyzeTokenMentions(posts: CommunityPost[]): Map<string, {
    hypeCount: number;
    fudCount: number;
    totalMentions: number;
    avgEngagement: number;
  }> {
    const tokenData = new Map();
    
    for (const post of posts) {
      for (const token of post.tokenMentions) {
        if (!tokenData.has(token)) {
          tokenData.set(token, {
            hypeCount: 0,
            fudCount: 0,
            totalMentions: 0,
            avgEngagement: 0
          });
        }
        
        const data = tokenData.get(token);
        data.totalMentions += 1;
        data.avgEngagement = (data.avgEngagement + post.engagement) / 2;
        
        // Analyze sentiment
        const text = post.text.toLowerCase();
        const hasHype = this.hypeKeywords.some(keyword => text.includes(keyword));
        const hasFud = this.fudKeywords.some(keyword => text.includes(keyword));
        
        if (hasHype) data.hypeCount += 1;
        if (hasFud) data.fudCount += 1;
        
        tokenData.set(token, data);
      }
    }
    
    return tokenData;
  }

  async getTokenCommunityScore(symbol: string): Promise<{
    communityHype: number;
    communityFud: number;
    socialVelocity: number;
    influencerMentions: number;
  }> {
    try {
      const feedData = await this.fetchCommunityFeeds();
      const tokenMention = feedData.tokenMentions.get(symbol);
      
      if (!tokenMention || tokenMention.totalMentions === 0) {
        return {
          communityHype: 0,
          communityFud: 0,
          socialVelocity: 0,
          influencerMentions: 0
        };
      }
      
      const hypePercentage = (tokenMention.hypeCount / tokenMention.totalMentions) * 100;
      const fudPercentage = (tokenMention.fudCount / tokenMention.totalMentions) * 100;
      const socialVelocity = tokenMention.totalMentions * (tokenMention.avgEngagement / 10);
      
      return {
        communityHype: Math.round(hypePercentage),
        communityFud: Math.round(fudPercentage),
        socialVelocity: Math.round(socialVelocity),
        influencerMentions: tokenMention.totalMentions
      };
      
    } catch (error) {
      console.log(`Community sentiment fetch failed for ${symbol}:`, error);
      return {
        communityHype: 0,
        communityFud: 0,
        socialVelocity: 0,
        influencerMentions: 0
      };
    }
  }

  // Enhanced sentiment analysis combining multiple sources
  async getEnhancedSentiment(symbol: string, pumpFunSentiment: any): Promise<{
    totalHypeScore: number;
    totalFudScore: number;
    socialVelocity: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    sources: string[];
  }> {
    const communityScore = await this.getTokenCommunityScore(symbol);
    
    // Combine pump.fun and community sentiment
    const totalHypeScore = Math.round(
      (pumpFunSentiment.hypeScore * 0.6) + (communityScore.communityHype * 0.4)
    );
    
    const totalFudScore = Math.round(
      (pumpFunSentiment.fudScore * 0.6) + (communityScore.communityFud * 0.4)
    );
    
    // Determine confidence based on data sources
    const sources = ['pump.fun'];
    if (communityScore.influencerMentions > 0) {
      sources.push('telegram', 'twitter');
    }
    
    const confidenceLevel = sources.length >= 3 ? 'high' : 
                           sources.length === 2 ? 'medium' : 'low';
    
    return {
      totalHypeScore,
      totalFudScore,
      socialVelocity: communityScore.socialVelocity,
      confidenceLevel,
      sources
    };
  }
}

export const communitySentimentFeeds = new CommunitySentimentFeeds();
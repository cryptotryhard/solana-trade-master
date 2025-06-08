import { storage } from './storage';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'profit' | 'strategy' | 'milestone';
  requirement: {
    type: 'trade_count' | 'win_rate' | 'profit_amount' | 'consecutive_wins' | 'portfolio_value' | 'days_active';
    value: number;
  };
  reward: {
    type: 'badge' | 'title' | 'bonus';
    value: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: Date;
}

interface UserProgress {
  userId: number;
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  maxConsecutiveWins: number;
  currentConsecutiveWins: number;
  portfolioValue: number;
  daysActive: number;
  unlockedAchievements: string[];
  lastUpdated: Date;
}

class AchievementsSystem {
  private achievements: Achievement[] = [
    // Trading Achievements
    {
      id: 'first_trade',
      name: 'First Steps',
      description: 'Execute your first trade',
      icon: '🎯',
      category: 'trading',
      requirement: { type: 'trade_count', value: 1 },
      reward: { type: 'badge', value: 'Rookie Trader' },
      rarity: 'common'
    },
    {
      id: 'trade_veteran',
      name: 'Trade Veteran',
      description: 'Execute 100 trades',
      icon: '⚔️',
      category: 'trading',
      requirement: { type: 'trade_count', value: 100 },
      reward: { type: 'badge', value: 'Veteran Trader' },
      rarity: 'rare'
    },
    {
      id: 'trade_master',
      name: 'Trade Master',
      description: 'Execute 1000 trades',
      icon: '👑',
      category: 'trading',
      requirement: { type: 'trade_count', value: 1000 },
      reward: { type: 'title', value: 'Trading Master' },
      rarity: 'legendary'
    },

    // Win Rate Achievements
    {
      id: 'accurate_trader',
      name: 'Accurate Trader',
      description: 'Achieve 80% win rate with 20+ trades',
      icon: '🎯',
      category: 'strategy',
      requirement: { type: 'win_rate', value: 80 },
      reward: { type: 'badge', value: 'Precision Trader' },
      rarity: 'rare'
    },
    {
      id: 'sniper',
      name: 'Sniper',
      description: 'Achieve 90% win rate with 50+ trades',
      icon: '🎖️',
      category: 'strategy',
      requirement: { type: 'win_rate', value: 90 },
      reward: { type: 'title', value: 'Market Sniper' },
      rarity: 'epic'
    },

    // Profit Achievements
    {
      id: 'first_profit',
      name: 'First Profit',
      description: 'Earn your first $10 profit',
      icon: '💰',
      category: 'profit',
      requirement: { type: 'profit_amount', value: 10 },
      reward: { type: 'badge', value: 'Profit Maker' },
      rarity: 'common'
    },
    {
      id: 'profit_hunter',
      name: 'Profit Hunter',
      description: 'Earn $1,000 in total profit',
      icon: '💎',
      category: 'profit',
      requirement: { type: 'profit_amount', value: 1000 },
      reward: { type: 'badge', value: 'Profit Hunter' },
      rarity: 'rare'
    },
    {
      id: 'profit_king',
      name: 'Profit King',
      description: 'Earn $10,000 in total profit',
      icon: '👑',
      category: 'profit',
      requirement: { type: 'profit_amount', value: 10000 },
      reward: { type: 'title', value: 'Profit King' },
      rarity: 'legendary'
    },

    // Consecutive Wins
    {
      id: 'winning_streak',
      name: 'Winning Streak',
      description: 'Win 5 trades in a row',
      icon: '🔥',
      category: 'strategy',
      requirement: { type: 'consecutive_wins', value: 5 },
      reward: { type: 'badge', value: 'Streak Master' },
      rarity: 'rare'
    },
    {
      id: 'unstoppable',
      name: 'Unstoppable',
      description: 'Win 10 trades in a row',
      icon: '⚡',
      category: 'strategy',
      requirement: { type: 'consecutive_wins', value: 10 },
      reward: { type: 'title', value: 'Unstoppable Force' },
      rarity: 'epic'
    },

    // Portfolio Milestones
    {
      id: 'portfolio_1k',
      name: 'Rising Star',
      description: 'Reach $1,000 portfolio value',
      icon: '⭐',
      category: 'milestone',
      requirement: { type: 'portfolio_value', value: 1000 },
      reward: { type: 'badge', value: 'Rising Star' },
      rarity: 'common'
    },
    {
      id: 'portfolio_10k',
      name: 'High Roller',
      description: 'Reach $10,000 portfolio value',
      icon: '💎',
      category: 'milestone',
      requirement: { type: 'portfolio_value', value: 10000 },
      reward: { type: 'badge', value: 'High Roller' },
      rarity: 'rare'
    },
    {
      id: 'portfolio_100k',
      name: 'Whale Status',
      description: 'Reach $100,000 portfolio value',
      icon: '🐋',
      category: 'milestone',
      requirement: { type: 'portfolio_value', value: 100000 },
      reward: { type: 'title', value: 'Crypto Whale' },
      rarity: 'legendary'
    }
  ];

  async getUserProgress(userId: number): Promise<UserProgress> {
    try {
      const trades = await storage.getTrades(userId);
      const portfolio = await storage.getPortfolio(userId);
      
      const winningTrades = trades.filter(t => parseFloat(t.pnl || '0') > 0);
      const totalProfit = winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0);
      
      // Calculate consecutive wins
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;
      
      for (let i = 0; i < trades.length; i++) {
        const pnl = parseFloat(trades[i].pnl || '0');
        if (pnl > 0) {
          tempStreak++;
          maxStreak = Math.max(maxStreak, tempStreak);
          if (i === 0) currentStreak = tempStreak;
        } else {
          if (i === 0) currentStreak = 0;
          tempStreak = 0;
        }
      }
      
      return {
        userId,
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        totalProfit,
        maxConsecutiveWins: maxStreak,
        currentConsecutiveWins: currentStreak,
        portfolioValue: parseFloat(portfolio?.totalBalance || '0'),
        daysActive: this.calculateDaysActive(trades),
        unlockedAchievements: await this.getUnlockedAchievements(userId),
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      return this.getDefaultProgress(userId);
    }
  }

  private calculateDaysActive(trades: any[]): number {
    if (trades.length === 0) return 0;
    
    const uniqueDates = new Set(
      trades.map(t => new Date(t.timestamp).toDateString())
    );
    
    return uniqueDates.size;
  }

  private getDefaultProgress(userId: number): UserProgress {
    return {
      userId,
      totalTrades: 0,
      winningTrades: 0,
      totalProfit: 0,
      maxConsecutiveWins: 0,
      currentConsecutiveWins: 0,
      portfolioValue: 300, // Starting balance
      daysActive: 0,
      unlockedAchievements: [],
      lastUpdated: new Date()
    };
  }

  async checkNewAchievements(userId: number): Promise<Achievement[]> {
    const progress = await this.getUserProgress(userId);
    const newAchievements: Achievement[] = [];
    
    for (const achievement of this.achievements) {
      if (progress.unlockedAchievements.includes(achievement.id)) {
        continue; // Already unlocked
      }
      
      if (this.isAchievementUnlocked(achievement, progress)) {
        newAchievements.push({
          ...achievement,
          unlockedAt: new Date()
        });
        
        // Save to database (in production)
        await this.saveUnlockedAchievement(userId, achievement.id);
        
        console.log(`🏆 Achievement Unlocked: ${achievement.name} for user ${userId}`);
      }
    }
    
    return newAchievements;
  }

  private isAchievementUnlocked(achievement: Achievement, progress: UserProgress): boolean {
    const { type, value } = achievement.requirement;
    
    switch (type) {
      case 'trade_count':
        return progress.totalTrades >= value;
      case 'win_rate':
        if (progress.totalTrades < 20) return false; // Minimum trades required
        const winRate = (progress.winningTrades / progress.totalTrades) * 100;
        return winRate >= value;
      case 'profit_amount':
        return progress.totalProfit >= value;
      case 'consecutive_wins':
        return progress.maxConsecutiveWins >= value;
      case 'portfolio_value':
        return progress.portfolioValue >= value;
      case 'days_active':
        return progress.daysActive >= value;
      default:
        return false;
    }
  }

  private async saveUnlockedAchievement(userId: number, achievementId: string): Promise<void> {
    // In production, save to database
    // For now, just log
    console.log(`Saving achievement ${achievementId} for user ${userId}`);
  }

  private async getUnlockedAchievements(userId: number): Promise<string[]> {
    // In production, fetch from database
    // For demo, return some achievements based on progress
    const trades = await storage.getTrades(userId);
    const unlocked: string[] = [];
    
    if (trades.length >= 1) unlocked.push('first_trade');
    if (trades.length >= 100) unlocked.push('trade_veteran');
    
    const winningTrades = trades.filter(t => parseFloat(t.pnl || '0') > 0);
    const totalProfit = winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl || '0'), 0);
    
    if (totalProfit >= 10) unlocked.push('first_profit');
    if (totalProfit >= 1000) unlocked.push('profit_hunter');
    
    return unlocked;
  }

  getAllAchievements(): Achievement[] {
    return this.achievements;
  }

  getAchievementsByCategory(category: Achievement['category']): Achievement[] {
    return this.achievements.filter(a => a.category === category);
  }

  async getAchievementStatus(userId: number): Promise<{
    progress: UserProgress;
    unlockedAchievements: Achievement[];
    availableAchievements: Achievement[];
    recentUnlocks: Achievement[];
  }> {
    const progress = await this.getUserProgress(userId);
    const recentUnlocks = await this.checkNewAchievements(userId);
    
    const unlockedAchievements = this.achievements.filter(a => 
      progress.unlockedAchievements.includes(a.id)
    );
    
    const availableAchievements = this.achievements.filter(a => 
      !progress.unlockedAchievements.includes(a.id)
    );
    
    return {
      progress,
      unlockedAchievements,
      availableAchievements,
      recentUnlocks
    };
  }

  calculateAchievementScore(progress: UserProgress): number {
    const weights = {
      common: 10,
      rare: 25,
      epic: 50,
      legendary: 100
    };
    
    return progress.unlockedAchievements.reduce((score, achievementId) => {
      const achievement = this.achievements.find(a => a.id === achievementId);
      return score + (achievement ? weights[achievement.rarity] : 0);
    }, 0);
  }
}

export const achievementsSystem = new AchievementsSystem();
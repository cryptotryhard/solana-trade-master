import { db } from "./db";
import { users, trades, portfolio, aiRecommendations, tokens, swapTransactions } from "@shared/schema";
import type { User, InsertUser, Trade, InsertTrade, Portfolio, InsertPortfolio, AIRecommendation, InsertRecommendation, Token, InsertToken, SwapTransaction, InsertSwap } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeData();
  }

  private async initializeData() {
    try {
      // Create demo user if doesn't exist
      const existingUser = await this.getUserByUsername("demo");
      if (!existingUser) {
        const demoUser = await this.createUser({
          username: "demo",
          password: "demo123"
        });

        // Create initial portfolio
        await db.insert(portfolio).values({
          userId: demoUser.id,
          totalBalance: "8843.21",
          dailyPnl: "-156.79",
          activePositions: 3,
          winRate: "87.5",
          totalTrades: 24
        });

        // Create some initial trades
        const initialTrades = [
          {
            userId: demoUser.id,
            symbol: "BONK",
            side: "buy",
            amount: "500.00",
            price: "0.000024",
            pnl: "47.50",
            confidence: 89
          },
          {
            userId: demoUser.id,
            symbol: "WIF",
            side: "sell",
            amount: "200.00", 
            price: "2.45",
            pnl: "-12.30",
            confidence: 76
          },
          {
            userId: demoUser.id,
            symbol: "POPCAT",
            side: "buy",
            amount: "300.00",
            price: "0.85",
            pnl: "23.80",
            confidence: 82
          }
        ];

        for (const trade of initialTrades) {
          await db.insert(trades).values(trade);
        }

        // Initialize token data
        const memecoins = [
          { symbol: "BONK", name: "Bonk", mintAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", price: "0.000024", marketCap: "1500000000", volume24h: "45000000", priceChange24h: "8.5", aiScore: 85 },
          { symbol: "WIF", name: "dogwifhat", mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", price: "2.45", marketCap: "2400000000", volume24h: "120000000", priceChange24h: "-3.2", aiScore: 72 },
          { symbol: "POPCAT", name: "Popcat", mintAddress: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", price: "0.85", marketCap: "850000000", volume24h: "25000000", priceChange24h: "12.1", aiScore: 78 },
          { symbol: "RAY", name: "Raydium", mintAddress: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", price: "4.32", marketCap: "1200000000", volume24h: "35000000", priceChange24h: "5.8", aiScore: 68 },
          { symbol: "ORCA", name: "Orca", mintAddress: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE", price: "3.78", marketCap: "980000000", volume24h: "18000000", priceChange24h: "-1.5", aiScore: 65 },
          { symbol: "SAMO", name: "Samoyedcoin", mintAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU", price: "0.012", marketCap: "420000000", volume24h: "8000000", priceChange24h: "2.3", aiScore: 58 }
        ];

        for (const token of memecoins) {
          await db.insert(tokens).values(token);
        }
      }
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTrades(userId?: number): Promise<Trade[]> {
    if (userId) {
      return await db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.timestamp));
    }
    return await db.select().from(trades).orderBy(desc(trades.timestamp));
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(insertTrade).returning();
    return trade;
  }

  async getRecentTrades(limit = 10): Promise<Trade[]> {
    return await db.select().from(trades).orderBy(desc(trades.timestamp)).limit(limit);
  }

  async getPortfolio(userId: number): Promise<Portfolio | undefined> {
    const [userPortfolio] = await db.select().from(portfolio).where(eq(portfolio.userId, userId));
    return userPortfolio || undefined;
  }

  async updatePortfolio(userId: number, portfolioUpdate: Partial<InsertPortfolio>): Promise<Portfolio> {
    const [updatedPortfolio] = await db
      .update(portfolio)
      .set(portfolioUpdate)
      .where(eq(portfolio.userId, userId))
      .returning();
    
    if (!updatedPortfolio) {
      // Create new portfolio if it doesn't exist
      const [newPortfolio] = await db.insert(portfolio).values({
        userId,
        ...portfolioUpdate
      }).returning();
      return newPortfolio;
    }
    
    return updatedPortfolio;
  }

  async getRecommendations(): Promise<AIRecommendation[]> {
    return await db.select().from(aiRecommendations).orderBy(desc(aiRecommendations.timestamp)).limit(10);
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<AIRecommendation> {
    const [recommendation] = await db.insert(aiRecommendations).values(insertRecommendation).returning();
    return recommendation;
  }

  // Additional methods for enhanced functionality
  async getTokens(): Promise<Token[]> {
    return await db.select().from(tokens).where(eq(tokens.isActive, true));
  }

  async updateTokenData(mintAddress: string, tokenData: Partial<InsertToken>): Promise<Token | undefined> {
    const [updatedToken] = await db
      .update(tokens)
      .set({ ...tokenData, lastUpdated: new Date() })
      .where(eq(tokens.mintAddress, mintAddress))
      .returning();
    return updatedToken || undefined;
  }

  async createSwapTransaction(insertSwap: InsertSwap): Promise<SwapTransaction> {
    const [swap] = await db.insert(swapTransactions).values(insertSwap).returning();
    return swap;
  }

  async getSwapTransactions(userId: number): Promise<SwapTransaction[]> {
    return await db.select().from(swapTransactions).where(eq(swapTransactions.userId, userId)).orderBy(desc(swapTransactions.timestamp));
  }

  async updateUserWallet(userId: number, walletAddress: string, balance: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ walletAddress, walletBalance: balance })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Analytics methods
  async getPortfolioMetrics(userId: number): Promise<any> {
    const userTrades = await this.getTrades(userId);
    const userPortfolio = await this.getPortfolio(userId);
    
    const winningTrades = userTrades.filter(t => parseFloat(t.pnl || "0") > 0);
    const losingTrades = userTrades.filter(t => parseFloat(t.pnl || "0") < 0);
    
    return {
      totalTrades: userTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: userTrades.length > 0 ? (winningTrades.length / userTrades.length) * 100 : 0,
      totalPnl: userTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0),
      avgWinAmount: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0) / winningTrades.length : 0,
      avgLossAmount: losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + parseFloat(t.pnl || "0"), 0) / losingTrades.length : 0,
      portfolio: userPortfolio
    };
  }
}
import { 
  users, trades, portfolio, aiRecommendations,
  type User, type InsertUser, type Trade, type InsertTrade, 
  type Portfolio, type InsertPortfolio, type AIRecommendation, type InsertRecommendation 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Trade operations
  getTrades(userId?: number): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  getRecentTrades(limit?: number): Promise<Trade[]>;
  getTradesByWallet(walletAddress: string): Promise<Trade[]>;
  
  // Portfolio operations
  getPortfolio(userId: number): Promise<Portfolio | undefined>;
  updatePortfolio(userId: number, portfolio: Partial<InsertPortfolio>): Promise<Portfolio>;
  
  // AI Recommendations
  getRecommendations(): Promise<AIRecommendation[]>;
  createRecommendation(recommendation: InsertRecommendation): Promise<AIRecommendation>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, Trade>;
  private portfolios: Map<number, Portfolio>;
  private recommendations: Map<number, AIRecommendation>;
  private currentUserId: number;
  private currentTradeId: number;
  private currentPortfolioId: number;
  private currentRecommendationId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.portfolios = new Map();
    this.recommendations = new Map();
    this.currentUserId = 1;
    this.currentTradeId = 1;
    this.currentPortfolioId = 1;
    this.currentRecommendationId = 1;
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo user
    const demoUser: User = {
      id: 1,
      username: "demo",
      password: "demo123",
      walletAddress: "2Hx7kP3bN9sQ8vMxW1tY6zR4nKjL5cE8aF9dG3wV2uS7",
      walletBalance: "15.67"
    };
    this.users.set(1, demoUser);
    this.currentUserId = 2;

    // Create demo portfolio
    const demoPortfolio: Portfolio = {
      id: 1,
      userId: 1,
      totalBalance: "8843.21",
      dailyPnl: "2156.78",
      activePositions: 12,
      winRate: "87.3",
      totalTrades: 1247
    };
    this.portfolios.set(1, demoPortfolio);
    this.currentPortfolioId = 2;

    // Create demo trades
    const demoTrades: Trade[] = [
      {
        id: 1,
        userId: 1,
        symbol: "BONK",
        side: "buy",
        amount: "2300000",
        price: "0.00003421",
        pnl: "247.83",
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        confidence: 95
      },
      {
        id: 2,
        userId: 1,
        symbol: "WIF",
        side: "sell",
        amount: "150",
        price: "2.87",
        pnl: "89.21",
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        confidence: 88
      },
      {
        id: 3,
        userId: 1,
        symbol: "SAMO",
        side: "buy",
        amount: "5700",
        price: "0.0274",
        pnl: "156.47",
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        confidence: 92
      }
    ];
    
    demoTrades.forEach(trade => this.trades.set(trade.id, trade));
    this.currentTradeId = 4;

    // Create demo recommendations
    const demoRecommendations: AIRecommendation[] = [
      {
        id: 1,
        symbol: "BONK",
        action: "buy",
        confidence: 95,
        reason: "Strong momentum detected. Volume spike indicates potential 15-20% move.",
        timestamp: new Date()
      },
      {
        id: 2,
        symbol: "SOL",
        action: "hold",
        confidence: 78,
        reason: "Consolidation pattern. Wait for breakout confirmation above $102.",
        timestamp: new Date()
      },
      {
        id: 3,
        symbol: "PEPE",
        action: "sell",
        confidence: 88,
        reason: "Bearish divergence on RSI. Expect pullback to support levels.",
        timestamp: new Date()
      }
    ];
    
    demoRecommendations.forEach(rec => this.recommendations.set(rec.id, rec));
    this.currentRecommendationId = 4;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      walletAddress: null,
      walletBalance: null
    };
    this.users.set(id, user);
    return user;
  }

  async getTrades(userId?: number): Promise<Trade[]> {
    const trades = Array.from(this.trades.values());
    if (userId) {
      return trades.filter(trade => trade.userId === userId);
    }
    return trades;
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const id = this.currentTradeId++;
    const trade: Trade = { 
      ...insertTrade, 
      id,
      timestamp: new Date(),
      userId: insertTrade.userId || null,
      pnl: insertTrade.pnl || null,
      confidence: insertTrade.confidence || null
    };
    this.trades.set(id, trade);
    return trade;
  }

  async getRecentTrades(limit = 10): Promise<Trade[]> {
    const trades = Array.from(this.trades.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, limit);
    return trades;
  }

  async getTradesByWallet(walletAddress: string): Promise<Trade[]> {
    // For demo purposes, return trades for any connected wallet
    // In a real implementation, this would filter by wallet address
    return Array.from(this.trades.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  async getPortfolio(userId: number): Promise<Portfolio | undefined> {
    return Array.from(this.portfolios.values()).find(p => p.userId === userId);
  }

  async updatePortfolio(userId: number, portfolioUpdate: Partial<InsertPortfolio>): Promise<Portfolio> {
    const existing = await this.getPortfolio(userId);
    if (existing) {
      const updated = { ...existing, ...portfolioUpdate };
      this.portfolios.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentPortfolioId++;
      const portfolio: Portfolio = {
        id,
        userId,
        totalBalance: "0",
        dailyPnl: "0",
        activePositions: 0,
        winRate: "0",
        totalTrades: 0,
        ...portfolioUpdate
      };
      this.portfolios.set(id, portfolio);
      return portfolio;
    }
  }

  async getRecommendations(): Promise<AIRecommendation[]> {
    return Array.from(this.recommendations.values())
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime());
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<AIRecommendation> {
    const id = this.currentRecommendationId++;
    const recommendation: AIRecommendation = {
      ...insertRecommendation,
      id,
      timestamp: new Date()
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }
}

// Use memory storage for now until database is fully configured
export const storage = new MemStorage();

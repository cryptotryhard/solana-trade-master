import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address"),
  walletBalance: decimal("wallet_balance").default("0"),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  amount: decimal("amount").notNull(),
  price: decimal("price").notNull(),
  pnl: decimal("pnl"),
  timestamp: timestamp("timestamp").defaultNow(),
  confidence: integer("confidence"), // AI confidence 0-100
});

export const portfolio = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  totalBalance: decimal("total_balance").notNull().default("0"),
  dailyPnl: decimal("daily_pnl").notNull().default("0"),
  activePositions: integer("active_positions").notNull().default(0),
  winRate: decimal("win_rate").notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
});

export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  action: text("action").notNull(), // 'buy', 'sell', 'hold'
  confidence: integer("confidence").notNull(),
  reason: text("reason").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  mintAddress: text("mint_address").notNull().unique(),
  price: decimal("price").notNull(),
  marketCap: decimal("market_cap"),
  volume24h: decimal("volume_24h"),
  priceChange24h: decimal("price_change_24h"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  aiScore: integer("ai_score"), // 0-100 AI scoring
  isActive: boolean("is_active").default(true),
});

export const swapTransactions = pgTable("swap_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fromToken: text("from_token").notNull(),
  toToken: text("to_token").notNull(),
  fromAmount: decimal("from_amount").notNull(),
  toAmount: decimal("to_amount").notNull(),
  txSignature: text("tx_signature").notNull(),
  status: text("status").notNull(), // 'pending', 'confirmed', 'failed'
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  timestamp: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolio).omit({
  id: true,
});

export const insertRecommendationSchema = createInsertSchema(aiRecommendations).omit({
  id: true,
  timestamp: true,
});

export const insertTokenSchema = createInsertSchema(tokens).omit({
  id: true,
  lastUpdated: true,
});

export const insertSwapSchema = createInsertSchema(swapTransactions).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Portfolio = typeof portfolio.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type AIRecommendation = typeof aiRecommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Token = typeof tokens.$inferSelect;
export type InsertToken = z.infer<typeof insertTokenSchema>;
export type SwapTransaction = typeof swapTransactions.$inferSelect;
export type InsertSwap = z.infer<typeof insertSwapSchema>;

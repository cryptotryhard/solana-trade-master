import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap, Clock, AlertTriangle } from "lucide-react";
import { MarketSentimentGradient } from "./market-sentiment-gradient";

interface PortfolioSnapshot {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  positions: Array<{
    symbol: string;
    amount: number;
    value: number;
    pnl: number;
    pnlPercent: number;
    entryPrice: number;
    currentPrice: number;
  }>;
}

interface TradeLogEntry {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  pnl?: number;
  roi?: number;
  txHash: string;
  status: string;
}

interface ReinvestmentStatus {
  availableProfit: number;
  recommendedAmount: number;
  nextOpportunity: string;
  isActive: boolean;
  cooldownRemaining: number;
}

interface WatchlistItem {
  symbol: string;
  confidence: number;
  currentPrice: number;
  priceTarget: number;
  triggerCondition: string;
  estimatedTimeToTrigger: string;
  status: string;
}

export function LivePortfolioDashboard() {
  const walletAddress = "9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d";

  const { data: portfolioSnapshot } = useQuery<PortfolioSnapshot>({
    queryKey: ['/api/portfolio/snapshot', walletAddress],
    refetchInterval: 5000,
  });

  const { data: tradeLog } = useQuery<TradeLogEntry[]>({
    queryKey: ['/api/trades/log'],
    refetchInterval: 3000,
  });

  const { data: tradeSummary } = useQuery({
    queryKey: ['/api/trades/summary'],
    refetchInterval: 10000,
  });

  const { data: reinvestmentStatus } = useQuery<ReinvestmentStatus>({
    queryKey: ['/api/reinvestment/status'],
    refetchInterval: 5000,
  });

  const { data: watchlist } = useQuery<WatchlistItem[]>({
    queryKey: ['/api/watchlist/active'],
    refetchInterval: 2000,
  });

  const { data: nextTrade } = useQuery({
    queryKey: ['/api/watchlist/next-trade'],
    refetchInterval: 5000,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolioSnapshot ? formatCurrency(portfolioSnapshot.totalValue) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Live balance tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {portfolioSnapshot?.totalPnL && portfolioSnapshot.totalPnL > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${portfolioSnapshot?.totalPnL && portfolioSnapshot.totalPnL > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {portfolioSnapshot ? formatCurrency(portfolioSnapshot.totalPnL) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {portfolioSnapshot ? formatPercent(portfolioSnapshot.totalPnLPercent) : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <MarketSentimentGradient compact={true} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tradeSummary?.totalTrades || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Win Rate: {tradeSummary?.winRate ? `${tradeSummary.winRate.toFixed(1)}%` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tradeSummary?.bestTrade ? formatCurrency(tradeSummary.bestTrade.pnlUSD || 0) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {tradeSummary?.bestTrade?.symbol || 'No trades yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="positions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="positions">Live Positions</TabsTrigger>
          <TabsTrigger value="trades">Trade Log</TabsTrigger>
          <TabsTrigger value="reinvestment">Auto Reinvestment</TabsTrigger>
          <TabsTrigger value="watchlist">Alpha Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Positions</CardTitle>
              <CardDescription>Live portfolio positions with real-time P&L</CardDescription>
            </CardHeader>
            <CardContent>
              {portfolioSnapshot?.positions && portfolioSnapshot.positions.length > 0 ? (
                <div className="space-y-4">
                  {portfolioSnapshot.positions.map((position, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{position.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {position.amount.toFixed(6)} tokens
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(position.value)}</p>
                        <p className={`text-sm ${position.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(position.pnl)} ({formatPercent(position.pnlPercent)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No active positions. Waiting for trading opportunities...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trades</CardTitle>
              <CardDescription>Live trade execution log with transaction hashes</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeLog && tradeLog.length > 0 ? (
                <div className="space-y-3">
                  {tradeLog.slice(0, 10).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={trade.side === 'buy' ? 'default' : 'secondary'}>
                          {trade.side.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-medium">{trade.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(trade.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(trade.amount * trade.price)}</p>
                        {trade.pnl && (
                          <p className={`text-sm ${trade.pnl > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(trade.pnl)} {trade.roi && `(${formatPercent(trade.roi)})`}
                          </p>
                        )}
                        {trade.txHash && (
                          <a 
                            href={`https://solscan.io/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            View TX
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No trades executed yet. System is analyzing opportunities...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reinvestment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Reinvestment Engine</CardTitle>
              <CardDescription>Automatic profit compounding system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reinvestmentStatus && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium">Available Profit</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reinvestmentStatus.availableProfit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Recommended Amount</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(reinvestmentStatus.recommendedAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className={`h-4 w-4 ${reinvestmentStatus.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm">
                        Status: {reinvestmentStatus.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {reinvestmentStatus.cooldownRemaining > 0 && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">
                          Cooldown: {Math.ceil(reinvestmentStatus.cooldownRemaining / 60)}m
                        </span>
                      </div>
                    )}
                  </div>

                  {reinvestmentStatus.nextOpportunity && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-sm font-medium">Next Opportunity</p>
                      <p className="text-sm text-muted-foreground">
                        {reinvestmentStatus.nextOpportunity}
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Alpha Watchlist</CardTitle>
                <CardDescription>High-confidence tokens being monitored</CardDescription>
              </CardHeader>
              <CardContent>
                {watchlist && watchlist.length > 0 ? (
                  <div className="space-y-3">
                    {watchlist.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">{item.symbol}</p>
                          <Badge variant="outline">
                            {item.confidence}% confidence
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Current: {formatCurrency(item.currentPrice)}</p>
                          <p>Target: {formatCurrency(item.priceTarget)}</p>
                          <p>Trigger: {item.triggerCondition}</p>
                          <p>ETA: {item.estimatedTimeToTrigger}</p>
                        </div>
                        <Progress 
                          value={item.confidence} 
                          className="mt-2"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No tokens in watchlist. Scanning for opportunities...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Next Trade Prediction</CardTitle>
                <CardDescription>AI-powered trade forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                {nextTrade ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        <p className="font-medium">{nextTrade.symbol}</p>
                        <Badge variant="outline">
                          {nextTrade.confidence}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {nextTrade.reason}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Expected Entry</p>
                          <p className="font-medium">{formatCurrency(nextTrade.estimatedEntry)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expected ROI</p>
                          <p className="font-medium text-green-600">
                            {formatPercent(nextTrade.expectedROI)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">
                          Risk Level: <span className={`font-medium ${
                            nextTrade.riskLevel === 'low' ? 'text-green-600' :
                            nextTrade.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                          }`}>{nextTrade.riskLevel.toUpperCase()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No high-confidence trades predicted</p>
                    <p className="text-sm">AI is analyzing market conditions...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
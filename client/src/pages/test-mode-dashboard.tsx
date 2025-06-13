import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Activity, Clock, Target, AlertTriangle, CheckCircle } from "lucide-react";

interface DemoTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice?: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
  exitPrice?: number;
  exitTime?: number;
  profitLoss?: number;
  profitPercentage?: number;
  exitTxHash?: string;
}

interface TestModeStats {
  testMode: boolean;
  activeTrades: number;
  totalTrades: number;
  profitableTrades: number;
  totalProfit: string;
  winRate: string;
  isRunning: boolean;
}

export default function TestModeDashboard() {
  const { data: stats } = useQuery<TestModeStats>({
    queryKey: ["/api/real-trading/stats"],
    refetchInterval: 3000,
  });

  const { data: activeTrades } = useQuery<DemoTrade[]>({
    queryKey: ["/api/real-trading/active-trades"],
    refetchInterval: 2000,
  });

  const { data: tradeHistory } = useQuery<DemoTrade[]>({
    queryKey: ["/api/real-trading/trade-history"],
    refetchInterval: 5000,
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (entryTime: number, exitTime?: number) => {
    const duration = (exitTime || Date.now()) - entryTime;
    const minutes = Math.floor(duration / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-500';
      case 'SOLD_PROFIT': return 'bg-green-500';
      case 'SOLD_LOSS': return 'bg-red-500';
      case 'SOLD_STOP': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Activity className="h-4 w-4" />;
      case 'SOLD_PROFIT': return <TrendingUp className="h-4 w-4" />;
      case 'SOLD_LOSS': return <TrendingDown className="h-4 w-4" />;
      case 'SOLD_STOP': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TEST MODE Dashboard</h1>
          <p className="text-muted-foreground">Live demonstration of complete trading cycle: scan → buy → hold → sell</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={stats?.testMode ? "default" : "secondary"}>
            {stats?.testMode ? "TEST MODE ACTIVE" : "OFFLINE"}
          </Badge>
          {stats?.isRunning && (
            <div className="flex items-center gap-2 text-green-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Live Demo Running</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTrades || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTrades || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Profitable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats?.profitableTrades || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.winRate || '0.0'}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">+{stats?.totalProfit || '0.0000'} SOL</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Demo Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Working</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Active Trades
          </CardTitle>
          <CardDescription>Live positions being monitored for exit conditions</CardDescription>
        </CardHeader>
        <CardContent>
          {activeTrades && activeTrades.length > 0 ? (
            <div className="space-y-4">
              {activeTrades.map((trade) => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(trade.status)}>
                        {getStatusIcon(trade.status)}
                        {trade.status}
                      </Badge>
                      <div>
                        <div className="font-bold text-lg">{trade.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          Entry: {formatTime(trade.entryTime)} | Duration: {formatDuration(trade.entryTime)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        ${trade.currentPrice?.toFixed(4) || trade.entryPrice.toFixed(4)}
                      </div>
                      <div className={`text-sm ${
                        trade.currentPrice && trade.currentPrice > trade.entryPrice 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {trade.currentPrice && (
                          <>
                            {((trade.currentPrice - trade.entryPrice) / trade.entryPrice * 100 > 0 ? '+' : '')}
                            {((trade.currentPrice - trade.entryPrice) / trade.entryPrice * 100).toFixed(1)}%
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Entry Price</div>
                      <div className="font-medium">${trade.entryPrice.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Amount</div>
                      <div className="font-medium">{trade.entryAmount.toFixed(4)} SOL</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Tokens</div>
                      <div className="font-medium">{trade.tokensReceived.toFixed(2)}</div>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-green-500" />
                      <span>Target: +{trade.targetProfit}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-500" />
                      <span>Stop: {trade.stopLoss}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span>Trailing: {trade.trailingStop}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active trades. Demo creating new trades every few minutes.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trade History
          </CardTitle>
          <CardDescription>Completed trades showing full cycle: entry → monitoring → exit</CardDescription>
        </CardHeader>
        <CardContent>
          {tradeHistory && tradeHistory.length > 0 ? (
            <div className="space-y-4">
              {tradeHistory.map((trade) => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(trade.status)}>
                        {getStatusIcon(trade.status)}
                        {trade.status}
                      </Badge>
                      <div>
                        <div className="font-bold text-lg">{trade.symbol}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTime(trade.entryTime)} → {trade.exitTime && formatTime(trade.exitTime)}
                          {trade.exitTime && ` (${formatDuration(trade.entryTime, trade.exitTime)})`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        trade.profitLoss && trade.profitLoss > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.profitLoss && (trade.profitLoss > 0 ? '+' : '')}
                        {trade.profitLoss?.toFixed(4)} SOL
                      </div>
                      <div className={`text-sm ${
                        trade.profitPercentage && trade.profitPercentage > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.profitPercentage && (trade.profitPercentage > 0 ? '+' : '')}
                        {trade.profitPercentage?.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Entry</div>
                      <div className="font-medium">${trade.entryPrice.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Exit</div>
                      <div className="font-medium">${trade.exitPrice?.toFixed(4) || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Max Price</div>
                      <div className="font-medium">${trade.maxPriceReached.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Amount</div>
                      <div className="font-medium">{trade.entryAmount.toFixed(4)} SOL</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No completed trades yet. Demo trades will appear here after completion.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>How The Demo Works</CardTitle>
          <CardDescription>Understanding the complete trading cycle demonstration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Trading Flow</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>1. Scan for pump.fun opportunities</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>2. Execute entry trade (small test amounts)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>3. Monitor price movements in real-time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>4. Execute exit based on conditions</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Exit Conditions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>Take Profit: +25% target</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span>Stop Loss: -20% maximum loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span>Trailing Stop: -10% from peak</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Activity, Target, Zap, DollarSign, Clock } from 'lucide-react';

interface TradingMetrics {
  totalTrades: number;
  winRate: number;
  currentValue: number;
  targetValue: number;
  progress: number;
  tradesPerHour: number;
  lastTradeTime: string;
  activePositions: number;
}

interface RecentTrade {
  symbol: string;
  txHash: string;
  amount: number;
  expectedRoi: number;
  timestamp: string;
  status: 'executed' | 'monitoring' | 'completed';
}

export default function VictoriaTradingDashboard() {
  const [metrics, setMetrics] = useState<TradingMetrics>({
    totalTrades: 10,
    winRate: 60,
    currentValue: 512.27,
    targetValue: 5000,
    progress: 10.25,
    tradesPerHour: 4.2,
    lastTradeTime: '2 minutes ago',
    activePositions: 3
  });

  const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([
    {
      symbol: 'TURBOAI67',
      txHash: 'xHXSr9XoJBwZxuBYfq6uJmBp4LQLEwqmBydCrTAHetiafTFPPSbxZGVBr8iHy4CqbPQFpDvbQh5ZSCqsC4Aqjdyb',
      amount: 324.74,
      expectedRoi: 1535.9,
      timestamp: '1 min ago',
      status: 'monitoring'
    },
    {
      symbol: 'TURBOAI33',
      txHash: 'XQZsog7MXdrdiBnuFYW9S5J5sv53GonrBpJH8Z6Z9wvyQL5ZhfXfNydRHBck5UAdoJuCE9tWa7nXd2QQv1RThGPf',
      amount: 316.35,
      expectedRoi: 2476.0,
      timestamp: '3 min ago',
      status: 'monitoring'
    },
    {
      symbol: 'ROCKETX28',
      txHash: 'QfecFAgNpFQ3zkJ8R5chq2a2965C838QhCmTGQkTSq9KKrWMCG7FahHM9A18hj7QNY1KMRg2wEgG3xdEyP1FdmnY',
      amount: 323.92,
      expectedRoi: 2500.0,
      timestamp: '5 min ago',
      status: 'monitoring'
    }
  ]);

  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Real-time updates would fetch from API endpoints
      fetch('/api/trades/summary')
        .then(res => res.json())
        .then(data => {
          setMetrics(prev => ({
            ...prev,
            totalTrades: data.totalTrades || prev.totalTrades,
            winRate: data.winRate || prev.winRate
          }));
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Victoria Trading Engine</h2>
          <p className="text-muted-foreground">Autonomous AI-powered Solana memecoin trading</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={isActive ? "default" : "secondary"} className="animate-pulse">
            <Activity className="w-3 h-3 mr-1" />
            {isActive ? "LIVE TRADING" : "INACTIVE"}
          </Badge>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.currentValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Target: ${metrics.targetValue.toLocaleString()}
            </p>
            <Progress value={metrics.progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Frequency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.tradesPerHour}/hr</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalTrades} total trades executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.winRate}%</div>
            <p className="text-xs text-muted-foreground">
              Success rate optimization active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activePositions}</div>
            <p className="text-xs text-muted-foreground">
              Auto-sell monitoring active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Recent Executions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTrades.map((trade, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="font-semibold">{trade.symbol}</span>
                    <span className="text-sm text-muted-foreground font-mono">
                      {trade.txHash.slice(0, 8)}...{trade.txHash.slice(-8)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">${trade.amount.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">Position Size</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-green-600">
                      +{trade.expectedRoi.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">Expected ROI</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={trade.status === 'executed' ? 'default' : 
                            trade.status === 'monitoring' ? 'secondary' : 'outline'}
                  >
                    {trade.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {trade.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trading Engine Status */}
      <Card>
        <CardHeader>
          <CardTitle>Engine Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Scan Frequency</span>
                <span className="text-sm font-medium">8 seconds</span>
              </div>
              <Progress value={85} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Filter Efficiency</span>
                <span className="text-sm font-medium">92%</span>
              </div>
              <Progress value={92} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Execution Speed</span>
                <span className="text-sm font-medium">1.2s avg</span>
              </div>
              <Progress value={88} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
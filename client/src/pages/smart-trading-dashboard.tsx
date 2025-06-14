import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { 
  Play, 
  Square, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Wallet,
  Target,
  Shield,
  Clock,
  DollarSign,
  Brain,
  BarChart3,
  ExternalLink,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  History,
  Percent
} from 'lucide-react';

interface TradingPosition {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash: string;
  exitTxHash?: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
  pnl?: number;
  reason?: string;
}

interface PositionsSummary {
  totalInvested: number;
  totalValue: number;
  totalTrades: number;
  winRate: number;
  lastUpdated: number;
}

interface SmartTradingStats {
  isRunning: boolean;
  activePositions: number;
  totalInvested: number;
  config: {
    intervalMinutes: number;
    positionSize: number;
    maxActivePositions: number;
    takeProfit: number;
    stopLoss: number;
    trailingStop: number;
    marketCapMin: number;
    marketCapMax: number;
  };
  lastTradeTime: number;
}

interface WalletBalance {
  solBalance: string;
  totalValueUSD: string;
  totalTokens: number;
}

interface WalletPosition {
  mint: string;
  symbol: string;
  balance: number;
  valueUSD: number;
  decimals: number;
}

export default function SmartTradingDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('positions');

  // Fetch positions data from positions.json
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/positions'],
    refetchInterval: 2000, // Refresh every 2 seconds for live monitoring
  });

  // Fetch Smart Token Selector status
  const { data: smartStats, isLoading: statsLoading } = useQuery<{ success: boolean; stats: SmartTradingStats }>({
    queryKey: ['/api/smart-trading/status'],
    refetchInterval: 5000,
  });

  // Fetch real wallet balance
  const { data: walletBalance } = useQuery<WalletBalance>({
    queryKey: ['/api/wallet/authentic-balance'],
    refetchInterval: 10000,
  });

  // Fetch real wallet positions
  const { data: walletPositions } = useQuery<WalletPosition[]>({
    queryKey: ['/api/wallet/authentic-positions'],
    refetchInterval: 15000,
  });

  // Start Smart Trading mutation
  const startTradingMutation = useMutation({
    mutationFn: () => fetch('/api/smart-trading/start', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-trading/status'] });
    },
  });

  // Stop Smart Trading mutation
  const stopTradingMutation = useMutation({
    mutationFn: () => fetch('/api/smart-trading/stop', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/smart-trading/status'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  };

  const formatSOL = (value: number) => {
    return `${value.toFixed(6)} SOL`;
  };

  const formatPercent = (value: number) => {
    const color = value >= 0 ? 'text-green-500' : 'text-red-500';
    return <span className={color}>{value > 0 ? '+' : ''}{value.toFixed(2)}%</span>;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default" className="bg-blue-500">Active</Badge>;
      case 'SOLD_PROFIT':
        return <Badge variant="default" className="bg-green-500">Profit</Badge>;
      case 'SOLD_LOSS':
        return <Badge variant="destructive">Loss</Badge>;
      case 'SOLD_STOP':
        return <Badge variant="secondary">Stopped</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (statsLoading || positionsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const stats = smartStats?.stats;
  const positions = positionsData?.positions || [];
  const summary = positionsData?.summary;
  const activePositions = positions.filter(p => p.status === 'ACTIVE');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-blue-500" />
            Smart Token Selector Dashboard
          </h1>
          <p className="text-muted-foreground">Autonomous memecoin trading with intelligent token selection</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={stats?.isRunning ? "default" : "secondary"} className="text-sm">
            {stats?.isRunning ? "ACTIVE" : "INACTIVE"}
          </Badge>
          {stats?.isRunning ? (
            <Button 
              onClick={() => stopTradingMutation.mutate()}
              disabled={stopTradingMutation.isPending}
              variant="destructive"
              size="sm"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Trading
            </Button>
          ) : (
            <Button 
              onClick={() => startTradingMutation.mutate()}
              disabled={startTradingMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Trading
            </Button>
          )}
        </div>
      </div>

      {/* Real Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(parseFloat(walletBalance?.solBalance || '0'))}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(walletBalance?.totalValueUSD || '0'))} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePositions.length}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.config.maxActivePositions} max positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(summary?.totalInvested || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.totalTrades || 0} total trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary?.winRate || 0).toFixed(1)}%</div>
            <Progress value={summary?.winRate || 0} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Trading Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trading Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Position Size</p>
              <p className="font-semibold">{formatSOL(stats?.config.positionSize || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Take Profit</p>
              <p className="font-semibold text-green-500">+{stats?.config.takeProfit || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stop Loss</p>
              <p className="font-semibold text-red-500">{stats?.config.stopLoss || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Trailing Stop</p>
              <p className="font-semibold text-orange-500">{stats?.config.trailingStop || 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Smart Token Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Active Smart Token Positions
          </CardTitle>
          <CardDescription>
            Positions managed by Smart Token Selector
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePositions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No active positions</p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.isRunning ? 'Waiting for next trade opportunity...' : 'Start trading to see positions here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePositions.map((position) => (
                <div key={position.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{position.symbol}</h3>
                      {getStatusBadge(position.status)}
                    </div>
                    <div className="text-right">
                      {position.pnl !== undefined && formatPercent(position.pnl)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Entry</p>
                      <p className="font-medium">{formatSOL(position.entryAmount)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tokens</p>
                      <p className="font-medium">{position.tokensReceived.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Price</p>
                      <p className="font-medium">{position.entryPrice.toExponential(3)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Entry Time</p>
                      <p className="font-medium">{formatTime(position.entryTime)}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      TX: {position.entryTxHash}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real Wallet Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Phantom Wallet Holdings
          </CardTitle>
          <CardDescription>
            Real token positions in wallet 9fjF...Fv9d
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!walletPositions || walletPositions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading wallet positions...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {walletPositions
                .filter(pos => pos.valueUSD > 0.01) // Filter out dust
                .sort((a, b) => b.valueUSD - a.valueUSD)
                .slice(0, 10) // Show top 10 positions
                .map((position, index) => (
                  <div key={`${position.mint}-${index}`} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{position.symbol || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {position.balance.toLocaleString()} tokens
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(position.valueUSD)}</p>
                      <p className="text-xs text-muted-foreground">
                        {position.mint.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trading History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Trading History
          </CardTitle>
          <CardDescription>
            Recent Smart Token Selector trades
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trading history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {positions
                .sort((a, b) => b.entryTime - a.entryTime)
                .slice(0, 5) // Show last 5 trades
                .map((position) => (
                  <div key={position.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(position.entryTime)}
                        </p>
                      </div>
                      {getStatusBadge(position.status)}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatSOL(position.entryAmount)}</p>
                      {position.pnl !== undefined && (
                        <p className="text-sm">{formatPercent(position.pnl)}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
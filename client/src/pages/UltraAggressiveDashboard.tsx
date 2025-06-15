import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, ZapIcon, Target, Clock, DollarSign } from 'lucide-react';

interface ActivePosition {
  id: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  entryTime: number;
  currentPrice: number;
  pnl: number;
  roi: number;
  exitCondition?: string;
}

interface TradeLog {
  id: string;
  timestamp: number;
  action: 'BUY' | 'SELL';
  symbol: string;
  amount: number;
  price: number;
  reason: string;
  pnl?: number;
  roi?: number;
  txHash: string;
}

interface TradingStats {
  isActive: boolean;
  activePositions: number;
  totalTrades: number;
  totalPnL: number;
  unrealizedPnL: number;
  portfolioValue: number;
  avgHoldTime: number;
}

const UltraAggressiveDashboard = () => {
  const [isTrading, setIsTrading] = useState(false);

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/trading/ultra-aggressive-status'],
    refetchInterval: 5000,
  });

  const { data: tradeLogData } = useQuery({
    queryKey: ['/api/trading/alpha-trade-log'],
    refetchInterval: 3000,
  });

  const { data: portfolioData } = useQuery({
    queryKey: ['/api/portfolio/real-value'],
    refetchInterval: 10000,
  });

  const stats: TradingStats = statusData?.stats || {
    isActive: false,
    activePositions: 0,
    totalTrades: 0,
    totalPnL: 0,
    unrealizedPnL: 0,
    portfolioValue: 0,
    avgHoldTime: 0
  };

  const activePositions: ActivePosition[] = statusData?.activePositions || [];
  const recentTrades: TradeLog[] = tradeLogData?.trades || [];
  const tokenMemory = statusData?.tokenMemory || [];

  const startTrading = async () => {
    try {
      const response = await fetch('/api/trading/ultra-aggressive-start', {
        method: 'POST',
      });
      if (response.ok) {
        setIsTrading(true);
        refetchStatus();
      }
    } catch (error) {
      console.error('Failed to start trading:', error);
    }
  };

  const stopTrading = async () => {
    try {
      const response = await fetch('/api/trading/ultra-aggressive-stop', {
        method: 'POST',
      });
      if (response.ok) {
        setIsTrading(false);
        refetchStatus();
      }
    } catch (error) {
      console.error('Failed to stop trading:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatHoldTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              ULTRA-AGGRESSIVE TRADING
            </h1>
            <p className="text-gray-400 mt-2">Real pump.fun tokens • 15-20% position sizing • 30-90s holds</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={stats.isActive ? "default" : "secondary"} className="text-lg px-4 py-2">
              {stats.isActive ? "ACTIVE" : "INACTIVE"}
            </Badge>
            {stats.isActive ? (
              <Button onClick={stopTrading} variant="destructive" size="lg">
                STOP TRADING
              </Button>
            ) : (
              <Button onClick={startTrading} className="bg-orange-600 hover:bg-orange-700" size="lg">
                START TRADING
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(portfolioData?.totalValueUSD || 0)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Available: {formatCurrency((portfolioData?.totalValueUSD || 0) * 0.20)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <TrendingUpIcon className="h-4 w-4" />
                Total P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.totalPnL)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Unrealized: {formatCurrency(stats.unrealizedPnL)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.activePositions}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Total Trades: {stats.totalTrades}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Avg Hold Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatHoldTime(stats.avgHoldTime)}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                Target: 30-90s
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Positions */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ZapIcon className="h-5 w-5 text-orange-400" />
                Active Positions ({activePositions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activePositions.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No active positions
                  </div>
                ) : (
                  activePositions.map((position) => (
                    <div key={position.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-lg">{position.symbol}</div>
                        <div className={`font-bold ${position.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatPercent(position.roi)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                        <div>Entry: ${position.entryPrice.toFixed(6)}</div>
                        <div>Current: ${position.currentPrice.toFixed(6)}</div>
                        <div>Amount: {formatCurrency(position.entryAmount)}</div>
                        <div>P&L: {formatCurrency(position.pnl)}</div>
                      </div>
                      <div className="mt-2">
                        <Progress 
                          value={Math.abs(position.roi)} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alpha Trade Log */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5 text-orange-400" />
                Alpha Trade Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTrades.length === 0 ? (
                  <div className="text-center text-gray-400 py-8">
                    No trades yet
                  </div>
                ) : (
                  recentTrades.map((trade) => (
                    <div key={trade.id} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'}>
                            {trade.action}
                          </Badge>
                          <span className="font-bold">{trade.symbol}</span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {formatTime(trade.timestamp)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                        <div>Amount: {formatCurrency(trade.amount)}</div>
                        <div>Price: ${trade.price.toFixed(6)}</div>
                        {trade.pnl !== undefined && (
                          <>
                            <div className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                              P&L: {formatCurrency(trade.pnl)}
                            </div>
                            <div className={trade.roi && trade.roi >= 0 ? 'text-green-400' : 'text-red-400'}>
                              ROI: {formatPercent(trade.roi || 0)}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {trade.reason}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Token Memory */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Token Memory ({tokenMemory.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokenMemory.slice(0, 8).map((token: any) => (
                <div key={token.mint} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{token.symbol}</span>
                    <Badge 
                      variant={
                        token.status === 'TRADED' ? 'default' :
                        token.status === 'FAILED' ? 'destructive' :
                        token.status === 'BLACKLISTED' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {token.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">
                    <div>Score: {token.score.toFixed(1)}%</div>
                    <div>Liquidity: {formatCurrency(token.liquidity)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UltraAggressiveDashboard;
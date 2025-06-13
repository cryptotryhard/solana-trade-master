import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Play, Square, TrendingUp, TrendingDown, Activity, Database } from 'lucide-react';

export default function StreamlinedTradingDashboard() {
  const queryClient = useQueryClient();

  // Fetch streamlined trading stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/streamlined/stats'],
    refetchInterval: 5000,
  });

  // Fetch active trades
  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ['/api/streamlined/trades'],
    refetchInterval: 3000,
  });

  // Start trading mutation
  const startTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/streamlined/start', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streamlined/stats'] });
    },
  });

  // Stop trading mutation
  const stopTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/streamlined/stop', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/streamlined/stats'] });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(value);
  };

  const formatSOL = (value: number) => {
    return `${value.toFixed(6)} SOL`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'SOLD_PROFIT': return 'bg-blue-500';
      case 'SOLD_LOSS': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getProfitColor = (percentage: number) => {
    if (percentage > 0) return 'text-green-600';
    if (percentage < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (statsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Streamlined Trading Engine</h1>
          <p className="text-gray-600">Rate-limited trading with RPC optimization</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => startTradingMutation.mutate()}
            disabled={stats?.isRunning || startTradingMutation.isPending}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start Trading
          </Button>
          <Button
            onClick={() => stopTradingMutation.mutate()}
            disabled={!stats?.isRunning || stopTradingMutation.isPending}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Trading
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trading Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={stats?.isRunning ? "default" : "secondary"}>
                {stats?.isRunning ? "ACTIVE" : "STOPPED"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePositions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Max 2 positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(stats?.totalValue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Current positions value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProfitColor(stats?.totalProfitLoss || 0)}`}>
              {formatSOL(stats?.totalProfitLoss || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Unrealized profit/loss
            </p>
          </CardContent>
        </Card>
      </div>

      {/* RPC Status */}
      {stats?.rpcStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              RPC Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Total Connections</p>
                <p className="text-2xl font-bold">{stats.rpcStatus.totalConnections}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Available Connections</p>
                <p className="text-2xl font-bold text-green-600">{stats.rpcStatus.availableConnections}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Current Endpoint</p>
                <p className="text-lg font-semibold">#{stats.rpcStatus.currentIndex + 1}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Request Usage by Endpoint</p>
              {stats.rpcStatus.requestCounts.map((count: number, index: number) => (
                <div key={index} className="flex items-center gap-2 mb-1">
                  <span className="text-sm w-20">Endpoint {index + 1}:</span>
                  <Progress value={(count / 5) * 100} className="flex-1" />
                  <span className="text-sm w-12">{count}/5</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Active Trades</CardTitle>
          <CardDescription>
            Current trading positions with real-time monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tradesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : !trades || trades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active trades. Trading engine will automatically scan for opportunities.
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade: any) => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(trade.status)}>
                        {trade.status}
                      </Badge>
                      <div>
                        <h3 className="font-semibold">{trade.symbol}</h3>
                        <p className="text-sm text-gray-600">
                          {trade.tokenMint.slice(0, 8)}...{trade.tokenMint.slice(-8)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(trade.currentPrice)}</p>
                      <p className={`text-sm ${getProfitColor(trade.profitPercentage)}`}>
                        {trade.profitPercentage >= 0 ? '+' : ''}{trade.profitPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Entry Price</p>
                      <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Position Size</p>
                      <p className="font-medium">{formatSOL(trade.entryAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">P&L</p>
                      <p className={`font-medium ${getProfitColor(trade.profitLoss)}`}>
                        {formatSOL(trade.profitLoss)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Entry: {new Date(trade.entryTime).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Risk Management</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Max Position Size:</span>
                  <span className="font-medium">0.025 SOL</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Open Positions:</span>
                  <span className="font-medium">2</span>
                </div>
                <div className="flex justify-between">
                  <span>Take Profit:</span>
                  <span className="font-medium text-green-600">+25%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stop Loss:</span>
                  <span className="font-medium text-red-600">-20%</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">System Protection</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Trading Cycle:</span>
                  <span className="font-medium">30 seconds</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate Limiting:</span>
                  <span className="font-medium text-green-600">Enabled</span>
                </div>
                <div className="flex justify-between">
                  <span>RPC Rotation:</span>
                  <span className="font-medium text-green-600">Active</span>
                </div>
                <div className="flex justify-between">
                  <span>Error Recovery:</span>
                  <span className="font-medium text-green-600">Automatic</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
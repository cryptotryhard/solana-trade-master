import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, DollarSign, Target, Activity, Wallet } from 'lucide-react';

interface LivePosition {
  mint: string;
  symbol: string;
  balance: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  roi: number;
  status: string;
  entryTxHash: string;
}

interface LiveStatus {
  isLive: boolean;
  wallet: string;
  solBalance: number;
  totalPositions: number;
  estimatedValue: number;
  authenticDataOnly: boolean;
}

export default function VictoriaLiveDashboard() {
  const queryClient = useQueryClient();

  // Live status query
  const { data: liveStatus } = useQuery<LiveStatus>({
    queryKey: ['/api/victoria/live-status'],
    refetchInterval: 2000,
  });

  // Live positions query
  const { data: livePositions } = useQuery<{ positions: LivePosition[] }>({
    queryKey: ['/api/victoria/live-positions'],
    refetchInterval: 3000,
  });

  // Live trading activation mutation
  const activateLiveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/victoria/activate-live-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/victoria/live-status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/victoria/live-positions'] });
    }
  });

  const positions = livePositions?.positions || [];
  const activeProfitablePositions = positions.filter(p => p.roi > 0);
  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const averageROI = positions.length > 0 ? positions.reduce((sum, p) => sum + p.roi, 0) / positions.length : 0;

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-yellow-400" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            VICTORIA LIVE TRADING
          </h1>
        </div>
        <p className="text-gray-300 text-lg">
          Real-time autonomous trading with live Phantom wallet
        </p>
      </div>

      {/* Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-green-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-lg font-bold text-green-400">
                  {liveStatus?.isLive ? 'LIVE ACTIVE' : 'INACTIVE'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-blue-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">SOL Balance</p>
                <p className="text-lg font-bold text-white">
                  {liveStatus?.solBalance?.toFixed(4)} SOL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-purple-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Positions</p>
                <p className="text-lg font-bold text-white">
                  {positions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-yellow-500/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              <div>
                <p className="text-sm text-gray-400">Portfolio Value</p>
                <p className="text-lg font-bold text-white">
                  ${liveStatus?.estimatedValue?.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5 text-green-400" />
            Live Trading Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">
                ${totalPnL.toFixed(2)}
              </p>
              <p className="text-sm text-gray-400">Total P&L</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">
                {averageROI.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">Average ROI</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {activeProfitablePositions.length}
              </p>
              <p className="text-sm text-gray-400">Profitable Positions</p>
            </div>
          </div>

          {!liveStatus?.isLive && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={() => activateLiveMutation.mutate()}
                disabled={activateLiveMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3 text-lg"
              >
                {activateLiveMutation.isPending ? 'Activating...' : 'ACTIVATE LIVE TRADING'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Positions Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Live Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No live positions found
            </div>
          ) : (
            <div className="space-y-2">
              {positions.map((position, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-white">
                        {position.symbol || 'UNKNOWN'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {position.balance.toLocaleString()} tokens
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={position.roi >= 0 ? "default" : "destructive"}
                        className={position.roi >= 0 ? "bg-green-500" : "bg-red-500"}
                      >
                        {position.roi >= 0 ? '+' : ''}{position.roi.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400">
                      ${position.pnl.toFixed(2)} P&L
                    </p>
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {position.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Info */}
      {liveStatus?.wallet && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Live Phantom Wallet</p>
                <p className="font-mono text-sm text-white break-all">
                  {liveStatus.wallet}
                </p>
              </div>
              <Badge className="bg-green-500">
                CONNECTED
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
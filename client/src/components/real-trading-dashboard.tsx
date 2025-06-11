import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, TrendingUp, DollarSign, Clock, CheckCircle } from 'lucide-react';

interface RealTrade {
  id: string;
  timestamp: Date;
  tokenSymbol: string;
  tokenMint: string;
  type: 'BUY' | 'SELL';
  amountSOL: number;
  amountTokens: number;
  price: number;
  txHash: string;
  status: 'CONFIRMED' | 'FAILED';
  slippage: number;
  realExecution: boolean;
}

interface TradingStats {
  totalRealTrades: number;
  totalSOLTraded: number;
  currentBalance: number;
  lastTradeTime: Date | null;
  realExecutionMode: boolean;
  jupiterIntegration: boolean;
}

interface HealthStatus {
  mode: string;
  walletConnected: boolean;
  jupiterIntegration: boolean;
  tradesExecuted: number;
  currentBalance: number;
  status: string;
  realExecution: boolean;
  lastHealthCheck: Date;
}

export function RealTradingDashboard() {
  const [isLive, setIsLive] = useState(true);

  const { data: trades = [], refetch: refetchTrades } = useQuery<RealTrade[]>({
    queryKey: ['/api/trade/logs'],
    refetchInterval: isLive ? 2000 : false,
  });

  const { data: stats, refetch: refetchStats } = useQuery<TradingStats>({
    queryKey: ['/api/trade/stats'],
    refetchInterval: isLive ? 5000 : false,
  });

  const { data: health, refetch: refetchHealth } = useQuery<HealthStatus>({
    queryKey: ['/api/health'],
    refetchInterval: isLive ? 3000 : false,
  });

  const openSolscan = (txHash: string) => {
    window.open(`https://solscan.io/tx/${txHash}`, '_blank');
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatSOL = (amount: number) => {
    return `${amount.toFixed(4)} SOL`;
  };

  const formatUSD = (solAmount: number, solPrice = 180) => {
    return `$${(solAmount * solPrice).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-green-400">REAL TRADING DASHBOARD</h2>
          <p className="text-gray-400">Live Jupiter DEX Execution</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            REAL MODE ACTIVE
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className={isLive ? 'bg-green-900/20 text-green-400' : 'bg-gray-700 text-gray-400'}
          >
            {isLive ? 'LIVE' : 'PAUSED'}
          </Button>
        </div>
      </div>

      {/* Health Status */}
      <Card className="bg-gray-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-lg font-semibold text-green-400">
                {health?.status || 'LOADING'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Balance</p>
              <p className="text-lg font-semibold">
                {formatSOL(health?.currentBalance || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Real Trades</p>
              <p className="text-lg font-semibold text-green-400">
                {health?.tradesExecuted || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Jupiter</p>
              <Badge variant={health?.jupiterIntegration ? 'default' : 'destructive'}>
                {health?.jupiterIntegration ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-900 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-sm text-gray-400">Total SOL Traded</p>
                <p className="text-xl font-bold text-blue-400">
                  {formatSOL(stats?.totalSOLTraded || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Real Trades</p>
                <p className="text-xl font-bold text-purple-400">
                  {stats?.totalRealTrades || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-sm text-gray-400">Last Trade</p>
                <p className="text-xl font-bold text-orange-400">
                  {stats?.lastTradeTime ? formatTime(stats.lastTradeTime) : 'NONE'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Trades Table */}
      <Card className="bg-gray-900 border-green-500/30">
        <CardHeader>
          <CardTitle className="text-green-400">Live Trade Execution</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Waiting for real trades...</p>
              <p className="text-sm text-gray-500 mt-2">
                Real transactions will appear here with verifiable TX hashes
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {trades.slice(0, 10).map((trade: RealTrade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={trade.type === 'BUY' ? 'default' : 'destructive'}
                      className={trade.type === 'BUY' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}
                    >
                      {trade.type}
                    </Badge>
                    <div>
                      <p className="font-semibold text-white">{trade.tokenSymbol}</p>
                      <p className="text-sm text-gray-400">
                        {formatTime(trade.timestamp)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-white">{formatSOL(trade.amountSOL)}</p>
                    <p className="text-sm text-gray-400">
                      {formatUSD(trade.amountSOL)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-white">
                      {trade.amountTokens.toLocaleString()} {trade.tokenSymbol}
                    </p>
                    <p className="text-sm text-gray-400">
                      Slippage: {trade.slippage.toFixed(2)}%
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={trade.status === 'CONFIRMED' ? 'default' : 'destructive'}
                      className={trade.status === 'CONFIRMED' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}
                    >
                      {trade.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openSolscan(trade.txHash)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Information */}
      <Card className="bg-gray-900 border-yellow-500/30">
        <CardHeader>
          <CardTitle className="text-yellow-400">Wallet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Address:</span>
              <span className="font-mono text-sm">9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <span className="text-green-400">Solana Mainnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">DEX:</span>
              <span className="text-blue-400">Jupiter V6</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mode:</span>
              <Badge className="bg-red-900 text-red-400">REAL EXECUTION</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
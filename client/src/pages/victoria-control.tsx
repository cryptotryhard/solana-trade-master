import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface LiveTrade {
  id: string;
  timestamp: Date;
  tokenSymbol: string;
  type: 'BUY' | 'SELL';
  amountSOL: number;
  amountTokens: number;
  txHash: string;
  status: 'CONFIRMED' | 'PENDING';
  pnl?: number;
  roi?: number;
}

interface Position {
  symbol: string;
  balance: number;
  valueUSD: number;
  entryPrice: number;
  currentPrice: number;
  roi: number;
  pnl: number;
}

interface BotStatus {
  active: boolean;
  mode: string;
  balance: number;
  totalTrades: number;
  pnl24h: number;
  lastUpdate: string;
}

export default function VictoriaControl() {
  const [isLaunched, setIsLaunched] = useState(false);

  // Bot status and control
  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 2000,
  });

  // Live trades
  const { data: trades = [] } = useQuery<LiveTrade[]>({
    queryKey: ['/api/trades/live'],
    refetchInterval: 1000,
  });

  // Current positions
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 3000,
  });

  // Phantom wallet balance
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 5000,
  });

  // Launch/Stop Victoria
  const launchMutation = useMutation({
    mutationFn: (action: 'start' | 'stop') => 
      fetch(`/api/bot/${action}`, { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
  });

  const handleLaunch = () => {
    if (isLaunched) {
      launchMutation.mutate('stop');
      setIsLaunched(false);
    } else {
      launchMutation.mutate('start');
      setIsLaunched(true);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatSOL = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return '0.0000 SOL';
    return `${amount.toFixed(4)} SOL`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-green-400">VICTORIA</h1>
          <p className="text-gray-400">Autonomous Trading Engine</p>
        </div>
        
        <Button
          onClick={handleLaunch}
          size="lg"
          variant={isLaunched ? "destructive" : "default"}
          className={`px-8 py-4 text-lg font-bold ${
            isLaunched 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          disabled={launchMutation.isPending}
        >
          {isLaunched ? '⏸ STOP VICTORIA' : '▶ LAUNCH VICTORIA'}
        </Button>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-400">
              {walletData?.solBalance ? formatSOL(walletData.solBalance) : '0.0000 SOL'}
            </div>
            <div className="text-sm text-gray-400">Wallet Balance</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">
              {botStatus?.totalTrades ?? 0}
            </div>
            <div className="text-sm text-gray-400">Total Trades</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${
              (botStatus?.pnl24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(botStatus?.pnl24h)}
            </div>
            <div className="text-sm text-gray-400">24h P&L</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                botStatus?.active ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <div className="text-lg font-bold">
                {botStatus?.active ? 'ACTIVE' : 'STOPPED'}
              </div>
            </div>
            <div className="text-sm text-gray-400">Bot Status</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Live Trades */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400">Live Trades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="p-4 border-b border-gray-700 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.type === 'BUY' ? 'default' : 'destructive'}>
                        {trade.type}
                      </Badge>
                      <span className="font-bold">{trade.tokenSymbol}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Amount: </span>
                      {formatSOL(trade.amountSOL)}
                    </div>
                    <div>
                      <span className="text-gray-400">Status: </span>
                      <Badge variant={trade.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                        {trade.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <span className="text-gray-400 text-xs">TX: </span>
                    <span className="text-blue-400 text-xs font-mono">
                      {trade.txHash.slice(0, 8)}...{trade.txHash.slice(-8)}
                    </span>
                  </div>
                </div>
              ))}
              
              {trades.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  No trades yet. Launch Victoria to start trading.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Positions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400">Current Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {positions.map((position) => (
                <div key={position.symbol} className="p-4 border-b border-gray-700 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-lg">{position.symbol || 'Unknown'}</div>
                    <div className={`font-bold ${
                      (position.roi ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {(position.roi ?? 0) >= 0 ? '+' : ''}{(position.roi ?? 0).toFixed(2)}%
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Value: </span>
                      {formatCurrency(position.valueUSD)}
                    </div>
                    <div>
                      <span className="text-gray-400">P&L: </span>
                      <span className={(position.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(position.pnl)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-400">
                    Entry: {formatCurrency(position.entryPrice)} | 
                    Current: {formatCurrency(position.currentPrice)}
                  </div>
                </div>
              ))}
              
              {positions.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  No active positions.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
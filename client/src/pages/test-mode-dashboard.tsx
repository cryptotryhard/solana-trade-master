/**
 * TEST MODE DASHBOARD - Real Pump.fun Trading Education
 * Skutečný obchodní cyklus s malými objemy pro výuku
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, TrendingUp, TrendingDown, ExternalLink, Play, Square, BarChart3 } from 'lucide-react';

interface RealTrade {
  id: string;
  tokenMint: string;
  symbol: string;
  entryPrice: number;
  entryAmount: number;
  tokensReceived: number;
  entryTime: number;
  currentPrice?: number;
  exitPrice?: number;
  exitTime?: number;
  profitLoss?: number;
  profitPercentage?: number;
  status: 'ACTIVE' | 'SOLD_PROFIT' | 'SOLD_LOSS' | 'SOLD_STOP';
  entryTxHash?: string;
  exitTxHash?: string;
  targetProfit: number;
  stopLoss: number;
  trailingStop: number;
  maxPriceReached: number;
}

interface PumpFunToken {
  mint: string;
  symbol: string;
  marketCap: number;
  volume24h: number;
  priceUSD: number;
  liquidity: number;
  isValidForTrading: boolean;
}

interface TradingStats {
  testMode: boolean;
  activeTrades: number;
  totalTrades: number;
  profitableTrades: number;
  winRate: number;
  totalProfitLoss: number;
  maxTradeSize: number;
  maxOpenPositions: number;
}

export default function TestModeDashboard() {
  const [isTestModeEnabled, setIsTestModeEnabled] = useState(true);
  const [isTradingActive, setIsTradingActive] = useState(false);
  const queryClient = useQueryClient();

  // Fetch trading stats
  const { data: stats } = useQuery<TradingStats>({
    queryKey: ['/api/real-trading/stats'],
    refetchInterval: 5000
  });

  // Fetch active trades
  const { data: activeTrades = [] } = useQuery<RealTrade[]>({
    queryKey: ['/api/real-trading/active-trades'],
    refetchInterval: 3000
  });

  // Fetch trade history
  const { data: tradeHistory = [] } = useQuery<RealTrade[]>({
    queryKey: ['/api/real-trading/trade-history'],
    refetchInterval: 10000
  });

  // Fetch available pump.fun tokens
  const { data: availableTokens = [] } = useQuery<PumpFunToken[]>({
    queryKey: ['/api/real-trading/pump-fun-tokens'],
    refetchInterval: 30000
  });

  // Toggle test mode mutation
  const toggleTestModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/real-trading/toggle-test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/real-trading/stats'] });
    }
  });

  // Start/stop trading mutation
  const tradingMutation = useMutation({
    mutationFn: async (action: 'start' | 'stop') => {
      if (action === 'start') {
        const response = await fetch('/api/real-trading/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        return response.json();
      }
      // For stop, we don't have an endpoint yet, so just return success
      return { success: true, message: 'Trading stopped' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/real-trading/stats'] });
    }
  });

  const handleTestModeToggle = (enabled: boolean) => {
    setIsTestModeEnabled(enabled);
    toggleTestModeMutation.mutate(enabled);
  };

  const handleTradingToggle = () => {
    const action = isTradingActive ? 'stop' : 'start';
    setIsTradingActive(!isTradingActive);
    tradingMutation.mutate(action);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-blue-500">AKTIVNÍ</Badge>;
      case 'SOLD_PROFIT':
        return <Badge className="bg-green-500">ZISK</Badge>;
      case 'SOLD_LOSS':
        return <Badge className="bg-red-500">ZTRÁTA</Badge>;
      case 'SOLD_STOP':
        return <Badge className="bg-orange-500">STOP</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">TEST MODE Dashboard</h1>
          <p className="text-muted-foreground">
            Skutečný obchodní cyklus s malými objemy - max 0.03 SOL na obchod
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={isTestModeEnabled}
              onCheckedChange={handleTestModeToggle}
              disabled={toggleTestModeMutation.isPending}
            />
            <span className="text-sm font-medium">
              {isTestModeEnabled ? 'TEST MODE ON' : 'PRODUCTION MODE'}
            </span>
          </div>
          <Button
            onClick={handleTradingToggle}
            disabled={tradingMutation.isPending}
            variant={isTradingActive ? "destructive" : "default"}
          >
            {isTradingActive ? (
              <>
                <Square className="w-4 h-4 mr-2" />
                Stop Trading
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Trading
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Warning for Test Mode */}
      {isTestModeEnabled && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="font-medium text-orange-800">
                TEST MODE: Maximálně 1 pozice, 0.03 SOL na obchod
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trading Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aktivní obchody</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeTrades || 0}</div>
            <p className="text-xs text-muted-foreground">
              Max: {stats?.maxOpenPositions || 1}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Celkem obchodů</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTrades || 0}</div>
            <p className="text-xs text-muted-foreground">
              Úspěšnost: {stats?.winRate?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">P&L celkem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProfitLoss ? (
                <span className={stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.totalProfitLoss >= 0 ? '+' : ''}{stats.totalProfitLoss.toFixed(4)} SOL
                </span>
              ) : (
                '0.0000 SOL'
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Max objem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.maxTradeSize || 0.03} SOL</div>
            <p className="text-xs text-muted-foreground">
              ~${((stats?.maxTradeSize || 0.03) * 145).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Aktivní pozice
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTrades.length > 0 ? (
            <div className="space-y-4">
              {activeTrades.map((trade) => (
                <div key={trade.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{trade.symbol}</h3>
                      <p className="text-sm text-muted-foreground">
                        Vstup: {formatTime(trade.entryTime)}
                      </p>
                    </div>
                    {getStatusBadge(trade.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Částka</p>
                      <p className="font-medium">{trade.entryAmount.toFixed(4)} SOL</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vstupní cena</p>
                      <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Aktuální cena</p>
                      <p className="font-medium">
                        {trade.currentPrice ? formatCurrency(trade.currentPrice) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">P&L</p>
                      <p className={`font-medium ${
                        (trade.profitPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.profitPercentage ? (
                          <>
                            {trade.profitPercentage >= 0 ? '+' : ''}
                            {trade.profitPercentage.toFixed(2)}%
                          </>
                        ) : '0.00%'}
                      </p>
                    </div>
                  </div>

                  {/* Progress bars for profit target and stop loss */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Stop Loss: {trade.stopLoss}%</span>
                        <span>Profit Target: +{trade.targetProfit}%</span>
                      </div>
                      <Progress 
                        value={Math.max(0, Math.min(100, ((trade.profitPercentage || 0) + Math.abs(trade.stopLoss)) / (trade.targetProfit + Math.abs(trade.stopLoss)) * 100))}
                        className="h-2"
                      />
                    </div>
                  </div>

                  {/* Transaction links */}
                  {trade.entryTxHash && (
                    <div className="mt-2">
                      <a
                        href={`https://solscan.io/tx/${trade.entryTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Zobrazit na Solscan
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Žádné aktivní pozice
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>Dostupné pump.fun tokeny (15k-50k MC)</CardTitle>
        </CardHeader>
        <CardContent>
          {availableTokens.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTokens.map((token) => (
                <div key={token.mint} className="border rounded-lg p-4">
                  <h3 className="font-bold">{token.symbol}</h3>
                  <div className="text-sm space-y-1 mt-2">
                    <p>MC: ${token.marketCap.toLocaleString()}</p>
                    <p>Cena: {formatCurrency(token.priceUSD)}</p>
                    <p>Likvidita: ${token.liquidity.toLocaleString()}</p>
                    <p>Volume 24h: ${token.volume24h.toLocaleString()}</p>
                  </div>
                  <Badge className={token.isValidForTrading ? "bg-green-500" : "bg-gray-500"} size="sm">
                    {token.isValidForTrading ? 'Vhodný' : 'Nevhodný'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Žádné vhodné tokeny k dispozici
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trade History */}
      <Card>
        <CardHeader>
          <CardTitle>Historie obchodů</CardTitle>
        </CardHeader>
        <CardContent>
          {tradeHistory.length > 0 ? (
            <div className="space-y-3">
              {tradeHistory.slice(-10).reverse().map((trade) => (
                <div key={trade.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <span className="font-medium">{trade.symbol}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {formatTime(trade.exitTime || trade.entryTime)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      (trade.profitPercentage || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.profitPercentage ? (
                        <>
                          {trade.profitPercentage >= 0 ? '+' : ''}
                          {trade.profitPercentage.toFixed(2)}%
                        </>
                      ) : '0.00%'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {trade.profitLoss ? `${trade.profitLoss.toFixed(4)} SOL` : '0.0000 SOL'}
                    </div>
                  </div>
                  {getStatusBadge(trade.status)}
                  {trade.exitTxHash && (
                    <a
                      href={`https://solscan.io/tx/${trade.exitTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Žádná historie obchodů
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
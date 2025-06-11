import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TradingViewChart } from '@/components/tradingview-chart';
import { DecisionLogPanel } from '@/components/decision-log-panel';
import { ProfitPerformanceTracker } from '@/components/profit-performance-tracker';
import { TrendingUp, TrendingDown, DollarSign, Activity, Zap, Bot, Target, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Position {
  id: string;
  symbol: string;
  mintAddress: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  profit: number;
  roi: number;
  txHash: string;
  status: string;
}

interface BotStatus {
  active: boolean;
  mode: string;
  totalTrades: number;
  pnl24h: number;
  lastTransaction: string;
  currentAction: string;
}

interface RealTimeAlert {
  id: string;
  type: 'trade_executed' | 'signal_detected' | 'error' | 'profit_target';
  message: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

export default function EnhancedVictoriaDashboard() {
  const [selectedToken, setSelectedToken] = useState<string>('');
  const [alerts, setAlerts] = useState<RealTimeAlert[]>([]);
  const [lastTradeCount, setLastTradeCount] = useState(0);

  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ['/api/portfolio/positions'],
    refetchInterval: 2000
  });

  const { data: botStatus } = useQuery<BotStatus>({
    queryKey: ['/api/bot/status'],
    refetchInterval: 1000
  });

  const { data: liveData = [] } = useQuery<any[]>({
    queryKey: ['/api/trades/live'],
    refetchInterval: 1000
  });

  const { data: walletBalance } = useQuery({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 5000
  });

  // Real-time notifications
  useEffect(() => {
    if (Array.isArray(liveData) && liveData.length > lastTradeCount) {
      const newTrades = liveData.slice(lastTradeCount);
      newTrades.forEach((trade: any) => {
        if (trade && trade.symbol) {
          const alert: RealTimeAlert = {
            id: `alert_${Date.now()}_${Math.random()}`,
            type: 'trade_executed',
            message: `VICTORIA executed ${trade.symbol} trade - TX: ${trade.txHash?.slice(0, 8)}...`,
            timestamp: new Date().toISOString(),
            severity: 'success'
          };
          setAlerts(prev => [alert, ...prev].slice(0, 10));
        }
      });
      setLastTradeCount(liveData.length);
    }
  }, [liveData, lastTradeCount]);

  const totalPortfolioValue = Array.isArray(positions) ? positions.reduce((sum, pos) => 
    sum + ((pos?.quantity || 0) * (pos?.currentPrice || 0)), 0
  ) : 0;

  const totalProfit = Array.isArray(positions) ? positions.reduce((sum, pos) => sum + (pos?.profit || 0), 0) : 0;
  const totalEntryValue = Array.isArray(positions) ? positions.reduce((sum, pos) => sum + ((pos?.quantity || 0) * (pos?.entryPrice || 0)), 0) : 0;
  const totalRoi = totalEntryValue > 0 ? (totalProfit / totalEntryValue) * 100 : 0;

  const getStatusColor = (mode: string) => {
    if (mode === 'autonomous') return 'bg-green-500/20 text-green-300';
    if (mode === 'scanning') return 'bg-blue-500/20 text-blue-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'warning': return 'border-yellow-500 bg-yellow-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      default: return 'border-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              VICTORIA Advanced Dashboard
            </h1>
            <p className="text-gray-400 mt-1">
              Autonomous AI Trading Engine - Real-time Performance & Analytics
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(botStatus?.mode || 'offline')}>
              <Bot className="w-4 h-4 mr-2" />
              {botStatus?.active ? (botStatus.currentAction || 'ACTIVE') : 'OFFLINE'}
            </Badge>
            
            <div className="text-right">
              <div className="text-sm text-gray-400">Wallet Balance</div>
              <div className="font-bold text-green-400">
                {(walletBalance as any)?.balance?.toFixed(4) || '0.0000'} SOL
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Alerts */}
        {alerts.length > 0 && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Live Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {alerts.slice(0, 3).map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">{alert.message}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Portfolio Value</p>
                  <p className="text-2xl font-bold text-white">
                    ${(totalPortfolioValue || 0).toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total P&L</p>
                  <p className={`text-2xl font-bold ${(totalProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${(totalProfit || 0).toFixed(2)}
                  </p>
                </div>
                {(totalProfit || 0) >= 0 ? (
                  <TrendingUp className="w-8 h-8 text-green-400" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-400" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">ROI</p>
                  <p className={`text-2xl font-bold ${(totalRoi || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(totalRoi || 0).toFixed(2)}%
                  </p>
                </div>
                <Target className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active Positions</p>
                  <p className="text-2xl font-bold text-white">
                    {positions.length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="trading" className="text-white">
              Live Trading
            </TabsTrigger>
            <TabsTrigger value="positions" className="text-white">
              Positions
            </TabsTrigger>
            <TabsTrigger value="decisions" className="text-white">
              AI Decisions
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-white">
              Performance
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-white">
              Charts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Active Positions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {positions.map((position) => (
                      <div 
                        key={position.id}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:border-purple-500 transition-colors"
                        onClick={() => setSelectedToken(position.symbol)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-white">{position.symbol}</div>
                            <div className="text-sm text-gray-400">
                              {position.quantity.toLocaleString()} tokens
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${(position.profit || 0).toFixed(2)}
                            </div>
                            <div className={`text-sm ${position.roi >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                              {(position.roi || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                          <span>Entry: ${(position.entryPrice || 0).toFixed(6)}</span>
                          <span>Current: ${(position.currentPrice || 0).toFixed(6)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Recent Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.isArray(liveData) ? liveData.slice(0, 6).map((trade: any) => (
                      <div key={trade?.id || Math.random()} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="font-semibold text-white">{trade?.symbol || 'UNKNOWN'}</span>
                            <Badge variant="outline" className="text-green-400 border-green-400">
                              BUY
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-semibold">
                              {trade?.amountSOL?.toFixed(4) || '0.0000'} SOL
                            </div>
                            <div className="text-xs text-gray-400">
                              {trade?.timestamp ? new Date(trade.timestamp).toLocaleTimeString() : 'N/A'}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <a 
                            href={`https://solscan.io/tx/${trade?.txHash || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            View on Solscan: {trade?.txHash?.slice(0, 12) || 'N/A'}...
                          </a>
                        </div>
                      </div>
                    )) : (
                      <div className="text-gray-400 text-center py-4">
                        No recent trades available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="positions" className="mt-6">
            <div className="grid grid-cols-1 gap-6">
              {positions.map((position) => (
                <Card key={position.id} className="bg-gray-900 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>{position.symbol} Position Details</span>
                      <Badge className="bg-blue-500/20 text-blue-300">
                        Active
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Quantity</p>
                        <p className="text-white font-semibold">
                          {position.quantity.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Entry Price</p>
                        <p className="text-white font-semibold">
                          ${(position.entryPrice || 0).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Current Price</p>
                        <p className="text-white font-semibold">
                          ${(position.currentPrice || 0).toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">P&L</p>
                        <p className={`font-semibold ${(position.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${(position.profit || 0).toFixed(2)} ({(position.roi || 0).toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <a 
                        href={`https://solscan.io/tx/${position.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Transaction: {position.txHash}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="decisions" className="mt-6">
            <DecisionLogPanel />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <ProfitPerformanceTracker />
          </TabsContent>

          <TabsContent value="charts" className="mt-6">
            <div className="space-y-6">
              {selectedToken ? (
                <TradingViewChart 
                  symbol={selectedToken}
                  mintAddress={positions.find(p => p.symbol === selectedToken)?.mintAddress || ''}
                  entryPrice={positions.find(p => p.symbol === selectedToken)?.entryPrice}
                  currentPrice={positions.find(p => p.symbol === selectedToken)?.currentPrice}
                />
              ) : (
                <Card className="bg-gray-900 border-gray-700">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">
                      Select a position from the Trading tab to view detailed charts
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
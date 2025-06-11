import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TrendingUp, TrendingDown, DollarSign, Target, Clock, Trophy } from 'lucide-react';

interface PerformanceMetrics {
  totalProfit24h: number;
  totalProfitWeek: number;
  totalProfitAll: number;
  winRate: number;
  avgProfitPerTrade: number;
  totalTrades: number;
  activePositions: number;
  bestTrade: {
    symbol: string;
    profit: number;
    roi: number;
  };
  worstTrade: {
    symbol: string;
    profit: number;
    roi: number;
  };
}

interface TradeHistory {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  profit?: number;
  roi?: number;
  timestamp: string;
  status: 'completed' | 'active';
  txHash: string;
}

interface StrategyPerformance {
  strategy: string;
  winRate: number;
  avgRoi: number;
  totalTrades: number;
  profit: number;
}

export function ProfitPerformanceTracker() {
  const { data: metrics } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/performance/metrics'],
    refetchInterval: 5000
  });

  const { data: history = [] } = useQuery<TradeHistory[]>({
    queryKey: ['/api/trades/history'],
    refetchInterval: 3000
  });

  const { data: strategies = [] } = useQuery<StrategyPerformance[]>({
    queryKey: ['/api/performance/strategies'],
    refetchInterval: 10000
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getWinRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">24h Profit</p>
                <p className={`text-2xl font-bold ${getProfitColor(metrics?.totalProfit24h || 0)}`}>
                  {formatCurrency(metrics?.totalProfit24h || 0)}
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
                <p className="text-gray-400 text-sm">Win Rate</p>
                <p className={`text-2xl font-bold ${getWinRateColor(metrics?.winRate || 0)}`}>
                  {metrics?.winRate?.toFixed(1) || '0'}%
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Per Trade</p>
                <p className={`text-2xl font-bold ${getProfitColor(metrics?.avgProfitPerTrade || 0)}`}>
                  {formatCurrency(metrics?.avgProfitPerTrade || 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-white">
                  {metrics?.totalTrades || 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Performance Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="history" className="text-white">
                Trade History
              </TabsTrigger>
              <TabsTrigger value="strategies" className="text-white">
                Strategy Performance
              </TabsTrigger>
              <TabsTrigger value="best" className="text-white">
                Best/Worst Trades
              </TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      No trade history available
                    </div>
                  ) : (
                    history.map((trade) => (
                      <div key={trade.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {trade.type === 'buy' ? (
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            )}
                            <div>
                              <div className="font-semibold text-white">{trade.symbol}</div>
                              <div className="text-sm text-gray-400">
                                {trade.quantity.toLocaleString()} tokens @ {formatCurrency(trade.price)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {formatCurrency(trade.value)}
                            </div>
                            {trade.profit !== undefined && (
                              <div className={`text-sm ${getProfitColor(trade.profit)}`}>
                                {formatCurrency(trade.profit)} ({formatPercentage(trade.roi || 0)})
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {new Date(trade.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <Badge 
                            variant={trade.status === 'active' ? 'default' : 'secondary'}
                            className={trade.status === 'active' ? 'bg-blue-500/20 text-blue-300' : 'bg-gray-500/20 text-gray-300'}
                          >
                            {trade.status}
                          </Badge>
                          
                          <a 
                            href={`https://solscan.io/tx/${trade.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            View on Solscan
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="strategies" className="mt-4">
              <div className="space-y-4">
                {strategies.map((strategy, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-white">{strategy.strategy}</h3>
                      <Badge className="bg-purple-500/20 text-purple-300">
                        {strategy.totalTrades} trades
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Win Rate</p>
                        <p className={`font-bold ${getWinRateColor(strategy.winRate)}`}>
                          {strategy.winRate.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Avg ROI</p>
                        <p className={`font-bold ${getProfitColor(strategy.avgRoi)}`}>
                          {formatPercentage(strategy.avgRoi)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Profit</p>
                        <p className={`font-bold ${getProfitColor(strategy.profit)}`}>
                          {formatCurrency(strategy.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="best" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-green-400 flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Best Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics?.bestTrade ? (
                      <div>
                        <div className="text-xl font-bold text-white mb-1">
                          {metrics.bestTrade.symbol}
                        </div>
                        <div className="text-green-400 text-lg font-semibold">
                          {formatCurrency(metrics.bestTrade.profit)}
                        </div>
                        <div className="text-green-300 text-sm">
                          ROI: {formatPercentage(metrics.bestTrade.roi)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">No trades yet</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-red-400 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Worst Trade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {metrics?.worstTrade ? (
                      <div>
                        <div className="text-xl font-bold text-white mb-1">
                          {metrics.worstTrade.symbol}
                        </div>
                        <div className="text-red-400 text-lg font-semibold">
                          {formatCurrency(metrics.worstTrade.profit)}
                        </div>
                        <div className="text-red-300 text-sm">
                          ROI: {formatPercentage(metrics.worstTrade.roi)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400">No trades yet</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
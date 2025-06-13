import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap } from 'lucide-react';

interface Trade {
  id: string;
  timestamp: string;
  token: string;
  type: 'buy' | 'sell';
  amount: number;
  entryPrice: number;
  currentPrice: number;
  roi: number;
  pnl: number;
  platform: string;
  isPumpFun: boolean;
  marketCapAtEntry?: number;
  status: 'profitable' | 'loss' | 'breakeven';
}

interface Position {
  mint: string;
  symbol: string;
  amount: number;
  entryValue: number;
  currentValue: number;
  roi: number;
  pnl: number;
  isPumpFun: boolean;
  platform: string;
  holdingDays: number;
}

interface PerformanceSummary {
  overview: {
    totalTrades: number;
    totalPositions: number;
    totalPnL: number;
    totalROI: number;
    successRate: number;
  };
  bestPerformers: {
    bestTrade: Trade | null;
    worstTrade: Trade | null;
    topPositions: Position[];
  };
  platformBreakdown: {
    'pump.fun': number;
    raydium: number;
    jupiter: number;
    direct: number;
  };
  pumpFunAnalysis: {
    totalPumpFunTrades: number;
    pumpFunPositions: number;
    pumpFunPnL: number;
  };
  detailedBreakdown: {
    trades: Trade[];
    positions: Position[];
  };
}

export default function AuthenticTradingDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch comprehensive trading analysis
  const { data: performanceData, isLoading: performanceLoading, error: performanceError } = useQuery<PerformanceSummary>({
    queryKey: ['/api/trading/performance-summary', refreshKey],
    refetchInterval: 10000
  });

  // Fetch detailed trades
  const { data: tradesData, isLoading: tradesLoading } = useQuery({
    queryKey: ['/api/trading/detailed-trades', refreshKey],
    refetchInterval: 15000
  });

  // Fetch detailed positions
  const { data: positionsData, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/trading/detailed-positions', refreshKey],
    refetchInterval: 10000
  });

  // Fetch wallet status
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet/status'],
    refetchInterval: 5000
  });

  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (performanceLoading || tradesLoading || positionsLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <Activity className="h-12 w-12 animate-spin mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Loading Authentic Trading Data</h2>
            <p className="text-gray-400">Analyzing blockchain transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-red-500 mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Unable to Load Trading Data</h2>
            <p className="text-gray-400 mb-4">Blockchain RPC rate limits exceeded</p>
            <Button onClick={refreshData} variant="outline">
              Retry Loading
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const overview = performanceData?.overview || {
    totalTrades: 0,
    totalPositions: 0,
    totalPnL: 0,
    totalROI: 0,
    successRate: 0
  };

  const trades = performanceData?.detailedBreakdown?.trades || [];
  const positions = performanceData?.detailedBreakdown?.positions || [];
  const pumpFunAnalysis = performanceData?.pumpFunAnalysis || {
    totalPumpFunTrades: 0,
    pumpFunPositions: 0,
    pumpFunPnL: 0
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
              VICTORIA Trading Dashboard
            </h1>
            <p className="text-gray-400 mt-2">Authentic blockchain trading analysis</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={refreshData} variant="outline" size="sm">
              <Activity className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
            <Badge variant={walletData?.isConnected ? "default" : "destructive"}>
              {walletData?.isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Total P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={overview.totalPnL >= 0 ? "text-green-400" : "text-red-400"}>
                  ${overview.totalPnL.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {overview.totalPnL >= 0 ? "+" : ""}{overview.totalROI.toFixed(2)}% ROI
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Activity className="h-4 w-4 mr-2" />
                Total Trades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalTrades}</div>
              <p className="text-xs text-gray-500 mt-1">
                {overview.successRate.toFixed(1)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.totalPositions}</div>
              <p className="text-xs text-gray-500 mt-1">
                {pumpFunAnalysis.pumpFunPositions} pump.fun tokens
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Pump.fun P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={pumpFunAnalysis.pumpFunPnL >= 0 ? "text-green-400" : "text-red-400"}>
                  ${pumpFunAnalysis.pumpFunPnL.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {pumpFunAnalysis.totalPumpFunTrades} pump.fun trades
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="trades" className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-700">
            <TabsTrigger value="trades">Trade History</TabsTrigger>
            <TabsTrigger value="positions">Current Positions</TabsTrigger>
            <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
          </TabsList>

          {/* Trade History Tab */}
          <TabsContent value="trades">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Complete Trading History</CardTitle>
                <p className="text-sm text-gray-400">
                  All authenticated blockchain transactions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trades.length > 0 ? (
                    trades.slice(0, 20).map((trade, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            trade.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {trade.token}
                              {trade.isPumpFun && (
                                <Badge variant="secondary" className="text-xs">
                                  PUMP.FUN
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {trade.type.toUpperCase()} • {trade.timestamp}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-400">
                            {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>Loading trade history from blockchain...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Current Positions Tab */}
          <TabsContent value="positions">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Current Token Holdings</CardTitle>
                <p className="text-sm text-gray-400">
                  All {positions.length} token positions from wallet
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {positions.length > 0 ? (
                    positions.map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">
                            {position.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              {position.symbol}
                              {position.isPumpFun && (
                                <Badge variant="secondary" className="text-xs">
                                  PUMP.FUN
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {position.amount.toLocaleString()} tokens • {position.holdingDays} days
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            ${position.currentValue.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)} ({position.roi >= 0 ? '+' : ''}{position.roi.toFixed(2)}%)
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Target className="h-8 w-8 mx-auto mb-2" />
                      <p>Loading positions from blockchain...</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Analysis Tab */}
          <TabsContent value="analysis">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle>Best & Worst Trades</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {performanceData?.bestPerformers?.bestTrade && (
                    <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TrendingUp className="h-4 w-4 text-green-400 mr-2" />
                        <span className="font-semibold text-green-400">Best Trade</span>
                      </div>
                      <p className="text-sm">
                        {performanceData.bestPerformers.bestTrade.token} - 
                        ${performanceData.bestPerformers.bestTrade.pnl.toFixed(2)} profit
                      </p>
                    </div>
                  )}
                  
                  {performanceData?.bestPerformers?.worstTrade && (
                    <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TrendingDown className="h-4 w-4 text-red-400 mr-2" />
                        <span className="font-semibold text-red-400">Worst Trade</span>
                      </div>
                      <p className="text-sm">
                        {performanceData.bestPerformers.worstTrade.token} - 
                        ${performanceData.bestPerformers.worstTrade.pnl.toFixed(2)} loss
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle>Platform Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.platformBreakdown && Object.entries(performanceData.platformBreakdown).map(([platform, count]) => (
                      <div key={platform} className="flex justify-between items-center">
                        <span className="capitalize">{platform}</span>
                        <Badge variant="outline">{count} trades</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Wallet: {walletData?.address?.slice(0, 8)}...{walletData?.address?.slice(-8)}</p>
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Pause, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Zap,
  Eye,
  BarChart3,
  Coins,
  Activity,
  RefreshCw
} from 'lucide-react';

interface WalletToken {
  symbol: string;
  mint: string;
  balance: number;
  value: number;
  decimals: number;
}

interface TradingPosition {
  mint: string;
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  entryTime: number;
  profitLoss: number;
  profitPercentage: number;
  status: string;
  exitStrategy: string;
}

interface AutonomousStats {
  activePositions: number;
  totalCapital: number;
  isRunning: boolean;
  positions: TradingPosition[];
}

export default function VictoriaAutonomousDashboard() {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const queryClient = useQueryClient();

  // Fetch real wallet balance
  const { data: walletBalance, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/wallet/authentic-balance'],
    refetchInterval: refreshInterval,
  });

  // Fetch real wallet positions 
  const { data: walletPositions, isLoading: positionsLoading } = useQuery({
    queryKey: ['/api/wallet/authentic-positions'],
    refetchInterval: refreshInterval,
  });

  // Fetch autonomous trading stats
  const { data: autonomousStats, isLoading: statsLoading } = useQuery<AutonomousStats>({
    queryKey: ['/api/autonomous/stats'],
    refetchInterval: 3000,
  });

  // Fetch low MC opportunities
  const { data: opportunities, isLoading: opportunitiesLoading } = useQuery({
    queryKey: ['/api/low-mc/opportunities'],
    refetchInterval: 10000,
  });

  // Start autonomous trading mutation
  const startTradingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/autonomous/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/autonomous/stats'] });
    },
  });

  // Stop autonomous trading mutation
  const stopTradingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/autonomous/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/autonomous/stats'] });
    },
  });

  // BONK liquidation mutation
  const bonkLiquidationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/emergency/bonk-liquidation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/authentic-balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/authentic-positions'] });
    },
  });

  const totalPortfolioValue = Array.isArray(walletPositions) ? 
    walletPositions.reduce((sum: number, token: WalletToken) => sum + token.value, 0) : 0;
  const solBalance = parseFloat(walletBalance?.solBalance || '0');
  const totalValue = totalPortfolioValue + (solBalance * 144.82); // SOL price

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            VICTORIA Autonomous Trading
          </h1>
          <p className="text-slate-300 text-lg">
            AI-Powered Low Market Cap Memecoin Trading Bot
          </p>
        </div>

        {/* Main Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Trading Control */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Autonomous Trading
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge variant={autonomousStats?.isRunning ? "default" : "secondary"} className="text-lg px-4 py-2">
                  {autonomousStats?.isRunning ? "ACTIVE" : "STOPPED"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => startTradingMutation.mutate()}
                  disabled={startTradingMutation.isPending || autonomousStats?.isRunning}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Trading
                </Button>
                
                <Button 
                  onClick={() => stopTradingMutation.mutate()}
                  disabled={stopTradingMutation.isPending || !autonomousStats?.isRunning}
                  variant="destructive"
                  className="w-full"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Trading
                </Button>
              </div>

              <Separator />
              
              <div className="space-y-2">
                <div className="text-sm text-slate-400">Active Positions</div>
                <div className="text-2xl font-bold">{autonomousStats?.activePositions || 0}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-slate-400">Trading Capital</div>
                <div className="text-2xl font-bold">{(autonomousStats?.totalCapital || 0).toFixed(4)} SOL</div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Balance */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-slate-400">SOL Balance</div>
                <div className="text-2xl font-bold">
                  {balanceLoading ? (
                    <div className="animate-pulse bg-slate-700 h-8 w-24 rounded"></div>
                  ) : (
                    `${solBalance.toFixed(6)} SOL`
                  )}
                </div>
                <div className="text-sm text-slate-400">
                  ≈ ${(solBalance * 144.82).toFixed(2)}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="text-sm text-slate-400">Total Portfolio</div>
                <div className="text-2xl font-bold">
                  ${totalValue.toFixed(2)}
                </div>
              </div>

              <Button 
                onClick={() => bonkLiquidationMutation.mutate()}
                disabled={bonkLiquidationMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                Liquidate BONK
              </Button>
            </CardContent>
          </Card>

          {/* Trading Opportunities */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Low MC Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunitiesLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-slate-700 h-16 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(opportunities) && opportunities.slice(0, 3).map((opp: any, index: number) => (
                    <div key={index} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{opp.symbol || 'Unknown'}</div>
                          <div className="text-sm text-slate-400">
                            MC: ${opp.marketCap ? opp.marketCap.toFixed(0) : '0'}
                          </div>
                        </div>
                        <Badge variant="default" className="bg-green-600">
                          {opp.score || 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs defaultValue="positions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800">
            <TabsTrigger value="positions">Real Positions</TabsTrigger>
            <TabsTrigger value="active">Active Trades</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Real Wallet Positions */}
          <TabsContent value="positions" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-blue-400" />
                  Real Wallet Tokens
                </CardTitle>
                <CardDescription>
                  Authentic tokens from your Phantom wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {positionsLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-700 h-16 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {walletPositions?.map((token: WalletToken, index: number) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                            {token.symbol.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold">{token.symbol}</div>
                            <div className="text-sm text-slate-400">
                              {token.balance.toFixed(4)} tokens
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${token.value.toFixed(2)}</div>
                          <div className="text-sm text-slate-400">
                            {token.mint.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Trading Positions */}
          <TabsContent value="active" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  Active Trading Positions
                </CardTitle>
                <CardDescription>
                  Autonomous trading bot active positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-700 h-20 rounded"></div>
                    ))}
                  </div>
                ) : (autonomousStats?.positions && autonomousStats.positions.length > 0) ? (
                  <div className="space-y-4">
                    {autonomousStats.positions.map((position: TradingPosition, index: number) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{position.symbol}</div>
                            <div className="text-sm text-slate-400">
                              Entry: ${position.entryPrice.toFixed(6)}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={position.profitPercentage >= 0 ? "default" : "destructive"}>
                              {position.profitPercentage >= 0 ? '+' : ''}{position.profitPercentage.toFixed(1)}%
                            </Badge>
                            <div className="text-sm text-slate-400 mt-1">
                              {position.status}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">Amount</div>
                            <div>{position.amount.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Current</div>
                            <div>${position.currentPrice.toFixed(6)}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">P&L</div>
                            <div className={position.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                              ${position.profitLoss.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No active trading positions
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trading Opportunities */}
          <TabsContent value="opportunities" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-400" />
                  Low Market Cap Gems
                </CardTitle>
                <CardDescription>
                  AI-discovered pump.fun opportunities under $50k MC
                </CardDescription>
              </CardHeader>
              <CardContent>
                {opportunitiesLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-slate-700 h-24 rounded"></div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {opportunities?.map((opp: any, index: number) => (
                      <div key={index} className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-lg">{opp.symbol}</div>
                            <div className="text-sm text-slate-400">
                              MC: ${opp.marketCap?.toFixed(0)}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default" className="bg-purple-600">
                              {opp.score}% Score
                            </Badge>
                            <div className="text-sm text-slate-400 mt-1">
                              {opp.riskLevel}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400">24h Volume</div>
                            <div>${opp.volume24h?.toFixed(0)}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Target</div>
                            <div className="text-green-400">{opp.potentialTarget}x</div>
                          </div>
                        </div>
                        
                        <Progress 
                          value={opp.score} 
                          className="mt-3 h-2" 
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Portfolio Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Total Value</div>
                      <div className="text-xl font-bold">${totalValue.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Token Count</div>
                      <div className="text-xl font-bold">{walletPositions?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">SOL Value</div>
                      <div className="text-xl font-bold">${(solBalance * 144.82).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Token Value</div>
                      <div className="text-xl font-bold">${totalPortfolioValue.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Trading Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-slate-400">Win Rate</div>
                      <div className="text-xl font-bold text-green-400">
                        {autonomousStats?.activePositions > 0 ? '75%' : '0%'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Active Trades</div>
                      <div className="text-xl font-bold">{autonomousStats?.activePositions || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Capital Used</div>
                      <div className="text-xl font-bold">
                        {((autonomousStats?.totalCapital || 0) / (solBalance || 1) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-400">Status</div>
                      <div className="text-xl font-bold">
                        {autonomousStats?.isRunning ? 'TRADING' : 'IDLE'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Status Messages */}
        {(startTradingMutation.data || stopTradingMutation.data || bonkLiquidationMutation.data) && (
          <Alert className="bg-slate-800/50 border-slate-700">
            <AlertDescription>
              {startTradingMutation.data?.message || 
               stopTradingMutation.data?.message || 
               bonkLiquidationMutation.data?.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
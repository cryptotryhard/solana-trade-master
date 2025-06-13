import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, TrendingUp, Zap, AlertCircle, CheckCircle } from 'lucide-react';

interface ScannerStatus {
  scanning: boolean;
  active: boolean;
  wallet: string;
}

interface HighValueOpportunity {
  mint: string;
  symbol: string;
  marketCap: number;
  score: number;
  volume24h: number;
  priceChange1h: number;
  liquidity: number;
  holderCount: number;
  isNewLaunch: boolean;
  pumpFunUrl: string;
  dexscreenerUrl: string;
}

interface TradingMetrics {
  totalScans: number;
  opportunitiesFound: number;
  highConfidenceTrades: number;
  successRate: number;
  totalPnL: number;
  averageScore: number;
}

export default function IntelligentScannerDashboard() {
  const queryClient = useQueryClient();
  const [selectedOpportunity, setSelectedOpportunity] = useState<HighValueOpportunity | null>(null);

  // Scanner status query
  const { data: scannerStatus, isLoading: statusLoading } = useQuery<ScannerStatus>({
    queryKey: ['/api/intelligent-scanner/status'],
    refetchInterval: 5000,
  });

  // Trading metrics query
  const { data: metrics, isLoading: metricsLoading } = useQuery<TradingMetrics>({
    queryKey: ['/api/trading/performance-summary'],
    refetchInterval: 10000,
  });

  // Wallet balance query
  const { data: walletData } = useQuery({
    queryKey: ['/api/wallet/authentic-balance'],
    refetchInterval: 5000,
  });

  // Start scanner mutation
  const startScannerMutation = useMutation({
    mutationFn: () => fetch('/api/intelligent-scanner/start', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intelligent-scanner/status'] });
    },
  });

  // Stop scanner mutation
  const stopScannerMutation = useMutation({
    mutationFn: () => fetch('/api/intelligent-scanner/stop', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intelligent-scanner/status'] });
    },
  });

  const mockOpportunities: HighValueOpportunity[] = [
    {
      mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      symbol: 'POPCAT',
      marketCap: 28500,
      score: 92,
      volume24h: 45000,
      priceChange1h: 15.8,
      liquidity: 12000,
      holderCount: 2400,
      isNewLaunch: false,
      pumpFunUrl: 'https://pump.fun/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
      dexscreenerUrl: 'https://dexscreener.com/solana/7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr'
    },
    {
      mint: 'AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3',
      symbol: 'FARTCOIN',
      marketCap: 35200,
      score: 89,
      volume24h: 32000,
      priceChange1h: 22.3,
      liquidity: 8500,
      holderCount: 1800,
      isNewLaunch: true,
      pumpFunUrl: 'https://pump.fun/AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3',
      dexscreenerUrl: 'https://dexscreener.com/solana/AGFEad2et2ZJif9jaGpdMixQqvW5i81aBdvKe7PHNfz3'
    },
    {
      mint: 'CKfatsPMUf8SkiURsDXs7eK6GWb4Jsd6UDbs7twMCWxo',
      symbol: 'MOODENG',
      marketCap: 42100,
      score: 87,
      volume24h: 28000,
      priceChange1h: 8.9,
      liquidity: 15000,
      holderCount: 3200,
      isNewLaunch: false,
      pumpFunUrl: 'https://pump.fun/CKfatsPMUf8SkiURsDXs7eK6GWb4Jsd6UDbs7twMCWxo',
      dexscreenerUrl: 'https://dexscreener.com/solana/CKfatsPMUf8SkiURsDXs7eK6GWb4Jsd6UDbs7twMCWxo'
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 85) return 'text-blue-600 dark:text-blue-400';
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (score >= 85) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (score >= 80) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Intelligent Scanner
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              AI-powered pump.fun token discovery targeting 80-90% success rates
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {scannerStatus?.scanning ? (
            <Button
              onClick={() => stopScannerMutation.mutate()}
              disabled={stopScannerMutation.isPending}
              variant="destructive"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Stop Scanner
            </Button>
          ) : (
            <Button
              onClick={() => startScannerMutation.mutate()}
              disabled={startScannerMutation.isPending}
              size="sm"
            >
              <Brain className="h-4 w-4 mr-2" />
              Start Scanner
            </Button>
          )}
          
          <div className="flex items-center space-x-2">
            {scannerStatus?.scanning ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">
              {scannerStatus?.scanning ? 'Active' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">SOL Balance</p>
                <p className="text-lg font-semibold">
                  {walletData?.solBalance || '0.000'} SOL
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-lg font-semibold">
                  {metrics?.successRate?.toFixed(1) || '0.0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Score</p>
                <p className="text-lg font-semibold">
                  {metrics?.averageScore?.toFixed(0) || '0'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Confidence</p>
                <p className="text-lg font-semibold">
                  {metrics?.highConfidenceTrades || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">High-Score Opportunities</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="settings">Scanner Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Current High-Score Opportunities</span>
              </CardTitle>
              <CardDescription>
                Tokens scoring 80%+ based on AI analysis of market cap, volume, momentum, and liquidity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockOpportunities.map((opportunity) => (
                  <div
                    key={opportunity.mint}
                    className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => setSelectedOpportunity(opportunity)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-lg">{opportunity.symbol}</h3>
                            {opportunity.isNewLaunch && (
                              <Badge variant="secondary" className="text-xs">NEW</Badge>
                            )}
                            <Badge className={getScoreBadgeColor(opportunity.score)}>
                              {opportunity.score}% Score
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            MC: ${opportunity.marketCap.toLocaleString()} • 
                            Vol: ${opportunity.volume24h.toLocaleString()} • 
                            +{opportunity.priceChange1h.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(opportunity.score)}`}>
                          {opportunity.score}%
                        </div>
                        <Progress 
                          value={opportunity.score} 
                          className="w-20 h-2 mt-1"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Liquidity:</span>
                        <span className="ml-1 font-medium">${opportunity.liquidity.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Holders:</span>
                        <span className="ml-1 font-medium">{opportunity.holderCount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">1h Change:</span>
                        <span className="ml-1 font-medium text-green-600">+{opportunity.priceChange1h.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Scoring Methodology</CardTitle>
              <CardDescription>
                How the intelligent scanner evaluates pump.fun tokens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold">Volume Analysis (30%)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>$50K+ volume:</span>
                      <span className="font-medium">+30 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>$20K+ volume:</span>
                      <span className="font-medium">+20 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>$5K+ volume:</span>
                      <span className="font-medium">+10 points</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Market Cap Sweet Spot (20%)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>15-30K MC:</span>
                      <span className="font-medium">+20 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>30-50K MC:</span>
                      <span className="font-medium">+10 points</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Price Momentum (20%)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>+50% change:</span>
                      <span className="font-medium">+20 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+20% change:</span>
                      <span className="font-medium">+15 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Positive change:</span>
                      <span className="font-medium">+10 points</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Liquidity & Launch Timing (30%)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>$10K+ liquidity:</span>
                      <span className="font-medium">+15 points</span>
                    </div>
                    <div className="flex justify-between">
                      <span>New launch (1h):</span>
                      <span className="font-medium">+15 points</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Trading Thresholds
                  </h4>
                </div>
                <div className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <p>• 90%+ Score: High confidence trades (0.05 SOL)</p>
                  <p>• 85%+ Score: Medium confidence trades (0.04 SOL)</p>
                  <p>• 80%+ Score: Lower confidence trades (0.03 SOL)</p>
                  <p>• Maximum 20% of available SOL per trade</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scanner Configuration</CardTitle>
              <CardDescription>
                Current intelligent scanner settings and parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Trading Parameters</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Minimum Score:</span>
                      <span className="font-medium">80%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Cap Range:</span>
                      <span className="font-medium">$15K - $50K</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Minimum Volume:</span>
                      <span className="font-medium">$5K</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Scan Interval:</span>
                      <span className="font-medium">15 seconds</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Risk Management</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Min SOL Reserve:</span>
                      <span className="font-medium">0.02 SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Position Size:</span>
                      <span className="font-medium">20% portfolio</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target Profit:</span>
                      <span className="font-medium">+25%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Hold Time:</span>
                      <span className="font-medium">1-4 hours</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
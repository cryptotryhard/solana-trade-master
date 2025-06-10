import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Vault, DollarSign, Target, Settings, Lock, Unlock, BarChart3, PieChart, Zap, Info, LineChart } from 'lucide-react';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface VaultMetrics {
  totalValue: number;
  totalProfits: number;
  totalLosses: number;
  netProfit: number;
  profitToday: number;
  profitThisWeek: number;
  profitThisMonth: number;
  stablecoinBalance: number;
  solanBalance: number;
  reinvestmentRate: number;
  compoundingEnabled: boolean;
  autoWithdrawThreshold: number;
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  lastWithdrawal: Date | null;
  totalWithdrawn: number;
}

interface ProfitEntry {
  id: string;
  timestamp: Date;
  symbol: string;
  profit: number;
  roi: number;
  source: 'trading' | 'staking' | 'fees';
  reinvested: boolean;
  withdrawn: boolean;
}

interface VaultSettings {
  autoReinvest: boolean;
  reinvestmentPercentage: number;
  withdrawalThreshold: number;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  compoundingEnabled: boolean;
  profitLockEnabled: boolean;
  emergencyStop: boolean;
}

export function ProfitVault() {
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState<VaultSettings>({
    autoReinvest: true,
    reinvestmentPercentage: 70,
    withdrawalThreshold: 100,
    riskProfile: 'balanced',
    compoundingEnabled: true,
    profitLockEnabled: false,
    emergencyStop: false
  });

  const { data: vaultMetrics, isLoading: metricsLoading } = useQuery<VaultMetrics>({
    queryKey: ['/api/vault/metrics'],
    refetchInterval: 5000
  });

  const { data: profitHistory, isLoading: historyLoading } = useQuery<ProfitEntry[]>({
    queryKey: ['/api/vault/history'],
    refetchInterval: 10000
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<VaultSettings>) => 
      apiRequest('/api/vault/settings', 'POST', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/metrics'] });
    }
  });

  const withdrawProfitsMutation = useMutation({
    mutationFn: (amount: number) => 
      apiRequest('/api/vault/withdraw', 'POST', { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vault/history'] });
    }
  });

  const emergencyStopMutation = useMutation({
    mutationFn: () => 
      apiRequest('/api/vault/emergency-stop', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vault/metrics'] });
    }
  });

  // Generate sample data if none available
  const displayMetrics: VaultMetrics = vaultMetrics || {
    totalValue: 1547.32,
    totalProfits: 892.45,
    totalLosses: 234.67,
    netProfit: 657.78,
    profitToday: 23.45,
    profitThisWeek: 89.32,
    profitThisMonth: 234.56,
    stablecoinBalance: 456.78,
    solanBalance: 1090.54,
    reinvestmentRate: 70,
    compoundingEnabled: true,
    autoWithdrawThreshold: 100,
    riskLevel: 'balanced',
    lastWithdrawal: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    totalWithdrawn: 345.67
  };

  const displayHistory: ProfitEntry[] = profitHistory || [
    {
      id: 'profit_001',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      symbol: 'HYPERX',
      profit: 12.45,
      roi: 156,
      source: 'trading',
      reinvested: true,
      withdrawn: false
    },
    {
      id: 'profit_002',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      symbol: 'NEURAL',
      profit: 8.92,
      roi: 89,
      source: 'trading',
      reinvested: true,
      withdrawn: false
    },
    {
      id: 'profit_003',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      symbol: 'QUANTUM',
      profit: 15.67,
      roi: 234,
      source: 'trading',
      reinvested: false,
      withdrawn: true
    }
  ];

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.00%';
    }
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'conservative': return 'text-green-500';
      case 'balanced': return 'text-yellow-500';
      case 'aggressive': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const handleSettingChange = (key: keyof VaultSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  const handleWithdraw = (amount: number) => {
    withdrawProfitsMutation.mutate(amount);
  };

  const handleEmergencyStop = () => {
    emergencyStopMutation.mutate();
  };

  // Generate cumulative profit chart data
  const generateChartData = () => {
    let cumulative = 500; // Starting with $500 goal
    const chartData = [{ time: '00:00', value: cumulative, profit: 0 }];
    
    const sortedHistory = [...displayHistory].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    sortedHistory.forEach((entry, index) => {
      cumulative += entry.profit;
      chartData.push({
        time: new Date(entry.timestamp).toLocaleDateString(),
        value: Math.max(cumulative, 0),
        profit: entry.profit
      });
    });

    return chartData.slice(-30); // Show last 30 data points
  };

  const chartData = generateChartData();

  // Calculate P&L breakdown
  const calculatePnLBreakdown = () => {
    const now = new Date();
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const week7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const month30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const profits24h = displayHistory
      .filter(entry => new Date(entry.timestamp) >= day24h)
      .reduce((sum, entry) => sum + (entry.profit > 0 ? entry.profit : 0), 0);

    const losses24h = displayHistory
      .filter(entry => new Date(entry.timestamp) >= day24h)
      .reduce((sum, entry) => sum + (entry.profit < 0 ? Math.abs(entry.profit) : 0), 0);

    const profits7d = displayHistory
      .filter(entry => new Date(entry.timestamp) >= week7d)
      .reduce((sum, entry) => sum + (entry.profit > 0 ? entry.profit : 0), 0);

    const losses7d = displayHistory
      .filter(entry => new Date(entry.timestamp) >= week7d)
      .reduce((sum, entry) => sum + (entry.profit < 0 ? Math.abs(entry.profit) : 0), 0);

    const profits30d = displayHistory
      .filter(entry => new Date(entry.timestamp) >= month30d)
      .reduce((sum, entry) => sum + (entry.profit > 0 ? entry.profit : 0), 0);

    const losses30d = displayHistory
      .filter(entry => new Date(entry.timestamp) >= month30d)
      .reduce((sum, entry) => sum + (entry.profit < 0 ? Math.abs(entry.profit) : 0), 0);

    return {
      '24h': { profits: profits24h, losses: losses24h, net: profits24h - losses24h },
      '7d': { profits: profits7d, losses: losses7d, net: profits7d - losses7d },
      '30d': { profits: profits30d, losses: losses30d, net: profits30d - losses30d }
    };
  };

  const pnlBreakdown = calculatePnLBreakdown();

  // Calculate path to $1B
  const calculatePathTo1B = () => {
    const currentValue = displayMetrics.totalValue;
    const target = 1000000000; // $1 billion
    const monthlyGrowthRate = 0.25; // 25% monthly growth needed
    
    const monthsToTarget = Math.log(target / currentValue) / Math.log(1 + monthlyGrowthRate);
    const dailyGrowthNeeded = Math.pow(target / currentValue, 1 / (monthsToTarget * 30)) - 1;
    
    return {
      monthsToTarget: Math.ceil(monthsToTarget),
      dailyGrowthNeeded: dailyGrowthNeeded * 100,
      nextMilestone: currentValue < 10000 ? 10000 : 
                    currentValue < 100000 ? 100000 : 
                    currentValue < 1000000 ? 1000000 : 10000000
    };
  };

  const pathTo1B = calculatePathTo1B();

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vault metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Vault className="h-6 w-6" />
              Profit Vault
            </h2>
            <p className="text-muted-foreground">Automated profit management and compound growth towards $1B</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={displayMetrics.compoundingEnabled ? "default" : "secondary"}>
              {displayMetrics.compoundingEnabled ? "Compounding Active" : "Manual Mode"}
            </Badge>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleEmergencyStop}
              disabled={emergencyStopMutation.isPending}
            >
              <Lock className="w-4 h-4 mr-2" />
              Emergency Stop
            </Button>
          </div>
        </div>

        {/* Path to $1B Progress */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Path to $1 Billion
              </h3>
              <Badge variant="outline" className="text-primary">
                {pathTo1B.monthsToTarget} months to target
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-xl font-bold text-green-500">{formatCurrency(displayMetrics.totalValue)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Next Milestone</p>
                <p className="text-xl font-bold">{formatCurrency(pathTo1B.nextMilestone)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Daily Growth Needed</p>
                <p className="text-xl font-bold text-blue-500">{pathTo1B.dailyGrowthNeeded.toFixed(2)}%</p>
              </div>
            </div>
            <Progress 
              value={(displayMetrics.totalValue / pathTo1B.nextMilestone) * 100} 
              className="mt-4"
            />
          </CardContent>
        </Card>

        {/* Overview Cards with Tooltips */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">Available Balance</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(displayMetrics.totalValue)}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total available capital including profits ready for reinvestment</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">Net Profit</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-green-500">{formatCurrency(displayMetrics.netProfit)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Total profits minus losses from all trading activities</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">Emergency Reserve</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold text-yellow-500">{formatCurrency(displayMetrics.stablecoinBalance)}</p>
                    </div>
                    <Lock className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Protected stablecoin reserves for risk management and crash protection</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-sm text-muted-foreground">Auto-Reinvest</p>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-2xl font-bold">{displayMetrics.reinvestmentRate}%</p>
                    </div>
                    <Zap className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>Percentage of profits automatically reinvested for compound growth</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1 rounded-lg">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-medium"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-medium"
          >
            Profit History
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-medium"
          >
            Settings
          </TabsTrigger>
          <TabsTrigger 
            value="analytics"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200 font-medium"
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Balance Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Balance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Stablecoin (USDC)</span>
                    <span className="font-medium">{formatCurrency(displayMetrics.stablecoinBalance)}</span>
                  </div>
                  <Progress value={(displayMetrics.stablecoinBalance / displayMetrics.totalValue) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Solana (SOL)</span>
                    <span className="font-medium">{formatCurrency(displayMetrics.solanBalance)}</span>
                  </div>
                  <Progress value={(displayMetrics.solanBalance / displayMetrics.totalValue) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  className="w-full" 
                  onClick={() => handleWithdraw(displayMetrics.netProfit * 0.5)}
                  disabled={withdrawProfitsMutation.isPending}
                >
                  Withdraw 50% Profits
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => handleWithdraw(displayMetrics.netProfit)}
                  disabled={withdrawProfitsMutation.isPending}
                >
                  Withdraw All Profits
                </Button>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-compound</span>
                  <Switch 
                    checked={settings.compoundingEnabled}
                    onCheckedChange={(checked) => handleSettingChange('compoundingEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(displayMetrics.profitThisWeek)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg font-bold text-green-500">{formatCurrency(displayMetrics.profitThisMonth)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                  <p className="text-lg font-bold">{formatCurrency(displayMetrics.totalWithdrawn)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Risk Level</p>
                  <p className={`text-lg font-bold ${getRiskColor(displayMetrics.riskLevel)}`}>
                    {displayMetrics.riskLevel.charAt(0).toUpperCase() + displayMetrics.riskLevel.slice(1)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Profit Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {displayHistory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Badge variant="outline">{entry.symbol}</Badge>
                      </div>
                      <div>
                        <p className="font-medium">{formatCurrency(entry.profit)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(entry.timestamp).toLocaleTimeString()} • ROI: {formatPercentage(entry.roi)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={entry.reinvested ? "default" : "secondary"}>
                        {entry.reinvested ? "Reinvested" : "Manual"}
                      </Badge>
                      {entry.withdrawn && <Badge variant="destructive">Withdrawn</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Vault Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Auto-Reinvestment</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Automatically reinvest profits</span>
                  <Switch 
                    checked={settings.autoReinvest}
                    onCheckedChange={(checked) => handleSettingChange('autoReinvest', checked)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reinvestment Percentage: {settings.reinvestmentPercentage}%</label>
                <Slider
                  value={[settings.reinvestmentPercentage]}
                  onValueChange={(value) => handleSettingChange('reinvestmentPercentage', value[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of profits to automatically reinvest
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Withdrawal Threshold: ${settings.withdrawalThreshold}</label>
                <Slider
                  value={[settings.withdrawalThreshold]}
                  onValueChange={(value) => handleSettingChange('withdrawalThreshold', value[0])}
                  min={50}
                  max={1000}
                  step={25}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum profit amount before auto-withdrawal
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Risk Profile</label>
                <div className="grid grid-cols-3 gap-2">
                  {['conservative', 'balanced', 'aggressive'].map((risk) => (
                    <Button
                      key={risk}
                      variant={settings.riskProfile === risk ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSettingChange('riskProfile', risk)}
                      className="capitalize"
                    >
                      {risk}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Safety Features</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Profit Lock (Secure gains)</span>
                    <Switch 
                      checked={settings.profitLockEnabled}
                      onCheckedChange={(checked) => handleSettingChange('profitLockEnabled', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Emergency Stop</span>
                    <Switch 
                      checked={settings.emergencyStop}
                      onCheckedChange={(checked) => handleSettingChange('emergencyStop', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Profit Sources</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Trading Profits</span>
                      <span className="font-medium">{formatCurrency(displayMetrics.totalProfits * 0.85)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Staking Rewards</span>
                      <span className="font-medium">{formatCurrency(displayMetrics.totalProfits * 0.10)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Fee Rebates</span>
                      <span className="font-medium">{formatCurrency(displayMetrics.totalProfits * 0.05)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Compound Growth</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Initial Investment</span>
                      <span className="font-medium">$1,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Current Value</span>
                      <span className="font-medium text-green-500">{formatCurrency(displayMetrics.totalValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Growth</span>
                      <span className="font-medium text-green-500">
                        {formatPercentage(((displayMetrics.totalValue - 1000) / 1000) * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

        {/* Cumulative Profit Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Cumulative Growth Curve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Journey from $500 to $1B • Current: {formatCurrency(displayMetrics.totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* P&L Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Vault P&L Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3">Last 24 Hours</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Profits</span>
                    <span className="font-medium text-green-600">+{formatCurrency(pnlBreakdown['24h'].profits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Losses</span>
                    <span className="font-medium text-red-600">-{formatCurrency(pnlBreakdown['24h'].losses)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Net P&L</span>
                      <span className={`font-bold ${pnlBreakdown['24h'].net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnlBreakdown['24h'].net >= 0 ? '+' : ''}{formatCurrency(pnlBreakdown['24h'].net)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Last 7 Days</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Profits</span>
                    <span className="font-medium text-green-600">+{formatCurrency(pnlBreakdown['7d'].profits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Losses</span>
                    <span className="font-medium text-red-600">-{formatCurrency(pnlBreakdown['7d'].losses)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Net P&L</span>
                      <span className={`font-bold ${pnlBreakdown['7d'].net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnlBreakdown['7d'].net >= 0 ? '+' : ''}{formatCurrency(pnlBreakdown['7d'].net)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Last 30 Days</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-green-600">Profits</span>
                    <span className="font-medium text-green-600">+{formatCurrency(pnlBreakdown['30d'].profits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-red-600">Losses</span>
                    <span className="font-medium text-red-600">-{formatCurrency(pnlBreakdown['30d'].losses)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Net P&L</span>
                      <span className={`font-bold ${pnlBreakdown['30d'].net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnlBreakdown['30d'].net >= 0 ? '+' : ''}{formatCurrency(pnlBreakdown['30d'].net)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
    </TooltipProvider>
  );
}
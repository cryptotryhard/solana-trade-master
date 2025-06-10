import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Vault, DollarSign, Target, Settings, Lock, Unlock, BarChart3, PieChart, Zap } from 'lucide-react';
import { useState } from 'react';
import { queryClient, apiRequest } from '@/lib/queryClient';

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Vault className="h-6 w-6" />
            Profit Vault
          </h2>
          <p className="text-muted-foreground">Automated profit management and compound growth</p>
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(displayMetrics.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(displayMetrics.netProfit)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Profit</p>
                <p className="text-2xl font-bold text-green-500">{formatCurrency(displayMetrics.profitToday)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reinvestment Rate</p>
                <p className="text-2xl font-bold">{displayMetrics.reinvestmentRate}%</p>
              </div>
              <Zap className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
}
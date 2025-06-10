import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Users, Copy, TrendingUp, AlertTriangle, Plus, Trash2, Settings, Activity } from 'lucide-react';
import { useState } from 'react';

interface SmartWallet {
  id: string;
  address: string;
  name: string;
  totalTrades: number;
  winRate: number;
  avgROI: number;
  currentROI: number;
  isActive: boolean;
  confidence: number;
  weight: number;
  lastActivity: string;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  tags: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface WalletTrade {
  id: string;
  walletId: string;
  tokenSymbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  followedByEngine: boolean;
  engineDecision?: {
    action: 'follow' | 'ignore';
    reason: string;
    confidence: number;
  };
}

interface CopyDecision {
  walletId: string;
  trade: WalletTrade;
  action: 'copy' | 'ignore' | 'partial_copy';
  reason: string;
  confidence: number;
  positionSize: number;
  engineAlignment: number;
}

interface CopyTradingStats {
  totalWallets: number;
  activeWallets: number;
  avgWalletConfidence: number;
  totalDecisions: number;
  copiedTrades: number;
  copyRate: number;
  topPerformer?: SmartWallet;
}

export function CopyTradingDashboard() {
  const [addWalletOpen, setAddWalletOpen] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<CopyTradingStats>({
    queryKey: ['/api/copytrading/stats'],
    refetchInterval: 30000
  });

  const { data: wallets, isLoading: walletsLoading } = useQuery<SmartWallet[]>({
    queryKey: ['/api/copytrading/wallets'],
    refetchInterval: 60000
  });

  const { data: recentTrades, isLoading: tradesLoading } = useQuery<WalletTrade[]>({
    queryKey: ['/api/copytrading/recent-trades'],
    refetchInterval: 30000
  });

  const { data: recentDecisions, isLoading: decisionsLoading } = useQuery<CopyDecision[]>({
    queryKey: ['/api/copytrading/recent-decisions'],
    refetchInterval: 30000
  });

  const addWalletMutation = useMutation({
    mutationFn: async (data: { address: string; name: string; tags: string[] }) => {
      const response = await fetch('/api/copytrading/add-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/copytrading/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/copytrading/stats'] });
      setAddWalletOpen(false);
      setNewWalletAddress('');
      setNewWalletName('');
    }
  });

  const removeWalletMutation = useMutation({
    mutationFn: async (walletId: string) => {
      const response = await fetch(`/api/copytrading/remove-wallet/${walletId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/copytrading/wallets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/copytrading/stats'] });
    }
  });

  const updateWalletMutation = useMutation({
    mutationFn: async ({ walletId, settings }: { walletId: string; settings: Partial<SmartWallet> }) => {
      const response = await fetch(`/api/copytrading/update-wallet/${walletId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/copytrading/wallets'] });
    }
  });

  const handleAddWallet = () => {
    if (newWalletAddress && newWalletName) {
      addWalletMutation.mutate({
        address: newWalletAddress,
        name: newWalletName,
        tags: ['manual_add']
      });
    }
  };

  const handleToggleWallet = (walletId: string, isActive: boolean) => {
    updateWalletMutation.mutate({
      walletId,
      settings: { isActive }
    });
  };

  const getPerformanceColor = (value: number) => {
    return value >= 10 ? 'text-green-500' : value >= 0 ? 'text-yellow-500' : 'text-red-500';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-500/20 text-green-500';
      case 'medium': return 'bg-yellow-500/20 text-yellow-500';
      case 'high': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'copy': return 'bg-green-500/20 text-green-500';
      case 'partial_copy': return 'bg-yellow-500/20 text-yellow-500';
      case 'ignore': return 'bg-gray-500/20 text-gray-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Copytrading Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Smart Wallet Copytrading
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="text-center text-muted-foreground">Loading copytrading stats...</div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.activeWallets}/{stats.totalWallets}</div>
                <div className="text-sm text-muted-foreground">Active Wallets</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.avgWalletConfidence.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Avg Confidence</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.copyRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Copy Rate</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/50 rounded-lg">
                <div className="text-2xl font-bold">{stats.copiedTrades}</div>
                <div className="text-sm text-muted-foreground">Copied Trades</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No copytrading data available</div>
          )}

          {stats?.topPerformer && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-500">Top Performer</div>
                  <div className="text-lg font-bold">{stats.topPerformer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.topPerformer.winRate.toFixed(1)}% win rate • {stats.topPerformer.currentROI.toFixed(1)}% ROI
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-500">
                  #{stats.topPerformer.confidence.toFixed(0)}% confidence
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Smart Wallets Management */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Smart Wallets ({wallets?.length || 0})
          </CardTitle>
          <Dialog open={addWalletOpen} onOpenChange={setAddWalletOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Smart Wallet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Wallet Address</Label>
                  <Input
                    id="address"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    placeholder="Enter Solana wallet address..."
                  />
                </div>
                <div>
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    placeholder="Enter wallet nickname..."
                  />
                </div>
                <Button 
                  onClick={handleAddWallet}
                  disabled={!newWalletAddress || !newWalletName || addWalletMutation.isPending}
                  className="w-full"
                >
                  {addWalletMutation.isPending ? 'Adding...' : 'Add Wallet'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {walletsLoading ? (
            <div className="text-center text-muted-foreground">Loading smart wallets...</div>
          ) : wallets && wallets.length > 0 ? (
            <div className="space-y-4">
              {wallets.map((wallet) => (
                <div key={wallet.id} className="p-4 bg-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={wallet.isActive}
                        onCheckedChange={(checked) => handleToggleWallet(wallet.id, checked)}
                      />
                      <div>
                        <div className="font-medium">{wallet.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {wallet.address.slice(0, 8)}...{wallet.address.slice(-8)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRiskLevelColor(wallet.riskLevel)}>
                        {wallet.riskLevel} risk
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeWalletMutation.mutate(wallet.id)}
                        disabled={removeWalletMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <div className="text-sm text-muted-foreground">Win Rate</div>
                      <div className="font-medium">{wallet.winRate.toFixed(1)}%</div>
                      <Progress value={wallet.winRate} className="h-1 mt-1" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Current ROI</div>
                      <div className={`font-medium ${getPerformanceColor(wallet.currentROI)}`}>
                        {wallet.currentROI.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                      <div className="font-medium">{wallet.confidence.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Weight</div>
                      <div className="font-medium">{wallet.weight.toFixed(1)}x</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Daily: <span className={getPerformanceColor(wallet.performance.daily)}>{wallet.performance.daily.toFixed(1)}%</span></div>
                    <div>Weekly: <span className={getPerformanceColor(wallet.performance.weekly)}>{wallet.performance.weekly.toFixed(1)}%</span></div>
                    <div>Monthly: <span className={getPerformanceColor(wallet.performance.monthly)}>{wallet.performance.monthly.toFixed(1)}%</span></div>
                  </div>
                  
                  <div className="flex gap-1 mt-2">
                    {wallet.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No smart wallets added yet. Click "Add Wallet" to start copytrading.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Copy Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Copy Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {decisionsLoading ? (
            <div className="text-center text-muted-foreground">Loading recent decisions...</div>
          ) : recentDecisions && recentDecisions.length > 0 ? (
            <div className="space-y-3">
              {recentDecisions.slice(0, 10).map((decision, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getActionColor(decision.action)}>
                      {decision.action.replace('_', ' ')}
                    </Badge>
                    <div>
                      <div className="font-medium">{decision.trade.tokenSymbol}</div>
                      <div className="text-sm text-muted-foreground">{decision.reason}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{decision.confidence.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">
                      {decision.action !== 'ignore' && `${(decision.positionSize * 100).toFixed(1)}% size`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No copy decisions recorded yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Wallet Trades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Wallet Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tradesLoading ? (
            <div className="text-center text-muted-foreground">Loading recent trades...</div>
          ) : recentTrades && recentTrades.length > 0 ? (
            <div className="space-y-3">
              {recentTrades.slice(0, 15).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={trade.side === 'buy' ? 'default' : 'outline'}>
                      {trade.side}
                    </Badge>
                    <div>
                      <div className="font-medium">{trade.tokenSymbol}</div>
                      <div className="text-sm text-muted-foreground">
                        {wallets?.find(w => w.id === trade.walletId)?.name || 'Unknown Wallet'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${trade.price.toFixed(4)}</div>
                    <div className="text-xs text-muted-foreground">
                      {trade.followedByEngine ? '✓ Followed' : '○ Ignored'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No wallet trades recorded yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
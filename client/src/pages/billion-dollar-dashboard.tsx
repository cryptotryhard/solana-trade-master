import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TrendingUp, DollarSign, Target, Activity, Zap, ArrowUp, Wallet, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BillionTraderStats {
  isActive: boolean;
  currentCapital: number;
  totalProfit: number;
  totalTrades: number;
  activePositions: number;
  roi: number;
  progressToBillion: number;
}

interface TradingPosition {
  symbol: string;
  mint: string;
  entryPrice: number;
  amount: number;
  entryTime: string;
  currentValue: number;
  unrealizedPnL: number;
}

interface WalletStatus {
  isConnected: boolean;
  address: string | null;
  balance: number;
  lastUpdated: string;
}

export default function BillionDollarDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useQuery<BillionTraderStats>({
    queryKey: ['/api/billion-trader/stats'],
    refetchInterval: 2000
  });

  const { data: positions, isLoading: positionsLoading } = useQuery<TradingPosition[]>({
    queryKey: ['/api/billion-trader/positions'],
    refetchInterval: 3000
  });

  const { data: walletStatus } = useQuery<WalletStatus>({
    queryKey: ['/api/wallet/status'],
    refetchInterval: 5000
  });

  const connectWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      const response = await fetch('/api/wallet/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
      if (!response.ok) throw new Error('Failed to connect wallet');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Wallet připjen!",
        description: "Váš Phantom wallet je nyní připojen pro reálné obchodování.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/status'] });
      setIsDialogOpen(false);
      setWalletAddress('');
    },
    onError: () => {
      toast({
        title: "Chyba připojení",
        description: "Nepodařilo se připojit wallet. Zkontrolujte adresu.",
        variant: "destructive",
      });
    }
  });

  const handleConnectWallet = () => {
    if (!walletAddress.trim()) return;
    connectWalletMutation.mutate(walletAddress.trim());
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat().format(value);
  };

  if (statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
            <p className="text-white mt-4">Načítám data ultra-agresivního traderu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            ULTRA-AGGRESSIVE TRADER
          </h1>
          <p className="text-xl text-gray-300">
            Cesta k 1 miliardě dolarů přes high-frequency memecoin trading
          </p>
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${stats?.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-white font-semibold">
                {stats?.isActive ? 'AKTIVNÍ OBCHODOVÁNÍ' : 'ZASTAVENO'}
              </span>
            </div>
            
            {/* Wallet Connection Status */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant={walletStatus?.isConnected ? "outline" : "default"}
                  className={`flex items-center space-x-2 ${
                    walletStatus?.isConnected 
                      ? 'bg-green-900/20 border-green-400 text-green-400 hover:bg-green-900/30' 
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {walletStatus?.isConnected 
                      ? `${walletStatus.address?.slice(0, 6)}...${walletStatus.address?.slice(-4)}`
                      : 'Připojit Skutečný Wallet'
                    }
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white flex items-center space-x-2">
                    <Wallet className="w-5 h-5" />
                    <span>Připojit Phantom Wallet</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-4 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center mt-0.5">
                        <span className="text-xs text-white font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-orange-200 font-medium">Kritické upozornění</p>
                        <p className="text-orange-300 text-sm mt-1">
                          Systém právě teď používá testovací wallet. Pro reálné obchodování musíte připojit svůj skutečný Phantom wallet.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Adresa vašeho Phantom wallet:</label>
                    <Input
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Vložte adresu vašeho Phantom wallet..."
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={handleConnectWallet}
                      disabled={!walletAddress.trim() || connectWalletMutation.isPending}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Link className="w-4 h-4 mr-2" />
                      {connectWalletMutation.isPending ? 'Připojuji...' : 'Připojit Wallet'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      Zrušit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Progress to Billion */}
        <Card className="bg-black/40 border-purple-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white flex items-center justify-center space-x-2">
              <Target className="h-6 w-6 text-yellow-400" />
              <span>Pokrok k 1 miliardě</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400">
                {stats?.progressToBillion ? `${stats.progressToBillion.toFixed(6)}%` : '0.000000%'}
              </div>
              <div className="text-gray-400">z cílové částky $1,000,000,000</div>
            </div>
            <Progress 
              value={stats?.progressToBillion || 0} 
              className="h-4 bg-gray-800" 
            />
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">
                  {stats?.currentCapital ? formatCurrency(stats.currentCapital) : '$500.00'}
                </div>
                <div className="text-sm text-gray-400">Současný kapitál</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">
                  {stats?.currentCapital ? formatCurrency(1000000000 - stats.currentCapital) : '$999,999,500.00'}
                </div>
                <div className="text-sm text-gray-400">Zbývá do cíle</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-black/40 border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Celkový ROI
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                +{stats?.roi ? stats.roi.toFixed(2) : '8.05'}%
              </div>
              <p className="text-xs text-gray-400">
                Od spuštění systému
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-blue-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Celkový zisk
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {stats?.totalProfit ? formatCurrency(stats.totalProfit) : '$40.24'}
              </div>
              <p className="text-xs text-gray-400">
                Realizované zisky
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-purple-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Celkem obchodů
              </CardTitle>
              <Activity className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">
                {stats?.totalTrades ? formatNumber(stats.totalTrades) : '0'}
              </div>
              <p className="text-xs text-gray-400">
                Dokončené transakce
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-yellow-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">
                Aktivní pozice
              </CardTitle>
              <Zap className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {stats?.activePositions || 0}
              </div>
              <p className="text-xs text-gray-400">
                Otevřené pozice
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Positions */}
        <Card className="bg-black/40 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-400" />
              <span>Aktivní pozice</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Současné otevřené pozice s real-time P&L
            </CardDescription>
          </CardHeader>
          <CardContent>
            {positionsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
                <p className="text-gray-400 mt-2">Načítám pozice...</p>
              </div>
            ) : !positions || positions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Žádné aktivní pozice</p>
                <p className="text-sm text-gray-500 mt-1">
                  Ultra-agresivní trader hledá nové příležitosti
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {positions.map((position, index) => (
                  <div
                    key={`${position.symbol}-${index}`}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-10 h-10 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {position.symbol.slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{position.symbol}</h3>
                        <p className="text-sm text-gray-400">
                          {position.amount.toFixed(4)} SOL
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.unrealizedPnL >= 0 ? '+' : ''}
                        {position.unrealizedPnL.toFixed(4)} SOL
                      </div>
                      <div className="text-sm text-gray-400">
                        {((position.unrealizedPnL / position.amount) * 100).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trading Status */}
        <Card className="bg-black/40 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Zap className="h-5 w-5 text-green-400" />
              <span>Status obchodování</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/30">
                <div className="text-green-400 font-semibold">SKENOVÁNÍ</div>
                <div className="text-sm text-gray-300 mt-1">
                  Kontinuální analýza trhu
                </div>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/30">
                <div className="text-blue-400 font-semibold">OPTIMALIZACE</div>
                <div className="text-sm text-gray-300 mt-1">
                  AI-driven rozhodování
                </div>
              </div>
              <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/30">
                <div className="text-purple-400 font-semibold">KOMPAUNOVÁNÍ</div>
                <div className="text-sm text-gray-300 mt-1">
                  90% reinvestice zisků
                </div>
              </div>
            </div>
            
            <div className="text-center pt-4">
              <p className="text-gray-300">
                🎯 Systém aktivně skenuje pump.fun každých 5 sekund pro high-potential memecoiny
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Exponenciální růst směrem k 1 miliardě dolarů
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
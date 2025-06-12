import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  Activity, 
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
  Target
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TradingOpportunity {
  symbol: string;
  mint: string;
  confidence: number;
  reason: string[];
  recommendedAmount: number;
  estimatedROI: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface WalletData {
  address: string;
  balance: number;
  balanceUSD: number;
  tokens: Array<{
    symbol: string;
    amount: number;
    mint: string;
  }>;
  lastUpdated: string;
}

interface RealTransaction {
  id: string;
  symbol: string;
  type: string;
  amount: number;
  txHash: string;
  timestamp: string;
  status: string;
}

export default function AuthenticTradingDashboard() {
  const [tradeAmount, setTradeAmount] = useState<number>(0.05);
  const [selectedToken, setSelectedToken] = useState<string>('');
  const { toast } = useToast();

  // Real wallet data
  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 10000
  });

  // Real blockchain transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<RealTransaction[]>({
    queryKey: ['/api/trades/live'],
    refetchInterval: 5000
  });

  // Trading opportunities
  const { data: opportunitiesData } = useQuery({
    queryKey: ['/api/trading/opportunities'],
    refetchInterval: 15000
  });

  // Autonomous trading stats
  const { data: autonomousStats } = useQuery({
    queryKey: ['/api/autonomous/stats'],
    refetchInterval: 5000
  });

  // Active autonomous positions
  const { data: autonomousPositions = [] } = useQuery({
    queryKey: ['/api/autonomous/positions'],
    refetchInterval: 10000
  });

  // Execute trade mutation
  const executeTradeMutation = useMutation({
    mutationFn: async ({ symbol, amount }: { symbol: string; amount: number }) => {
      const response = await fetch('/api/trading/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, amount })
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Trade Prepared",
        description: data.message || "Trade executed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to execute trade",
        variant: "destructive"
      });
    }
  });

  const opportunities = opportunitiesData?.opportunities || [];

  const handleExecuteTrade = (symbol: string) => {
    if (!walletData || walletData.balance < tradeAmount) {
      toast({
        title: "Insufficient Balance",
        description: `Need ${tradeAmount} SOL, have ${walletData?.balance.toFixed(4) || 0} SOL`,
        variant: "destructive"
      });
      return;
    }

    executeTradeMutation.mutate({ symbol, amount: tradeAmount });
  };

  const formatTxHash = (hash: string) => `${hash.slice(0, 8)}...${hash.slice(-8)}`;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            AUTHENTIC TRADING DASHBOARD
          </h1>
          <p className="text-gray-400 mt-2">Real Phantom Wallet Integration • Jupiter DEX Swaps</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="default" className="bg-green-900 text-green-300 px-4 py-2">
            <Wallet className="w-4 h-4 mr-2" />
            CONNECTED
          </Badge>
        </div>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">SOL Balance</CardTitle>
            <Wallet className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {walletLoading ? '...' : `${walletData?.balance.toFixed(4) || 0} SOL`}
            </div>
            <p className="text-xs text-gray-400">
              ${walletLoading ? '...' : walletData?.balanceUSD.toFixed(2) || '0.00'} USD
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Active Tokens</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {walletData?.tokens.length || 0}
            </div>
            <p className="text-xs text-gray-400">Tokens in wallet</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Autonomous Stats</CardTitle>
            <Target className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {autonomousStats?.isActive ? 'ACTIVE' : 'INACTIVE'}
            </div>
            <p className="text-xs text-gray-400">
              {autonomousStats?.tradesExecuted || 0} trades executed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trading Opportunities */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-green-400">Live Trading Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Scanning for opportunities...</p>
                  <p className="text-sm">Real-time analysis in progress</p>
                </div>
              ) : (
                opportunities.map((opp: TradingOpportunity, idx: number) => (
                  <div key={idx} className="p-4 bg-gray-800 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-lg">{opp.symbol}</span>
                        <Badge 
                          variant={opp.confidence > 80 ? 'default' : 'secondary'}
                          className={
                            opp.confidence > 80 ? 'bg-green-900 text-green-300' : 
                            'bg-yellow-900 text-yellow-300'
                          }
                        >
                          {opp.confidence}% confidence
                        </Badge>
                        <Badge 
                          variant={opp.riskLevel === 'LOW' ? 'default' : 'destructive'}
                          className={
                            opp.riskLevel === 'LOW' ? 'bg-green-900 text-green-300' :
                            opp.riskLevel === 'MEDIUM' ? 'bg-yellow-900 text-yellow-300' :
                            'bg-red-900 text-red-300'
                          }
                        >
                          {opp.riskLevel} RISK
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${opp.estimatedROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {opp.estimatedROI >= 0 ? '+' : ''}{opp.estimatedROI.toFixed(1)}% ROI
                        </div>
                        <div className="text-sm text-gray-400">
                          {opp.recommendedAmount.toFixed(3)} SOL
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="text-sm text-gray-300 font-medium">Analysis:</div>
                      <ul className="text-sm text-gray-400 space-y-1">
                        {opp.reason.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleExecuteTrade(opp.symbol)}
                      disabled={executeTradeMutation.isPending || !walletData || walletData.balance < opp.recommendedAmount}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {executeTradeMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Preparing Trade...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Execute Jupiter Swap
                        </div>
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Real Transactions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-blue-400">Blockchain Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent transactions</p>
                  <p className="text-sm">Execute trades to see activity</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <div>
                        <div className="font-semibold text-white">{tx.symbol}</div>
                        <div className="text-sm text-gray-400">
                          {tx.type} • {tx.amount} {tx.symbol}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => window.open(`https://solscan.io/tx/${tx.txHash}`, '_blank')}
                      >
                        {formatTxHash(tx.txHash)}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trading Panel */}
      <Card className="bg-gray-900 border-gray-700 mt-8">
        <CardHeader>
          <CardTitle className="text-yellow-400">Manual Trading Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="amount" className="text-gray-300">Trade Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0.001"
                max={walletData?.balance || 0}
                value={tradeAmount}
                onChange={(e) => setTradeAmount(parseFloat(e.target.value) || 0)}
                className="bg-gray-800 border-gray-600 text-white mt-2"
              />
              <p className="text-xs text-gray-400 mt-1">
                Available: {walletData?.balance.toFixed(4) || '0'} SOL
              </p>
            </div>

            <div>
              <Label htmlFor="token" className="text-gray-300">Target Token</Label>
              <Input
                id="token"
                placeholder="e.g., BONK, WIF, RAY"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value.toUpperCase())}
                className="bg-gray-800 border-gray-600 text-white mt-2"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => selectedToken && handleExecuteTrade(selectedToken)}
                disabled={!selectedToken || tradeAmount <= 0 || executeTradeMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Execute Manual Trade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Banner */}
      <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-600 rounded">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="font-medium text-yellow-400">Real Money Trading</div>
            <div className="text-sm text-yellow-300">
              This system executes real trades with your Phantom wallet. All transactions are irreversible.
              Connect your Phantom wallet to complete trades.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Connected to wallet: {walletData?.address.slice(0, 8)}...{walletData?.address.slice(-8)}</p>
        <p className="mt-1">Real-time Jupiter DEX integration • Solana blockchain verified</p>
      </div>
    </div>
  );
}
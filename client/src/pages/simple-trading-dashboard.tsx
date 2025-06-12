import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  mint: string;
  image?: string;
  entryPrice: number;
  currentPrice: number;
  amount: number;
  entryTime: string;
  pnl: number;
  pnlPercent: number;
  marketCap: number;
  entryValue: number;
  currentValue: number;
}

interface TradingStats {
  isActive: boolean;
  currentCapital: number;
  totalTrades: number;
  activePositions: number;
  roi: number;
  totalProfit: number;
}

interface WalletStatus {
  isConnected: boolean;
  address: string | null;
  balance: number;
}

// Generate meme coin images based on symbol
const getMemeImage = (symbol: string) => {
  const memeImages: { [key: string]: string } = {
    'BONK': '🐶',
    'PEPE': '🐸', 
    'DOGE': '🐕',
    'SHIB': '🐕‍🦺',
    'FLOKI': '🐺',
    'WOJAK': '😢',
    'CHAD': '💪',
    'COPE': '🤡',
    'MOON': '🌙',
    'PUMP': '📈',
    'BASED': '🗿',
    'DEGEN': '🎲',
    'WIF': '🧢',
    'RAY': '☀️',
    'STEP': '👟'
  };
  return memeImages[symbol] || '🪙';
};

export default function SimpleTradingDashboard() {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Real trading stats
  const { data: stats } = useQuery<TradingStats>({
    queryKey: ['/api/billion-trader/stats'],
    refetchInterval: 3000
  });

  // Real wallet status
  const { data: walletStatus } = useQuery<WalletStatus>({
    queryKey: ['/api/wallet/status'],
    refetchInterval: 5000
  });

  // Real positions data
  const { data: rawPositions } = useQuery<any[]>({
    queryKey: ['/api/billion-trader/positions'],
    refetchInterval: 2000
  });

  // Real token holdings data (BONK, etc.)
  const { data: tokenHoldings } = useQuery<any[]>({
    queryKey: ['/api/wallet/tokens'],
    refetchInterval: 3000
  });

  // Combine raw positions and token holdings to show all assets
  const combinedPositions = [
    ...(rawPositions || []),
    ...(tokenHoldings || []).map(token => ({
      symbol: token.symbol,
      mint: token.mint,
      balance: token.uiAmount,
      estimatedValue: token.valueUSD ? token.valueUSD / 200 : 0, // Convert USD to SOL
      entryPrice: 0.000001, // Default entry for existing holdings
      entryTime: new Date().toISOString()
    }))
  ];

  // Transform positions to include calculated fields
  const positions: Position[] = combinedPositions.map((pos, index) => ({
    id: `${pos.symbol}_${index}`,
    symbol: pos.symbol || 'UNKNOWN',
    mint: pos.mint || '',
    image: getMemeImage(pos.symbol || ''),
    entryPrice: pos.entryPrice || 0.000001,
    currentPrice: pos.estimatedValue / Math.max(pos.balance || 1, 1),
    amount: pos.balance || 0,
    entryTime: pos.entryTime || new Date().toISOString(),
    pnl: (pos.estimatedValue || 0) - (pos.entryPrice || 0.000001) * (pos.balance || 0),
    pnlPercent: pos.estimatedValue > 0 ? 
      (((pos.estimatedValue / Math.max(pos.balance || 1, 1)) - (pos.entryPrice || 0.000001)) / (pos.entryPrice || 0.000001)) * 100 : 0,
    marketCap: Math.random() * 100000 + 20000, // Placeholder since we don't have real MC data
    entryValue: (pos.entryPrice || 0.000001) * (pos.balance || 0),
    currentValue: pos.estimatedValue || 0
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPrice = (value: number) => {
    if (value < 0.000001) return value.toExponential(2);
    if (value < 0.01) return value.toFixed(6);
    return value.toFixed(4);
  };

  const realBalance = walletStatus?.balance || 0;
  const realCapitalUSD = realBalance * 200; // SOL to USD approximation

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Trading Dashboard</h1>
            <p className="text-gray-400">Real-time memecoin trading positions</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              stats?.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
            }`}>
              {stats?.isActive ? 'ACTIVE' : 'STOPPED'}
            </div>
          </div>
        </div>

        {/* Real Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {realBalance.toFixed(4)} SOL
              </div>
              <div className="text-sm text-gray-400">
                ≈ ${realCapitalUSD.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Active Positions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{positions.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Total Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.totalTrades || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(positions.reduce((sum, p) => sum + p.currentValue, 0))}
              </div>
              <div className={`text-sm flex items-center ${
                positions.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {positions.reduce((sum, p) => sum + p.pnl, 0) >= 0 ? 
                  <TrendingUp className="w-4 h-4 mr-1" /> : 
                  <TrendingDown className="w-4 h-4 mr-1" />
                }
                {positions.reduce((sum, p) => sum + p.pnl, 0).toFixed(4)} SOL
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Positions Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Trading Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active positions</p>
                <p className="text-sm">Bot is scanning for trading opportunities...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-gray-300">Token</TableHead>
                      <TableHead className="text-gray-300">Market Cap</TableHead>
                      <TableHead className="text-gray-300">Entry Price</TableHead>
                      <TableHead className="text-gray-300">Current Price</TableHead>
                      <TableHead className="text-gray-300">Amount</TableHead>
                      <TableHead className="text-gray-300">Entry Value</TableHead>
                      <TableHead className="text-gray-300">Current Value</TableHead>
                      <TableHead className="text-gray-300">PnL</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">{position.image}</div>
                            <div>
                              <div className="font-medium text-white">{position.symbol}</div>
                              <div className="text-xs text-gray-400 font-mono">
                                {position.mint.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {formatCurrency(position.marketCap)}
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono">
                          {formatPrice(position.entryPrice)}
                        </TableCell>
                        <TableCell className="text-gray-300 font-mono">
                          {formatPrice(position.currentPrice)}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {position.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {position.entryValue.toFixed(6)} SOL
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {position.currentValue.toFixed(6)} SOL
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Badge variant={position.pnl >= 0 ? "default" : "destructive"}>
                              {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                            </Badge>
                            <div className={`ml-2 text-sm ${
                              position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {position.pnl >= 0 ? '+' : ''}{position.pnl.toFixed(6)} SOL
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedPosition(position)}
                            className="border-slate-600 text-gray-300 hover:bg-slate-700"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Info */}
        {walletStatus?.isConnected && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Wallet Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Address</div>
                  <div className="font-mono text-white">{walletStatus.address}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Last Update</div>
                  <div className="text-white">{new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
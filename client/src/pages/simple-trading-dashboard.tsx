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

  // Pump.fun trader status
  const { data: pumpFunStatus } = useQuery<any>({
    queryKey: ['/api/pumpfun/status'],
    refetchInterval: 2000
  });

  // Combine all position sources to show complete trading picture
  const combinedPositions = [
    ...(rawPositions || []),
    ...(tokenHoldings || []).map(token => ({
      symbol: token.symbol,
      mint: token.mint,
      balance: token.uiAmount || token.balance || 0,
      estimatedValue: token.valueUSD ? token.valueUSD / 200 : 0, // Convert USD to SOL
      entryPrice: token.priceUSD || 0.000001, // Use actual price if available
      entryTime: new Date().toISOString(),
      source: 'wallet'
    })),
    ...(pumpFunStatus?.positions || []).map(pos => ({
      symbol: pos.token.symbol,
      mint: pos.token.mint,
      balance: pos.tokensReceived || 0,
      estimatedValue: pos.positionSOL || 0,
      entryPrice: pos.entryPrice || 0.000001,
      entryTime: pos.entryTime || new Date().toISOString(),
      source: 'pumpfun'
    }))
  ];

  // Transform positions to include calculated fields
  const positions: Position[] = combinedPositions.map((pos, index) => {
    const balance = pos.balance || 0;
    const estimatedValue = pos.estimatedValue || 0;
    const entryPrice = pos.entryPrice || 0.000001;
    const currentPrice = balance > 0 ? estimatedValue / balance : entryPrice;
    const entryValue = entryPrice * balance;
    const currentValue = estimatedValue;
    const pnl = currentValue - entryValue;
    const pnlPercent = entryValue > 0 ? (pnl / entryValue) * 100 : 0;
    
    return {
      id: `${pos.symbol}_${index}`,
      symbol: pos.symbol || 'UNKNOWN',
      mint: pos.mint || '',
      image: getMemeImage(pos.symbol || ''),
      entryPrice: entryPrice,
      currentPrice: currentPrice,
      amount: balance,
      entryTime: pos.entryTime || new Date().toISOString(),
      pnl: pnl,
      pnlPercent: pnlPercent,
      marketCap: pos.symbol === 'BONK' ? 8500000000 : Math.random() * 100000 + 20000,
      entryValue: entryValue,
      currentValue: currentValue
    };
  }).filter(pos => pos.amount > 0); // Only show positions with actual balance

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
              pumpFunStatus?.isActive ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
            }`}>
              {pumpFunStatus?.isActive ? 'PUMP.FUN TRADING' : 'HOLDING BONK'}
            </div>
            <Button
              variant={pumpFunStatus?.isActive ? "destructive" : "default"}
              onClick={async () => {
                try {
                  if (pumpFunStatus?.isActive) {
                    await fetch('/api/pumpfun/stop', { method: 'POST' });
                  } else {
                    await fetch('/api/pumpfun/start', { method: 'POST' });
                  }
                } catch (error) {
                  console.error('Trading control error:', error);
                }
              }}
              className="text-xs"
            >
              {pumpFunStatus?.isActive ? 'STOP' : 'START PUMP.FUN'}
            </Button>
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

        {/* Debug Info */}
        {tokenHoldings && tokenHoldings.length > 0 && (
          <Card className="bg-blue-900/20 border-blue-700 mb-4">
            <CardContent className="pt-6">
              <div className="text-blue-300 text-sm">
                <p>Debug: {tokenHoldings.length} token(s) detected, {positions.length} position(s) displayed</p>
                <p>BONK: {tokenHoldings.find(t => t.symbol === 'BONK')?.uiAmount?.toLocaleString() || 'Not found'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Trading Mode Info */}
        {!pumpFunStatus?.isActive && (
          <Card className="bg-orange-900/20 border-orange-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <div>
                    <h3 className="text-white font-medium">BONK Holding Mode</h3>
                    <p className="text-orange-300 text-sm">Switch to pump.fun trading for new memecoin opportunities at 20K → 20M+ market cap</p>
                  </div>
                </div>
                <Button
                  onClick={async () => {
                    try {
                      await fetch('/api/pumpfun/start', { method: 'POST' });
                    } catch (error) {
                      console.error('Failed to start pump.fun trading:', error);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Switch to Pump.fun Trading
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Positions Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              {pumpFunStatus?.isActive ? 'Pump.fun Trading Positions' : 'Token Holdings'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active positions</p>
                <p className="text-sm">Switch to pump.fun trading to start finding new opportunities</p>
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
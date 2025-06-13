import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, TrendingUp, Activity, Wallet, Target } from "lucide-react";

interface AuthenticPosition {
  mint: string;
  symbol: string;
  amount: number;
  currentValue: number;
  entryValue: number;
  pnl: number;
  roi: number;
  isPumpFun: boolean;
  platform: string;
  entryTimestamp?: string;
  txHash?: string;
}

interface AuthenticTrade {
  id: string;
  symbol: string;
  mint: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
  txHash: string;
  pnl: number;
  roi: number;
  isPumpFun: boolean;
  platform: string;
  marketCapAtEntry?: number;
}

interface WalletData {
  solBalance: number;
  totalValue: number;
  totalPnL: number;
  totalROI: number;
  address: string;
}

export default function UltraAuthenticDashboard() {
  // Fetch authentic wallet data
  const { data: walletData, isLoading: walletLoading } = useQuery<WalletData>({
    queryKey: ['/api/wallet/authentic-balance'],
    refetchInterval: 10000,
  });

  // Fetch authentic positions
  const { data: positions = [], isLoading: positionsLoading } = useQuery<AuthenticPosition[]>({
    queryKey: ['/api/wallet/authentic-positions'],
    refetchInterval: 15000,
  });

  // Fetch authentic trades
  const { data: trades = [], isLoading: tradesLoading } = useQuery<AuthenticTrade[]>({
    queryKey: ['/api/trades/authentic-history'],
    refetchInterval: 20000,
  });

  const generatePumpFunLink = (mint: string) => {
    return `https://pump.fun/coin/${mint}`;
  };

  const generateDexScreenerLink = (mint: string) => {
    return `https://dexscreener.com/solana/${mint}`;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pumpFunPositions = positions.filter(p => p.isPumpFun);
  const totalPumpFunValue = pumpFunPositions.reduce((sum, p) => sum + p.currentValue, 0);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            VICTORIA - Autentický Trading Dashboard
          </h1>
          <p className="text-gray-400 mt-2">
            100% blockchain data - žádné fallback hodnoty
          </p>
        </div>

        {/* Wallet Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                SOL Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {walletLoading ? '...' : `${walletData?.solBalance?.toFixed(6) || '0'} SOL`}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Wallet: {walletData?.address ? `${walletData.address.slice(0, 8)}...` : 'Loading...'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Celková hodnota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                ${walletLoading ? '...' : walletData?.totalValue?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {positions.length} pozic
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                P&L
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (walletData?.totalPnL || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {walletLoading ? '...' : 
                  `${(walletData?.totalPnL || 0) >= 0 ? '+' : ''}$${walletData?.totalPnL?.toFixed(2) || '0.00'}`
                }
              </div>
              <p className="text-xs text-gray-400 mt-1">
                ROI: {walletData?.totalROI?.toFixed(2) || '0'}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Pump.fun pozice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400">
                {pumpFunPositions.length}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Hodnota: ${totalPumpFunValue.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="positions" className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-700">
            <TabsTrigger value="positions">Aktuální pozice</TabsTrigger>
            <TabsTrigger value="trades">Historie obchodů</TabsTrigger>
          </TabsList>

          <TabsContent value="positions">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Autentické pozice z blockchainu</CardTitle>
                <p className="text-sm text-gray-400">
                  Reálné tokeny s přímými odkazy na pump.fun a dexscreener
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {positionsLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p>Načítám pozice z blockchainu...</p>
                    </div>
                  ) : positions.length > 0 ? (
                    positions.map((position, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col">
                            <div className="font-semibold flex items-center gap-2">
                              {position.symbol}
                              {position.isPumpFun && (
                                <Badge variant="secondary" className="text-xs bg-orange-600 text-white">
                                  PUMP.FUN
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {position.platform}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-400">
                              {position.amount.toLocaleString()} tokenů
                            </div>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6"
                                onClick={() => window.open(generatePumpFunLink(position.mint), '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Pump.fun
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-6"
                                onClick={() => window.open(generateDexScreenerLink(position.mint), '_blank')}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                DexScreener
                              </Button>
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
                            {position.pnl >= 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          </div>
                          <div className={`text-xs ${
                            position.roi >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {position.roi >= 0 ? '+' : ''}{position.roi.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Wallet className="h-8 w-8 mx-auto mb-2" />
                      <p>Žádné pozice nenalezeny</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle>Kompletní historie obchodů</CardTitle>
                <p className="text-sm text-gray-400">
                  Autentické transakce s přesnými cenami a časem nákupu
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tradesLoading ? (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
                      <p>Načítám historii z blockchainu...</p>
                    </div>
                  ) : trades.length > 0 ? (
                    trades.slice(0, 20).map((trade, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${
                            trade.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <div className="flex flex-col">
                            <div className="font-semibold flex items-center gap-2">
                              {trade.symbol}
                              {trade.isPumpFun && (
                                <Badge variant="secondary" className="text-xs bg-orange-600 text-white">
                                  PUMP.FUN
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {trade.type.toUpperCase()} • {formatTime(trade.timestamp)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Cena: ${trade.price.toFixed(8)} • {trade.amount.toLocaleString()} tokenů
                            </div>
                            <div className="flex gap-2 mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-5"
                                onClick={() => window.open(`https://solscan.io/tx/${trade.txHash}`, '_blank')}
                              >
                                <ExternalLink className="h-2 w-2 mr-1" />
                                TX
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs h-5"
                                onClick={() => window.open(generatePumpFunLink(trade.mint), '_blank')}
                              >
                                <ExternalLink className="h-2 w-2 mr-1" />
                                Token
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            trade.roi >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.roi >= 0 ? '+' : ''}{trade.roi.toFixed(2)}%
                          </div>
                          {trade.marketCapAtEntry && (
                            <div className="text-xs text-gray-400">
                              MC: ${(trade.marketCapAtEntry / 1000).toFixed(0)}K
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>Žádné obchody nenalezeny</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
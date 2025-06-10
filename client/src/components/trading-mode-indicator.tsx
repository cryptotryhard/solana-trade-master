import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Shield, Zap, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TradingStatus {
  active: boolean;
  mode: 'live' | 'demo';
  timestamp: string;
  lastTransaction?: string;
  balance: number;
  realBalance: number;
  trades24h: number;
  pnl24h: number;
}

export function TradingModeIndicator() {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ['/api/live-trading/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: realBalance } = useQuery({
    queryKey: ['/api/wallet/balance/9fjFMjjB6qF2VFACEUDuXVLhgGHGV7j54p6YnaREfV9d'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleToggleMode = async () => {
    setIsToggling(true);
    try {
      const newMode = status?.mode === 'live' ? 'demo' : 'live';
      await apiRequest('/api/live-trading/toggle', {
        method: 'POST',
        body: { mode: newMode }
      });
      
      toast({
        title: `Přepnuto na ${newMode === 'live' ? 'Live' : 'Demo'} režim`,
        description: newMode === 'live' 
          ? 'Pozor: Nyní se provádějí skutečné obchody s reálnými prostředky!'
          : 'Obchodování je nyní v demo režimu - žádné skutečné transakce.'
      });
      
      refetch();
    } catch (error) {
      toast({
        title: 'Chyba při přepínání režimu',
        description: 'Nepodařilo se změnit obchodní režim',
        variant: 'destructive'
      });
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-effect neon-border">
        <CardHeader>
          <CardTitle className="text-sm">Obchodní režim</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-secondary rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLiveMode = status?.mode === 'live';
  const isActive = status?.active;

  return (
    <Card className={`glass-effect ${isLiveMode ? 'border-red-500' : 'border-yellow-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            {isLiveMode ? (
              <Zap className="w-4 h-4 mr-2 text-red-500" />
            ) : (
              <Shield className="w-4 h-4 mr-2 text-yellow-500" />
            )}
            Obchodní režim
          </CardTitle>
          <Badge 
            variant={isLiveMode ? "destructive" : "secondary"}
            className={isLiveMode ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}
          >
            {isLiveMode ? 'LIVE' : 'DEMO'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status indikátor */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Status:</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-xs">{isActive ? 'Aktivní' : 'Neaktivní'}</span>
          </div>
        </div>

        {/* Balance porovnání */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Skutečný balance:</span>
            <span className="text-xs font-mono">
              {realBalance ? (realBalance / 1000000000).toFixed(3) : '0.000'} SOL
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Dashboard balance:</span>
            <span className="text-xs font-mono">
              {status?.balance?.toFixed(3) || '0.000'} SOL
            </span>
          </div>
          {realBalance && status?.balance && Math.abs(realBalance/1000000000 - status.balance) > 0.001 && (
            <div className="flex items-center text-yellow-500">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="text-xs">Balance se neshoduje - možná simulace</span>
            </div>
          )}
        </div>

        {/* Přepínač režimu */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-medium">Live obchodování</span>
              <span className="text-xs text-muted-foreground">
                {isLiveMode ? 'Skutečné transakce' : 'Demo režim'}
              </span>
            </div>
            <Switch
              checked={isLiveMode}
              onCheckedChange={handleToggleMode}
              disabled={isToggling}
              className="data-[state=checked]:bg-red-500"
            />
          </div>
        </div>

        {/* Varování pro live režim */}
        {isLiveMode && (
          <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
            <div className="flex items-center text-red-400">
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium">POZOR: Live režim aktivní</span>
            </div>
            <p className="text-xs text-red-400/80 mt-1">
              Provádějí se skutečné obchody s reálnými prostředky
            </p>
          </div>
        )}

        {/* Statistiky za 24h */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">Obchody 24h</div>
            <div className="text-sm font-mono">{status?.trades24h || 0}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">P&L 24h</div>
            <div className={`text-sm font-mono ${(status?.pnl24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {status?.pnl24h ? (status.pnl24h > 0 ? '+' : '') + status.pnl24h.toFixed(2) + '%' : '0.00%'}
            </div>
          </div>
        </div>

        {/* Poslední transakce */}
        {status?.lastTransaction && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground">Poslední tx:</div>
            <div className="text-xs font-mono break-all">
              {status.lastTransaction.substring(0, 20)}...
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
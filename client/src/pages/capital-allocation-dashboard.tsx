import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, RefreshCw, Zap } from 'lucide-react';

interface AllocationTarget {
  mint: string;
  symbol: string;
  targetAllocation: number;
  currentAllocation: number;
  actionRequired: 'BUY' | 'SELL' | 'HOLD';
  tradeAmount: number;
}

interface AllocationStatus {
  totalValue: number;
  currentPositions: number;
  allocationTargets: AllocationTarget[];
  lastUpdate: string;
}

export default function CapitalAllocationDashboard() {
  const [allocationStatus, setAllocationStatus] = useState<AllocationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebalancing, setRebalancing] = useState(false);

  const fetchAllocationStatus = async () => {
    try {
      const response = await fetch('/api/capital/status');
      if (response.ok) {
        const data = await response.json();
        setAllocationStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch allocation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerRebalancing = async () => {
    setRebalancing(true);
    try {
      const response = await fetch('/api/capital/rebalance', { method: 'POST' });
      if (response.ok) {
        await fetchAllocationStatus(); // Refresh data
      }
    } catch (error) {
      console.error('Rebalancing failed:', error);
    } finally {
      setRebalancing(false);
    }
  };

  useEffect(() => {
    fetchAllocationStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAllocationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p>Loading allocation status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Smart Capital Allocation
          </h1>
          <p className="text-xl text-purple-200">
            Automated portfolio optimization for maximum growth
          </p>
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-800/50 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-100 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                ${allocationStatus?.totalValue.toFixed(2) || '0.00'}
              </div>
              <p className="text-sm text-purple-200 mt-1">
                Optimized for rapid compounding
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {allocationStatus?.currentPositions || 0}/8
              </div>
              <p className="text-sm text-purple-200 mt-1">
                Maximum diversification
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-purple-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-purple-100 flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Last Rebalance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold text-yellow-400">
                {allocationStatus?.lastUpdate ? 
                  new Date(allocationStatus.lastUpdate).toLocaleTimeString() : 
                  'Never'
                }
              </div>
              <Button 
                onClick={triggerRebalancing}
                disabled={rebalancing}
                className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
                size="sm"
              >
                {rebalancing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rebalancing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Trigger Rebalance
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Allocation Targets */}
        {allocationStatus?.allocationTargets && (
          <Card className="bg-slate-800/50 border-purple-500/20">
            <CardHeader>
              <CardTitle className="text-purple-100 text-xl">
                Smart Allocation Strategy
              </CardTitle>
              <p className="text-purple-200 text-sm">
                Optimized positions based on performance analysis and risk management
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allocationStatus.allocationTargets.map((target, index) => (
                  <div key={target.mint} className="bg-slate-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">
                          {target.symbol}
                        </span>
                        <Badge 
                          variant={
                            target.actionRequired === 'BUY' ? 'default' :
                            target.actionRequired === 'SELL' ? 'destructive' : 
                            'secondary'
                          }
                          className={
                            target.actionRequired === 'BUY' ? 'bg-green-600 hover:bg-green-700' :
                            target.actionRequired === 'SELL' ? 'bg-red-600 hover:bg-red-700' :
                            'bg-gray-600 hover:bg-gray-700'
                          }
                        >
                          {target.actionRequired}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-purple-100">
                          {(target.targetAllocation * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-purple-300">
                          Target
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-purple-200">
                        <span>Current: {(target.currentAllocation * 100).toFixed(1)}%</span>
                        <span>Target: {(target.targetAllocation * 100).toFixed(1)}%</span>
                      </div>
                      
                      <Progress 
                        value={target.currentAllocation * 100} 
                        className="h-2"
                      />
                      
                      {target.tradeAmount > 20 && (
                        <div className="flex items-center gap-2 text-sm">
                          {target.actionRequired === 'BUY' ? (
                            <TrendingUp className="h-4 w-4 text-green-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-purple-200">
                            Trade Amount: ${target.tradeAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strategy Info */}
        <Card className="bg-slate-800/50 border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-purple-100">Allocation Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-purple-200">
              <div>
                <h3 className="font-semibold text-white mb-2">Portfolio Rules</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Maximum 8 token positions</li>
                  <li>• 15% SOL reserve for liquidity</li>
                  <li>• 2-25% allocation per position</li>
                  <li>• Rebalance on 5% drift</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Performance Metrics</h3>
                <ul className="space-y-1 text-sm">
                  <li>• 24h price momentum analysis</li>
                  <li>• Volume and liquidity scoring</li>
                  <li>• Risk-adjusted allocation weighting</li>
                  <li>• Automatic rebalancing every 2 hours</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Brain, 
  Shield, 
  Zap,
  BarChart3,
  Settings,
  AlertTriangle
} from "lucide-react";

interface ConfidenceRegime {
  level: 'high' | 'medium' | 'uncertain';
  score: number;
  description: string;
  indicators: string[];
}

interface AggressionLevel {
  mode: 'conservative' | 'scaled' | 'hyper';
  positionSizeMultiplier: number;
  autoCompoundingRate: number;
  usdcBufferTarget: number;
  maxConcurrentTrades: number;
}

interface PortfolioMetrics {
  totalValue: number;
  volatility24h: number;
  drawdown: number;
  winRate: number;
  avgROI: number;
  tradesCount: number;
  pumpFrequency: number;
  confidenceScore: number;
  timestamp: string;
}

interface MetaAdjustment {
  timestamp: string;
  reason: string;
  previousAggression: AggressionLevel;
  newAggression: AggressionLevel;
  triggerMetrics: {
    drawdown?: number;
    winRate?: number;
    volatility?: number;
    pumpFrequency?: number;
  };
}

export function PortfolioMetaDashboard() {
  const [metaManagerActive, setMetaManagerActive] = useState(true);

  const { data: regime, isLoading: regimeLoading } = useQuery({
    queryKey: ['/api/portfolio/meta/regime'],
    refetchInterval: 30000,
  });

  const { data: aggression, isLoading: aggressionLoading } = useQuery({
    queryKey: ['/api/portfolio/meta/aggression'],
    refetchInterval: 30000,
  });

  const { data: metrics = [], isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/portfolio/meta/metrics'],
    refetchInterval: 60000,
  });

  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({
    queryKey: ['/api/portfolio/meta/adjustments'],
    refetchInterval: 120000,
  });

  const toggleMetaManager = async () => {
    try {
      const response = await fetch('/api/portfolio/meta/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !metaManagerActive })
      });
      
      if (response.ok) {
        setMetaManagerActive(!metaManagerActive);
      }
    } catch (error) {
      console.error('Failed to toggle meta manager:', error);
    }
  };

  const forceAnalysis = async () => {
    try {
      await fetch('/api/portfolio/meta/force-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch (error) {
      console.error('Failed to force analysis:', error);
    }
  };

  const getRegimeIcon = (level: string) => {
    switch (level) {
      case 'high': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'medium': return <Activity className="h-5 w-5 text-yellow-500" />;
      case 'uncertain': return <TrendingDown className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getRegimeColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'uncertain': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getAggressionIcon = (mode: string) => {
    switch (mode) {
      case 'hyper': return <Zap className="h-5 w-5 text-orange-500" />;
      case 'scaled': return <Target className="h-5 w-5 text-blue-500" />;
      case 'conservative': return <Shield className="h-5 w-5 text-green-500" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  const getAggressionColor = (mode: string) => {
    switch (mode) {
      case 'hyper': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'scaled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'conservative': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (regimeLoading || aggressionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Portfolio Meta-Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading portfolio intelligence...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentRegime = regime as ConfidenceRegime;
  const currentAggression = aggression as AggressionLevel;
  const recentMetrics = metrics as PortfolioMetrics[];
  const recentAdjustments = adjustments as MetaAdjustment[];

  const latestMetrics = recentMetrics[recentMetrics.length - 1];

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Portfolio Meta-Manager
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Active</span>
                <Switch
                  checked={metaManagerActive}
                  onCheckedChange={toggleMetaManager}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={forceAnalysis}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Force Analysis
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Confidence Regime */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRegimeIcon(currentRegime?.level)}
              Confidence Regime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getRegimeColor(currentRegime?.level)}>
                {currentRegime?.level?.toUpperCase()} CONFIDENCE
              </Badge>
              <span className="text-2xl font-bold">
                {currentRegime?.score || 0}/100
              </span>
            </div>
            
            <Progress 
              value={currentRegime?.score || 0} 
              className="w-full"
            />
            
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {currentRegime?.description}
            </p>
            
            {currentRegime?.indicators && currentRegime.indicators.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Key Indicators:</h4>
                <ul className="space-y-1">
                  {currentRegime.indicators.map((indicator, index) => (
                    <li key={index} className="text-xs flex items-center gap-2">
                      <div className="w-1 h-1 bg-blue-500 rounded-full" />
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aggression Level */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getAggressionIcon(currentAggression?.mode)}
              Aggression Level
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className={getAggressionColor(currentAggression?.mode)}>
                {currentAggression?.mode?.toUpperCase()} MODE
              </Badge>
              <span className="text-lg font-semibold">
                {(currentAggression?.positionSizeMultiplier || 1).toFixed(1)}x
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Position Size</p>
                <p className="font-semibold">
                  {((currentAggression?.positionSizeMultiplier || 1) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Auto-Compound</p>
                <p className="font-semibold">
                  {((currentAggression?.autoCompoundingRate || 0) * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">USDC Buffer</p>
                <p className="font-semibold">
                  {currentAggression?.usdcBufferTarget || 0}%
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Max Trades</p>
                <p className="font-semibold">
                  {currentAggression?.maxConcurrentTrades || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="metrics">Portfolio Metrics</TabsTrigger>
          <TabsTrigger value="adjustments">Recent Adjustments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Current Portfolio Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
                    <p className="text-2xl font-bold text-green-500">
                      {latestMetrics.winRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Drawdown</p>
                    <p className="text-2xl font-bold text-red-500">
                      {latestMetrics.drawdown.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Volatility</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {latestMetrics.volatility24h.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pump Frequency</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {latestMetrics.pumpFrequency.toFixed(1)}/hr
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500">No recent metrics available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="adjustments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Strategy Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentAdjustments.length > 0 ? (
                <div className="space-y-4">
                  {recentAdjustments.slice(-5).reverse().map((adjustment, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {adjustment.previousAggression.mode} → {adjustment.newAggression.mode}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(adjustment.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {adjustment.reason}
                      </p>
                      {adjustment.triggerMetrics && (
                        <div className="flex gap-4 text-xs">
                          {adjustment.triggerMetrics.drawdown && (
                            <span>Drawdown: {adjustment.triggerMetrics.drawdown.toFixed(1)}%</span>
                          )}
                          {adjustment.triggerMetrics.winRate && (
                            <span>Win Rate: {adjustment.triggerMetrics.winRate.toFixed(1)}%</span>
                          )}
                          {adjustment.triggerMetrics.volatility && (
                            <span>Volatility: {adjustment.triggerMetrics.volatility.toFixed(1)}%</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No recent adjustments</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
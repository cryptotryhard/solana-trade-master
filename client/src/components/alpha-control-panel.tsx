import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Target, Layers, Crown, TrendingUp, Activity, Shield, AlertTriangle, CheckCircle2, Database } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AlphaStatus {
  active: boolean;
  layeredPositions: number;
  totalPositionValue: number;
  leaderboardWallets: number;
  scanInterval: number;
  profitAllocation: {
    sol: number;
    usdc: number;
    reinvestment: number;
  };
}

interface LayeredPosition {
  symbol: string;
  layers: number;
  totalAmount: number;
  averageEntry: number;
  currentProfit: number;
  dataSources?: string[];
  aiScore?: number;
  confidence?: 'high' | 'medium' | 'low';
}

interface AlphaToken {
  symbol: string;
  mintAddress: string;
  price: number;
  volume24h: number;
  marketCap: number;
  age: number;
  uniqueWallets: number;
  volumeSpike: number;
  aiScore: number;
  liquidityUSD: number;
  ownershipRisk: number;
  dataSources?: string[];
  confidence?: 'high' | 'medium' | 'low';
  hypeScore?: number;
  fudScore?: number;
  sentimentRating?: 'bullish' | 'neutral' | 'bearish';
  keyIndicators?: string[];
}

export function AlphaControlPanel() {
  const [settings, setSettings] = useState({
    scanInterval: 20,
    minAIScore: 92,
    maxLayers: 3,
    reinvestmentRatio: 85
  });

  const [confidenceMode, setConfidenceMode] = useState<'all' | 'high_only'>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish_only'>('all');
  const [aggressiveSentimentMode, setAggressiveSentimentMode] = useState(false);

  const { data: alphaStatus, refetch } = useQuery<AlphaStatus>({
    queryKey: ["/api/alpha/status"],
    refetchInterval: 5000
  });

  const { data: positions } = useQuery<LayeredPosition[]>({
    queryKey: ["/api/alpha/positions"],
    refetchInterval: 10000
  });

  const { data: alphaTokens } = useQuery<AlphaToken[]>({
    queryKey: ["/api/alpha/tokens"],
    refetchInterval: 5000
  });

  const activateAlphaMutation = useMutation({
    mutationFn: () => apiRequest('POST', "/api/alpha/activate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alpha/status"] });
      refetch();
    }
  });

  const deactivateAlphaMutation = useMutation({
    mutationFn: () => apiRequest('POST', "/api/alpha/deactivate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alpha/status"] });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: any) => apiRequest('POST', "/api/alpha/settings", newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alpha/status"] });
    }
  });

  const forceExecuteTradeMutation = useMutation({
    mutationFn: (tokenSymbol?: string) => apiRequest('POST', "/api/trading/force-execute", { tokenSymbol }),
    onSuccess: (data) => {
      console.log('Force trade result:', data);
      queryClient.invalidateQueries({ queryKey: ["/api/trading/live-trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alpha/positions"] });
    }
  });

  const handleToggleAlpha = () => {
    if (alphaStatus?.active) {
      deactivateAlphaMutation.mutate();
    } else {
      activateAlphaMutation.mutate();
    }
  };

  const handleSettingsUpdate = () => {
    updateSettingsMutation.mutate({
      scanInterval: settings.scanInterval,
      minAIScore: settings.minAIScore,
      maxLayers: settings.maxLayers,
      confidenceMode: confidenceMode,
      sentimentFilter: sentimentFilter,
      aggressiveSentimentMode: aggressiveSentimentMode,
      profitAllocation: {
        sol: 0.10,
        usdc: 0.05,
        reinvestment: settings.reinvestmentRatio / 100
      }
    });
  };

  const getConfidenceBadge = (confidence?: 'high' | 'medium' | 'low', dataSources?: string[]) => {
    if (!confidence && !dataSources) return null;
    
    const sourceCount = dataSources?.length || 0;
    const actualConfidence = confidence || (sourceCount >= 2 ? 'high' : sourceCount === 1 ? 'medium' : 'low');
    
    const badgeConfig = {
      high: { color: 'bg-green-500', icon: CheckCircle2, text: 'High Confidence' },
      medium: { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Medium Confidence' },
      low: { color: 'bg-red-500', icon: Shield, text: 'Low Confidence' }
    };
    
    const config = badgeConfig[actualConfidence];
    const Icon = config.icon;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`${config.color} text-white border-0`}>
              <Icon className="h-3 w-3 mr-1" />
              {actualConfidence.toUpperCase()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">{config.text}</p>
              {dataSources && dataSources.length > 0 && (
                <p className="text-sm">Sources: {dataSources.join(', ')}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const getDataSourceBadges = (dataSources?: string[]) => {
    if (!dataSources || dataSources.length === 0) {
      return (
        <Badge variant="outline" className="bg-gray-500 text-white border-0">
          <Database className="h-3 w-3 mr-1" />
          Synthetic
        </Badge>
      );
    }
    
    return dataSources.map((source, index) => (
      <Badge key={index} variant="outline" className="bg-blue-500 text-white border-0 mr-1">
        {source}
      </Badge>
    ));
  };

  const getSentimentBadge = (token: AlphaToken) => {
    if (!token.sentimentRating && !token.hypeScore) return null;
    
    const rating = token.sentimentRating || 'neutral';
    const hypeScore = token.hypeScore || 0;
    const fudScore = token.fudScore || 0;
    
    const badgeConfig = {
      bullish: { color: 'bg-green-500', icon: '📈', text: 'Bullish' },
      neutral: { color: 'bg-yellow-500', icon: '➡️', text: 'Neutral' },
      bearish: { color: 'bg-red-500', icon: '📉', text: 'Bearish' }
    };
    
    const config = badgeConfig[rating];
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`${config.color} text-white border-0`}>
              {config.icon} {config.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Community Sentiment</p>
              <p className="text-sm">Hype Score: {hypeScore}%</p>
              <p className="text-sm">FUD Score: {fudScore}%</p>
              {token.keyIndicators && token.keyIndicators.length > 0 && (
                <p className="text-xs">Indicators: {token.keyIndicators.join(', ')}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const filteredTokens = alphaTokens?.filter(token => {
    // Confidence filtering
    if (confidenceMode === 'high_only') {
      const sourceCount = token.dataSources?.length || 0;
      if (sourceCount < 2 && token.confidence !== 'high') return false;
    }
    
    // Sentiment filtering
    if (sentimentFilter === 'bullish_only') {
      if (token.sentimentRating !== 'bullish' && (!token.hypeScore || token.hypeScore < 70)) {
        return false;
      }
    }
    
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Alpha Status Card */}
      <Card className="border-red-500/30 bg-gradient-to-br from-red-950/20 to-orange-950/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-red-500" />
              Alpha Acceleration Mode
            </div>
            <Badge 
              variant={alphaStatus?.active ? "default" : "secondary"}
              className={alphaStatus?.active ? "bg-red-500 text-white animate-pulse" : ""}
            >
              {alphaStatus?.active ? "ACTIVE" : "STANDBY"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Control Button */}
            <Button
              onClick={handleToggleAlpha}
              disabled={activateAlphaMutation.isPending || deactivateAlphaMutation.isPending}
              className={`w-full ${alphaStatus?.active 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600'
              }`}
            >
              {activateAlphaMutation.isPending || deactivateAlphaMutation.isPending ? (
                'Processing...'
              ) : alphaStatus?.active ? (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Deactivate Alpha Mode
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Activate Alpha Mode
                </>
              )}
            </Button>

            {/* Status Grid */}
            {alphaStatus && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Active Positions</span>
                  </div>
                  <div className="text-xl font-bold">{alphaStatus.layeredPositions}</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Position Value</span>
                  </div>
                  <div className="text-xl font-bold">${alphaStatus.totalPositionValue.toFixed(0)}</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium">Shadow Wallets</span>
                  </div>
                  <div className="text-xl font-bold">{alphaStatus.leaderboardWallets}</div>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Scan Rate</span>
                  </div>
                  <div className="text-xl font-bold">{alphaStatus.scanInterval}s</div>
                </div>
              </div>
            )}

            {/* Profit Allocation */}
            {alphaStatus && (
              <div className="border rounded-lg p-3">
                <h4 className="font-semibold text-sm mb-2">Profit Allocation</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>SOL Reserve:</span>
                    <span className="font-medium">{(alphaStatus.profitAllocation.sol * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>USDC Safety:</span>
                    <span className="font-medium">{(alphaStatus.profitAllocation.usdc * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Auto-Compound:</span>
                    <span className="font-medium text-green-500">{(alphaStatus.profitAllocation.reinvestment * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Layered Positions */}
      {positions && positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Layered Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {positions.map((position) => (
                <div key={position.symbol} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{position.symbol}</span>
                    <Badge variant={position.currentProfit > 0 ? "default" : "destructive"}>
                      {position.currentProfit > 0 ? '+' : ''}{position.currentProfit.toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Layers:</span>
                      <div className="font-medium">{position.layers}/{settings.maxLayers}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size:</span>
                      <div className="font-medium">${position.totalAmount.toFixed(0)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Entry:</span>
                      <div className="font-medium">${position.averageEntry.toFixed(6)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alpha Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Alpha Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Confidence Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Confidence Mode</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="confidence-mode"
                    checked={confidenceMode === 'high_only'}
                    onCheckedChange={(checked) => setConfidenceMode(checked ? 'high_only' : 'all')}
                  />
                  <Label htmlFor="confidence-mode" className="text-sm">
                    High-Confidence Only
                  </Label>
                </div>
                <div className="text-xs text-muted-foreground">
                  {confidenceMode === 'high_only' 
                    ? 'Only show tokens verified by 2+ sources' 
                    : 'Show all detected opportunities'
                  }
                </div>
              </div>
            </div>

            {/* Sentiment Filter Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Community Sentiment Filter</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="sentiment-filter"
                    checked={sentimentFilter === 'bullish_only'}
                    onCheckedChange={(checked) => setSentimentFilter(checked ? 'bullish_only' : 'all')}
                  />
                  <Label htmlFor="sentiment-filter" className="text-sm">
                    Bullish Sentiment Only
                  </Label>
                </div>
                <div className="text-xs text-muted-foreground">
                  {sentimentFilter === 'bullish_only' 
                    ? 'Only show tokens with positive community sentiment' 
                    : 'Show all sentiment types'
                  }
                </div>
              </div>
            </div>

            {/* Aggressive Sentiment Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Aggressive Sentiment Mode</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="aggressive-sentiment"
                    checked={aggressiveSentimentMode}
                    onCheckedChange={setAggressiveSentimentMode}
                  />
                  <Label htmlFor="aggressive-sentiment" className="text-sm">
                    Enable Aggressive Mode
                  </Label>
                </div>
                <div className="text-xs text-muted-foreground">
                  {aggressiveSentimentMode 
                    ? 'Lower AI thresholds for high-sentiment tokens' 
                    : 'Standard sentiment weighting'
                  }
                </div>
              </div>
            </div>

            {/* Scan Interval */}
            <div className="space-y-2">
              <Label className="text-sm">
                Scan Interval: {settings.scanInterval} seconds
              </Label>
              <Slider
                value={[settings.scanInterval]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, scanInterval: value }))}
                max={60}
                min={10}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Ultra Fast</span>
                <span>Moderate</span>
              </div>
            </div>

            {/* AI Score Threshold */}
            <div className="space-y-2">
              <Label className="text-sm">
                Min AI Score: {settings.minAIScore}/100
              </Label>
              <Slider
                value={[settings.minAIScore]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, minAIScore: value }))}
                max={100}
                min={80}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative</span>
                <span>Ultra Aggressive</span>
              </div>
            </div>

            {/* Max Layers */}
            <div className="space-y-2">
              <Label className="text-sm">
                Max Position Layers: {settings.maxLayers}
              </Label>
              <Slider
                value={[settings.maxLayers]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, maxLayers: value }))}
                max={5}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Reinvestment Ratio */}
            <div className="space-y-2">
              <Label className="text-sm">
                Auto-Compound Rate: {settings.reinvestmentRatio}%
              </Label>
              <Slider
                value={[settings.reinvestmentRatio]}
                onValueChange={([value]) => setSettings(prev => ({ ...prev, reinvestmentRatio: value }))}
                max={95}
                min={50}
                step={5}
                className="w-full"
              />
            </div>

            <Button
              onClick={handleSettingsUpdate}
              disabled={updateSettingsMutation.isPending}
              className="w-full"
            >
              {updateSettingsMutation.isPending ? "Updating..." : "Update Alpha Settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alpha Opportunities with Confidence Overlay */}
      {filteredTokens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Alpha Opportunities
              </div>
              <Badge variant="outline">
                {filteredTokens.length} {confidenceMode === 'high_only' ? 'High-Confidence' : 'Total'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTokens.map((token) => (
                <div key={token.mintAddress} className="border rounded-lg p-4 space-y-3 relative overflow-hidden">
                  {/* Token Header */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg truncate">{token.symbol}</span>
                        {getConfidenceBadge(token.confidence, token.dataSources)}
                      </div>
                      <div className="flex items-center gap-2">
                        {getSentimentBadge(token)}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 min-w-[80px]">
                      <div className="text-xs text-muted-foreground mb-1">AI Score</div>
                      <div className="flex items-center justify-end">
                        <Badge 
                          variant={token.aiScore >= 95 ? "default" : token.aiScore >= 90 ? "secondary" : "outline"}
                          className="text-xs font-bold px-2 py-1 whitespace-nowrap"
                        >
                          {Math.round(token.aiScore)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Data Sources */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-muted-foreground mr-2">Sources:</span>
                    {getDataSourceBadges(token.dataSources)}
                  </div>

                  {/* Token Metrics - Compressed */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <div className="text-muted-foreground">Price</div>
                      <div className="font-medium">${token.price.toFixed(6)}</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <div className="text-muted-foreground">Vol 24h</div>
                      <div className="font-medium">${(token.volume24h / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <div className="text-muted-foreground">MCap</div>
                      <div className="font-medium">${(token.marketCap / 1000000).toFixed(1)}M</div>
                    </div>
                    <div className="text-center p-2 bg-secondary/30 rounded">
                      <div className="text-muted-foreground">Age</div>
                      <div className="font-medium">{token.age.toFixed(0)}m</div>
                    </div>
                  </div>
                  
                  {/* Secondary Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-1 border rounded">
                      <div className="text-muted-foreground">Wallets</div>
                      <div className="font-medium">{token.uniqueWallets}</div>
                    </div>
                    <div className="text-center p-1 border rounded">
                      <div className="text-muted-foreground">Spike</div>
                      <div className="font-medium text-green-500">+{token.volumeSpike?.toFixed(0) || 0}%</div>
                    </div>
                    <div className="text-center p-1 border rounded">
                      <div className="text-muted-foreground">Risk</div>
                      <div className="font-medium text-red-500">{token.ownershipRisk?.toFixed(0) || 0}%</div>
                    </div>
                  </div>

                  {/* Risk Indicators */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Risk:</span>
                      <Badge variant={token.ownershipRisk < 10 ? "default" : token.ownershipRisk < 25 ? "secondary" : "destructive"}>
                        {token.ownershipRisk.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Liquidity:</span>
                      <span className="text-sm font-medium">${token.liquidityUSD.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Opportunities Message */}
      {filteredTokens.length === 0 && alphaTokens && alphaTokens.length > 0 && confidenceMode === 'high_only' && (
        <Card className="border-yellow-500/30">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No high-confidence opportunities found. Switch to "All Signals" mode to see more opportunities.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
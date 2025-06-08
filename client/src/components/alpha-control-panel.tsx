import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Target, Layers, Crown, TrendingUp, Activity } from "lucide-react";
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
}

export function AlphaControlPanel() {
  const [settings, setSettings] = useState({
    scanInterval: 20,
    minAIScore: 92,
    maxLayers: 3,
    reinvestmentRatio: 85
  });

  const { data: alphaStatus, refetch } = useQuery<AlphaStatus>({
    queryKey: ["/api/alpha/status"],
    refetchInterval: 5000
  });

  const { data: positions } = useQuery<LayeredPosition[]>({
    queryKey: ["/api/alpha/positions"],
    refetchInterval: 10000
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
      profitAllocation: {
        sol: 0.10,
        usdc: 0.05,
        reinvestment: settings.reinvestmentRatio / 100
      }
    });
  };

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
    </div>
  );
}
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Vault, PiggyBank, TrendingUp, Settings, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface VaultSettings {
  autoAllocate: boolean;
  allocationStrategy: 'conservative' | 'balanced' | 'aggressive';
  minimumProfitThreshold: number;
  stablecoinRatio: number;
  reinvestmentRatio: number;
  emergencyReserve: number;
}

interface VaultStatus {
  totalValue: number;
  stablecoinBalance: number;
  lowRiskBalance: number;
  availableForReinvestment: number;
  emergencyReserve: number;
  lastAllocation: string | null;
  currentSettings: VaultSettings;
}

export function ProfitVault() {
  const [showSettings, setShowSettings] = useState(false);
  const [localSettings, setLocalSettings] = useState<Partial<VaultSettings>>({});

  const { data: vaultStatus, isLoading } = useQuery<VaultStatus>({
    queryKey: ["/api/vault/status"],
    refetchInterval: 30000
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<VaultSettings>) => 
      apiRequest("/api/vault/settings", { method: "POST", body: settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vault/status"] });
      setShowSettings(false);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Profit Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading vault status...</div>
        </CardContent>
      </Card>
    );
  }

  if (!vaultStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Profit Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Vault data unavailable</div>
        </CardContent>
      </Card>
    );
  }

  const handleSettingsUpdate = () => {
    const updatedSettings = {
      ...vaultStatus.currentSettings,
      ...localSettings
    };
    updateSettingsMutation.mutate(updatedSettings);
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'conservative': return 'text-blue-500';
      case 'balanced': return 'text-green-500';
      case 'aggressive': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStrategyDescription = (strategy: string) => {
    switch (strategy) {
      case 'conservative': return '60% Stablecoins, 30% Low Risk, 10% Reinvest';
      case 'balanced': return '40% Stablecoins, 20% Low Risk, 40% Reinvest';
      case 'aggressive': return '20% Stablecoins, 10% Low Risk, 70% Reinvest';
      default: return 'Unknown strategy';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Vault className="h-5 w-5" />
            Profit Vault
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Vault Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <PiggyBank className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Value</span>
              </div>
              <div className="text-xl font-bold">${vaultStatus.totalValue.toFixed(2)}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Available</span>
              </div>
              <div className="text-xl font-bold">${vaultStatus.availableForReinvestment.toFixed(2)}</div>
            </div>
          </div>

          {/* Asset Breakdown */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Asset Allocation</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Stablecoins (USDC)</span>
                <span className="font-medium">${vaultStatus.stablecoinBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Low Risk Assets</span>
                <span className="font-medium">${vaultStatus.lowRiskBalance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-orange-500" />
                  <span className="text-sm">Emergency Reserve</span>
                </div>
                <span className="font-medium">${vaultStatus.emergencyReserve.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Current Strategy */}
          <div className="border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Strategy</span>
              <span className={`font-semibold capitalize ${getStrategyColor(vaultStatus.currentSettings.allocationStrategy)}`}>
                {vaultStatus.currentSettings.allocationStrategy}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {getStrategyDescription(vaultStatus.currentSettings.allocationStrategy)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs">Auto-Allocate:</span>
              <span className={`text-xs font-medium ${vaultStatus.currentSettings.autoAllocate ? 'text-green-500' : 'text-red-500'}`}>
                {vaultStatus.currentSettings.autoAllocate ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-sm">Vault Settings</h4>
              
              {/* Auto Allocation Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-allocate" className="text-sm">Auto-Allocate Profits</Label>
                <Switch
                  id="auto-allocate"
                  checked={localSettings.autoAllocate ?? vaultStatus.currentSettings.autoAllocate}
                  onCheckedChange={(checked) => 
                    setLocalSettings(prev => ({ ...prev, autoAllocate: checked }))
                  }
                />
              </div>

              {/* Strategy Selection */}
              <div className="space-y-2">
                <Label className="text-sm">Allocation Strategy</Label>
                <div className="grid grid-cols-3 gap-2">
                  {['conservative', 'balanced', 'aggressive'].map((strategy) => (
                    <Button
                      key={strategy}
                      variant={
                        (localSettings.allocationStrategy ?? vaultStatus.currentSettings.allocationStrategy) === strategy 
                          ? "default" 
                          : "outline"
                      }
                      size="sm"
                      onClick={() => 
                        setLocalSettings(prev => ({ ...prev, allocationStrategy: strategy as any }))
                      }
                      className="capitalize"
                    >
                      {strategy}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Minimum Profit Threshold */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Minimum Profit Threshold: $
                  {localSettings.minimumProfitThreshold ?? vaultStatus.currentSettings.minimumProfitThreshold}
                </Label>
                <Slider
                  value={[localSettings.minimumProfitThreshold ?? vaultStatus.currentSettings.minimumProfitThreshold]}
                  onValueChange={([value]) => 
                    setLocalSettings(prev => ({ ...prev, minimumProfitThreshold: value }))
                  }
                  max={500}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>

              {/* Stablecoin Ratio */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Stablecoin Allocation: {localSettings.stablecoinRatio ?? vaultStatus.currentSettings.stablecoinRatio}%
                </Label>
                <Slider
                  value={[localSettings.stablecoinRatio ?? vaultStatus.currentSettings.stablecoinRatio]}
                  onValueChange={([value]) => 
                    setLocalSettings(prev => ({ ...prev, stablecoinRatio: value }))
                  }
                  max={80}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Reinvestment Ratio */}
              <div className="space-y-2">
                <Label className="text-sm">
                  Reinvestment Ratio: {localSettings.reinvestmentRatio ?? vaultStatus.currentSettings.reinvestmentRatio}%
                </Label>
                <Slider
                  value={[localSettings.reinvestmentRatio ?? vaultStatus.currentSettings.reinvestmentRatio]}
                  onValueChange={([value]) => 
                    setLocalSettings(prev => ({ ...prev, reinvestmentRatio: value }))
                  }
                  max={80}
                  min={10}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSettingsUpdate}
                  disabled={updateSettingsMutation.isPending}
                  size="sm"
                  className="flex-1"
                >
                  {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setLocalSettings({});
                    setShowSettings(false);
                  }}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Last Allocation */}
          {vaultStatus.lastAllocation && (
            <div className="text-xs text-muted-foreground">
              Last allocation: {new Date(vaultStatus.lastAllocation).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
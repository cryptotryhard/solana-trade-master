import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Zap,
  Shield,
  Cpu,
  Wifi,
  DollarSign,
  Settings,
  Play,
  Activity,
  Square
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SystemCheckResult {
  status: 'ok' | 'error' | 'warning';
  ready: boolean;
  errors: string[];
  warnings: string[];
  components: {
    phantom_wallet: CheckStatus;
    jupiter_api: CheckStatus;
    helius_api: CheckStatus;
    price_fetcher: CheckStatus;
    websocket_feeds: CheckStatus;
    trade_execution: CheckStatus;
    ai_modules: CheckStatus;
    sol_balance: CheckStatus;
    api_endpoints?: CheckStatus;
    wallet_balance_usd?: CheckStatus;
    background_engines?: CheckStatus;
  };
  deployment_ready: boolean;
  timestamp: Date;
}

interface CheckStatus {
  status: 'ok' | 'error' | 'warning';
  message: string;
  details?: any;
}

const getStatusIcon = (status: 'ok' | 'error' | 'warning') => {
  switch (status) {
    case 'ok':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  }
};

const getStatusColor = (status: 'ok' | 'error' | 'warning') => {
  switch (status) {
    case 'ok':
      return 'text-green-500 bg-green-50 border-green-200';
    case 'error':
      return 'text-red-500 bg-red-50 border-red-200';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
};

const componentIcons = {
  phantom_wallet: <Shield className="w-4 h-4" />,
  jupiter_api: <Activity className="w-4 h-4" />,
  helius_api: <Wifi className="w-4 h-4" />,
  price_fetcher: <DollarSign className="w-4 h-4" />,
  websocket_feeds: <Wifi className="w-4 h-4" />,
  trade_execution: <Zap className="w-4 h-4" />,
  ai_modules: <Cpu className="w-4 h-4" />,
  sol_balance: <DollarSign className="w-4 h-4" />
};

const componentNames = {
  phantom_wallet: 'Phantom Wallet',
  jupiter_api: 'Jupiter API',
  helius_api: 'Helius API',
  price_fetcher: 'Price Fetcher',
  websocket_feeds: 'WebSocket Feeds',
  trade_execution: 'Trade Execution',
  ai_modules: 'AI Modules',
  sol_balance: 'SOL Balance'
};

export function SystemStatusPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [liveTradingActivated, setLiveTradingActivated] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: systemStatus, isLoading, error } = useQuery<SystemCheckResult>({
    queryKey: ['/api/system-check'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 2
  });

  const { data: liveTradingStatus } = useQuery({
    queryKey: ['/api/live-trading/status'],
    refetchInterval: 10000,
  });

  const systemCheckMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/system-check');
      if (!response.ok) {
        throw new Error('System check failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-check'] });
    }
  });

  const activateLiveTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/live-trading/activate', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/status'] });
      toast({
        title: "Live Trading Activated",
        description: "VICTORIA is now actively trading with real funds",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Activation Failed",
        description: error.message || "Failed to activate live trading",
        variant: "destructive",
      });
    },
  });

  const deactivateLiveTradingMutation = useMutation({
    mutationFn: () => apiRequest('/api/live-trading/deactivate', 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/live-trading/status'] });
      toast({
        title: "Live Trading Deactivated",
        description: "VICTORIA has been switched to simulation mode",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deactivation Failed", 
        description: error.message || "Failed to deactivate live trading",
        variant: "destructive",
      });
    },
  });

  const runSystemCheck = () => {
    setIsRunningCheck(true);
    systemCheckMutation.mutate();
    setTimeout(() => setIsRunningCheck(false), 3000);
  };

  const handleLiveTradingActivation = () => {
    activateLiveTradingMutation.mutate();
    setLiveTradingActivated(true);
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2">Running system check...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !systemStatus) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 font-medium">System check failed</p>
            <p className="text-sm text-gray-500 mt-1">Unable to retrieve system status</p>
            <Button 
              onClick={runSystemCheck} 
              className="mt-4"
              disabled={systemCheckMutation.isPending}
            >
              {systemCheckMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Retry Check
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getOverallProgress = () => {
    const components = Object.values(systemStatus.components);
    const okComponents = components.filter(c => c.status === 'ok').length;
    return (okComponents / components.length) * 100;
  };

  return (
    <Card className={`w-full transition-all duration-300 ${
      systemStatus.deployment_ready 
        ? 'border-green-200 bg-green-50/30' 
        : systemStatus.status === 'error' 
          ? 'border-red-200 bg-red-50/30'
          : 'border-yellow-200 bg-yellow-50/30'
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Status
            {systemStatus.deployment_ready && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <Play className="w-3 h-3 mr-1" />
                Deployment Ready
              </Badge>
            )}
          </CardTitle>
          <Button 
            onClick={runSystemCheck}
            variant="outline"
            size="sm"
            disabled={systemCheckMutation.isPending}
          >
            {systemCheckMutation.isPending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className={`p-4 rounded-lg border ${getStatusColor(systemStatus.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getStatusIcon(systemStatus.status)}
              <span className="font-medium">
                {systemStatus.deployment_ready 
                  ? 'System Ready for Live Trading' 
                  : systemStatus.ready 
                    ? 'System Operational' 
                    : 'System Issues Detected'
                }
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
          
          <Progress value={getOverallProgress()} className="mb-2" />
          <p className="text-sm">
            {Object.values(systemStatus.components).filter(c => c.status === 'ok').length} of{' '}
            {Object.values(systemStatus.components).length} components operational
          </p>
        </div>

        {/* System Check Control */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Settings className={`w-5 h-5 text-blue-600 ${isRunningCheck ? 'animate-spin' : ''}`} />
                <span className="font-semibold text-gray-900">System Verification</span>
              </div>
              <Badge 
                variant={systemStatus.deployment_ready ? "default" : "secondary"}
                className={systemStatus.deployment_ready 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-600"
                }
              >
                {systemStatus.deployment_ready ? "READY" : "CHECKING"}
              </Badge>
            </div>
            
            <Button
              onClick={runSystemCheck}
              variant="outline"
              size="sm"
              disabled={isRunningCheck || systemCheckMutation.isPending}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRunningCheck ? 'animate-spin' : ''}`} />
              {isRunningCheck ? "Running Check..." : "Run System Check"}
            </Button>
          </div>
          
          <p className="text-sm text-gray-600 mt-2">
            Comprehensive verification of all endpoints, balances, and background engines before live trading.
          </p>
        </div>

        {/* Live Trading Control */}
        {systemStatus.deployment_ready && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-900">Live Trading Mode</span>
                </div>
                <Badge 
                  variant={liveTradingStatus?.active ? "default" : "secondary"}
                  className={liveTradingStatus?.active 
                    ? "bg-green-600 text-white animate-pulse" 
                    : "bg-gray-100 text-gray-600"
                  }
                >
                  {liveTradingStatus?.active ? "LIVE" : "SIMULATION"}
                </Badge>
              </div>
              
              <div className="flex gap-2">
                {liveTradingStatus?.active ? (
                  <Button
                    onClick={() => deactivateLiveTradingMutation.mutate()}
                    variant="outline"
                    size="sm"
                    disabled={deactivateLiveTradingMutation.isPending}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Square className="w-4 h-4 mr-1" />
                    {deactivateLiveTradingMutation.isPending ? "Stopping..." : "Stop Trading"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleLiveTradingActivation}
                    size="sm"
                    disabled={activateLiveTradingMutation.isPending || !systemStatus.deployment_ready || liveTradingActivated}
                    className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    {activateLiveTradingMutation.isPending ? "Activating..." : liveTradingActivated ? "Live Trading Active" : "Activate Live Trading"}
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mt-2">
              {liveTradingStatus?.active 
                ? "🔴 VICTORIA is actively trading with real funds. Monitor performance carefully."
                : "✅ All systems verified. Click to enable live trading with real SOL."
              }
            </p>
          </div>
        )}

        {/* Errors and Warnings Summary */}
        {(systemStatus.errors.length > 0 || systemStatus.warnings.length > 0) && (
          <div className="space-y-2">
            {systemStatus.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="font-medium text-red-800">
                    {systemStatus.errors.length} Error{systemStatus.errors.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {systemStatus.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {systemStatus.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {systemStatus.warnings.length} Warning{systemStatus.warnings.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {systemStatus.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Component Details */}
        {isExpanded && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700">Component Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(systemStatus.components).map(([key, component]) => (
                  <div 
                    key={key}
                    className={`p-3 rounded border transition-colors ${getStatusColor(component.status)}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {componentIcons[key as keyof typeof componentIcons]}
                      <span className="font-medium text-sm">
                        {componentNames[key as keyof typeof componentNames]}
                      </span>
                      {getStatusIcon(component.status)}
                    </div>
                    <p className="text-xs opacity-80">{component.message}</p>
                    {component.details && (
                      <div className="mt-2 text-xs opacity-70">
                        {typeof component.details === 'object' ? (
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(component.details, null, 2)}
                          </pre>
                        ) : (
                          <span>{component.details}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Deployment Ready Actions */}
        {systemStatus.deployment_ready && (
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-medium text-green-800">
                Victoria is fully operational and ready for live trading
              </span>
            </div>
            <p className="text-sm text-green-700 mb-3">
              All critical systems are functioning correctly. You can now proceed with live trading deployment.
            </p>
            <div className="flex gap-2">
              <Button className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Start Live Trading
              </Button>
              <Button variant="outline" className="border-green-300 text-green-700">
                View Configuration
              </Button>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center">
          Last checked: {new Date(systemStatus.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
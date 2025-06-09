import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  ShieldAlert, 
  ShieldX, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Eye,
  EyeOff,
  RefreshCw,
  Zap,
  TrendingDown,
  Clock,
  Settings
} from "lucide-react";

interface ThreatLevel {
  level: 'safe' | 'elevated' | 'high' | 'critical';
  score: number;
  indicators: string[];
  recommendations: string[];
}

interface ProtectionStatus {
  isEnabled: boolean;
  safeModeActive: boolean;
  consecutiveLosses: number;
  activeLocks: any[];
  recentEvents: any[];
}

interface SafeModeConfig {
  isActive: boolean;
  enteredAt: string;
  reason: string;
  restrictions: {
    tradingDisabled: boolean;
    maxPositionSize: number;
    allowedTokens: string[];
    cooldownMinutes: number;
  };
  exitConditions: {
    stabilizationPeriod: number;
    requiredWinRate: number;
    maxDrawdown: number;
  };
}

interface PanicTrigger {
  id: string;
  name: string;
  description: string;
  condition: string;
  threshold: number;
  timeWindow: number;
  severity: 'warning' | 'moderate' | 'critical';
  action: string;
  isActive: boolean;
}

interface CapitalLock {
  tokenSymbol: string;
  mintAddress: string;
  lockedAt: string;
  reason: string;
  failureCount: number;
  lockDuration: number;
  unlockAt: string;
}

interface ProtectionEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    trigger?: string;
    reason: string;
    metrics: any;
    action: string;
  };
}

export function CrashShieldDashboard() {
  const [shieldEnabled, setShieldEnabled] = useState(true);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const { data: protectionStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/crash-shield/status'],
    refetchInterval: 10000,
  });

  const { data: threatLevel, isLoading: threatLoading } = useQuery({
    queryKey: ['/api/crash-shield/threat-level'],
    refetchInterval: 30000,
  });

  const { data: safeModeConfig, isLoading: safeModeLoading } = useQuery({
    queryKey: ['/api/crash-shield/safe-mode'],
    refetchInterval: 15000,
  });

  const { data: triggers = [], isLoading: triggersLoading } = useQuery({
    queryKey: ['/api/crash-shield/triggers'],
    refetchInterval: 60000,
  });

  const { data: capitalLocks = [], isLoading: locksLoading } = useQuery({
    queryKey: ['/api/crash-shield/capital-locks'],
    refetchInterval: 30000,
  });

  const { data: protectionEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/crash-shield/events'],
    refetchInterval: 20000,
  });

  const toggleShield = async () => {
    try {
      const response = await fetch('/api/crash-shield/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !shieldEnabled })
      });
      
      if (response.ok) {
        setShieldEnabled(!shieldEnabled);
      }
    } catch (error) {
      console.error('Failed to toggle crash shield:', error);
    }
  };

  const forceSafeMode = async () => {
    try {
      await fetch('/api/crash-shield/force-safe-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Manual activation from dashboard' })
      });
    } catch (error) {
      console.error('Failed to force safe mode:', error);
    }
  };

  const manualRecovery = async () => {
    try {
      await fetch('/api/crash-shield/manual-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to initiate recovery:', error);
    }
  };

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'safe': return <Shield className="h-5 w-5 text-green-500" />;
      case 'elevated': return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
      case 'high': return <ShieldAlert className="h-5 w-5 text-orange-500" />;
      case 'critical': return <ShieldX className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'elevated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (statusLoading || threatLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Crash Shield Auto-Protect
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading protection systems...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = protectionStatus as ProtectionStatus;
  const threat = threatLevel as ThreatLevel;
  const safeMode = safeModeConfig as SafeModeConfig;
  const panicTriggers = triggers as PanicTrigger[];
  const locks = capitalLocks as CapitalLock[];
  const events = protectionEvents as ProtectionEvent[];

  const activeLocks = locks.filter(lock => new Date(lock.unlockAt) > new Date());
  const activeTriggers = panicTriggers.filter(trigger => trigger.isActive);

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Crash Shield Auto-Protect
              {safeMode?.isActive && (
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 ml-2">
                  SAFE MODE
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Auto-Protect</span>
                <Switch
                  checked={status?.isEnabled || false}
                  onCheckedChange={toggleShield}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                className="flex items-center gap-2"
              >
                {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showSensitiveData ? 'Hide' : 'Show'} Details
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Threat Level & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Threat Level</p>
                <div className="flex items-center gap-2 mt-1">
                  {getThreatIcon(threat?.level)}
                  <Badge className={getThreatColor(threat?.level)}>
                    {threat?.level?.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{threat?.score || 0}</p>
                <p className="text-xs text-gray-500">Risk Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Consecutive Losses</p>
                <p className="text-2xl font-bold text-red-500">{status?.consecutiveLosses || 0}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Capital Locks</p>
                <p className="text-2xl font-bold text-orange-500">{activeLocks.length}</p>
              </div>
              <Lock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Triggers</p>
                <p className="text-2xl font-bold text-blue-500">{activeTriggers.length}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Safe Mode Alert */}
      {safeMode?.isActive && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <ShieldAlert className="h-5 w-5" />
              Safe Mode Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>Reason:</strong> {safeMode.reason}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>Activated:</strong> {new Date(safeMode.enteredAt).toLocaleString()}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Max Position</p>
                  <p className="font-semibold">{safeMode.restrictions.maxPositionSize}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Trading</p>
                  <p className="font-semibold">
                    {safeMode.restrictions.tradingDisabled ? 'Disabled' : 'Restricted'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Cooldown</p>
                  <p className="font-semibold">{safeMode.restrictions.cooldownMinutes}m</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Win Rate Target</p>
                  <p className="font-semibold">{safeMode.exitConditions.requiredWinRate}%</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={manualRecovery}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Manual Recovery
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="triggers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="triggers">Panic Triggers</TabsTrigger>
          <TabsTrigger value="locks">Capital Locks</TabsTrigger>
          <TabsTrigger value="events">Protection Events</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="triggers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Panic Trigger Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {panicTriggers.map((trigger) => (
                  <div key={trigger.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={trigger.isActive ? "default" : "secondary"}>
                          {trigger.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <span className="font-semibold">{trigger.name}</span>
                        <Badge className={getThreatColor(trigger.severity)}>
                          {trigger.severity}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {trigger.threshold} {trigger.condition === 'consecutive_losses' ? 'losses' : '%'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {trigger.description}
                    </p>
                    <div className="flex gap-4 text-xs text-gray-500">
                      <span>Action: {trigger.action.replace('_', ' ')}</span>
                      <span>Window: {trigger.timeWindow}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="locks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Capital Lock Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeLocks.length > 0 ? (
                <div className="space-y-4">
                  {activeLocks.map((lock) => (
                    <div key={lock.tokenSymbol} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4 text-orange-500" />
                          <span className="font-semibold">{lock.tokenSymbol}</span>
                          <Badge variant="secondary">
                            Failures: {lock.failureCount}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            Unlocks: {new Date(lock.unlockAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>Reason:</strong> {lock.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        Locked: {new Date(lock.lockedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No active capital locks</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Protection Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.slice(0, 10).map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(event.severity)}
                          <span className="font-semibold capitalize">
                            {event.type.replace('_', ' ')}
                          </span>
                          <Badge className={getThreatColor(event.severity)}>
                            {event.severity}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {event.details.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        Action: {event.details.action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No recent protection events</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Management Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {threat?.recommendations && threat.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {threat.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-blue-700 dark:text-blue-300">{rec}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">All systems operating normally</p>
              )}

              {!safeMode?.isActive && (
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={forceSafeMode}
                    className="w-full flex items-center gap-2"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    Force Safe Mode (Manual Override)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
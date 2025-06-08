import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Medal, Crown } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'trading' | 'profit' | 'strategy' | 'milestone';
  requirement: {
    type: string;
    value: number;
  };
  reward: {
    type: string;
    value: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

interface UserProgress {
  userId: number;
  totalTrades: number;
  winningTrades: number;
  totalProfit: number;
  maxConsecutiveWins: number;
  portfolioValue: number;
  unlockedAchievements: string[];
}

interface AchievementStatus {
  progress: UserProgress;
  unlockedAchievements: Achievement[];
  availableAchievements: Achievement[];
  recentUnlocks: Achievement[];
}

export function AchievementsPanel() {
  const { data: status, isLoading } = useQuery<AchievementStatus>({
    queryKey: ["/api/achievements/status"],
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading achievements...</div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No achievement data available</div>
        </CardContent>
      </Card>
    );
  }

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return <Star className="h-4 w-4 text-gray-500" />;
      case 'rare': return <Medal className="h-4 w-4 text-blue-500" />;
      case 'epic': return <Trophy className="h-4 w-4 text-purple-500" />;
      case 'legendary': return <Crown className="h-4 w-4 text-yellow-500" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'border-gray-500/30 bg-gray-500/10';
      case 'rare': return 'border-blue-500/30 bg-blue-500/10';
      case 'epic': return 'border-purple-500/30 bg-purple-500/10';
      case 'legendary': return 'border-yellow-500/30 bg-yellow-500/10';
      default: return 'border-secondary';
    }
  };

  const calculateProgress = (achievement: Achievement, progress: UserProgress) => {
    const { type, value } = achievement.requirement;
    let current = 0;
    
    switch (type) {
      case 'trade_count':
        current = progress.totalTrades;
        break;
      case 'win_rate':
        current = progress.totalTrades > 0 ? (progress.winningTrades / progress.totalTrades) * 100 : 0;
        break;
      case 'profit_amount':
        current = progress.totalProfit;
        break;
      case 'consecutive_wins':
        current = progress.maxConsecutiveWins;
        break;
      case 'portfolio_value':
        current = progress.portfolioValue;
        break;
    }
    
    return Math.min(100, (current / value) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Achievements ({status.unlockedAchievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Recent Unlocks */}
          {status.recentUnlocks.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-green-500">Recent Unlocks</h4>
              {status.recentUnlocks.map((achievement) => (
                <div 
                  key={achievement.id}
                  className={`border rounded-lg p-3 animate-pulse ${getRarityColor(achievement.rarity)}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{achievement.icon}</span>
                    {getRarityIcon(achievement.rarity)}
                    <span className="font-medium">{achievement.name}</span>
                    <Badge variant="outline" className="ml-auto">New!</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Unlocked Achievements */}
          {status.unlockedAchievements.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Unlocked</h4>
              <div className="grid grid-cols-1 gap-2">
                {status.unlockedAchievements.slice(0, 3).map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`border rounded-lg p-3 ${getRarityColor(achievement.rarity)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{achievement.icon}</span>
                      {getRarityIcon(achievement.rarity)}
                      <span className="font-medium">{achievement.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Towards Next Achievements */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">In Progress</h4>
            <div className="space-y-3">
              {status.availableAchievements.slice(0, 3).map((achievement) => {
                const progress = calculateProgress(achievement, status.progress);
                return (
                  <div key={achievement.id} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg opacity-50">{achievement.icon}</span>
                      {getRarityIcon(achievement.rarity)}
                      <span className="font-medium text-sm">{achievement.name}</span>
                    </div>
                    <Progress value={progress} className="h-2 mb-1" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{achievement.description}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Stats */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{status.unlockedAchievements.length}</div>
              <div className="text-xs text-muted-foreground">Unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{status.availableAchievements.length}</div>
              <div className="text-xs text-muted-foreground">Available</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
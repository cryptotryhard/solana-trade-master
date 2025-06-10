import { webhookNotifier } from './webhook-notifier';

interface AlertConfig {
  roiThreshold: number; // Percentage for ROI alerts
  milestoneThresholds: number[]; // USD amounts for milestone alerts
  enableTelegram: boolean;
  enableEmail: boolean;
  enableWebhook: boolean;
  telegramChatId?: string;
  emailAddress?: string;
}

interface Alert {
  id: string;
  type: 'roi' | 'milestone' | 'api_failure' | 'system_error' | 'portfolio_protection';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: Date;
  sent: boolean;
  channels: string[];
}

class AlertNotificationSystem {
  private config: AlertConfig = {
    roiThreshold: 300, // Alert on +300% ROI
    milestoneThresholds: [1000, 5000, 10000, 50000, 100000, 500000, 1000000], // $1K to $1M milestones
    enableTelegram: false,
    enableEmail: false,
    enableWebhook: true
  };

  private alerts: Alert[] = [];
  private apiFailureCount = 0;
  private lastApiFailureAlert = 0;
  private currentPortfolioValue = 0;
  private lastMilestoneReached = 0;

  constructor() {
    this.startMonitoring();
    console.log('🔔 Alert Notification System: Monitoring active');
  }

  private startMonitoring(): void {
    // Monitor every 30 seconds
    setInterval(() => {
      this.checkSystemHealth();
    }, 30000);

    // Check portfolio milestones every minute
    setInterval(() => {
      this.checkPortfolioMilestones();
    }, 60000);
  }

  async sendROIAlert(trade: {
    symbol: string;
    roi: number;
    amount: number;
    txHash?: string;
    entryPrice: number;
    exitPrice: number;
  }): Promise<void> {
    if (trade.roi < this.config.roiThreshold) return;

    const alert: Alert = {
      id: `roi_${Date.now()}`,
      type: 'roi',
      severity: trade.roi > 1000 ? 'critical' : 'high',
      title: `🚀 MASSIVE GAIN: ${trade.symbol} +${trade.roi.toFixed(1)}%!`,
      message: `
🎯 Token: ${trade.symbol}
💰 ROI: +${trade.roi.toFixed(1)}%
📈 Entry: $${trade.entryPrice.toFixed(6)}
📈 Exit: $${trade.exitPrice.toFixed(6)}
💵 Profit: $${(trade.amount * (trade.roi / 100)).toFixed(2)}
${trade.txHash ? `🔗 TX: https://solscan.io/tx/${trade.txHash}` : ''}
      `.trim(),
      data: trade,
      timestamp: new Date(),
      sent: false,
      channels: []
    };

    await this.sendAlert(alert);
  }

  async sendMilestoneAlert(milestone: number, currentValue: number): Promise<void> {
    const alert: Alert = {
      id: `milestone_${Date.now()}`,
      type: 'milestone',
      severity: milestone >= 1000000 ? 'critical' : 'high',
      title: `🎉 MILESTONE REACHED: $${this.formatNumber(milestone)}!`,
      message: `
🏆 Portfolio Value: $${this.formatNumber(currentValue)}
🎯 Milestone: $${this.formatNumber(milestone)}
📊 Growth: ${((currentValue / 500 - 1) * 100).toFixed(1)}% from initial
⏰ Timestamp: ${new Date().toLocaleString()}
🚀 Next target: $${this.formatNumber(this.getNextMilestone(milestone))}
      `.trim(),
      data: { milestone, currentValue },
      timestamp: new Date(),
      sent: false,
      channels: []
    };

    await this.sendAlert(alert);
  }

  async sendAPIFailureAlert(service: string, error: string): Promise<void> {
    this.apiFailureCount++;
    
    // Rate limit API failure alerts - max 1 per 5 minutes
    const now = Date.now();
    if (now - this.lastApiFailureAlert < 300000) return;
    
    this.lastApiFailureAlert = now;

    const alert: Alert = {
      id: `api_failure_${Date.now()}`,
      type: 'api_failure',
      severity: this.apiFailureCount > 5 ? 'critical' : 'medium',
      title: `⚠️ API FAILURE: ${service}`,
      message: `
🚨 Service: ${service}
❌ Error: ${error}
📊 Failure count: ${this.apiFailureCount}
⏰ Time: ${new Date().toLocaleString()}
🔄 Auto-retry: Active
      `.trim(),
      data: { service, error, count: this.apiFailureCount },
      timestamp: new Date(),
      sent: false,
      channels: []
    };

    await this.sendAlert(alert);
  }

  async sendPortfolioProtectionAlert(drawdown: number, action: string): Promise<void> {
    const alert: Alert = {
      id: `protection_${Date.now()}`,
      type: 'portfolio_protection',
      severity: drawdown > 15 ? 'critical' : 'high',
      title: `🛡️ PORTFOLIO PROTECTION ACTIVATED`,
      message: `
📉 Drawdown: ${drawdown.toFixed(2)}%
🛡️ Action: ${action}
⏰ Time: ${new Date().toLocaleString()}
🔄 Mode: Ultra-Conservative
⚡ Auto-recovery: Enabled
      `.trim(),
      data: { drawdown, action },
      timestamp: new Date(),
      sent: false,
      channels: []
    };

    await this.sendAlert(alert);
  }

  private async sendAlert(alert: Alert): Promise<void> {
    this.alerts.push(alert);

    try {
      // Always send via webhook (console log)
      if (this.config.enableWebhook) {
        console.log(`🔔 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
        console.log(alert.message);
        alert.channels.push('webhook');
        
        // Send system alert via webhook notifier
        await webhookNotifier.sendSystemAlert(
          `${alert.title}\n\n${alert.message}`,
          alert.severity === 'critical' ? 'error' : 'warning'
        );
      }

      // Future: Telegram integration
      if (this.config.enableTelegram && this.config.telegramChatId) {
        // await this.sendTelegramAlert(alert);
        alert.channels.push('telegram');
      }

      // Future: Email integration  
      if (this.config.enableEmail && this.config.emailAddress) {
        // await this.sendEmailAlert(alert);
        alert.channels.push('email');
      }

      alert.sent = true;
      
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  private checkSystemHealth(): void {
    // Reset API failure count periodically
    if (Date.now() - this.lastApiFailureAlert > 600000) { // 10 minutes
      this.apiFailureCount = 0;
    }
  }

  private async checkPortfolioMilestones(): Promise<void> {
    try {
      // Mock portfolio value check - in real implementation would fetch actual value
      this.currentPortfolioValue = 1547.32; // From vault metrics

      for (const milestone of this.config.milestoneThresholds) {
        if (this.currentPortfolioValue >= milestone && milestone > this.lastMilestoneReached) {
          this.lastMilestoneReached = milestone;
          await this.sendMilestoneAlert(milestone, this.currentPortfolioValue);
          break; // Only send one milestone alert at a time
        }
      }
    } catch (error) {
      console.error('Error checking portfolio milestones:', error);
    }
  }

  private getNextMilestone(current: number): number {
    const next = this.config.milestoneThresholds.find(m => m > current);
    return next || current * 2;
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  // Configuration methods
  updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔔 Alert configuration updated');
  }

  setROIThreshold(threshold: number): void {
    this.config.roiThreshold = threshold;
    console.log(`🔔 ROI alert threshold set to ${threshold}%`);
  }

  enableTelegram(chatId: string): void {
    this.config.enableTelegram = true;
    this.config.telegramChatId = chatId;
    console.log('🔔 Telegram alerts enabled');
  }

  enableEmail(email: string): void {
    this.config.enableEmail = true;
    this.config.emailAddress = email;
    console.log('🔔 Email alerts enabled');
  }

  // Public API
  getRecentAlerts(limit: number = 20): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlertStats(): {
    totalAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
  } {
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    this.alerts.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
      bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    });

    return {
      totalAlerts: this.alerts.length,
      alertsByType: byType,
      alertsBySeverity: bySeverity
    };
  }

  // Test method for demonstration
  async testAlert(): Promise<void> {
    await this.sendROIAlert({
      symbol: 'TEST',
      roi: 350,
      amount: 100,
      txHash: '4cGV4hFHFT3eW41g59gHr3g6sFcPte2ZrxtFDdD28W3rt8vVojUByCXc7nSk89yBRdRc1CVkbFQbAeG7HPKeXZ8y',
      entryPrice: 0.00001,
      exitPrice: 0.000045
    });
  }
}

export const alertNotificationSystem = new AlertNotificationSystem();
import fetch from 'node-fetch';

interface NotificationPayload {
  message: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: Date;
  metadata?: any;
}

class WebhookNotifier {
  private discordWebhookUrl?: string;
  private telegramBotToken?: string;
  private telegramChatId?: string;

  constructor() {
    // Initialize webhook URLs from environment variables
    this.discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
    this.telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
  }

  public async sendDeploymentReadyNotification(): Promise<void> {
    const payload: NotificationPayload = {
      message: '✅ VICTORIA is fully operational and ready for live trading.',
      status: 'success',
      timestamp: new Date(),
      metadata: {
        system: 'VICTORIA Trading AI',
        event: 'deployment_ready',
        action_required: 'Enable live trading mode'
      }
    };

    await this.sendNotifications(payload);
  }

  public async sendSystemAlert(message: string, status: 'warning' | 'error'): Promise<void> {
    const payload: NotificationPayload = {
      message,
      status,
      timestamp: new Date(),
      metadata: {
        system: 'VICTORIA Trading AI',
        event: 'system_alert'
      }
    };

    await this.sendNotifications(payload);
  }

  private async sendNotifications(payload: NotificationPayload): Promise<void> {
    const promises: Promise<void>[] = [];

    // Send to Discord if configured
    if (this.discordWebhookUrl) {
      promises.push(this.sendDiscordNotification(payload));
    }

    // Send to Telegram if configured
    if (this.telegramBotToken && this.telegramChatId) {
      promises.push(this.sendTelegramNotification(payload));
    }

    // Console notification as fallback
    promises.push(this.sendConsoleNotification(payload));

    // Wait for all notifications to complete
    await Promise.allSettled(promises);
  }

  private async sendDiscordNotification(payload: NotificationPayload): Promise<void> {
    if (!this.discordWebhookUrl) return;

    try {
      const discordPayload = {
        embeds: [{
          title: '🤖 VICTORIA Trading System',
          description: payload.message,
          color: this.getDiscordColor(payload.status),
          timestamp: payload.timestamp.toISOString(),
          fields: payload.metadata ? [
            {
              name: 'System',
              value: payload.metadata.system || 'VICTORIA',
              inline: true
            },
            {
              name: 'Event',
              value: payload.metadata.event || 'notification',
              inline: true
            },
            {
              name: 'Status',
              value: payload.status.toUpperCase(),
              inline: true
            }
          ] : [],
          footer: {
            text: 'VICTORIA AI Trading System',
            icon_url: 'https://via.placeholder.com/20x20/00ff00/ffffff?text=V'
          }
        }]
      };

      const response = await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(discordPayload)
      });

      if (!response.ok) {
        console.error('Discord webhook failed:', response.status, response.statusText);
      } else {
        console.log('✅ Discord notification sent successfully');
      }
    } catch (error) {
      console.error('Discord notification error:', error);
    }
  }

  private async sendTelegramNotification(payload: NotificationPayload): Promise<void> {
    if (!this.telegramBotToken || !this.telegramChatId) return;

    try {
      const emoji = this.getTelegramEmoji(payload.status);
      const message = `${emoji} *VICTORIA Trading System*\n\n${payload.message}\n\n` +
                     `📊 Status: ${payload.status.toUpperCase()}\n` +
                     `⏰ Time: ${payload.timestamp.toLocaleString()}`;

      const telegramUrl = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        console.error('Telegram webhook failed:', response.status, response.statusText);
      } else {
        console.log('✅ Telegram notification sent successfully');
      }
    } catch (error) {
      console.error('Telegram notification error:', error);
    }
  }

  private async sendConsoleNotification(payload: NotificationPayload): Promise<void> {
    const emoji = this.getConsoleEmoji(payload.status);
    const timestamp = payload.timestamp.toLocaleString();
    
    console.log('\n' + '='.repeat(60));
    console.log(`${emoji} WEBHOOK NOTIFICATION`);
    console.log('='.repeat(60));
    console.log(`Message: ${payload.message}`);
    console.log(`Status: ${payload.status.toUpperCase()}`);
    console.log(`Time: ${timestamp}`);
    
    if (payload.metadata) {
      console.log('Metadata:');
      Object.entries(payload.metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  private getDiscordColor(status: string): number {
    switch (status) {
      case 'success': return 0x00ff00; // Green
      case 'warning': return 0xffff00; // Yellow
      case 'error': return 0xff0000;   // Red
      case 'info': return 0x0099ff;    // Blue
      default: return 0x808080;        // Gray
    }
  }

  private getTelegramEmoji(status: string): string {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  }

  private getConsoleEmoji(status: string): string {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '🔔';
    }
  }

  public getNotificationStatus(): {
    discord: boolean;
    telegram: boolean;
    console: boolean;
  } {
    return {
      discord: !!this.discordWebhookUrl,
      telegram: !!(this.telegramBotToken && this.telegramChatId),
      console: true
    };
  }

  public async testNotifications(): Promise<void> {
    const testPayload: NotificationPayload = {
      message: '🧪 Test notification from VICTORIA Trading System',
      status: 'info',
      timestamp: new Date(),
      metadata: {
        system: 'VICTORIA Trading AI',
        event: 'test_notification',
        test: true
      }
    };

    console.log('🧪 Sending test notifications...');
    await this.sendNotifications(testPayload);
  }
}

export const webhookNotifier = new WebhookNotifier();
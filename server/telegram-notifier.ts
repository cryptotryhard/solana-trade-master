interface TelegramConfig {
  botToken?: string;
  chatId?: string;
  enabled: boolean;
}

interface TradeAlert {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  amount: number;
  pnl?: number;
  confidence: number;
  reason: string;
  timestamp: Date;
}

class TelegramNotifier {
  private config: TelegramConfig = {
    enabled: false
  };

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // In production, load from environment variables
    this.config = {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      chatId: process.env.TELEGRAM_CHAT_ID,
      enabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    };

    if (this.config.enabled) {
      console.log('📱 Telegram notifications enabled');
    } else {
      console.log('📱 Telegram notifications disabled - missing bot token or chat ID');
    }
  }

  async sendTradeAlert(trade: TradeAlert): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const message = this.formatTradeMessage(trade);
      await this.sendMessage(message);
      
      console.log(`📤 Telegram alert sent: ${trade.action} ${trade.symbol}`);
    } catch (error) {
      console.error('Telegram notification failed:', error);
    }
  }

  private formatTradeMessage(trade: TradeAlert): string {
    const action = trade.action === 'BUY' ? '🟢 BUY' : '🔴 SELL';
    const pnlText = trade.pnl !== undefined 
      ? `\n💰 P&L: ${trade.pnl > 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`
      : '';
    
    return `${action} ${trade.symbol}
📊 Price: $${trade.price}
📈 Amount: ${trade.amount}
🎯 Confidence: ${trade.confidence}%${pnlText}
💡 Reason: ${trade.reason}
⏰ ${trade.timestamp.toLocaleTimeString()}

#Victoria #Trading #${trade.symbol}`;
  }

  private async sendMessage(text: string): Promise<void> {
    if (!this.config.botToken || !this.config.chatId) return;

    const url = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        text,
        parse_mode: 'Markdown'
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.statusText}`);
    }
  }

  async sendPortfolioUpdate(balance: number, dailyPnl: number, winRate: number): Promise<void> {
    if (!this.config.enabled) return;

    const message = `📊 *Portfolio Update*
💰 Balance: $${balance.toFixed(2)}
📈 Daily P&L: ${dailyPnl > 0 ? '+' : ''}$${dailyPnl.toFixed(2)}
🎯 Win Rate: ${winRate.toFixed(1)}%
⏰ ${new Date().toLocaleString()}

#Victoria #Portfolio`;

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Portfolio update notification failed:', error);
    }
  }

  async sendMilestoneAlert(milestone: string): Promise<void> {
    if (!this.config.enabled) return;

    const message = `🏆 *MILESTONE ACHIEVED*
${milestone}

Victoria AI continues scaling towards $500M target!
⏰ ${new Date().toLocaleString()}

#Victoria #Milestone`;

    try {
      await this.sendMessage(message);
    } catch (error) {
      console.error('Milestone notification failed:', error);
    }
  }

  toggleNotifications(enabled: boolean): void {
    this.config.enabled = enabled && !!(this.config.botToken && this.config.chatId);
    console.log(`📱 Telegram notifications ${this.config.enabled ? 'enabled' : 'disabled'}`);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

export const telegramNotifier = new TelegramNotifier();
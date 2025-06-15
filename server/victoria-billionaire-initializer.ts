/**
 * VICTORIA BILLIONAIRE INITIALIZER
 * Auto-activates the billionaire engine on server startup
 */

import { billionaireEngine } from './billionaire-trading-engine';

class VictoriaBillionaireInitializer {
  private initialized = false;

  async initializeOnStartup() {
    if (this.initialized) return;
    
    try {
      console.log('🚀 VICTORIA AUTO-INITIALIZATION STARTING...');
      console.log('💰 Target: $459 → $10,000,000,000+ (Billionaire Mode)');
      
      // Wait 10 seconds after server start to ensure all systems are ready
      setTimeout(async () => {
        try {
          await billionaireEngine.startBillionaireEngine();
          console.log('✅ VICTORIA BILLIONAIRE ENGINE AUTO-ACTIVATED');
          console.log('🎯 Milestone-based adaptive trading initiated');
          console.log('🧠 AI position management: SCALP/MOMENTUM/MOONSHOT/HEDGE');
          console.log('📊 Dashboard available at: /billionaire');
          
          this.initialized = true;
        } catch (error) {
          console.error('❌ Auto-initialization failed:', error);
          console.log('💡 Manual activation available via API: POST /api/billionaire/start');
        }
      }, 10000);
      
    } catch (error) {
      console.error('❌ Billionaire initializer error:', error);
    }
  }

  getInitializationStatus() {
    return {
      initialized: this.initialized,
      engineRunning: this.initialized,
      dashboardUrl: '/billionaire',
      apiEndpoints: {
        start: 'POST /api/billionaire/start',
        status: 'GET /api/billionaire/status',
        stop: 'POST /api/billionaire/stop'
      }
    };
  }
}

export const victoriaBillionaireInitializer = new VictoriaBillionaireInitializer();
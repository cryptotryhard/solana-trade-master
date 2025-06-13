import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import VictoriaTradingDashboard from "@/components/victoria-trading-dashboard";
import VictoriaControl from "@/pages/victoria-control";
import EnhancedVictoriaDashboard from "@/pages/enhanced-victoria-dashboard";
import StarkDashboard from "@/pages/stark-dashboard";
import RealTradingPage from "@/pages/real-trading";
import VictoriaMasterDashboard from "@/pages/victoria-master-dashboard";
import BillionDollarDashboard from "@/pages/billion-dollar-dashboard";
import AdvancedTradingDashboard from "@/pages/advanced-trading-dashboard";
import SimpleTradingDashboard from "@/pages/simple-trading-dashboard";
import AuthenticPortfolioDashboard from "@/pages/authentic-portfolio-dashboard";
import UltraAuthenticDashboard from "@/pages/ultra-authentic-dashboard";
import IntelligentScannerDashboard from "@/pages/intelligent-scanner-dashboard";
import VictoriaAutonomousDashboard from "@/pages/victoria-autonomous-dashboard";
import TestModeDashboard from "@/pages/test-mode-dashboard";
import ProductionTradingDashboard from "@/pages/production-trading-dashboard";
import StreamlinedTradingDashboard from "@/pages/streamlined-trading-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={VictoriaAutonomousDashboard} />
      <Route path="/portfolio" component={AuthenticPortfolioDashboard} />
      <Route path="/billion" component={BillionDollarDashboard} />
      <Route path="/stark" component={StarkDashboard} />
      <Route path="/victoria" component={VictoriaControl} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/master" component={VictoriaMasterDashboard} />
      <Route path="/trading" component={VictoriaTradingDashboard} />
      <Route path="/real-trading" component={RealTradingPage} />
      <Route path="/authentic" component={UltraAuthenticDashboard} />
      <Route path="/advanced" component={AdvancedTradingDashboard} />
      <Route path="/scanner" component={IntelligentScannerDashboard} />
      <Route path="/autonomous" component={VictoriaAutonomousDashboard} />
      <Route path="/test-mode" component={TestModeDashboard} />
      <Route path="/production" component={ProductionTradingDashboard} />
      <Route path="/streamlined" component={StreamlinedTradingDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

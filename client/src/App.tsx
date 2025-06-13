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
import AuthenticTradingDashboard from "@/pages/authentic-trading-dashboard";
import BillionDollarDashboard from "@/pages/billion-dollar-dashboard";
import AdvancedTradingDashboard from "@/pages/advanced-trading-dashboard";
import SimpleTradingDashboard from "@/pages/simple-trading-dashboard";
import OptimizedPortfolioDashboard from "@/pages/optimized-portfolio-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={OptimizedPortfolioDashboard} />
      <Route path="/billion" component={BillionDollarDashboard} />
      <Route path="/stark" component={StarkDashboard} />
      <Route path="/victoria" component={VictoriaControl} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/master" component={VictoriaMasterDashboard} />
      <Route path="/trading" component={VictoriaTradingDashboard} />
      <Route path="/real-trading" component={RealTradingPage} />
      <Route path="/authentic" component={AuthenticTradingDashboard} />
      <Route path="/advanced" component={AdvancedTradingDashboard} />
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

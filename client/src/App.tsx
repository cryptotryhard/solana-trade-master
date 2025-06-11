import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import VictoriaTradingDashboard from "@/components/victoria-trading-dashboard";
import VictoriaControl from "@/pages/victoria-control";
import RealTradingPage from "@/pages/real-trading";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={VictoriaControl} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/victoria" component={VictoriaTradingDashboard} />
      <Route path="/real-trading" component={RealTradingPage} />
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

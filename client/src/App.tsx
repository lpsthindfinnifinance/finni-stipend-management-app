import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/useAuth";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Practices from "@/pages/practices";
import PracticeDetail from "@/pages/practice-detail";
import NewRequest from "@/pages/new-request";
import Requests from "@/pages/requests";
import Approvals from "@/pages/approvals";
import Allocations from "@/pages/allocations";
import NewAllocation from "@/pages/new-allocation";
import Reports from "@/pages/reports";
import PayPeriods from "@/pages/pay-periods";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/practices" component={Practices} />
          <Route path="/practices/:id" component={PracticeDetail} />
          <Route path="/requests/new" component={NewRequest} />
          <Route path="/requests" component={Requests} />
          <Route path="/approvals" component={Approvals} />
          <Route path="/allocations" component={Allocations} />
          <Route path="/allocations/new" component={NewAllocation} />
          <Route path="/reports" component={Reports} />
          <Route path="/pay-periods" component={PayPeriods} />
          <Route path="/settings" component={Settings} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Sidebar width configuration for enterprise dashboard
  const sidebarStyle = {
    "--sidebar-width": "16rem", // 256px for navigation
    "--sidebar-width-icon": "4rem", // 64px collapsed
  } as React.CSSProperties;

  return (
    <TooltipProvider>
      {isLoading || !isAuthenticated ? (
        <Router />
      ) : (
        <SidebarProvider style={sidebarStyle}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    Pay Period 1
                  </span>
                </div>
              </header>
              <main className="flex-1 overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
      )}
      <Toaster />
    </TooltipProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

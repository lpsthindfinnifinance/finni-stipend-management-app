import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RoleSwitcher } from "@/components/role-switcher";
import { useAuth } from "@/hooks/useAuth";
// import finniLogo from "@assets/finni_logo_1762237015805.png";
import finniLogo from "@assets/Fnni Logo_1762236891653.png";

// Pages
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Practices from "@/pages/practices";
import PracticeDetail from "@/pages/practice-detail";
import NewRequest from "@/pages/new-request";
import Requests from "@/pages/requests";
import StipendRequestDetail from "@/pages/stipend-request-detail";
import Approvals from "@/pages/approvals";
import Allocations from "@/pages/allocations";
import NewAllocation from "@/pages/new-allocation";
import AllocationDetail from "@/pages/allocation-detail";
import PayPeriods from "@/pages/pay-periods";
import FinanceOps from "@/pages/finance-ops";
import NegativeEarnings from "@/pages/negative-earnings";
import Settings from "@/pages/settings";
import Help from "@/pages/help";
import NotFound from "@/pages/not-found";

// function Router() {
//   const { isAuthenticated, isLoading } = useAuth();

//   return (
//     <Switch>
//       {isLoading || !isAuthenticated ? (
//         <Route path="/" component={Landing} />
//       ) : (
//         <>
//           <Route path="/" component={Dashboard} />
//           <Route path="/dashboard" component={Dashboard} />
//           <Route path="/practices" component={Practices} />
//           <Route path="/practices/:id" component={PracticeDetail} />
//           <Route path="/requests/new" component={NewRequest} />
//           <Route path="/requests/:id" component={StipendRequestDetail} />
//           <Route path="/requests" component={Requests} />
//           <Route path="/approvals" component={Approvals} />
//           <Route path="/allocations" component={Allocations} />
//           <Route path="/allocations/new" component={NewAllocation} />
//           <Route path="/allocations/:id" component={AllocationDetail} />
//           <Route path="/pay-periods" component={PayPeriods} />
//           <Route path="/finance-ops" component={FinanceOps} />
//           <Route path="/negative-earnings" component={NegativeEarnings} />
//           <Route path="/settings" component={Settings} />
//           <Route path="/help" component={Help} />
//         </>
//       )}
//       <Route component={NotFound} />
//     </Switch>
//   );
// }

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  // NEW: Early return for loading state
  if (isLoading) {
    return null;
  }
  // NEW: Early return for unauthenticated users
  // if (!isAuthenticated) {
  //   return (
  //     <Switch>
  //       <Route path="/" component={Landing} />
  //       <Route component={NotFound} />
  //     </Switch>
  //   );
  // }
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route component={Landing} />
      </Switch>
    );
  }
  // NEW: Only authenticated routes here (no conditional inside Switch)
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/practices" component={Practices} />
      <Route path="/practices/:id" component={PracticeDetail} />
      <Route path="/requests/new" component={NewRequest} />
      <Route path="/requests/:id" component={StipendRequestDetail} />
      <Route path="/requests" component={Requests} />
      <Route path="/approvals" component={Approvals} />
      <Route path="/allocations" component={Allocations} />
      <Route path="/allocations/new" component={NewAllocation} />
      <Route path="/allocations/:id" component={AllocationDetail} />
      <Route path="/pay-periods" component={PayPeriods} />
      <Route path="/finance-ops" component={FinanceOps} />
      <Route path="/negative-earnings" component={NegativeEarnings} />
      <Route path="/settings" component={Settings} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Fetch current pay period
  const { data: currentPeriod } = useQuery<{ payPeriodNumber: number; year: number }>({
    queryKey: ["/api/pay-periods/current"],
    enabled: isAuthenticated && !isLoading,
  });
  
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
        <SidebarProvider defaultOpen={true} style={sidebarStyle}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
                <div className="flex items-center gap-4">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <img 
                    src={finniLogo} 
                    alt="Finni Health" 
                    className="h-7"
                    data-testid="img-finni-logo"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <RoleSwitcher />
                  <div className="h-4 w-px bg-border" />
                  <span className="text-sm text-muted-foreground" data-testid="text-current-period">
                    PP{currentPeriod?.payPeriodNumber || 1} {currentPeriod?.year || 2025}
                  </span>
                </div>
              </header>
              <main className="flex-1 overflow-auto">
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

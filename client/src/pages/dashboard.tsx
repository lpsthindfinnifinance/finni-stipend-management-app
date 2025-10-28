import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortfolioCard } from "@/components/portfolio-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/dashboard/summary"],
    enabled: isAuthenticated,
  });

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery({
    queryKey: ["/api/portfolios"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            {role === "PSM" && "Manage your portfolio stipend allocations"}
            {role === "Lead PSM" && "Oversee all portfolio allocations and approvals"}
            {role === "Finance" && "Monitor financial operations and final approvals"}
            {role === "Admin" && "Full system administration and oversight"}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {summaryLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </CardHeader>
                </Card>
              ))}
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Portfolio Cap
                  </CardTitle>
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-semibold" data-testid="text-total-cap">
                    {formatCurrency(summary?.totalCap || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Across all portfolios
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    This Period Allocated
                  </CardTitle>
                  <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-semibold text-blue-600 dark:text-blue-400" data-testid="text-allocated">
                    {formatCurrency(summary?.allocated || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {summary?.utilizationPercent?.toFixed(1) || 0}% utilization
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Approvals
                  </CardTitle>
                  <div className="h-8 w-8 rounded-md bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold" data-testid="text-pending">
                    {summary?.pendingApprovals || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Require your action
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                  <div className="h-8 w-8 rounded-md bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-semibold text-green-600 dark:text-green-400" data-testid="text-available">
                    {formatCurrency(summary?.available || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Remaining to allocate
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Portfolio Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Portfolios</h2>
          {portfoliosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {portfolios?.map((portfolio: any) => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onViewDetails={() => {
                    window.location.href = `/practices?portfolio=${portfolio.id}`;
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity (placeholder for future) */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">
                No recent activity to display
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, DollarSign, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: summary } = useQuery({
    queryKey: ["/api/dashboard/summary"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive reporting and financial analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Portfolio Utilization</CardTitle>
                  <CardDescription>Cross-portfolio analysis</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-semibold mb-2">
                {summary?.utilizationPercent?.toFixed(1) || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                Overall utilization rate
              </p>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Ledger Summary</CardTitle>
                  <CardDescription>Transaction history</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-semibold mb-2">
                {formatCurrency(summary?.allocated || 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                Total allocated this period
              </p>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />
                Export Ledger
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Allocation History</CardTitle>
                  <CardDescription>Inter-PSM transfers</CardDescription>
                </div>
                <div className="h-10 w-10 rounded-md bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold mb-2">
                0
              </div>
              <p className="text-sm text-muted-foreground">
                Total allocations
              </p>
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Download className="h-4 w-4 mr-2" />
                Export History
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Reports</CardTitle>
            <CardDescription>
              Generate comprehensive reports for analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">Advanced reporting coming soon</p>
              <p className="text-sm">
                Detailed analytics, charts, and exportable reports
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

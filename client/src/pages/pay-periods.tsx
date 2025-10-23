import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Upload, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function PayPeriods() {
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

  const { data: currentPeriod } = useQuery({
    queryKey: ["/api/pay-periods/current"],
    enabled: isAuthenticated,
  });

  const { data: periods, isLoading } = useQuery({
    queryKey: ["/api/pay-periods"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (role !== "Finance") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Access restricted to Finance team
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Pay Period Management
          </h1>
          <p className="text-muted-foreground">
            Manage 14-day pay periods and BigQuery data imports
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Pay Period</CardTitle>
                <CardDescription>
                  Pay Period {currentPeriod?.id || 1} of 26 (2025)
                </CardDescription>
              </div>
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPeriod && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentPeriod.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentPeriod.endDate)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" data-testid="button-import-bigquery">
                <Upload className="h-4 w-4 mr-2" />
                Import BigQuery Data
              </Button>
              <Button variant="outline" data-testid="button-trigger-remeasurement">
                <RefreshCw className="h-4 w-4 mr-2" />
                Trigger Remeasurement
              </Button>
              <Button data-testid="button-advance-period">
                Advance to Next Period
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Pay Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading pay periods...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Period</TableHead>
                    <TableHead className="font-medium">Start Date</TableHead>
                    <TableHead className="font-medium">End Date</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Remeasurement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!periods || periods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pay periods found
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods.slice(0, 10).map((period: any) => (
                      <TableRow key={period.id}>
                        <TableCell className="font-semibold">
                          Pay Period {period.id}
                        </TableCell>
                        <TableCell>{formatDate(period.startDate)}</TableCell>
                        <TableCell>{formatDate(period.endDate)}</TableCell>
                        <TableCell>
                          {period.isCurrent ? (
                            <Badge className="bg-primary">Current</Badge>
                          ) : (
                            <Badge variant="secondary">Closed</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {period.remeasurementCompleted ? (
                            <Badge variant="secondary">Completed</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

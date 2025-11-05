import { useEffect, type KeyboardEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function Requests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [, setLocation] = useLocation();

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

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/stipend-requests", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/stipend-requests?requestorId=${user.id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
    enabled: isAuthenticated && !!user,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              My Requests
            </h1>
            <p className="text-muted-foreground">
              View and manage your stipend requests
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/requests/new"; }}
            data-testid="button-new-request"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Request History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading requests...
              </div>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No requests found
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto relative">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Request ID</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Practice</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Type</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Pay Period</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Status</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {requests.map((request: any) => {
                      const handleRowClick = () => setLocation(`/requests/${request.id}`);
                      const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick();
                        }
                      };

                      return (
                        <tr 
                          key={request.id} 
                          data-testid={`row-my-request-${request.id}`}
                          className="border-b transition-colors cursor-pointer hover-elevate"
                          onClick={handleRowClick}
                          onKeyDown={handleKeyDown}
                          tabIndex={0}
                          role="button"
                          aria-label={`View request ${request.id}`}
                        >
                          <td className="p-4 align-middle font-mono">{request.id}</td>
                          <td className="p-4 align-middle">{request.practiceName || request.practiceId}</td>
                          <td className="p-4 align-middle text-right font-mono font-semibold">
                            {formatCurrency(request.amount)}
                          </td>
                          <td className="p-4 align-middle">
                            <StatusBadge status={request.requestType} />
                          </td>
                          <td className="p-4 align-middle text-sm font-medium">
                            {request.requestType === "recurring" && request.effectivePayPeriod && request.recurringEndPeriod
                              ? `PP${request.effectivePayPeriod}'${request.effectiveYear || 2025}-PP${request.recurringEndPeriod}'${request.recurringEndYear || request.effectiveYear || 2025}`
                              : request.effectivePayPeriod
                              ? `PP${request.effectivePayPeriod}'${request.effectiveYear || 2025}`
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className="p-4 align-middle">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="p-4 align-middle text-sm text-muted-foreground">
                            {formatDateTime(request.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

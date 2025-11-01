import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Plus } from "lucide-react";

export default function Requests() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

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
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Request ID</TableHead>
                    <TableHead className="font-medium">Practice</TableHead>
                    <TableHead className="font-medium text-right">Amount</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Pay Period</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!requests || requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request: any) => (
                      <TableRow key={request.id} data-testid={`row-my-request-${request.id}`}>
                        <TableCell className="font-mono">{request.id}</TableCell>
                        <TableCell>{request.practiceName || request.practiceId}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.requestType} />
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {request.requestType === "recurring" && request.effectivePayPeriod && request.recurringEndPeriod
                            ? `PP${request.effectivePayPeriod}-PP${request.recurringEndPeriod}`
                            : request.effectivePayPeriod
                            ? `PP${request.effectivePayPeriod}`
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={request.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(request.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

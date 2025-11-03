import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useLocation } from "wouter";
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

export default function Allocations() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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

  const { data: allocations, isLoading } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: isAuthenticated,
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Allocations
            </h1>
            <p className="text-muted-foreground">
              Transfer stipend budget between practices
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setLocation("/allocations/new")}
              data-testid="button-new-allocation"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allocation History</CardTitle>
            <CardDescription>
              View transfers between practices
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading allocations...
              </div>
            ) : !allocations || (allocations as any[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No allocations yet</p>
                <p className="text-sm">
                  Click "New Allocation" to transfer budget between practices
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-medium">ID</TableHead>
                      <TableHead className="font-medium">Donor PSM</TableHead>
                      <TableHead className="font-medium">Recipient Practices</TableHead>
                      <TableHead className="font-medium">Donor Practices</TableHead>
                      <TableHead className="font-medium text-right">Amount</TableHead>
                      <TableHead className="font-medium">Status</TableHead>
                      <TableHead className="font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allocations as any[]).map((allocation: any) => (
                      <TableRow 
                        key={allocation.id} 
                        className="cursor-pointer hover-elevate"
                        onClick={() => setLocation(`/allocations/${allocation.id}`)}
                        data-testid={`row-allocation-${allocation.id}`}
                      >
                        <TableCell className="font-mono">{allocation.id}</TableCell>
                        <TableCell>{allocation.donorPsmName || allocation.donorPsmId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {allocation.recipientPracticeIds?.length || 0} practices
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {allocation.donorPracticeIds?.length || 0} practices
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(allocation.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={allocation.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(allocation.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
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

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/status-badge";
import { useParams, useLocation, Link } from "wouter";
import { Progress } from "@/components/ui/progress";
import type { StipendRequest } from "@shared/schema";

export default function PracticeDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const practiceId = params.id;

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

  const { data: practice, isLoading: practiceLoading } = useQuery({
    queryKey: ["/api/practices", practiceId],
    enabled: isAuthenticated && !!practiceId,
  });

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["/api/practices", practiceId, "balance"],
    enabled: isAuthenticated && !!practiceId,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ["/api/practices", practiceId, "ledger"],
    enabled: isAuthenticated && !!practiceId,
  });

  const { data: pendingRequests, isLoading: pendingRequestsLoading } = useQuery<StipendRequest[]>({
    queryKey: ["/api/practices", practiceId, "pending-requests"],
    enabled: isAuthenticated && !!practiceId,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const isLoading = practiceLoading || balanceLoading || ledgerLoading || pendingRequestsLoading;

  // Calculate total pending amount
  const totalPendingAmount = (pendingRequests || []).reduce(
    (sum: number, req) => sum + parseFloat(req.amount),
    0
  );

  // Color code based on actual amount sign: negative = red (debit), positive = green (credit)
  const getTransactionColor = (rawAmount: any) => {
    const amount = Number(rawAmount ?? 0);
    if (!Number.isFinite(amount)) {
      return "text-foreground";
    }
    if (amount < 0) {
      return "text-red-600";
    }
    if (amount > 0) {
      return "text-green-600";
    }
    return "text-foreground"; // Zero
  };

  const getTransactionSign = (rawAmount: any) => {
    const amount = Number(rawAmount ?? 0);
    if (!Number.isFinite(amount)) {
      return formatCurrency(0);
    }
    if (amount < 0) {
      return formatCurrency(amount); // Already has negative sign
    }
    if (amount > 0) {
      return `+${formatCurrency(amount)}`;
    }
    return formatCurrency(0);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/practices")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              {(practice as any)?.name || practiceId}
            </h1>
            <p className="text-muted-foreground">
              Practice ID: {(practice as any)?.id} • Portfolio: {(practice as any)?.portfolioId}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading practice details...
          </div>
        ) : (
          <>
            {/* Balance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Stipend Cap */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stipend Cap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold">
                    {formatCurrency((balance as any)?.stipendCap || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Till PP26
                  </p>
                </CardContent>
              </Card>

              {/* Allocated-in and Allocated-out (stacked) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Allocations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency((balance as any)?.allocatedIn || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Allocated-in</p>
                  </div>
                  <div>
                    <div className="text-lg font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {formatCurrency((balance as any)?.allocatedOut || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Allocated-out</p>
                  </div>
                </CardContent>
              </Card>

              {/* Stipend Paid */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stipend Paid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold">
                    {formatCurrency((balance as any)?.stipendPaid || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Approved & disbursed
                  </p>
                </CardContent>
              </Card>

              {/* Stipend Committed */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stipend Committed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold">
                    {formatCurrency((balance as any)?.stipendCommitted || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upcoming Pay Periods
                  </p>
                </CardContent>
              </Card>

              {/* Available Balance (stacked) - Per PP emphasized */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Per Pay Period - Primary/Emphasized */}
                  <div>
                    <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                      {formatCurrency((balance as any)?.availablePerPP || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Per Pay Period</p>
                  </div>
                  {/* Till PP26 - Secondary/Smaller */}
                  <div>
                    <div className="text-sm font-mono font-semibold text-muted-foreground">
                      {formatCurrency((balance as any)?.currentBalance || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Till PP26</p>
                  </div>
                </CardContent>
              </Card>

              {/* % Utilized */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    % Utilized
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold">
                    {(balance as any)?.utilizationPercent?.toFixed(1) || 0}%
                  </div>
                  <Progress 
                    value={(balance as any)?.utilizationPercent || 0} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid + Committed
                  </p>
                </CardContent>
              </Card>

              {/* Pending Requests */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pending Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400" data-testid="text-pending-amount">
                    {formatCurrency(totalPendingAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(pendingRequests || []).length} request{(pendingRequests || []).length !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Pending Requests Table */}
            {(pendingRequests || []).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pending Stipend Requests</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Requests awaiting approval
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-medium">Request ID</TableHead>
                          <TableHead className="font-medium">Submitted</TableHead>
                          <TableHead className="font-medium">Type</TableHead>
                          <TableHead className="font-medium text-right">Amount</TableHead>
                          <TableHead className="font-medium">Approval Stage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pendingRequests || []).map((request) => (
                          <TableRow key={request.id} data-testid={`row-pending-request-${request.id}`}>
                            <TableCell className="font-mono text-sm">
                              <Link 
                                href={`/requests/${request.id}`}
                                className="text-primary hover:underline"
                                data-testid={`link-request-${request.id}`}
                              >
                                #{request.id}
                              </Link>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(request.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {request.stipendType.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold text-orange-600 dark:text-orange-400">
                              {formatCurrency(request.amount)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={request.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ledger Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Ledger History</CardTitle>
                  <Button variant="outline" size="sm" data-testid="button-export-ledger">
                    <FileText className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!ledger || (ledger as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </div>
                ) : (
                  <div className="max-h-[600px] overflow-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-medium">Date</TableHead>
                        <TableHead className="font-medium">Type</TableHead>
                        <TableHead className="font-medium">Description</TableHead>
                        <TableHead className="font-medium text-right">Amount</TableHead>
                        <TableHead className="font-medium text-right">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ledger as any[]).map((entry: any, index: number) => {
                        // Extract request ID from description for paid/committed transactions
                        const requestIdMatch = entry.description?.match(/#(\d+)/);
                        const requestId = requestIdMatch ? requestIdMatch[1] : null;
                        
                        return (
                          <TableRow key={index} data-testid={`row-ledger-${index}`}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(entry.createdAt)}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={entry.transactionType} />
                            </TableCell>
                            <TableCell className="text-sm">
                              {entry.relatedRequestId && requestId ? (
                                <>
                                  {entry.description?.split(`#${requestId}`)[0]}
                                  <Link 
                                    href={`/requests/${entry.relatedRequestId}`}
                                    className="text-primary hover:underline font-mono"
                                    data-testid={`link-ledger-request-${entry.relatedRequestId}`}
                                  >
                                    #{requestId}
                                  </Link>
                                  {entry.description?.split(`#${requestId}`)[1]}
                                </>
                              ) : (
                                entry.description
                              )}
                            </TableCell>
                            <TableCell className={`text-right font-mono font-semibold ${getTransactionColor(entry.amount)}`}>
                              {getTransactionSign(entry.amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(entry.runningBalance)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

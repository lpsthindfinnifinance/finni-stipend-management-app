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

  const { data: practice, isLoading: practiceLoading, error: practiceError } = useQuery({
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

  // Check for 403 (access denied) error
  useEffect(() => {
    if (practiceError) {
      const errorMessage = String(practiceError);
      if (errorMessage.includes("403")) {
        toast({
          title: "Access Denied",
          description: "You can only view practices in your portfolio",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/dashboard");
        }, 1500);
      }
    }
  }, [practiceError, toast, setLocation]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  // If there's a 403 error, show a blank page while redirecting
  if (practiceError && String(practiceError).includes("403")) {
    return <div className="p-8"></div>;
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

  const exportLedgerToCSV = () => {
    if (!ledger || (ledger as any[]).length === 0) {
      toast({
        title: "No Data",
        description: "There are no ledger entries to export",
        variant: "destructive",
      });
      return;
    }

    // CSV Headers
    const headers = [
      "Date",
      "Type",
      "Pay Period",
      "Stipend Type",
      "Stipend Description",
      "Amount",
      "Running Balance",
    ];

    // Convert ledger data to CSV rows
    const rows = (ledger as any[]).map((entry: any) => {
      const amount = Number(entry.amount ?? 0);
      const runningBalance = Number(entry.runningBalance ?? 0);

      return [
        formatDate(entry.createdAt),
        entry.transactionType?.replace(/_/g, ' ') || '',
        entry.payPeriod ? `PP${entry.payPeriod}` : '',
        entry.stipendType?.replace(/_/g, ' ') || '',
        entry.stipendDescription || '',
        amount.toFixed(2), // Raw numeric value with 2 decimal places
        runningBalance.toFixed(2), // Raw numeric value with 2 decimal places
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape cells containing commas, quotes, or newlines
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      )
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const practiceName = (practice as any)?.name || 'practice';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${practiceName}_ledger_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: `Ledger exported to ${filename}`,
    });
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

              {/* Stipend Paid and Committed (stacked) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stipend Paid
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Stipend Paid */}
                  <div>
                    <div className="text-2xl font-mono font-bold">
                      {formatCurrency((balance as any)?.stipendPaid || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Approved & disbursed
                    </p>
                  </div>
                  {/* Stipend Committed */}
                  <div>
                    <div className="text-lg font-mono font-semibold text-muted-foreground">
                      {formatCurrency((balance as any)?.stipendCommitted || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Upcoming Pay Periods</p>
                  </div>
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
                          <TableHead className="font-medium">Pay Period</TableHead>
                          <TableHead className="font-medium text-right">Amount</TableHead>
                          <TableHead className="font-medium">Approval Stage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(pendingRequests || []).map((request) => (
                          <TableRow 
                            key={request.id} 
                            data-testid={`row-pending-request-${request.id}`}
                            className="cursor-pointer hover-elevate"
                            onClick={() => window.location.href = `/requests/${request.id}`}
                          >
                            <TableCell className="font-mono text-sm">
                              #{request.id}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(request.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm capitalize">
                              {request.stipendType.replace(/_/g, ' ')}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {request.requestType === "recurring" && request.effectivePayPeriod && request.recurringEndPeriod
                                ? `PP${request.effectivePayPeriod}-PP${request.recurringEndPeriod}`
                                : request.effectivePayPeriod
                                ? `PP${request.effectivePayPeriod}`
                                : <span className="text-muted-foreground">—</span>
                              }
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportLedgerToCSV}
                    data-testid="button-export-ledger"
                  >
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
                  <div className="max-h-[600px] overflow-auto relative">
                    <table className="w-full caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Date</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Type</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Pay Period</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Stipend Type</th>
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Stipend Description</th>
                          <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Amount</th>
                          <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Running Balance</th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {(ledger as any[]).map((entry: any, index: number) => {
                          const isClickable = !!entry.relatedRequestId || !!entry.relatedAllocationId;
                          const isRequest = !!entry.relatedRequestId;
                          const isAllocation = !!entry.relatedAllocationId;
                          
                          const handleClick = () => {
                            if (isRequest) {
                              window.location.href = `/requests/${entry.relatedRequestId}`;
                            } else if (isAllocation) {
                              window.location.href = `/allocations/${entry.relatedAllocationId}`;
                            }
                          };
                          
                          const testId = isRequest 
                            ? `row-ledger-request-${entry.relatedRequestId}` 
                            : isAllocation 
                            ? `row-ledger-allocation-${entry.relatedAllocationId}` 
                            : `row-ledger-${index}`;
                          
                          return (
                            <tr 
                              key={index} 
                              data-testid={testId}
                              className={`border-b transition-colors ${isClickable ? "cursor-pointer hover-elevate" : ""}`}
                              onClick={isClickable ? handleClick : undefined}
                            >
                              <td className="p-4 align-middle text-sm text-muted-foreground">
                                {formatDate(entry.createdAt)}
                              </td>
                              <td className="p-4 align-middle">
                                <StatusBadge status={entry.transactionType} />
                              </td>
                              <td className="p-4 align-middle text-sm font-medium">
                                {entry.payPeriod ? `PP${entry.payPeriod}` : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="p-4 align-middle text-sm">
                                {entry.stipendType ? (
                                  <StatusBadge status={entry.stipendType} />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-4 align-middle text-sm">
                                {entry.stipendDescription || <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className={`p-4 align-middle text-right font-mono font-semibold ${getTransactionColor(entry.amount)}`}>
                                {getTransactionSign(entry.amount)}
                              </td>
                              <td className="p-4 align-middle text-right font-mono font-semibold">
                                {formatCurrency(entry.runningBalance)}
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
          </>
        )}
      </div>
    </div>
  );
}

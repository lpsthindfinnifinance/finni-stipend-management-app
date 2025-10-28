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
import { useParams, useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";

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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const isLoading = practiceLoading || balanceLoading || ledgerLoading;

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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                    Maximum allocation
                  </p>
                </CardContent>
              </Card>

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
                    Pending approval
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Available Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                    {formatCurrency((balance as any)?.currentBalance || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Can be allocated
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Utilization
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
            </div>

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
                      {(ledger as any[]).map((entry: any, index: number) => (
                        <TableRow key={index} data-testid={`row-ledger-${index}`}>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(entry.createdAt)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={entry.transactionType} />
                          </TableCell>
                          <TableCell className="text-sm">
                            {entry.description}
                          </TableCell>
                          <TableCell className={`text-right font-mono font-semibold ${getTransactionColor(entry.amount)}`}>
                            {getTransactionSign(entry.amount)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            {formatCurrency(entry.runningBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
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

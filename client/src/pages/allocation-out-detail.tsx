import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/status-badge";
import { useParams } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AllocationOutDetail() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();

  const { data: allocation, isLoading } = useQuery<any>({
    queryKey: ["/api/allocations", id],
    enabled: isAuthenticated && !!id,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Loading allocation details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!allocation) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Allocation not found</p>
          </div>
        </div>
      </div>
    );
  }

  const isPracticeToP = allocation.allocationType === "practice_to_practice";

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">
              Outgoing Allocation #{allocation.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created on {formatDate(allocation.createdAt)}
            </p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={allocation.status} />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allocation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-testid="section-type">
                <p className="text-sm text-muted-foreground">Allocation Type</p>
                <p className="font-medium" data-testid="text-allocation-type">
                  {isPracticeToP ? "Practice-to-Practice" : "Inter-Portfolio (Outgoing)"}
                </p>
              </div>

              <div data-testid="section-donor-psm">
                <p className="text-sm text-muted-foreground">Donor PSM</p>
                <p className="font-medium" data-testid="text-donor-psm">
                  {allocation.donorPsmName}
                </p>
              </div>

              <div data-testid="section-total-amount">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-mono font-semibold text-lg" data-testid="text-total-amount">
                  {formatCurrency(parseFloat(allocation.totalAmount))}
                </p>
              </div>

              <div data-testid="section-created-date">
                <p className="text-sm text-muted-foreground">Created On</p>
                <p className="font-medium" data-testid="text-created-date">
                  {formatDate(allocation.createdAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recipient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isPracticeToP ? (
                <div data-testid="section-recipient-practices">
                  <p className="text-sm text-muted-foreground mb-2">Recipient Practices</p>
                  <p className="font-medium" data-testid="text-recipient-count">
                    {allocation.recipientData?.length || 0} practices
                  </p>
                </div>
              ) : (
                <div data-testid="section-recipient-portfolio">
                  <p className="text-sm text-muted-foreground">Recipient Portfolio</p>
                  <p className="font-medium" data-testid="text-recipient-portfolio">
                    {allocation.recipientData?.name || `Portfolio ${allocation.recipientPortfolioId}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Donor Practices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">Practice ID</TableHead>
                  <TableHead className="font-medium">Practice Name</TableHead>
                  <TableHead className="font-medium text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocation.donorPractices && allocation.donorPractices.length > 0 ? (
                  allocation.donorPractices.map((practice: any) => (
                    <TableRow key={practice.id} data-testid={`row-donor-practice-${practice.id}`}>
                      <TableCell className="font-mono">{practice.id}</TableCell>
                      <TableCell>{practice.name}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(practice.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No donor practices
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {isPracticeToP ? (
          <Card>
            <CardHeader>
              <CardTitle>Recipient Practices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Practice ID</TableHead>
                    <TableHead className="font-medium">Practice Name</TableHead>
                    <TableHead className="font-medium text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocation.recipientData && allocation.recipientData.length > 0 ? (
                    allocation.recipientData.map((practice: any) => (
                      <TableRow key={practice.id} data-testid={`row-recipient-practice-${practice.id}`}>
                        <TableCell className="font-mono">{practice.id}</TableCell>
                        <TableCell>{practice.name}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(practice.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No recipient practices
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recipient Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div data-testid="section-portfolio-details">
                  <p className="text-sm text-muted-foreground">Portfolio Name</p>
                  <p className="font-medium text-lg" data-testid="text-portfolio-name">
                    {allocation.recipientData?.name || `Portfolio ${allocation.recipientPortfolioId}`}
                  </p>
                </div>
                <div data-testid="section-portfolio-amount">
                  <p className="text-sm text-muted-foreground">Amount Allocated</p>
                  <p className="font-mono font-semibold text-lg" data-testid="text-portfolio-amount">
                    {formatCurrency(parseFloat(allocation.totalAmount))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/status-badge";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { StipendRequestWithDetails } from "@shared/schema";

export default function StipendRequestDetail() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: request, isLoading } = useQuery<StipendRequestWithDetails>({
    queryKey: ["/api/stipend-requests", id],
    enabled: isAuthenticated && !!id,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-muted-foreground">Request not found</p>
          <Button onClick={() => setLocation("/")} className="mt-4" data-testid="button-return-dashboard">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const getApprovalIcon = (stage: string) => {
    const status = request.status;
    
    if (status === "rejected") {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    
    if (stage === "psm" && request.psmApprovedAt) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (stage === "lead_psm" && request.leadPsmApprovedAt) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (stage === "finance" && request.financeApprovedAt) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    
    return <Clock className="h-5 w-5 text-muted-foreground" />;
  };

  const getApprovalStatus = (stage: string) => {
    const status = request.status;
    
    if (status === "rejected") {
      return "Rejected";
    }
    
    if (stage === "psm") {
      return request.psmApprovedAt ? "Approved" : status === "pending_psm" ? "Pending" : "Not Started";
    }
    if (stage === "lead_psm") {
      return request.leadPsmApprovedAt ? "Approved" : status === "pending_lead_psm" ? "Pending" : "Not Started";
    }
    if (stage === "finance") {
      return request.financeApprovedAt ? "Approved" : status === "pending_finance" ? "Pending" : "Not Started";
    }
    
    return "Not Started";
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
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
            Stipend Request #{request.id}
          </h1>
          <p className="text-sm text-muted-foreground">
            Submitted on {formatDate(request.createdAt)}
          </p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={request.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Request Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="section-requestor">
              <p className="text-sm text-muted-foreground">Requested By</p>
              <p className="font-medium" data-testid="text-requestor-name">
                {request.requestor?.name || "Unknown"}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-requestor-email">
                {request.requestor?.email || ""}
              </p>
            </div>

            <div data-testid="section-practice">
              <p className="text-sm text-muted-foreground">Practice</p>
              <p className="font-medium" data-testid="text-practice-name">
                {request.practice?.clinicName || request.practiceId}
              </p>
            </div>

            <div data-testid="section-amount">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-mono font-bold text-primary" data-testid="text-amount">
                {formatCurrency(request.amount)}
              </p>
            </div>

            <div data-testid="section-type">
              <p className="text-sm text-muted-foreground">Stipend Type</p>
              <Badge variant="secondary" className="capitalize" data-testid="badge-stipend-type">
                {request.stipendType.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div data-testid="section-request-type">
              <p className="text-sm text-muted-foreground">Request Type</p>
              <Badge variant="outline" className="capitalize" data-testid="badge-request-type">
                {request.requestType === "one_time" ? "One-Time" : "Recurring"}
              </Badge>
              {request.requestType === "recurring" && request.recurringEndPeriod && (
                <p className="text-sm text-muted-foreground mt-1">
                  Until PP{request.recurringEndPeriod}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Justification Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Justification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap" data-testid="text-justification">
              {request.justification}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* PSM Approval */}
            <div className="flex gap-4" data-testid="section-psm-approval">
              <div className="flex-shrink-0 mt-1">
                {getApprovalIcon("psm")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">PSM Approval</p>
                  <Badge 
                    variant={request.psmApprovedAt ? "default" : "secondary"}
                    data-testid="badge-psm-status"
                  >
                    {getApprovalStatus("psm")}
                  </Badge>
                </div>
                {request.psmApprovedAt && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p data-testid="text-psm-approver">
                      Approved by {request.psmApprover?.name || "Unknown"}
                    </p>
                    <p data-testid="text-psm-date">
                      on {formatDate(request.psmApprovedAt)}
                    </p>
                    {request.psmComment && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm" data-testid="text-psm-comment">
                        <span className="font-medium">Comment: </span>
                        {request.psmComment}
                      </div>
                    )}
                  </div>
                )}
                {!request.psmApprovedAt && request.status === "pending_psm" && (
                  <p className="text-sm text-muted-foreground">
                    Awaiting approval
                  </p>
                )}
              </div>
            </div>

            {/* Lead PSM Approval */}
            <div className="flex gap-4" data-testid="section-lead-psm-approval">
              <div className="flex-shrink-0 mt-1">
                {getApprovalIcon("lead_psm")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">Lead PSM Approval</p>
                  <Badge 
                    variant={request.leadPsmApprovedAt ? "default" : "secondary"}
                    data-testid="badge-lead-psm-status"
                  >
                    {getApprovalStatus("lead_psm")}
                  </Badge>
                </div>
                {request.leadPsmApprovedAt && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p data-testid="text-lead-psm-approver">
                      Approved by {request.leadPsmApprover?.name || "Unknown"}
                    </p>
                    <p data-testid="text-lead-psm-date">
                      on {formatDate(request.leadPsmApprovedAt)}
                    </p>
                    {request.leadPsmComment && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm" data-testid="text-lead-psm-comment">
                        <span className="font-medium">Comment: </span>
                        {request.leadPsmComment}
                      </div>
                    )}
                  </div>
                )}
                {!request.leadPsmApprovedAt && request.status === "pending_lead_psm" && (
                  <p className="text-sm text-muted-foreground">
                    Awaiting approval
                  </p>
                )}
              </div>
            </div>

            {/* Finance Approval */}
            <div className="flex gap-4" data-testid="section-finance-approval">
              <div className="flex-shrink-0 mt-1">
                {getApprovalIcon("finance")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">Finance Approval</p>
                  <Badge 
                    variant={request.financeApprovedAt ? "default" : "secondary"}
                    data-testid="badge-finance-status"
                  >
                    {getApprovalStatus("finance")}
                  </Badge>
                </div>
                {request.financeApprovedAt && (
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p data-testid="text-finance-approver">
                      Approved by {request.financeApprover?.name || "Unknown"}
                    </p>
                    <p data-testid="text-finance-date">
                      on {formatDate(request.financeApprovedAt)}
                    </p>
                    {request.financeComment && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm" data-testid="text-finance-comment">
                        <span className="font-medium">Comment: </span>
                        {request.financeComment}
                      </div>
                    )}
                  </div>
                )}
                {!request.financeApprovedAt && request.status === "pending_finance" && (
                  <p className="text-sm text-muted-foreground">
                    Awaiting approval
                  </p>
                )}
              </div>
            </div>

            {/* Rejection Info */}
            {request.status === "rejected" && (
              <div className="mt-6 p-4 bg-destructive/10 rounded-md border border-destructive/20" data-testid="section-rejection">
                <div className="flex gap-2 items-start">
                  <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-destructive">Request Rejected</p>
                    {request.rejectedBy && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Rejected by {request.rejectedBy} on {formatDate(request.rejectedAt)}
                      </p>
                    )}
                    {request.rejectionReason && (
                      <p className="text-sm mt-2" data-testid="text-rejection-reason">
                        Reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

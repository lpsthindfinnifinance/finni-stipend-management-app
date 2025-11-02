import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, XCircle, CheckCircle, Trash2 } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { StatusBadge } from "@/components/status-badge";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { StipendRequestWithDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function StipendRequestDetail() {
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [approvalComment, setApprovalComment] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: request, isLoading } = useQuery<StipendRequestWithDetails>({
    queryKey: ["/api/stipend-requests", id],
    enabled: isAuthenticated && !!id,
  });

  const { data: payPeriodBreakdown, isLoading: isLoadingBreakdown } = useQuery<any[]>({
    queryKey: ["/api/stipend-requests", id, "pay-period-breakdown"],
    enabled: isAuthenticated && !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ comment }: { comment?: string }) => {
      return await apiRequest("POST", `/api/stipend-requests/${id}/approve`, { comment });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      setIsApproveDialogOpen(false);
      setApprovalComment("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ reason }: { reason: string }) => {
      return await apiRequest("POST", `/api/stipend-requests/${id}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      setIsRejectDialogOpen(false);
      setRejectionReason("");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to reject request",
        variant: "destructive",
      });
    },
  });

  const cancelPeriodMutation = useMutation({
    mutationFn: async ({ payPeriod }: { payPeriod: number }) => {
      return await apiRequest("POST", `/api/stipend-requests/${id}/cancel-period`, { payPeriod });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Committed period cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests", id, "pay-period-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to cancel committed period",
        variant: "destructive",
      });
    },
  });

  const markPeriodPaidMutation = useMutation({
    mutationFn: async ({ payPeriod }: { payPeriod: number }) => {
      return await apiRequest("POST", `/api/stipend-requests/${id}/mark-period-paid`, { payPeriod });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Period marked as paid successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests", id, "pay-period-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to mark period as paid",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/stipend-requests/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      setIsDeleteDialogOpen(false);
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete request",
        variant: "destructive",
      });
    },
  });

  const canApprove = () => {
    if (!request) return false;
    if (role === "Lead PSM" && request.status === "pending_lead_psm") return true;
    if ((role === "Finance" || role === "Admin") && request.status === "pending_finance") return true;
    if (role === "Admin") return true;
    return false;
  };

  const canDelete = () => {
    if (!request) return false;
    const allowedStatuses = ['pending_psm', 'pending_lead_psm'];
    return allowedStatuses.includes(request.status);
  };

  const handleApprove = () => {
    setIsApproveDialogOpen(true);
  };

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate();
  };

  const confirmApprove = () => {
    if (approvalComment.trim() && approvalComment.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Comment must be at least 5 characters if provided",
        variant: "destructive",
      });
      return;
    }
    approveMutation.mutate({
      comment: approvalComment.trim() || undefined,
    });
  };

  const handleReject = () => {
    setIsRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({
      reason: rejectionReason,
    });
  };

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
        <div className="ml-auto flex items-center gap-3">
          <StatusBadge status={request.status} />
          {canApprove() && request.status !== "approved" && request.status !== "rejected" && (
            <div className="flex gap-2">
              <Button
                variant="default"
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                data-testid="button-approve"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                data-testid="button-reject"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
          {canDelete() && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
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

            <div data-testid="section-stipend-description">
              <p className="text-sm text-muted-foreground">Stipend Description</p>
              <p className="text-sm" data-testid="text-stipend-description">
                {request.stipendDescription || "—"}
              </p>
            </div>

            {request.staffEmails && (
              <div data-testid="section-staff-emails">
                <p className="text-sm text-muted-foreground">Staff Emails</p>
                <p className="text-sm" data-testid="text-staff-emails">
                  {request.staffEmails}
                </p>
              </div>
            )}

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

      {/* Pay Period Breakdown Card */}
      {request && (request.requestType === 'recurring' || payPeriodBreakdown) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pay Period Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingBreakdown ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading breakdown...
              </div>
            ) : !payPeriodBreakdown || payPeriodBreakdown.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No pay period breakdown available
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto relative">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Pay Period</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Amount</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Status</th>
                      <th className="h-12 px-4 text-center align-middle font-medium text-muted-foreground sticky top-0 bg-card z-50 border-b">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {payPeriodBreakdown.map((period: any) => (
                      <tr 
                        key={period.payPeriod} 
                        className="border-b transition-colors"
                        data-testid={`row-period-${period.payPeriod}`}
                      >
                        <td className="p-4 align-middle font-medium">
                          PP{period.payPeriod}
                        </td>
                        <td className="p-4 align-middle text-right font-mono font-semibold">
                          {formatCurrency(period.amount)}
                        </td>
                        <td className="p-4 align-middle">
                          <Badge 
                            variant={
                              period.status === 'paid' ? 'default' : 
                              period.status === 'committed' ? 'secondary' : 
                              period.status === 'cancelled' ? 'destructive' : 
                              'outline'
                            }
                            data-testid={`badge-status-${period.payPeriod}`}
                          >
                            {period.status === 'paid' ? 'Paid' : 
                             period.status === 'committed' ? 'Committed' : 
                             period.status === 'cancelled' ? 'Cancelled' : 
                             'Pending'}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle text-center">
                          {period.status === 'committed' && (role === 'Finance' || role === 'Admin') && (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => markPeriodPaidMutation.mutate({ payPeriod: period.payPeriod })}
                                disabled={markPeriodPaidMutation.isPending}
                                data-testid={`button-mark-paid-${period.payPeriod}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mark as Paid
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelPeriodMutation.mutate({ payPeriod: period.payPeriod })}
                                disabled={cancelPeriodMutation.isPending}
                                data-testid={`button-cancel-${period.payPeriod}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approval Timeline Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
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
                      on {formatDateTime(request.leadPsmApprovedAt)}
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
                      on {formatDateTime(request.financeApprovedAt)}
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

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              You are about to approve this stipend request. You can optionally add a comment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment (optional)</Label>
              <Textarea
                id="approval-comment"
                placeholder="Add a comment..."
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                data-testid="textarea-approval-comment"
              />
              {approvalComment.trim() && approvalComment.trim().length < 5 && (
                <p className="text-sm text-destructive">
                  Comment must be at least 5 characters
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false);
                setApprovalComment("");
              }}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={
                approveMutation.isPending ||
                (approvalComment.trim().length > 0 && approvalComment.trim().length < 5)
              }
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this stipend request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                data-testid="textarea-rejection-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete">
          <DialogHeader>
            <DialogTitle>Delete Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stipend request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

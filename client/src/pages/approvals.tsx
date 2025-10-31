import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CheckCircle, XCircle } from "lucide-react";
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

export default function Approvals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);

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

  const { data: pendingRequests, isLoading: pendingLoading } = useQuery<any[]>({
    queryKey: ["/api/stipend-requests/pending"],
    enabled: isAuthenticated,
  });

  const { data: approvedRequests, isLoading: approvedLoading } = useQuery<any[]>({
    queryKey: ["/api/stipend-requests/approved"],
    enabled: isAuthenticated,
  });

  const { data: rejectedRequests, isLoading: rejectedLoading } = useQuery<any[]>({
    queryKey: ["/api/stipend-requests/rejected"],
    enabled: isAuthenticated,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: number; comment?: string }) => {
      return await apiRequest("POST", `/api/stipend-requests/${requestId}/approve`, { comment });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
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
    mutationFn: async ({ requestId, reason }: { requestId: number; reason: string }) => {
      return await apiRequest("POST", `/api/stipend-requests/${requestId}/reject`, { reason });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Request rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
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

  const handleApprove = (request: any) => {
    setSelectedRequest(request);
    setIsApproveDialogOpen(true);
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
      requestId: selectedRequest.id,
      comment: approvalComment.trim() || undefined,
    });
  };

  const handleReject = (request: any) => {
    setSelectedRequest(request);
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
      requestId: selectedRequest.id,
      reason: rejectionReason,
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const canApprove = (request: any) => {
    if (role === "Lead PSM" && request.status === "pending_lead_psm") return true;
    if ((role === "Finance" || role === "Admin") && request.status === "pending_finance") return true;
    // Admin can approve at any level
    if (role === "Admin") return true;
    return false;
  };

  const RequestsTable = ({ requests, showActions = false }: any) => (
    <div className="max-h-[600px] overflow-auto">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="font-medium">Request ID</TableHead>
          <TableHead className="font-medium">Practice</TableHead>
          <TableHead className="font-medium">Requestor</TableHead>
          <TableHead className="font-medium text-right">Amount</TableHead>
          <TableHead className="font-medium">Type</TableHead>
          <TableHead className="font-medium">Stipend Description</TableHead>
          <TableHead className="font-medium">Status</TableHead>
          <TableHead className="font-medium">Submitted</TableHead>
          {showActions && <TableHead className="font-medium text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests?.length === 0 ? (
          <TableRow>
            <TableCell colSpan={showActions ? 9 : 8} className="text-center py-8 text-muted-foreground">
              No requests found
            </TableCell>
          </TableRow>
        ) : (
          requests?.map((request: any) => (
            <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
              <TableCell className="font-mono">{request.id}</TableCell>
              <TableCell>{request.practiceName || request.practiceId}</TableCell>
              <TableCell>{request.requestorName || request.requestorId}</TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatCurrency(request.amount)}
              </TableCell>
              <TableCell>
                <StatusBadge status={request.requestType} />
              </TableCell>
              <TableCell className="text-sm">
                {request.stipendDescription || <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell>
                <StatusBadge status={request.status} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDateTime(request.createdAt)}
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  {canApprove(request) && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApprove(request)}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(request)}
                        disabled={rejectMutation.isPending}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Approvals
          </h1>
          <p className="text-muted-foreground">
            Review and approve stipend requests
          </p>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingRequests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedRequests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedRequests?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pendingLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading requests...
                  </div>
                ) : (
                  <RequestsTable requests={pendingRequests} showActions />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Approved Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {approvedLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading requests...
                  </div>
                ) : (
                  <RequestsTable requests={approvedRequests} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Rejected Requests</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {rejectedLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading requests...
                  </div>
                ) : (
                  <RequestsTable requests={rejectedRequests} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Approve Dialog */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Request</DialogTitle>
              <DialogDescription>
                You can add an optional comment to document your approval decision.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="approval-comment">Approval Comment (Optional)</Label>
                <Textarea
                  id="approval-comment"
                  placeholder="Add a comment about your approval decision... (minimum 5 characters if provided)"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={4}
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
                variant="default"
                onClick={confirmApprove}
                disabled={approveMutation.isPending || (approvalComment.trim().length > 0 && approvalComment.trim().length < 5)}
                data-testid="button-confirm-approve"
              >
                Approve Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this stipend request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  placeholder="Provide a detailed reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
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
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmReject}
                disabled={rejectMutation.isPending}
                data-testid="button-confirm-reject"
              >
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

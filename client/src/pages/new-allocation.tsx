import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PracticeAmount {
  practiceId: string;
  amount: number;
  amountInput?: string; // Track raw input string for editing
}

interface PreviewDonorPractice {
  practiceId: string;
  practiceName: string;
  amount: number;
  portfolioId: string;
  currentBalance: number;
  balanceAfter: number;
}

interface AllocationPreview {
  donorPractices: PreviewDonorPractice[];
  totalAvailable: number;
  hasSufficientBalance: boolean;
}

export default function NewAllocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  const [recipientPractices, setRecipientPractices] = useState<PracticeAmount[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("");
  const [recipientAmount, setRecipientAmount] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [comment, setComment] = useState<string>("");

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

  // Fetch recipient practices:
  // - For PSM: practices in their portfolio
  // - For Lead PSM/Finance/Admin: all practices
  const { data: portfolioPractices, isLoading: isLoadingRecipientPractices } = useQuery({
    queryKey: user?.role === "Lead PSM" || user?.role === "Finance" || user?.role === "Admin" 
      ? ["/api/practices"] 
      : user?.portfolioId 
        ? [`/api/practices?portfolio=${user.portfolioId}`] 
        : ["/api/practices"],
    enabled: isAuthenticated,
  });

  // Calculate total recipient amount
  const totalRecipientAmount = recipientPractices.reduce((sum, p) => sum + p.amount, 0);

  // Fetch preview of pro-rata distribution
  const { data: previewData, isLoading: isLoadingPreview } = useQuery<AllocationPreview>({
    queryKey: ["/api/allocations/preview", totalRecipientAmount, recipientPractices.map(p => p.practiceId).sort()],
    queryFn: async () => {
      const recipientIds = recipientPractices.map(p => p.practiceId).join(',');
      const response = await fetch(`/api/allocations/preview?totalAmount=${totalRecipientAmount}&recipientPracticeIds=${encodeURIComponent(recipientIds)}`);
      if (!response.ok) {
        throw new Error("Failed to fetch allocation preview");
      }
      return response.json();
    },
    enabled: isAuthenticated && totalRecipientAmount > 0,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/allocations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Allocation created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      setLocation("/allocations");
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
        description: error.message || "Failed to create allocation",
        variant: "destructive",
      });
    },
  });

  const handleAddRecipient = () => {
    setFormError("");

    // Validate practice selection
    if (!selectedPracticeId) {
      setFormError("Please select a practice");
      return;
    }

    // Validate amount
    const amount = parseFloat(recipientAmount);
    if (isNaN(amount) || amount <= 0) {
      setFormError("Amount must be greater than 0");
      return;
    }

    // Check for duplicates
    const isDuplicate = recipientPractices.some(p => p.practiceId === selectedPracticeId);
    if (isDuplicate) {
      setFormError("This practice has already been added");
      return;
    }

    // Add to array with both numeric and string representations
    setRecipientPractices([...recipientPractices, { 
      practiceId: selectedPracticeId, 
      amount,
      amountInput: recipientAmount 
    }]);
    
    // Clear form
    setSelectedPracticeId("");
    setRecipientAmount("");
  };

  const handleRemoveRecipient = (practiceId: string) => {
    setRecipientPractices(recipientPractices.filter(p => p.practiceId !== practiceId));
  };

  const handleUpdateRecipientAmount = (practiceId: string, rawValue: string) => {
    // Preserve the raw input string for smooth editing
    // Parse to number for validation and calculations
    const amount = rawValue === "" ? 0 : parseFloat(rawValue);
    
    setRecipientPractices(
      recipientPractices.map(p => 
        p.practiceId === practiceId 
          ? { ...p, amount: isNaN(amount) ? 0 : amount, amountInput: rawValue } 
          : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate recipients
    if (recipientPractices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one recipient practice",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidRecipientAmounts = recipientPractices.some(p => p.amount <= 0);
    if (hasInvalidRecipientAmounts) {
      toast({
        title: "Validation Error",
        description: "All recipient practices must have an amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate sufficient balance
    if (!previewData?.hasSufficientBalance) {
      toast({
        title: "Validation Error",
        description: "Insufficient balance to complete allocation",
        variant: "destructive",
      });
      return;
    }

    // Strip UI-only fields before submission
    const cleanedRecipients = recipientPractices.map(({ practiceId, amount }) => ({
      practiceId,
      amount,
    }));

    submitMutation.mutate({
      recipientPractices: cleanedRecipients,
      comment: comment.trim() || undefined, // Only include if not empty
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  // Sort function: Portfolio (G1-G5) first, then Practice ID
  const sortPractices = (a: any, b: any) => {
    // First sort by portfolio
    const portfolioA = a.portfolioId || '';
    const portfolioB = b.portfolioId || '';
    if (portfolioA !== portfolioB) {
      return portfolioA.localeCompare(portfolioB);
    }
    // Then sort by practice ID
    return (a.id || '').localeCompare(b.id || '');
  };

  // Get available recipient practices and sort
  const availableRecipientPractices = (portfolioPractices as any[] || []).sort(sortPractices);

  // Get practices that haven't been added yet
  const unselectedPractices = availableRecipientPractices.filter(
    practice => !recipientPractices.some(p => p.practiceId === practice.id)
  );

  // Check for validation errors
  const hasZeroOrNegative = recipientPractices.some(rp => rp.amount <= 0);
  const hasInsufficientBalance = previewData && !previewData.hasSufficientBalance;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setLocation("/allocations")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              New Allocation
            </h1>
            <p className="text-muted-foreground">
              Transfer stipend cap to practices with automatic pro-rata distribution
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Recipient Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Recipient Practices</CardTitle>
                <CardDescription>
                  Select a practice and enter an amount to add to the allocation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingRecipientPractices ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" data-testid="spinner-loading-recipient-practices" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="practice-select">Practice</Label>
                        <Select
                          value={selectedPracticeId}
                          onValueChange={setSelectedPracticeId}
                        >
                          <SelectTrigger id="practice-select" data-testid="select-practice">
                            <SelectValue placeholder="Select a practice..." />
                          </SelectTrigger>
                          <SelectContent>
                            {unselectedPractices.map((practice: any) => (
                              <SelectItem 
                                key={practice.id} 
                                value={practice.id}
                                data-testid={`select-item-practice-${practice.id}`}
                              >
                                {practice.name} ({practice.id}) - {practice.portfolioId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount-input">Amount</Label>
                        <Input
                          id="amount-input"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={recipientAmount}
                          onChange={(e) => setRecipientAmount(e.target.value)}
                          data-testid="input-amount"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    {formError && (
                      <Alert variant="destructive" data-testid="alert-form-error">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{formError}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      type="button"
                      onClick={handleAddRecipient}
                      disabled={!selectedPracticeId || !recipientAmount}
                      data-testid="button-add-recipient"
                    >
                      Add Recipient
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Selected Recipients Table */}
            {recipientPractices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selected Recipients</CardTitle>
                  <CardDescription>
                    Review and edit recipient practices and amounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-medium">Practice Name</TableHead>
                        <TableHead className="font-medium">Portfolio</TableHead>
                        <TableHead className="font-medium text-right">Amount</TableHead>
                        <TableHead className="font-medium w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipientPractices.map((recipient) => {
                        const practice = availableRecipientPractices.find(
                          (p: any) => p.id === recipient.practiceId
                        );
                        return (
                          <TableRow key={recipient.practiceId} data-testid={`row-selected-recipient-${recipient.practiceId}`}>
                            <TableCell>
                              {practice?.name} ({practice?.id})
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">{practice?.portfolioId}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={recipient.amountInput ?? recipient.amount}
                                onChange={(e) => handleUpdateRecipientAmount(recipient.practiceId, e.target.value)}
                                className="max-w-[150px] ml-auto text-right font-mono"
                                data-testid={`input-edit-amount-${recipient.practiceId}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveRecipient(recipient.practiceId)}
                                data-testid={`button-remove-${recipient.practiceId}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t">
                    <span className="text-sm font-medium">Total Recipient Amount</span>
                    <span className="font-mono font-semibold text-lg" data-testid="text-selected-total">
                      {formatCurrency(totalRecipientAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Optional Comment */}
            {recipientPractices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Comment (Optional)</CardTitle>
                  <CardDescription>
                    Add an optional comment to explain the purpose of this allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="e.g., Rebalancing for Q1 2025, Supporting new hires, etc."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    data-testid="textarea-comment"
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {comment.length} characters
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contributor Practices Preview */}
            {previewData && previewData.donorPractices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Contributor Practices (Auto-Calculated)</CardTitle>
                  <CardDescription>
                    Pro-rata distribution based on available balances
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-medium">Practice</TableHead>
                          <TableHead className="font-medium">Portfolio</TableHead>
                          <TableHead className="font-medium text-right">Balance Before</TableHead>
                          <TableHead className="font-medium text-right">Allocation Amount</TableHead>
                          <TableHead className="font-medium text-right">Balance After</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.donorPractices.map((donor: PreviewDonorPractice) => (
                          <TableRow key={donor.practiceId} data-testid={`row-contributor-${donor.practiceId}`}>
                            <TableCell>
                              {donor.practiceName} ({donor.practiceId})
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">{donor.portfolioId}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(donor.currentBalance)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(donor.amount)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(donor.balanceAfter)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-4 border-t">
                    <span className="text-sm font-medium">Total Allocation Amount</span>
                    <span className="font-mono font-semibold text-lg" data-testid="text-contributor-total">
                      {formatCurrency(previewData.donorPractices.reduce((sum, d) => sum + d.amount, 0))}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Balance Validation Alert */}
            {hasInsufficientBalance && previewData && (
              <Alert variant="destructive" data-testid="alert-insufficient-balance">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Insufficient balance. Available: {formatCurrency(previewData.totalAvailable)}, Required: {formatCurrency(totalRecipientAmount)}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={
                  recipientPractices.length === 0 ||
                  totalRecipientAmount <= 0 || 
                  hasZeroOrNegative || 
                  hasInsufficientBalance ||
                  submitMutation.isPending
                }
                data-testid="button-submit-allocation"
              >
                {submitMutation.isPending ? "Creating..." : "Create Allocation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/allocations")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Summary Panel */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Allocation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recipient Practices</span>
                    <span className="font-semibold" data-testid="text-recipient-count">{recipientPractices.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Recipient Amount</span>
                    <span className="font-mono font-semibold" data-testid="text-recipient-total">
                      {formatCurrency(totalRecipientAmount)}
                    </span>
                  </div>
                  {previewData && previewData.donorPractices.length > 0 && (
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">Auto-Calculated Contributors</span>
                      <span className="font-semibold" data-testid="text-contributor-count">{previewData.donorPractices.length}</span>
                    </div>
                  )}
                </div>

                {isLoadingPreview && totalRecipientAmount > 0 ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" data-testid="spinner-loading-preview" />
                  </div>
                ) : hasZeroOrNegative && recipientPractices.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      All amounts must be greater than 0
                    </AlertDescription>
                  </Alert>
                ) : hasInsufficientBalance ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Insufficient balance available
                    </AlertDescription>
                  </Alert>
                ) : totalRecipientAmount > 0 && previewData?.hasSufficientBalance ? (
                  <Alert data-testid="alert-ready">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Allocation ready to submit
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add practices and amounts to begin
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}

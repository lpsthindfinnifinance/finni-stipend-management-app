import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

interface DonorPractice {
  practiceId: string;
  amount: number;
}

export default function NewAllocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user, role } = useAuth();
  
  const [recipientPsmId, setRecipientPsmId] = useState("");
  const [donorPractices, setDonorPractices] = useState<DonorPractice[]>([]);

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

  // Fetch donor PSM's practices
  const { data: myPractices } = useQuery({
    queryKey: ["/api/practices/my"],
    enabled: isAuthenticated && user?.role === "PSM",
  });

  // Fetch all PSMs for recipient selection
  const { data: allUsers } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAuthenticated,
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

  const handleTogglePractice = (practiceId: string, maxAmount: number) => {
    const existing = donorPractices.find(p => p.practiceId === practiceId);
    if (existing) {
      // Remove practice
      setDonorPractices(donorPractices.filter(p => p.practiceId !== practiceId));
    } else {
      // Add practice with 0 amount initially
      setDonorPractices([...donorPractices, { practiceId, amount: 0 }]);
    }
  };

  const handleUpdateAmount = (practiceId: string, rawValue: string) => {
    // Parse the value and ensure it's a valid number (not NaN)
    const amount = parseFloat(rawValue);
    const validAmount = isNaN(amount) || amount < 0 ? 0 : amount;
    
    setDonorPractices(
      donorPractices.map(p => 
        p.practiceId === practiceId ? { ...p, amount: validAmount } : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientPsmId) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient PSM",
        variant: "destructive",
      });
      return;
    }

    if (donorPractices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one donor practice",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidAmounts = donorPractices.some(p => p.amount <= 0);
    if (hasInvalidAmounts) {
      toast({
        title: "Validation Error",
        description: "All selected practices must have an amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = donorPractices.reduce((sum, p) => sum + p.amount, 0);

    submitMutation.mutate({
      donorPsmId: user?.id,
      recipientPsmId,
      totalAmount,
      donorPracticeIds: donorPractices.map(p => p.practiceId),
      donorPractices, // Include amounts for each practice
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const totalAmount = donorPractices.reduce((sum, p) => sum + p.amount, 0);
  const otherPsms = (allUsers as any[] || []).filter((u: any) => 
    u.role === "PSM" && u.id !== user?.id
  );

  // Check for validation errors
  const hasZeroOrNegative = donorPractices.some(dp => dp.amount <= 0);
  const hasBalanceErrors = donorPractices.some(dp => {
    const practice = (myPractices as any[] || []).find((p: any) => p.id === dp.practiceId);
    const availableBalance = Number(practice?.currentBalance || 0);
    return dp.amount > availableBalance;
  });

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
              New Inter-PSM Allocation
            </h1>
            <p className="text-muted-foreground">
              Transfer stipend budget to another PSM
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recipient Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Recipient PSM</CardTitle>
                <CardDescription>
                  Select the PSM who will receive the allocated budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient *</Label>
                  <Select value={recipientPsmId} onValueChange={setRecipientPsmId}>
                    <SelectTrigger id="recipient" data-testid="select-recipient">
                      <SelectValue placeholder="Select a PSM" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherPsms.map((psm: any) => (
                        <SelectItem key={psm.id} value={psm.id}>
                          {psm.fullName || psm.email} (Portfolio: {psm.portfolioId || "N/A"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Donor Practices Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Donor Practices</CardTitle>
                <CardDescription>
                  Choose practices from your portfolio to allocate from
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!myPractices || (myPractices as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No practices available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="font-medium">Practice</TableHead>
                        <TableHead className="font-medium text-right">Available Balance</TableHead>
                        <TableHead className="font-medium text-right">Amount to Allocate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(myPractices as any[]).map((practice: any) => {
                        const isSelected = donorPractices.some(p => p.practiceId === practice.id);
                        const selectedPractice = donorPractices.find(p => p.practiceId === practice.id);
                        const availableBalance = practice.currentBalance || 0;

                        const hasError = isSelected && selectedPractice && selectedPractice.amount > availableBalance;

                        return (
                          <TableRow key={practice.id} data-testid={`row-practice-${practice.id}`}>
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleTogglePractice(practice.id, availableBalance)}
                                data-testid={`checkbox-practice-${practice.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              {practice.name} ({practice.id})
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatCurrency(availableBalance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {isSelected ? (
                                <div className="flex flex-col items-end gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={availableBalance}
                                    value={selectedPractice?.amount || ''}
                                    onChange={(e) => handleUpdateAmount(practice.id, e.target.value)}
                                    className={`max-w-[150px] ml-auto text-right font-mono ${hasError ? 'border-red-500' : ''}`}
                                    data-testid={`input-amount-${practice.id}`}
                                  />
                                  {hasError && (
                                    <span className="text-xs text-red-600">
                                      Exceeds balance
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={role === "Finance" || !recipientPsmId || donorPractices.length === 0 || totalAmount <= 0 || hasZeroOrNegative || hasBalanceErrors || submitMutation.isPending}
                data-testid="button-submit-allocation"
              >
                {submitMutation.isPending ? "Creating..." : "Create Allocation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/allocations")}
              >
                Cancel
              </Button>
            </div>
            
            {role === "Finance" && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Finance users can view allocations but cannot create them.
                </AlertDescription>
              </Alert>
            )}
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
                    <span className="text-muted-foreground">Practices Selected</span>
                    <span className="font-semibold">{donorPractices.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {hasZeroOrNegative ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      All amounts must be greater than 0
                    </AlertDescription>
                  </Alert>
                ) : hasBalanceErrors ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      One or more amounts exceed available balance
                    </AlertDescription>
                  </Alert>
                ) : totalAmount > 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Allocation ready to submit
                    </AlertDescription>
                  </Alert>
                ) : donorPractices.length > 0 ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please specify amounts for selected practices
                    </AlertDescription>
                  </Alert>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select practices to begin
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

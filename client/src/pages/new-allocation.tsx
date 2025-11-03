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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PracticeAmount {
  practiceId: string;
  amount: number;
}

type AllocationType = "practice_to_practice" | "inter_portfolio";

export default function NewAllocation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, user, role } = useAuth();
  
  const [allocationType, setAllocationType] = useState<AllocationType>("practice_to_practice");
  const [recipientPortfolioId, setRecipientPortfolioId] = useState("");
  const [donorPractices, setDonorPractices] = useState<PracticeAmount[]>([]);
  const [recipientPractices, setRecipientPractices] = useState<PracticeAmount[]>([]);

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

  // Fetch donor PSM's practices (or all practices for Finance/Admin)
  const { data: myPractices } = useQuery({
    queryKey: user?.role === "Finance" || user?.role === "Admin" ? ["/api/practices"] : ["/api/practices/my"],
    enabled: isAuthenticated,
  });

  // Fetch all practices in the same portfolio for recipient selection (practice-to-practice)
  const { data: portfolioPractices } = useQuery({
    queryKey: user?.portfolioId ? [`/api/practices?portfolio=${user.portfolioId}`] : ["/api/practices"],
    enabled: isAuthenticated && allocationType === "practice_to_practice",
  });

  // Fetch all portfolios for recipient selection (inter-portfolio)
  // Always fetch to have data ready when user switches to inter-portfolio mode
  // Use lightweight /list endpoint for dropdown (avoids expensive summary calculations)
  const { data: allPortfolios } = useQuery({
    queryKey: ["/api/portfolios/list"],
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

  const handleToggleDonorPractice = (practiceId: string) => {
    const existing = donorPractices.find(p => p.practiceId === practiceId);
    if (existing) {
      setDonorPractices(donorPractices.filter(p => p.practiceId !== practiceId));
    } else {
      setDonorPractices([...donorPractices, { practiceId, amount: 0 }]);
    }
  };

  const handleUpdateDonorAmount = (practiceId: string, rawValue: string) => {
    const amount = parseFloat(rawValue);
    const validAmount = isNaN(amount) || amount < 0 ? 0 : amount;
    setDonorPractices(
      donorPractices.map(p => 
        p.practiceId === practiceId ? { ...p, amount: validAmount } : p
      )
    );
  };

  const handleToggleRecipientPractice = (practiceId: string) => {
    const existing = recipientPractices.find(p => p.practiceId === practiceId);
    if (existing) {
      setRecipientPractices(recipientPractices.filter(p => p.practiceId !== practiceId));
    } else {
      setRecipientPractices([...recipientPractices, { practiceId, amount: 0 }]);
    }
  };

  const handleUpdateRecipientAmount = (practiceId: string, rawValue: string) => {
    const amount = parseFloat(rawValue);
    const validAmount = isNaN(amount) || amount < 0 ? 0 : amount;
    setRecipientPractices(
      recipientPractices.map(p => 
        p.practiceId === practiceId ? { ...p, amount: validAmount } : p
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate donor practices
    if (donorPractices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one donor practice",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidDonorAmounts = donorPractices.some(p => p.amount <= 0);
    if (hasInvalidDonorAmounts) {
      toast({
        title: "Validation Error",
        description: "All selected donor practices must have an amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Validate balance limits
    const hasBalanceErrors = donorPractices.some(dp => {
      const practice = (myPractices as any[] || []).find((p: any) => p.id === dp.practiceId);
      const availableBalance = Number(practice?.currentBalance || 0);
      return dp.amount > availableBalance;
    });

    if (hasBalanceErrors) {
      toast({
        title: "Validation Error",
        description: "One or more amounts exceed available practice balance",
        variant: "destructive",
      });
      return;
    }

    // Validate recipient based on allocation type
    if (allocationType === "practice_to_practice") {
      if (recipientPractices.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one recipient practice",
          variant: "destructive",
        });
        return;
      }

      const hasInvalidRecipientAmounts = recipientPractices.some(p => p.amount <= 0);
      if (hasInvalidRecipientAmounts) {
        toast({
          title: "Validation Error",
          description: "All selected recipient practices must have an amount greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Check that total donor amounts match total recipient amounts
      const totalDonor = donorPractices.reduce((sum, p) => sum + p.amount, 0);
      const totalRecipient = recipientPractices.reduce((sum, p) => sum + p.amount, 0);
      
      if (Math.abs(totalDonor - totalRecipient) > 0.01) {
        toast({
          title: "Validation Error",
          description: `Total donor amount (${formatCurrency(totalDonor)}) must equal total recipient amount (${formatCurrency(totalRecipient)})`,
          variant: "destructive",
        });
        return;
      }
    }

    if (allocationType === "inter_portfolio" && !recipientPortfolioId) {
      toast({
        title: "Validation Error",
        description: "Please select a recipient portfolio",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = donorPractices.reduce((sum, p) => sum + p.amount, 0);

    submitMutation.mutate({
      allocationType,
      donorPsmId: user?.id,
      recipientPracticeIds: allocationType === "practice_to_practice" ? recipientPractices.map(p => p.practiceId) : undefined,
      recipientPortfolioId: allocationType === "inter_portfolio" ? recipientPortfolioId : undefined,
      totalAmount,
      donorPracticeIds: donorPractices.map(p => p.practiceId),
      donorPractices, // Include amounts for each practice
      recipientPractices: allocationType === "practice_to_practice" ? recipientPractices : undefined,
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const totalDonorAmount = donorPractices.reduce((sum, p) => sum + p.amount, 0);
  const totalRecipientAmount = recipientPractices.reduce((sum, p) => sum + p.amount, 0);
  
  // Filter portfolios - exclude current user's portfolio for inter-portfolio
  const availablePortfolios = (allPortfolios as any[] || []).filter((p: any) => 
    p.id !== user?.portfolioId
  );

  // Get available recipient practices (exclude practices already selected as donors)
  const availableRecipientPractices = (portfolioPractices as any[] || []).filter((p: any) => 
    !donorPractices.some(dp => dp.practiceId === p.id)
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
            {/* Allocation Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Allocation Type</CardTitle>
                <CardDescription>
                  Choose how you want to allocate stipend budget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={allocationType} 
                  onValueChange={(value) => {
                    setAllocationType(value as AllocationType);
                    // Reset recipient selections when changing type
                    setRecipientPractices([]);
                    setRecipientPortfolioId("");
                  }}
                  data-testid="radio-allocation-type"
                >
                  <div className="flex items-start space-x-3 space-y-0 p-4 border rounded-lg hover-elevate">
                    <RadioGroupItem value="practice_to_practice" id="practice_to_practice" data-testid="radio-practice-to-practice" />
                    <div className="flex-1">
                      <Label htmlFor="practice_to_practice" className="font-semibold cursor-pointer">
                        Practice-to-Practice
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allocate directly to another PSM's practices within your portfolio
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-y-0 p-4 border rounded-lg hover-elevate">
                    <RadioGroupItem value="inter_portfolio" id="inter_portfolio" data-testid="radio-inter-portfolio" />
                    <div className="flex-1">
                      <Label htmlFor="inter_portfolio" className="font-semibold cursor-pointer">
                        Inter-Portfolio
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Allocate to another portfolio's suspense account. The recipient portfolio's Lead PSM will distribute funds to their practices.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Recipient Selection - Only show for inter_portfolio */}
            {allocationType === "inter_portfolio" && (
              <Card>
                <CardHeader>
                  <CardTitle>Recipient Portfolio</CardTitle>
                  <CardDescription>
                    Select the portfolio whose suspense account will receive the funds
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="recipient">Recipient Portfolio *</Label>
                    <Select value={recipientPortfolioId} onValueChange={setRecipientPortfolioId}>
                      <SelectTrigger id="recipient" data-testid="select-recipient-portfolio">
                        <SelectValue placeholder="Select a portfolio" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePortfolios.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            No other portfolios available
                          </div>
                        ) : (
                          availablePortfolios.map((portfolio: any) => (
                            <SelectItem key={portfolio.id} value={portfolio.id}>
                              {portfolio.name} ({portfolio.id})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

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
                                onCheckedChange={() => handleToggleDonorPractice(practice.id)}
                                data-testid={`checkbox-donor-practice-${practice.id}`}
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
                                    onChange={(e) => handleUpdateDonorAmount(practice.id, e.target.value)}
                                    className={`max-w-[150px] ml-auto text-right font-mono ${hasError ? 'border-red-500' : ''}`}
                                    data-testid={`input-donor-amount-${practice.id}`}
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

            {/* Recipient Practices Selection - Only for practice_to_practice */}
            {allocationType === "practice_to_practice" && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Recipient Practices</CardTitle>
                  <CardDescription>
                    Choose practices within your portfolio to receive the allocated budget
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!availableRecipientPractices || availableRecipientPractices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {donorPractices.length > 0 
                        ? "No additional practices available (donor practices excluded)"
                        : "No practices available"}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead className="font-medium">Practice</TableHead>
                          <TableHead className="font-medium text-right">Current Balance</TableHead>
                          <TableHead className="font-medium text-right">Amount to Receive</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {availableRecipientPractices.map((practice: any) => {
                          const isSelected = recipientPractices.some(p => p.practiceId === practice.id);
                          const selectedPractice = recipientPractices.find(p => p.practiceId === practice.id);
                          const currentBalance = practice.availableBalance || 0;

                          return (
                            <TableRow key={practice.id} data-testid={`row-recipient-practice-${practice.id}`}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleRecipientPractice(practice.id)}
                                  data-testid={`checkbox-recipient-practice-${practice.id}`}
                                />
                              </TableCell>
                              <TableCell>
                                {practice.name} ({practice.id})
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold text-muted-foreground">
                                {formatCurrency(currentBalance)}
                              </TableCell>
                              <TableCell className="text-right">
                                {isSelected ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={selectedPractice?.amount || ''}
                                    onChange={(e) => handleUpdateRecipientAmount(practice.id, e.target.value)}
                                    className="max-w-[150px] ml-auto text-right font-mono"
                                    data-testid={`input-recipient-amount-${practice.id}`}
                                  />
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
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={
                  (allocationType === "practice_to_practice" && recipientPractices.length === 0) ||
                  (allocationType === "inter_portfolio" && !recipientPortfolioId) ||
                  donorPractices.length === 0 || 
                  totalDonorAmount <= 0 || 
                  hasZeroOrNegative || 
                  hasBalanceErrors || 
                  (allocationType === "practice_to_practice" && Math.abs(totalDonorAmount - totalRecipientAmount) > 0.01) ||
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
                    <span className="text-muted-foreground">Donor Practices</span>
                    <span className="font-semibold">{donorPractices.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Donor Amount</span>
                    <span className="font-mono font-semibold">
                      {formatCurrency(totalDonorAmount)}
                    </span>
                  </div>
                  {allocationType === "practice_to_practice" && (
                    <>
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Recipient Practices</span>
                        <span className="font-semibold">{recipientPractices.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Recipient Amount</span>
                        <span className={`font-mono font-semibold ${Math.abs(totalDonorAmount - totalRecipientAmount) > 0.01 ? 'text-red-600' : ''}`}>
                          {formatCurrency(totalRecipientAmount)}
                        </span>
                      </div>
                      {Math.abs(totalDonorAmount - totalRecipientAmount) > 0.01 && totalDonorAmount > 0 && totalRecipientAmount > 0 && (
                        <div className="text-xs text-red-600 pt-1">
                          Amounts must match
                        </div>
                      )}
                    </>
                  )}
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
                ) : totalDonorAmount > 0 ? (
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

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign } from "lucide-react";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/formatters";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";

export default function Allocations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading, role, user } = useAuth();
  
  const [suspenseDialogOpen, setSuspenseDialogOpen] = useState(false);
  const [selectedPractices, setSelectedPractices] = useState<Array<{practiceId: string, amount: number}>>([]);

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

  const { data: allocations, isLoading } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: isAuthenticated,
  });

  // Fetch suspense balance for Lead PSM
  const { data: suspenseData } = useQuery({
    queryKey: ["/api/portfolios", user?.portfolioId, "suspense"],
    enabled: isAuthenticated && role === "Lead PSM" && !!user?.portfolioId,
  });

  // Fetch portfolio practices for Lead PSM
  const { data: portfolioPractices } = useQuery({
    queryKey: ["/api/practices/my"],
    enabled: isAuthenticated && role === "Lead PSM",
  });

  const allocateSuspenseMutation = useMutation({
    mutationFn: async (data: { practiceAllocations: Array<{practiceId: string, amount: number}> }) => {
      return await apiRequest("POST", `/api/portfolios/${user?.portfolioId}/allocate-from-suspense`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Suspense funds allocated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", user?.portfolioId, "suspense"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      setSuspenseDialogOpen(false);
      setSelectedPractices([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to allocate suspense funds",
        variant: "destructive",
      });
    },
  });

  const handleTogglePractice = (practiceId: string) => {
    const existing = selectedPractices.find(p => p.practiceId === practiceId);
    if (existing) {
      setSelectedPractices(selectedPractices.filter(p => p.practiceId !== practiceId));
    } else {
      setSelectedPractices([...selectedPractices, { practiceId, amount: 0 }]);
    }
  };

  const handleUpdateAmount = (practiceId: string, rawValue: string) => {
    const amount = parseFloat(rawValue);
    const validAmount = isNaN(amount) || amount < 0 ? 0 : amount;
    
    setSelectedPractices(
      selectedPractices.map(p => 
        p.practiceId === practiceId ? { ...p, amount: validAmount } : p
      )
    );
  };

  const handleSubmitSuspenseAllocation = () => {
    if (selectedPractices.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one practice",
        variant: "destructive",
      });
      return;
    }

    const hasInvalidAmounts = selectedPractices.some(p => p.amount <= 0);
    if (hasInvalidAmounts) {
      toast({
        title: "Validation Error",
        description: "All amounts must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Explicit validation: ensure total doesn't exceed suspense balance
    const totalAmount = selectedPractices.reduce((sum, p) => sum + p.amount, 0);
    const suspenseBalance = (suspenseData as any)?.suspenseBalance || 0;
    
    if (totalAmount > suspenseBalance) {
      toast({
        title: "Validation Error",
        description: `Total amount ($${totalAmount.toFixed(2)}) exceeds available suspense balance ($${suspenseBalance.toFixed(2)})`,
        variant: "destructive",
      });
      return;
    }

    allocateSuspenseMutation.mutate({
      practiceAllocations: selectedPractices,
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const suspenseBalance = (suspenseData as any)?.suspenseBalance || 0;
  const totalSelectedAmount = selectedPractices.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Inter-PSM Allocations
            </h1>
            <p className="text-muted-foreground">
              Transfer stipend budget between PSMs and portfolios
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setLocation("/allocations/new")}
              data-testid="button-new-allocation"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Allocation
            </Button>
          </div>
        </div>

        {/* Suspense Balance Card for Lead PSM */}
        {role === "Lead PSM" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Portfolio Suspense Account
              </CardTitle>
              <CardDescription>
                Funds received from inter-portfolio allocations that need to be distributed to your practices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Suspense Balance</p>
                  <p className="text-3xl font-mono font-bold" data-testid="text-suspense-balance">
                    {formatCurrency(suspenseBalance)}
                  </p>
                </div>
                {suspenseBalance > 0 && (
                  <Dialog open={suspenseDialogOpen} onOpenChange={setSuspenseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-allocate-suspense">
                        Allocate to Practices
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Allocate Suspense to Practices</DialogTitle>
                        <DialogDescription>
                          Distribute suspense funds to practices in your portfolio
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Available Suspense</span>
                            <span className="font-mono font-semibold">{formatCurrency(suspenseBalance)}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-2">
                            <span className="text-muted-foreground">Total Selected</span>
                            <span className="font-mono font-semibold">{formatCurrency(totalSelectedAmount)}</span>
                          </div>
                          {totalSelectedAmount > suspenseBalance && (
                            <p className="text-xs text-red-600 mt-2">
                              Total exceeds available suspense balance
                            </p>
                          )}
                        </div>

                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead className="font-medium">Practice</TableHead>
                              <TableHead className="font-medium text-right">Amount to Allocate</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(portfolioPractices as any[] || []).map((practice: any) => {
                              const isSelected = selectedPractices.some(p => p.practiceId === practice.id);
                              const selectedPractice = selectedPractices.find(p => p.practiceId === practice.id);

                              return (
                                <TableRow key={practice.id} data-testid={`row-suspense-practice-${practice.id}`}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleTogglePractice(practice.id)}
                                      data-testid={`checkbox-suspense-practice-${practice.id}`}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    {practice.name} ({practice.id})
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {isSelected ? (
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={suspenseBalance}
                                        value={selectedPractice?.amount || ''}
                                        onChange={(e) => handleUpdateAmount(practice.id, e.target.value)}
                                        className="max-w-[150px] ml-auto text-right font-mono"
                                        data-testid={`input-suspense-amount-${practice.id}`}
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

                        <div className="flex gap-3 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSuspenseDialogOpen(false);
                              setSelectedPractices([]);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitSuspenseAllocation}
                            disabled={
                              selectedPractices.length === 0 ||
                              totalSelectedAmount <= 0 ||
                              totalSelectedAmount > suspenseBalance ||
                              allocateSuspenseMutation.isPending
                            }
                            data-testid="button-submit-suspense-allocation"
                          >
                            {allocateSuspenseMutation.isPending ? "Allocating..." : "Allocate Funds"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Allocation History</CardTitle>
            <CardDescription>
              View transfers between Practice Success Managers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading allocations...
              </div>
            ) : !allocations || (allocations as any[]).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-2">No allocations yet</p>
                <p className="text-sm">
                  Click "New Allocation" to transfer budget between PSMs
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">ID</TableHead>
                    <TableHead className="font-medium">Type</TableHead>
                    <TableHead className="font-medium">Donor PSM</TableHead>
                    <TableHead className="font-medium">Recipient</TableHead>
                    <TableHead className="font-medium">Practices</TableHead>
                    <TableHead className="font-medium text-right">Amount</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(allocations as any[]).map((allocation: any) => {
                    const isPracticeToP = allocation.allocationType === "practice_to_practice";
                    const recipientDisplay = isPracticeToP 
                      ? (allocation.recipientPsmName || allocation.recipientPsmId)
                      : `Portfolio ${allocation.recipientPortfolioId} (Suspense)`;
                    
                    return (
                      <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                        <TableCell className="font-mono">{allocation.id}</TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-1 rounded bg-muted">
                            {isPracticeToP ? "Practice-to-Practice" : "Inter-Portfolio"}
                          </span>
                        </TableCell>
                        <TableCell>{allocation.donorPsmName || allocation.donorPsmId}</TableCell>
                        <TableCell>{recipientDisplay}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {allocation.donorPracticeIds?.length || 0} practices
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {formatCurrency(allocation.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={allocation.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(allocation.createdAt)}
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
      </div>
    </div>
  );
}

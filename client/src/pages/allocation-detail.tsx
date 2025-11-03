import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, X } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/status-badge";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PracticeAllocation {
  practiceId: string;
  practiceName: string;
  amount: string;
}

export default function AllocationDetail() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [selectedPractices, setSelectedPractices] = useState<PracticeAllocation[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string>("");

  const { data: allocation, isLoading } = useQuery<any>({
    queryKey: ["/api/allocations", id],
    enabled: isAuthenticated && !!id,
  });

  // Fetch practices for the user's portfolio (for distribution)
  const { data: practices = [] } = useQuery<any[]>({
    queryKey: ["/api/practices/my"],
    enabled: isAuthenticated && !!user?.portfolioId,
  });

  const distributeMutation = useMutation({
    mutationFn: async (data: { allocationId: string; practices: { practiceId: string; amount: number }[] }) => {
      return await apiRequest("POST", `/api/allocations/${data.allocationId}/distribute`, { practices: data.practices });
    },
    onSuccess: () => {
      toast({
        title: "Funds Distributed",
        description: "The funds have been successfully distributed to the selected practices.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/allocations"] });
      setSelectedPractices([]);
      window.history.back();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Distribution Failed",
        description: error.message || "Failed to distribute funds. Please try again.",
      });
    },
  });

  const handleAddPractice = () => {
    if (!selectedPracticeId) return;
    
    const practice = practices.find((p: any) => p.id === selectedPracticeId);
    if (!practice) return;
    
    // Check if practice is already added
    if (selectedPractices.some(p => p.practiceId === selectedPracticeId)) {
      toast({
        variant: "destructive",
        title: "Practice Already Added",
        description: "This practice has already been added to the distribution list.",
      });
      return;
    }
    
    setSelectedPractices([...selectedPractices, {
      practiceId: practice.id,
      practiceName: practice.name,
      amount: "",
    }]);
    setSelectedPracticeId("");
  };

  const handleRemovePractice = (practiceId: string) => {
    setSelectedPractices(selectedPractices.filter(p => p.practiceId !== practiceId));
  };

  const handleAmountChange = (practiceId: string, value: string) => {
    setSelectedPractices(selectedPractices.map(p => 
      p.practiceId === practiceId ? { ...p, amount: value } : p
    ));
  };

  const handleDistribute = () => {
    if (selectedPractices.length === 0) {
      toast({
        variant: "destructive",
        title: "No Practices Selected",
        description: "Please select at least one practice to distribute funds to.",
      });
      return;
    }

    // Validate each practice amount
    for (const practice of selectedPractices) {
      const amount = parseFloat(practice.amount);
      
      if (!practice.amount || practice.amount.trim() === "") {
        toast({
          variant: "destructive",
          title: "Missing Amount",
          description: `Please enter an amount for ${practice.practiceName}.`,
        });
        return;
      }

      if (isNaN(amount)) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: `Amount for ${practice.practiceName} must be a valid number.`,
        });
        return;
      }

      if (amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: `Amount for ${practice.practiceName} must be greater than zero.`,
        });
        return;
      }
    }

    const totalDistributed = selectedPractices.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const availableAmount = parseFloat(allocation.totalAmount);

    if (Math.abs(totalDistributed - availableAmount) > 0.01) {
      toast({
        variant: "destructive",
        title: "Amount Mismatch",
        description: `Total distributed amount (${formatCurrency(totalDistributed)}) must equal available amount (${formatCurrency(availableAmount)}).`,
      });
      return;
    }

    const practicesData = selectedPractices.map(p => ({
      practiceId: p.practiceId,
      amount: parseFloat(p.amount),
    }));

    distributeMutation.mutate({
      allocationId: id!,
      practices: practicesData,
    });
  };

  const totalDistributed = selectedPractices.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const availableAmount = allocation ? parseFloat(allocation.totalAmount) : 0;
  const remainingAmount = availableAmount - totalDistributed;

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
  const isInterPortfolio = allocation.allocationType === "inter_portfolio";
  // Check if this is an incoming inter-portfolio allocation (user's portfolio is the recipient)
  const isIncoming = isInterPortfolio && user?.portfolioId === allocation.recipientPortfolioId;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
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
              Allocation #{allocation.id} {isIncoming && "(Incoming)"}
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
          {/* Allocation Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Allocation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-testid="section-type">
                <p className="text-sm text-muted-foreground">Allocation Type</p>
                <p className="font-medium" data-testid="text-allocation-type">
                  {isPracticeToP ? "Practice-to-Practice" : "Inter-Portfolio"}
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

          {/* Recipient/Sender Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isIncoming ? "Sender Information" : "Recipient Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isIncoming ? (
                <>
                  <div data-testid="section-sender-portfolio">
                    <p className="text-sm text-muted-foreground">Sender Portfolio</p>
                    <p className="font-medium" data-testid="text-sender-portfolio">
                      {allocation.donorPortfolio || "Unknown"}
                    </p>
                  </div>
                  <div data-testid="section-sender-practices">
                    <p className="text-sm text-muted-foreground">Sender Practices</p>
                    <p className="font-medium" data-testid="text-sender-practices-count">
                      {allocation.donorPractices?.length || 0} practices
                    </p>
                  </div>
                </>
              ) : isPracticeToP ? (
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

        {/* Donor/Sender Practices Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isIncoming ? "Sender Practices" : "Donor Practices"}
            </CardTitle>
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
                    <TableRow key={practice.id} data-testid={`row-${isIncoming ? 'sender' : 'donor'}-practice-${practice.id}`}>
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
                      No {isIncoming ? "sender" : "donor"} practices
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Recipient Practices/Portfolio Table */}
        {isIncoming ? (
          // For incoming allocations, show a distribute funds form
          <Card>
            <CardHeader>
              <CardTitle>Distribute Received Funds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div data-testid="section-incoming-details">
                  <p className="text-sm text-muted-foreground">
                    These funds have been received in your portfolio's suspense account. 
                    Allocate them to practices within your portfolio below.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div data-testid="section-available-amount">
                    <p className="text-sm text-muted-foreground">Available Amount</p>
                    <p className="font-mono font-semibold text-lg" data-testid="text-available-amount">
                      {formatCurrency(availableAmount)}
                    </p>
                  </div>
                  <div data-testid="section-distributed-amount">
                    <p className="text-sm text-muted-foreground">Total Distributed</p>
                    <p className="font-mono font-semibold text-lg" data-testid="text-distributed-amount">
                      {formatCurrency(totalDistributed)}
                    </p>
                  </div>
                  <div data-testid="section-remaining-amount">
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className={`font-mono font-semibold text-lg ${Math.abs(remainingAmount) < 0.01 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} data-testid="text-remaining-amount">
                      {formatCurrency(remainingAmount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Add Practices to Distribution</Label>
                  <div className="flex gap-2">
                    <Select value={selectedPracticeId} onValueChange={setSelectedPracticeId}>
                      <SelectTrigger className="flex-1" data-testid="select-practice">
                        <SelectValue placeholder="Select a practice" />
                      </SelectTrigger>
                      <SelectContent>
                        {practices.filter((p: any) => !selectedPractices.some(sp => sp.practiceId === p.id)).map((practice: any) => (
                          <SelectItem key={practice.id} value={practice.id}>
                            {practice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAddPractice} 
                      disabled={!selectedPracticeId}
                      data-testid="button-add-practice"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {selectedPractices.length > 0 && (
                  <div className="space-y-3">
                    <Label>Distribution List</Label>
                    <div className="space-y-2">
                      {selectedPractices.map((practice) => (
                        <div key={practice.practiceId} className="flex gap-2 items-center bg-muted/50 p-3 rounded-md" data-testid={`row-distribution-${practice.practiceId}`}>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{practice.practiceName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{practice.practiceId}</p>
                          </div>
                          <div className="w-40">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Amount"
                              value={practice.amount}
                              onChange={(e) => handleAmountChange(practice.practiceId, e.target.value)}
                              data-testid={`input-amount-${practice.practiceId}`}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemovePractice(practice.practiceId)}
                            data-testid={`button-remove-${practice.practiceId}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleDistribute}
                    disabled={selectedPractices.length === 0 || Math.abs(remainingAmount) > 0.01 || distributeMutation.isPending}
                    data-testid="button-submit-distribution"
                    className="flex-1"
                  >
                    {distributeMutation.isPending ? "Distributing..." : "Distribute Funds"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isPracticeToP ? (
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

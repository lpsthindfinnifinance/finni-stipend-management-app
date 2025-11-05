import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/formatters";
import { AlertCircle, CheckCircle2, Check, ChevronsUpDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";

export default function NewRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading, user, role } = useAuth();
  
  const [practiceId, setPracticeId] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [requestType, setRequestType] = useState("one_time");
  const [stipendType, setStipendType] = useState("lease_stipend");
  const [stipendDescription, setStipendDescription] = useState("");
  const [staffEmails, setStaffEmails] = useState("");
  const [effectivePeriodYear, setEffectivePeriodYear] = useState<string | undefined>(undefined); // Format: "22-2025"
  const [recurringEndPeriodYear, setRecurringEndPeriodYear] = useState<string | undefined>(undefined); // Format: "26-2025"
  const [justification, setJustification] = useState("");

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

  const { data: practices = [] } = useQuery<any[]>({
    queryKey: ["/api/practices/my"],
    enabled: isAuthenticated,
  });

  const { data: practiceBalance } = useQuery<{ practiceId: string; available: number }>({
    queryKey: ["/api/practices", practiceId, "balance"],
    enabled: !!practiceId,
  });

  const { data: currentPayPeriod } = useQuery<{ id: number; payPeriodNumber: number; year: number }>({
    queryKey: ["/api/pay-periods/current"],
    enabled: isAuthenticated,
  });

  // Generate all available pay periods starting from current period
  const availablePeriods: { value: string; label: string; periodNum: number; year: number }[] = [];
  if (currentPayPeriod) {
    const currentPPNum = currentPayPeriod.payPeriodNumber;
    const currentYear = currentPayPeriod.year;
    
    // Add remaining periods in current year
    for (let pp = currentPPNum + 1; pp <= 26; pp++) {
      availablePeriods.push({
        value: `${pp}-${currentYear}`,
        label: `PP${pp}'${currentYear}`,
        periodNum: pp,
        year: currentYear
      });
    }
    
    // Add all periods in next year
    for (let pp = 1; pp <= 26; pp++) {
      availablePeriods.push({
        value: `${pp}-${currentYear + 1}`,
        label: `PP${pp}'${currentYear + 1}`,
        periodNum: pp,
        year: currentYear + 1
      });
    }
  }

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/stipend-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Stipend request submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests"] });
      // Reset form
      setPracticeId("");
      setPracticeOpen(false);
      setAmount("");
      setStipendType("lease_stipend");
      setStipendDescription("");
      setStaffEmails("");
      setRequestType("one_time");
      setEffectivePeriodYear(undefined);
      setRecurringEndPeriodYear(undefined);
      setJustification("");
      window.location.href = "/requests";
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
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!practiceId || !amount || !justification || !effectivePeriodYear) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (justification.length < 10) {
      toast({
        title: "Validation Error",
        description: "Justification must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }

    if (!stipendDescription || stipendDescription.trim().length < 5) {
      toast({
        title: "Validation Error",
        description: "Stipend description must be at least 5 characters",
        variant: "destructive",
      });
      return;
    }

    if (stipendType === "staff_cost_reimbursement" && (!staffEmails || staffEmails.trim().length < 5)) {
      toast({
        title: "Validation Error",
        description: "Staff emails must be at least 5 characters",
        variant: "destructive",
      });
      return;
    }

    if (requestType === "recurring" && !recurringEndPeriodYear) {
      toast({
        title: "Validation Error",
        description: "Please select an end pay period for recurring stipends",
        variant: "destructive",
      });
      return;
    }

    const numAmount = parseFloat(amount);
    if (practiceBalance && numAmount > practiceBalance.available) {
      toast({
        title: "Validation Error",
        description: "Amount exceeds available balance",
        variant: "destructive",
      });
      return;
    }

    // Parse the period-year format
    const [effectivePP, effectiveYr] = effectivePeriodYear.split('-').map(Number);
    const recurringData = recurringEndPeriodYear ? recurringEndPeriodYear.split('-').map(Number) : [null, null];
    
    submitMutation.mutate({
      practiceId,
      requestorId: user?.id,
      amount,
      stipendType,
      stipendDescription: stipendDescription.trim(),
      staffEmails: stipendType === "staff_cost_reimbursement" ? staffEmails.trim() : null,
      requestType,
      effectivePayPeriod: effectivePP,
      effectiveYear: effectiveYr,
      recurringEndPeriod: requestType === "recurring" && recurringData[0] ? recurringData[0] : null,
      recurringEndYear: requestType === "recurring" && recurringData[1] ? recurringData[1] : null,
      justification,
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const numAmount = parseFloat(amount) || 0;
  const isValid = numAmount > 0 && practiceBalance && numAmount <= practiceBalance.available;
  

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Submit Stipend Request
          </h1>
          <p className="text-muted-foreground">
            Request stipend allocation for a practice in your portfolio
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Details</CardTitle>
                <CardDescription>
                  Provide information about your stipend request
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="practice">Practice *</Label>
                  <Popover open={practiceOpen} onOpenChange={setPracticeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={practiceOpen}
                        className="w-full justify-between font-normal"
                        data-testid="select-practice"
                      >
                        {practiceId
                          ? practices?.find((p: any) => p.id === practiceId)?.name + ` (${practiceId})`
                          : "Select a practice..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search practices..." />
                        <CommandList>
                          <CommandEmpty>No practice found.</CommandEmpty>
                          <CommandGroup>
                            {practices?.map((practice: any) => (
                              <CommandItem
                                key={practice.id}
                                value={`${practice.name} ${practice.id}`}
                                onSelect={() => {
                                  setPracticeId(practice.id);
                                  setPracticeOpen(false);
                                }}
                                data-testid={`practice-option-${practice.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    practiceId === practice.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {practice.name} ({practice.id})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    data-testid="input-amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stipendType">Stipend Type *</Label>
                  <Select value={stipendType} onValueChange={setStipendType}>
                    <SelectTrigger id="stipendType" data-testid="select-stipend-type">
                      <SelectValue placeholder="Select stipend type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lease_stipend">Lease Stipend</SelectItem>
                      <SelectItem value="staff_cost_reimbursement">Staff Cost Reimbursement</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stipendDescription">Stipend Description</Label>
                  <Input
                    id="stipendDescription"
                    type="text"
                    placeholder="Brief description of the stipend..."
                    value={stipendDescription}
                    onChange={(e) => setStipendDescription(e.target.value)}
                    data-testid="input-stipend-description"
                  />
                </div>

                {stipendType === "staff_cost_reimbursement" && (
                  <div className="space-y-2">
                    <Label htmlFor="staffEmails">Staff Email IDs</Label>
                    <Input
                      id="staffEmails"
                      type="text"
                      placeholder="Enter email IDs separated by commas..."
                      value={staffEmails}
                      onChange={(e) => setStaffEmails(e.target.value)}
                      data-testid="input-staff-emails"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter email addresses separated by commas (e.g., john@example.com, jane@example.com)
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Request Type *</Label>
                  <RadioGroup value={requestType} onValueChange={setRequestType}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one_time" id="one_time" data-testid="radio-one-time" />
                      <Label htmlFor="one_time" className="font-normal cursor-pointer">
                        One-time
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recurring" id="recurring" data-testid="radio-recurring" />
                      <Label htmlFor="recurring" className="font-normal cursor-pointer">
                        Recurring
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectivePeriod">
                    {requestType === "recurring" ? "Start Pay Period *" : "Pay Period *"}
                  </Label>
                  <Select value={effectivePeriodYear} onValueChange={setEffectivePeriodYear}>
                    <SelectTrigger id="effectivePeriod" data-testid="select-effective-period">
                      <SelectValue placeholder="Select pay period" />
                    </SelectTrigger>
                    <SelectContent>
                      {!currentPayPeriod || availablePeriods.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">No future pay periods available</div>
                      ) : (
                        availablePeriods.map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {requestType === "recurring" 
                      ? "The pay period when this recurring stipend starts"
                      : "The pay period when this stipend will be paid"
                    }
                  </p>
                </div>

                {requestType === "recurring" && (
                  <div className="space-y-2">
                    <Label htmlFor="endPeriod">End Pay Period *</Label>
                    <Select value={recurringEndPeriodYear} onValueChange={setRecurringEndPeriodYear}>
                      <SelectTrigger id="endPeriod" data-testid="select-end-period">
                        <SelectValue placeholder="Select end period" />
                      </SelectTrigger>
                      <SelectContent>
                        {!currentPayPeriod || availablePeriods.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No future pay periods available</div>
                        ) : (
                          availablePeriods.map((period) => (
                            <SelectItem key={period.value} value={period.value}>
                              {period.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      The last pay period for this recurring stipend
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="justification">
                    Justification * (minimum 10 characters)
                  </Label>
                  <Textarea
                    id="justification"
                    placeholder="Provide a detailed justification for this stipend request..."
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    rows={5}
                    data-testid="textarea-justification"
                  />
                  <p className="text-xs text-muted-foreground">
                    {justification.length}/10 characters
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={!practiceId || !isValid || justification.length < 10 || submitMutation.isPending}
                data-testid="button-submit-request"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { window.location.href = "/requests"; }}
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* Validation Panel */}
          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Balance Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {practiceId && practiceBalance ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Balance</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(practiceBalance.available)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Requested Amount</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(numAmount)}
                        </span>
                      </div>
                      <div className="h-px bg-border my-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Remaining After</span>
                        <span className="font-mono font-semibold">
                          {formatCurrency(practiceBalance.available - numAmount)}
                        </span>
                      </div>
                    </div>

                    {isValid ? (
                      <Alert>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-600">
                          Request is within available balance
                        </AlertDescription>
                      </Alert>
                    ) : numAmount > 0 ? (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Amount exceeds available balance
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Select a practice to view balance
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

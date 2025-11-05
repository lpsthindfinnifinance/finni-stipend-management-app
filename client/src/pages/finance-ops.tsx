import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Calendar, Upload, RefreshCw, AlertCircle, CheckCircle2, FileText, Download, Filter, FileDown } from "lucide-react";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/formatters";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

// Helper function to check if a request should be shown for a specific pay period
function shouldShowRequestForPeriod(req: any, selectedPayPeriod: string): boolean {
  // If "All Periods" is selected, show all requests
  if (selectedPayPeriod === "all") {
    return true;
  }
  
  // Parse the selected period format "22-2025" into period number and year
  const [periodNumStr, yearStr] = selectedPayPeriod.split("-");
  const periodNum = parseInt(periodNumStr);
  const selectedYear = parseInt(yearStr);
  
  // Check if request matches the selected year
  if (req.effectiveYear !== selectedYear) {
    return false;
  }
  
  // Check if request is active for this period based on effectivePayPeriod and recurringEndPeriod
  const isPeriodInRange = req.requestType === "one_time"
    ? req.effectivePayPeriod === periodNum
    : (req.effectivePayPeriod <= periodNum && 
       (!req.recurringEndPeriod || req.recurringEndPeriod >= periodNum));
  
  if (!isPeriodInRange) {
    return false;
  }
  
  // If period is in range, check if it's cancelled in the payment breakdown
  if (req.paymentBreakdown) {
    const periodPayment = req.paymentBreakdown.find((p: any) => p.payPeriod === periodNum && p.year === selectedYear);
    
    // If we found the period breakdown and it's cancelled, exclude it
    if (periodPayment && periodPayment.status?.toLowerCase() === 'cancelled') {
      return false;
    }
  }
  
  return true;
}

export default function FinanceOps() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSetDefaultPeriod = useRef(false);
  
  // Opening Balance import states
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [openingBalanceCsvContent, setOpeningBalanceCsvContent] = useState("");
  const [openingBalanceCsvFileName, setOpeningBalanceCsvFileName] = useState("");
  const openingBalanceFileInputRef = useRef<HTMLInputElement>(null);
  
  // Warning states for CSV import
  const [practicesNotInTable, setPracticesNotInTable] = useState<string[]>([]);
  const [disappearedPractices, setDisappearedPractices] = useState<string[]>([]);
  
  // Filters for stipend requests table
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>("all");
  const [selectedPractice, setSelectedPractice] = useState<string>("all");
  
  // Selection state for bulk payment marking
  const [selectedRequests, setSelectedRequests] = useState<Set<number>>(new Set());

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

  const { data: currentPeriod } = useQuery<any>({
    queryKey: ["/api/pay-periods/current"],
    enabled: isAuthenticated,
  });

  // Set default filter to current pay period (only once on initial load)
  useEffect(() => {
    if (currentPeriod && !hasSetDefaultPeriod.current) {
      setSelectedPayPeriod(`${currentPeriod.payPeriodNumber}-${currentPeriod.year}`);
      hasSetDefaultPeriod.current = true;
    }
  }, [currentPeriod]);

  // Clear selections when pay period filter changes
  useEffect(() => {
    setSelectedRequests(new Set());
  }, [selectedPayPeriod, selectedPractice]);

  // Helper to get period-specific payment status
  const getPeriodStatus = (req: any, periodFilter: string) => {
    // If no breakdown available, use overall status
    if (!req.paymentBreakdown || req.paymentBreakdown.length === 0) {
      return req.isFullyPaid ? "Paid" : "Committed";
    }

    // If showing all periods, check if all non-cancelled periods are paid
    if (periodFilter === "all") {
      const nonCancelledPeriods = req.paymentBreakdown.filter((p: any) => 
        p.status?.toLowerCase() !== 'cancelled'
      );
      
      // If all non-cancelled periods are paid, return "Paid"
      const allPaid = nonCancelledPeriods.length > 0 && 
        nonCancelledPeriods.every((p: any) => p.status?.toLowerCase() === 'paid');
      
      return allPaid ? "Paid" : "Committed";
    }

    // Check if the specific filtered period is paid
    // Parse format "22-2025" into period number and year
    const [periodNumStr, yearStr] = periodFilter.split("-");
    const periodNum = parseInt(periodNumStr);
    const selectedYear = parseInt(yearStr);
    const periodPayment = req.paymentBreakdown.find((p: any) => p.payPeriod === periodNum && p.year === selectedYear);
    
    if (periodPayment) {
      return periodPayment.status === "paid" ? "Paid" : "Committed";
    }

    // If period not found in breakdown (shouldn't happen with proper filtering), default to Committed
    return "Committed";
  };

  const { data: periods, isLoading: periodsLoading } = useQuery<any[]>({
    queryKey: ["/api/pay-periods"],
    enabled: isAuthenticated,
  });

  const { data: allPractices = [] } = useQuery<any[]>({
    queryKey: ["/api/practices/all"],
    enabled: isAuthenticated,
  });

  const { data: allStipendRequests = [], isLoading: stipendsLoading } = useQuery<any[]>({
    queryKey: ["/api/stipend-requests/all-approved"],
    enabled: isAuthenticated,
  });

  const importMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await apiRequest("POST", "/api/pay-periods/import", { csvData });
      return await response.json();
    },
    onSuccess: (data: any) => {
      const balanceMsg = data.openingBalances > 0 ? ` ${data.openingBalances} opening balances created.` : '';
      const remeasureMsg = data.remeasurements > 0 ? ` ${data.remeasurements} remeasurements applied.` : '';
      toast({
        title: "Import Successful",
        description: `${data.imported} practice metrics imported for PP${currentPeriod?.id}.${balanceMsg}${remeasureMsg}`,
      });
      
      // Store warnings for display
      if (data.practicesNotInTable && data.practicesNotInTable.length > 0) {
        setPracticesNotInTable(data.practicesNotInTable);
      }
      if (data.disappearedPractices && data.disappearedPractices.length > 0) {
        setDisappearedPractices(data.disappearedPractices);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/pay-periods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pay-periods/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setShowImportDialog(false);
      setCsvContent("");
      setCsvFileName("");
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV data",
        variant: "destructive",
      });
    },
  });

  const openingBalanceImportMutation = useMutation({
    mutationFn: async (csvData: string) => {
      const response = await apiRequest("POST", "/api/opening-balance/import", { csvData });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Opening Balance Import Successful",
        description: `${data.created} opening balance entries imported. ${data.skipped > 0 ? `${data.skipped} entries skipped.` : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/practices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setShowOpeningBalanceDialog(false);
      setOpeningBalanceCsvContent("");
      setOpeningBalanceCsvFileName("");
    },
    onError: (error: any) => {
      toast({
        title: "Opening Balance Import Failed",
        description: error.message || "Failed to import opening balance data",
        variant: "destructive",
      });
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (periodId: number) => {
      return await apiRequest("POST", `/api/pay-periods/${periodId}/set-current`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Current pay period updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/pay-periods"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pay-periods/current"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update current period",
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ requestIds, payPeriod }: { requestIds: number[], payPeriod: number }) => {
      // Mark each request as paid for the specific pay period
      const promises = requestIds.map(requestId =>
        apiRequest("POST", `/api/stipend-requests/${requestId}/mark-period-paid`, { payPeriod })
      );
      await Promise.all(promises);
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `Marked ${variables.requestIds.length} stipend(s) as paid for PP${variables.payPeriod}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stipend-requests/all-approved"] });
      setSelectedRequests(new Set());
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark stipends as paid",
        variant: "destructive",
      });
    },
  });


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      setCsvFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csvContent) {
      toast({
        title: "No Data",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(csvContent);
  };

  const handleOpeningBalanceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setOpeningBalanceCsvContent(content);
      setOpeningBalanceCsvFileName(file.name);
    };
    reader.readAsText(file);
  };

  const handleOpeningBalanceImport = () => {
    if (!openingBalanceCsvContent) {
      toast({
        title: "No Data",
        description: "Please select a CSV file first",
        variant: "destructive",
      });
      return;
    }
    openingBalanceImportMutation.mutate(openingBalanceCsvContent);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/templates/metrics');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'metrics_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download template",
        variant: "destructive",
      });
    }
  };

  const handleExportStipends = () => {
    const filteredStipends = allStipendRequests.filter((req: any) => {
      const periodMatch = shouldShowRequestForPeriod(req, selectedPayPeriod);
      const practiceMatch = selectedPractice === "all" || req.practiceId === selectedPractice;
      return periodMatch && practiceMatch;
    });

    const headers = [
      "Request ID",
      "Practice ID",
      "Practice Name",
      "Amount",
      "Stipend Type",
      "Description",
      "Request Type",
      "Effective Period",
      "End Period",
      "Status",
      "Requestor",
      "Lead PSM Approver",
      "Lead PSM Approved At",
      "Finance Approver",
      "Finance Approved At",
      "Justification"
    ];

    const csvRows = [headers.join(",")];
    
    filteredStipends.forEach((req: any) => {
      const periodStatus = getPeriodStatus(req, selectedPayPeriod);
      const row = [
        req.id,
        req.practiceId,
        req.practice?.clinicName || "",
        req.amount,
        req.stipendType,
        `"${(req.stipendDescription || "").replace(/"/g, '""')}"`,
        req.requestType,
        req.effectivePayPeriod || "",
        req.recurringEndPeriod || "",
        periodStatus,
        req.requestor?.name || "",
        req.leadPsmApprover?.name || "",
        req.leadPsmApprovedAt ? formatDateTime(req.leadPsmApprovedAt) : "",
        req.financeApprover?.name || "",
        req.financeApprovedAt ? formatDateTime(req.financeApprovedAt) : "",
        `"${(req.justification || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stipend_requests_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast({
      title: "Export Successful",
      description: `${filteredStipends.length} stipend requests exported`,
    });
  };

  // Selection handlers
  const handleToggleRequest = (requestId: number) => {
    const newSelected = new Set(selectedRequests);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedRequests(newSelected);
  };

  const handleToggleAll = (requests: any[]) => {
    if (selectedRequests.size === requests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(requests.map(r => r.id)));
    }
  };

  const handleMarkAsPaid = () => {
    if (selectedRequests.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one stipend request",
        variant: "destructive",
      });
      return;
    }

    if (selectedPayPeriod === "all") {
      toast({
        title: "Invalid Selection",
        description: "Please select a specific pay period to mark stipends as paid",
        variant: "destructive",
      });
      return;
    }

    markAsPaidMutation.mutate({
      requestIds: Array.from(selectedRequests),
      payPeriod: parseInt(selectedPayPeriod),
    });
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredStipends = allStipendRequests.filter((req: any) => {
    const periodMatch = shouldShowRequestForPeriod(req, selectedPayPeriod);
    const practiceMatch = selectedPractice === "all" || req.practiceId === selectedPractice;
    return periodMatch && practiceMatch;
  });

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[90rem] mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Finance Operations
          </h1>
          <p className="text-muted-foreground">
            Manage pay periods, import BigQuery data, and view all stipend requests
          </p>
        </div>

        {/* Persistent warnings for CSV import issues */}
        {disappearedPractices.length > 0 && (
          <Alert variant="destructive" className="relative" data-testid="alert-disappeared-practices">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <strong>⚠️ {disappearedPractices.length} practice(s) disappeared from CSV:</strong>
                  <p className="mt-1 text-sm">
                    The following practices had a stipend cap in the previous pay period but were not found in the current CSV upload. 
                    Their stipend caps will remain unchanged from the previous period.
                  </p>
                  <p className="mt-2 text-sm font-mono bg-destructive/10 p-2 rounded">
                    {disappearedPractices.join(", ")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDisappearedPractices([])}
                  className="shrink-0"
                  data-testid="button-dismiss-disappeared"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {practicesNotInTable.length > 0 && (
          <Alert variant="destructive" className="relative" data-testid="alert-practices-not-in-table">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <strong>⚠️ {practicesNotInTable.length} practice(s) in CSV not found in Practice table:</strong>
                  <p className="mt-1 text-sm">
                    The following practices appear in your CSV but do not exist in the Practice management table. 
                    Their metrics were saved but no ledger entries were created.
                  </p>
                  <p className="mt-2 text-sm font-mono bg-destructive/10 p-2 rounded">
                    {practicesNotInTable.join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add these practices in Settings → Practices, then re-upload the CSV to create ledger entries.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPracticesNotInTable([])}
                  className="shrink-0"
                  data-testid="button-dismiss-not-in-table"
                >
                  Dismiss
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="stipends" className="w-full">
          <TabsList>
            <TabsTrigger value="stipends" data-testid="tab-stipends">All Stipends</TabsTrigger>
            <TabsTrigger value="periods" data-testid="tab-pay-periods">Pay Periods</TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Current Pay Period
                  </CardTitle>
                  <CardDescription>
                    Fiscal Year 2025 (26 pay periods)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentPeriod ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                        <div>
                          <p className="text-2xl font-bold text-foreground">
                            Pay Period {currentPeriod.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(currentPeriod.startDate)} - {formatDate(currentPeriod.endDate)}
                          </p>
                        </div>
                        <Badge variant="default" className="text-sm">
                          Current
                        </Badge>
                      </div>
                      
                      {currentPeriod.remeasurementCompleted ? (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <AlertDescription className="text-green-600">
                            Remeasurement completed for this period
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Remeasurement pending - Import BigQuery data to trigger
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No current period set</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import BigQuery Data
                  </CardTitle>
                  <CardDescription>
                    Upload practice metrics for current pay period
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setShowImportDialog(true)}
                    className="w-full"
                    data-testid="button-import-bigquery"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV Data
                  </Button>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="w-full"
                    data-testid="button-download-template"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileDown className="h-5 w-5" />
                    Import Opening Balance
                  </CardTitle>
                  <CardDescription>
                    Upload historical stipend paid data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setShowOpeningBalanceDialog(true)}
                    className="w-full"
                    variant="secondary"
                    data-testid="button-import-opening-balance"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Import Opening Balance CSV
                  </Button>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      CSV format: ClinicID, PayPeriodNumber, Year, OpeningBalanceStipendPaid
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Pay Periods</CardTitle>
                <CardDescription>
                  View and manage all pay periods for 2025
                </CardDescription>
              </CardHeader>
              <CardContent>
                {periodsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading periods...</p>
                ) : periods && periods.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Download CSV</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period: any) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">
                            PP{period.payPeriodNumber}'{period.year}
                          </TableCell>
                          <TableCell>{formatDate(period.startDate)}</TableCell>
                          <TableCell>{formatDate(period.endDate)}</TableCell>
                          <TableCell>
                            {period.isCurrent ? (
                              <Badge variant="default">Current</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {period.csvData ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.location.href = `/api/pay-periods/${period.id}/csv`;
                                }}
                                data-testid={`button-download-csv-${period.id}`}
                              >
                                <FileDown className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">No data</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!period.isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setCurrentMutation.mutate(period.id)}
                                disabled={setCurrentMutation.isPending}
                                data-testid={`button-set-current-${period.id}`}
                              >
                                Set Current
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No pay periods found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stipends" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Stipend Requests</CardTitle>
                    <CardDescription>
                      View and export all approved stipend requests across all practices
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportStipends} data-testid="button-export-stipends">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pay-period-filter">Filter by Pay Period</Label>
                    <Select value={selectedPayPeriod} onValueChange={setSelectedPayPeriod}>
                      <SelectTrigger id="pay-period-filter" data-testid="select-period-filter">
                        <SelectValue placeholder="All periods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Periods</SelectItem>
                        {periods && periods.map((period: any) => (
                          <SelectItem key={`${period.payPeriodNumber}-${period.year}`} value={`${period.payPeriodNumber}-${period.year}`}>
                            PP{period.payPeriodNumber}'{period.year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practice-filter">Filter by Practice</Label>
                    <Select value={selectedPractice} onValueChange={setSelectedPractice}>
                      <SelectTrigger id="practice-filter" data-testid="select-practice-filter">
                        <SelectValue placeholder="All practices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Practices</SelectItem>
                        {allPractices.map((practice: any) => (
                          <SelectItem key={practice.id} value={practice.id}>
                            {practice.name} ({practice.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  Showing {filteredStipends.length} of {allStipendRequests.length} stipend requests
                </div>

                {stipendsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading stipend requests...</p>
                ) : filteredStipends.length > 0 ? (
                  <>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedRequests.size === filteredStipends.length && filteredStipends.length > 0}
                                onCheckedChange={() => handleToggleAll(filteredStipends)}
                                data-testid="checkbox-select-all"
                              />
                            </TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Practice</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Request Type</TableHead>
                            <TableHead>Periods</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredStipends.map((req: any) => {
                            
                            return (
                            <TableRow
                              key={req.id}
                              className="cursor-pointer hover-elevate"
                              onClick={() => window.location.href = `/requests/${req.id}`}
                              data-testid={`row-stipend-${req.id}`}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedRequests.has(req.id)}
                                  onCheckedChange={() => handleToggleRequest(req.id)}
                                  data-testid={`checkbox-request-${req.id}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">#{req.id}</TableCell>
                              <TableCell>
                                <div className="font-medium">{req.practice?.clinicName || req.practiceId}</div>
                              </TableCell>
                              <TableCell className="font-mono">
                                {(() => {
                                  // If "All Pay Periods" is selected, show total of all paid + committed
                                  if (selectedPayPeriod === "all" && req.paymentBreakdown && req.paymentBreakdown.length > 0) {
                                    const total = req.paymentBreakdown
                                      .filter((p: any) => p.status === 'paid' || p.status === 'committed')
                                      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                                    return formatCurrency(total);
                                  }
                                  
                                  // If a specific period is selected, show only that period's amount
                                  if (selectedPayPeriod !== "all" && req.paymentBreakdown) {
                                    const periodNum = parseInt(selectedPayPeriod);
                                    const periodPayment = req.paymentBreakdown.find((p: any) => p.payPeriod === periodNum);
                                    if (periodPayment && (periodPayment.status === 'paid' || periodPayment.status === 'committed')) {
                                      return formatCurrency(Number(periodPayment.amount));
                                    }
                                  }
                                  
                                  // Fall back to request amount
                                  return formatCurrency(parseFloat(req.amount));
                                })()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{req.stipendType}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{req.stipendDescription || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={req.requestType === "one_time" ? "secondary" : "default"}>
                                  {req.requestType === "one_time" ? "One-time" : "Recurring"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-medium">
                                {req.requestType === "recurring" && req.effectivePayPeriod && req.recurringEndPeriod
                                  ? `PP${req.effectivePayPeriod}-PP${req.recurringEndPeriod}`
                                  : req.effectivePayPeriod
                                  ? `PP${req.effectivePayPeriod}`
                                  : <span className="text-muted-foreground">—</span>
                                }
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const periodStatus = getPeriodStatus(req, selectedPayPeriod);
                                  return (
                                    <Badge
                                      variant={
                                        periodStatus === "Paid"
                                          ? "success"
                                          : "default"
                                      }
                                    >
                                      {periodStatus}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                            </TableRow>
                          );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    {selectedRequests.size > 0 && selectedPayPeriod !== "all" && (
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="text-sm text-muted-foreground">
                          {selectedRequests.size} stipend{selectedRequests.size > 1 ? 's' : ''} selected
                        </div>
                        <Button
                          onClick={handleMarkAsPaid}
                          disabled={markAsPaidMutation.isPending}
                          data-testid="button-mark-paid"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {markAsPaidMutation.isPending 
                            ? "Processing..." 
                            : `Mark as Paid for PP${selectedPayPeriod}`}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No stipend requests found matching the selected filters
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import BigQuery Data</DialogTitle>
              <DialogDescription>
                Upload practice metrics CSV for Pay Period {currentPeriod?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will import practice metrics and trigger remeasurement calculations
                  for the current pay period.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {csvFileName || "Select CSV File"}
                </Button>
              </div>

              {csvFileName && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    File selected: {csvFileName}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowImportDialog(false);
                  setCsvContent("");
                  setCsvFileName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!csvContent || importMutation.isPending}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importing..." : "Import Data"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Import Opening Balance</DialogTitle>
              <DialogDescription>
                Upload historical stipend paid data
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Import opening balance of stipend paid for each practice across pay periods.
                  This data will be reflected negatively in ledgers and counted in all "Stipend Paid" and "Utilized" KPIs.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">CSV Format Requirements</Label>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-xs font-mono mb-2">ClinicID, PayPeriodNumber, Year, OpeningBalanceStipendPaid</p>
                  <p className="text-xs text-muted-foreground">Example:</p>
                  <p className="text-xs font-mono text-muted-foreground">P001, 1, 2025, 5000.00</p>
                  <p className="text-xs font-mono text-muted-foreground">P002, 1, 2025, 3200.50</p>
                </div>
              </div>

              <div className="space-y-2">
                <input
                  ref={openingBalanceFileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleOpeningBalanceFileSelect}
                  className="hidden"
                  data-testid="input-opening-balance-csv-file"
                />
                <Button
                  onClick={() => openingBalanceFileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {openingBalanceCsvFileName || "Select CSV File"}
                </Button>
              </div>

              {openingBalanceCsvFileName && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    File selected: {openingBalanceCsvFileName}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowOpeningBalanceDialog(false);
                  setOpeningBalanceCsvContent("");
                  setOpeningBalanceCsvFileName("");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOpeningBalanceImport}
                disabled={!openingBalanceCsvContent || openingBalanceImportMutation.isPending}
                data-testid="button-confirm-opening-balance-import"
              >
                {openingBalanceImportMutation.isPending ? "Importing..." : "Import Opening Balance"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}

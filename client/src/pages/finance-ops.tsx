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
import { Calendar, Upload, RefreshCw, AlertCircle, CheckCircle2, FileText, Download, Filter, DollarSign } from "lucide-react";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/formatters";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FinanceOps() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasSetDefaultPeriod = useRef(false);
  
  // Filters for stipend requests table
  const [selectedPayPeriod, setSelectedPayPeriod] = useState<string>("all");
  const [selectedPractice, setSelectedPractice] = useState<string>("all");

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
      setSelectedPayPeriod(currentPeriod.id.toString());
      hasSetDefaultPeriod.current = true;
    }
  }, [currentPeriod]);

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
      const periodMatch = selectedPayPeriod === "all" || 
        (req.requestType === "one_time"
          ? req.effectivePayPeriod === parseInt(selectedPayPeriod)
          : (req.effectivePayPeriod <= parseInt(selectedPayPeriod) && 
             (!req.recurringEndPeriod || req.recurringEndPeriod >= parseInt(selectedPayPeriod)))
        );
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
        req.status,
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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const filteredStipends = allStipendRequests.filter((req: any) => {
    const periodMatch = selectedPayPeriod === "all" || 
      (req.requestType === "one_time"
        ? req.effectivePayPeriod === parseInt(selectedPayPeriod)
        : (req.effectivePayPeriod <= parseInt(selectedPayPeriod) && 
           (!req.recurringEndPeriod || req.recurringEndPeriod >= parseInt(selectedPayPeriod)))
      );
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

        <Tabs defaultValue="stipends" className="w-full">
          <TabsList>
            <TabsTrigger value="stipends" data-testid="tab-stipends">All Stipends</TabsTrigger>
            <TabsTrigger value="periods" data-testid="tab-pay-periods">Pay Periods</TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <TableHead>Remeasurement</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {periods.map((period: any) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-medium">
                            PP{period.id}
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
                            {period.remeasurementCompleted ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                Pending
                              </Badge>
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
                        {Array.from({ length: 26 }, (_, i) => i + 1).map((period) => (
                          <SelectItem key={period} value={period.toString()}>
                            Pay Period {period}
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
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Practice</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Request Type</TableHead>
                          <TableHead>Periods</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Approved By</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStipends.map((req: any) => (
                          <TableRow
                            key={req.id}
                            className="cursor-pointer hover-elevate"
                            onClick={() => window.location.href = `/requests/${req.id}`}
                            data-testid={`row-stipend-${req.id}`}
                          >
                            <TableCell className="font-medium">#{req.id}</TableCell>
                            <TableCell>
                              <div className="font-medium">{req.practice?.clinicName || req.practiceId}</div>
                            </TableCell>
                            <TableCell className="font-mono">{formatCurrency(parseFloat(req.amount))}</TableCell>
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
                              <Badge
                                variant={
                                  req.status === "approved"
                                    ? "default"
                                    : req.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div>{req.financeApprover?.name || "—"}</div>
                                <div className="text-muted-foreground">
                                  {req.financeApprovedAt ? formatDate(req.financeApprovedAt) : ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.location.href = `/requests/${req.id}`}
                                data-testid={`button-manage-payments-${req.id}`}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />
                                Manage Payments
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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
      </div>
    </div>
  );
}

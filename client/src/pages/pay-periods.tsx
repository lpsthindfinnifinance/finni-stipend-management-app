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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Upload, RefreshCw, AlertCircle, CheckCircle2, FileText, Download } from "lucide-react";
import { formatDate } from "@/lib/formatters";

export default function PayPeriods() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: periods, isLoading } = useQuery<any[]>({
    queryKey: ["/api/pay-periods"],
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
      if (!response.ok) throw new Error('Failed to download template');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bigquery_metrics_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: "CSV template downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download CSV template",
        variant: "destructive",
      });
    }
  };

  if (authLoading || !isAuthenticated) {
    return null;
  }

  if (role !== "Finance") {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg text-muted-foreground">
                  Access restricted to Finance team
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Pay Period Management
          </h1>
          <p className="text-muted-foreground">
            Manage 14-day pay periods and BigQuery data imports
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Pay Period</CardTitle>
                <CardDescription>
                  Pay Period {currentPeriod?.id || 1} of 26 (2025)
                </CardDescription>
              </div>
              <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPeriod && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentPeriod.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="text-lg font-semibold">
                    {formatDate(currentPeriod.endDate)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowImportDialog(true)}
                data-testid="button-import-bigquery"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import BigQuery Data
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                data-testid="button-download-template"
              >
                <Download className="h-4 w-4 mr-2" />
                Download CSV Template
              </Button>
              <Button data-testid="button-advance-period">
                Advance to Next Period
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Pay Periods</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading pay periods...
              </div>
            ) : (
              <div className="max-h-[600px] overflow-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium">Period</TableHead>
                    <TableHead className="font-medium">Start Date</TableHead>
                    <TableHead className="font-medium">End Date</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Remeasurement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!periods || periods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No pay periods found
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods
                      .filter((period: any) => period.id >= 21)
                      .slice(0, 10)
                      .map((period: any) => (
                        <TableRow key={period.id}>
                          <TableCell className="font-semibold">
                            Pay Period {period.id}
                          </TableCell>
                          <TableCell>{formatDate(period.startDate)}</TableCell>
                          <TableCell>{formatDate(period.endDate)}</TableCell>
                          <TableCell>
                            {period.isCurrent ? (
                              <Badge className="bg-primary">Current</Badge>
                            ) : (
                              <Badge variant="secondary">Closed</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {period.remeasurementCompleted ? (
                              <Badge variant="secondary">Completed</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Import BigQuery Data</DialogTitle>
              <DialogDescription>
                Upload CSV export from BigQuery table: bizops.finance_Views.perf_comp_practice_aggregate_KPIs_v1_Stipends_PP
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Required Columns (40+):</strong>
                  <div className="text-xs mt-2 space-y-1 text-muted-foreground">
                    <p><strong>Core:</strong> Practice_ID, CurrentPayPeriod_Number, Group_Name, Entity_ID, Entity_Name</p>
                    <p><strong>Performance:</strong> GrossMargin_Percent, Collections_Percent_Trailing3Periods, StipendCapAvgFinal</p>
                    <p><strong>Balance:</strong> NegativeEarningsCap, OpeningBalance_CurrentPP, CommittedStipend_CurrentPP</p>
                    <p><strong>Revenue:</strong> Revenue_CurrentPP, Revenue_Trailing3Periods, RevChange_CurrentVPrior</p>
                    <p><strong>Full list:</strong> See BigQuery table schema for all 40+ columns</p>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    System will auto-calculate remeasurement based on StipendCapAvgFinal vs previous period
                  </p>
                </AlertDescription>
              </Alert>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  data-testid="button-select-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {csvFileName || "Select CSV File"}
                </Button>
              </div>

              {csvContent && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    File loaded: {csvFileName} ({csvContent.split('\n').length - 1} data rows)
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
                data-testid="button-cancel-import"
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

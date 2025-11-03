import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NegativeEarnings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedPractice, setSelectedPractice] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [justification, setJustification] = useState("");
  const { toast } = useToast();

  const { data: summary = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/negative-earnings/summary"],
  });

  const requestMutation = useMutation({
    mutationFn: async (data: { practiceId: string; amount: number; justification: string }) => {
      return await apiRequest("/api/negative-earnings/requests", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/negative-earnings/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/negative-earnings/requests"] });
      setShowRequestDialog(false);
      setSelectedPractice("");
      setRequestAmount("");
      setJustification("");
      toast({
        title: "Request Submitted",
        description: "Your negative earnings cap request has been submitted for Finance approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmitRequest = () => {
    if (!selectedPractice || !requestAmount || !justification) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    requestMutation.mutate({
      practiceId: selectedPractice,
      amount,
      justification,
    });
  };

  // Group practices by portfolio/group
  const groupedData = summary.reduce((acc: any, practice: any) => {
    const group = practice.group || practice.portfolioName || "Unknown";
    if (!acc[group]) {
      acc[group] = {
        groupName: group,
        totalCap: 0,
        totalUtilized: 0,
        totalAvailable: 0,
        practices: [],
      };
    }
    acc[group].totalCap += practice.negativeEarningsCap;
    acc[group].totalUtilized += practice.utilized;
    acc[group].totalAvailable += practice.available;
    acc[group].practices.push(practice);
    return acc;
  }, {});

  const groups = Object.values(groupedData);

  // Filter practices
  const filteredPractices = summary.filter((practice) => {
    const matchesSearch =
      searchQuery === "" ||
      practice.practiceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      practice.clinicName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGroup =
      groupFilter === "all" ||
      practice.group === groupFilter ||
      practice.portfolioName === groupFilter;

    return matchesSearch && matchesGroup;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUtilizationColor = (utilized: number, cap: number) => {
    if (cap === 0) return "text-muted-foreground";
    const percent = (utilized / cap) * 100;
    if (percent >= 90) return "text-destructive";
    if (percent >= 70) return "text-orange-600 dark:text-orange-500";
    return "text-primary";
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Negative Earnings Cap</h1>
        </div>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Negative Earnings Cap
        </h1>
        <Button 
          data-testid="button-request-cap" 
          variant="default"
          onClick={() => setShowRequestDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Request Additional Cap
        </Button>
      </div>

      {/* Group Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {groups.map((group: any) => (
          <Card key={group.groupName} data-testid={`card-group-${group.groupName}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {group.groupName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Total Cap</div>
                <div className="text-lg font-semibold" data-testid={`text-cap-${group.groupName}`}>
                  {formatCurrency(group.totalCap)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Utilized</div>
                <div
                  className={`text-lg font-semibold ${getUtilizationColor(
                    group.totalUtilized,
                    group.totalCap
                  )}`}
                  data-testid={`text-utilized-${group.groupName}`}
                >
                  {formatCurrency(group.totalUtilized)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Available</div>
                <div className="text-lg font-semibold" data-testid={`text-available-${group.groupName}`}>
                  {formatCurrency(group.totalAvailable)}
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground">Utilization</div>
                <div className="text-sm font-medium">
                  {group.totalCap > 0
                    ? Math.round((group.totalUtilized / group.totalCap) * 100)
                    : 0}
                  %
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search practices..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-practices"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-48" data-testid="select-group-filter">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {Array.from(new Set(summary.map((p) => p.group || p.portfolioName))).map(
              (group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Practice Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Practice Name</TableHead>
                  <TableHead>Clinic Name</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Negative Earnings Cap</TableHead>
                  <TableHead className="text-right">Utilized</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Utilization %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPractices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No practices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPractices.map((practice) => {
                    const utilizationPercent =
                      practice.negativeEarningsCap > 0
                        ? (practice.utilized / practice.negativeEarningsCap) * 100
                        : 0;

                    return (
                      <TableRow key={practice.practiceId} data-testid={`row-practice-${practice.practiceId}`}>
                        <TableCell className="font-medium" data-testid={`text-practice-name-${practice.practiceId}`}>
                          {practice.practiceName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {practice.clinicName}
                        </TableCell>
                        <TableCell>{practice.group || practice.portfolioName}</TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-cap-${practice.practiceId}`}>
                          {formatCurrency(practice.negativeEarningsCap)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${getUtilizationColor(
                            practice.utilized,
                            practice.negativeEarningsCap
                          )}`}
                          data-testid={`text-utilized-${practice.practiceId}`}
                        >
                          {formatCurrency(practice.utilized)}
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-available-${practice.practiceId}`}>
                          {formatCurrency(practice.available)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-utilization-${practice.practiceId}`}>
                          {Math.round(utilizationPercent)}%
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Request Additional Cap Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent data-testid="dialog-request-cap">
          <DialogHeader>
            <DialogTitle>Request Additional Negative Earnings Cap</DialogTitle>
            <DialogDescription>
              Submit a request for additional negative earnings cap. This will be sent directly to Finance for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="practice">Practice</Label>
              <Select value={selectedPractice} onValueChange={setSelectedPractice}>
                <SelectTrigger data-testid="select-practice">
                  <SelectValue placeholder="Select a practice" />
                </SelectTrigger>
                <SelectContent>
                  {summary.map((practice) => (
                    <SelectItem key={practice.practiceId} value={practice.practiceId}>
                      {practice.practiceName} ({practice.group || practice.portfolioName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification">Justification</Label>
              <Textarea
                id="justification"
                placeholder="Explain why additional negative earnings cap is needed..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={4}
                data-testid="textarea-justification"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRequestDialog(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={requestMutation.isPending}
              data-testid="button-submit-request"
            >
              {requestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

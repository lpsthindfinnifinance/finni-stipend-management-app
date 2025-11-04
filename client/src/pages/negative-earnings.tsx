import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useState } from "react";

export default function NegativeEarnings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [hideZeroCap, setHideZeroCap] = useState(true);

  const { data: summary = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/negative-earnings/summary"],
  });

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

  const groups = Object.values(groupedData).sort((a: any, b: any) => {
    // Sort by portfolio name (G1, G2, G3, G4, G5)
    return a.groupName.localeCompare(b.groupName);
  });

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

    const matchesCap = !hideZeroCap || practice.negativeEarningsCap > 0;

    return matchesSearch && matchesGroup && matchesCap;
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

  // Calculate business-level totals
  const businessTotals = summary.reduce(
    (acc, practice) => ({
      totalCap: acc.totalCap + practice.negativeEarningsCap,
      totalUtilized: acc.totalUtilized + practice.utilized,
      totalAvailable: acc.totalAvailable + practice.available,
    }),
    { totalCap: 0, totalUtilized: 0, totalAvailable: 0 }
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          Negative Earnings Cap
        </h1>
      </div>

      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Business Level Cap Card */}
        <Card data-testid="card-business-level">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Business Level Cap
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Total Cap</div>
              <div className="text-lg font-semibold" data-testid="text-business-cap">
                {formatCurrency(businessTotals.totalCap)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Utilized</div>
              <div
                className={`text-lg font-semibold ${getUtilizationColor(
                  businessTotals.totalUtilized,
                  businessTotals.totalCap
                )}`}
                data-testid="text-business-utilized"
              >
                {formatCurrency(businessTotals.totalUtilized)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Available</div>
              <div className="text-lg font-semibold" data-testid="text-business-available">
                {formatCurrency(businessTotals.totalAvailable)}
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">Utilization</div>
              <div className="text-sm font-medium">
                {businessTotals.totalCap > 0
                  ? Math.round((businessTotals.totalUtilized / businessTotals.totalCap) * 100)
                  : 0}
                %
              </div>
            </div>
          </CardContent>
        </Card>
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
      <div className="space-y-4">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="hide-zero-cap-ne"
            checked={hideZeroCap}
            onCheckedChange={(checked) => setHideZeroCap(checked === true)}
            data-testid="checkbox-hide-zero-cap-ne"
          />
          <Label htmlFor="hide-zero-cap-ne" className="text-sm cursor-pointer">
            Hide zero cap practices
          </Label>
        </div>
      </div>

      {/* Practice Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full min-h-[550px] max-h-[calc(100vh-600px)] overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-card z-10 border-b">Practice Name</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b">Clinic Name</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b">Group</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Negative Earnings Cap</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Utilized</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Available</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Utilization %</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Negative Earnings Cap 75%</TableHead>
                  <TableHead className="sticky top-0 bg-card z-10 border-b text-right">Balance 75%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPractices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No practices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPractices.map((practice) => {
                    const utilizationPercent =
                      practice.negativeEarningsCap > 0
                        ? (practice.utilized / practice.negativeEarningsCap) * 100
                        : 0;
                    
                    const cap75Percent = practice.negativeEarningsCap * 0.75;
                    const balance75Percent = cap75Percent - practice.utilized;

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
                        <TableCell className="text-right font-mono" data-testid={`text-cap-75-${practice.practiceId}`}>
                          {formatCurrency(cap75Percent)}
                        </TableCell>
                        <TableCell className="text-right font-mono" data-testid={`text-balance-75-${practice.practiceId}`}>
                          {formatCurrency(balance75Percent)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

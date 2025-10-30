import { useState } from "react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";

interface Practice {
  id: string;
  name: string;
  portfolioId: string;
  stipendCap?: number;
  availableBalance?: number;
  stipendPaid?: number;
  stipendCommitted?: number;
  availablePerPP?: number;
  unapprovedStipend?: number;
  utilizationPercent?: number;
  allocatedIn?: number;
  allocatedOut?: number;
}

interface PracticeTableProps {
  practices: Practice[];
  onPracticeClick?: (practiceId: string) => void;
}

export function PracticeTable({
  practices,
  onPracticeClick,
}: PracticeTableProps) {
  const [showAllocations, setShowAllocations] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Toggle for allocation columns */}
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Checkbox
          id="show-allocations"
          checked={showAllocations}
          onCheckedChange={(checked) => setShowAllocations(checked === true)}
          data-testid="checkbox-show-allocations"
        />
        <Label htmlFor="show-allocations" className="text-sm cursor-pointer">
          Show Allocation
        </Label>
      </div>

      {/* Table with sticky headers */}
      <div className="flex-1 overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <TableHeader className="sticky top-0 bg-background z-10 border-b">
            <TableRow>
              <TableHead className="font-medium bg-background">Practice ID</TableHead>
              <TableHead className="font-medium bg-background">Practice Name</TableHead>
              <TableHead className="font-medium bg-background">Portfolio</TableHead>
              <TableHead className="font-medium text-right bg-background">Stipend Cap (Till PP26)</TableHead>
              {showAllocations && (
                <>
                  <TableHead className="font-medium text-right bg-background">Allocated-in</TableHead>
                  <TableHead className="font-medium text-right bg-background">Allocated-out</TableHead>
                </>
              )}
              <TableHead className="font-medium text-right bg-background">Stipend Paid</TableHead>
              <TableHead className="font-medium text-right bg-background">Stipend Committed</TableHead>
              <TableHead className="font-medium text-right bg-background">Available (till PP26)</TableHead>
              <TableHead className="font-medium text-right bg-background">Available per Pay Period</TableHead>
              <TableHead className="font-medium text-right bg-background">Stipend Requested</TableHead>
              <TableHead className="font-medium text-right bg-background">Utilized %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {practices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showAllocations ? 12 : 10}
                  className="text-center py-8 text-muted-foreground"
                >
                  No practices found
                </TableCell>
              </TableRow>
            ) : (
              practices.map((practice) => (
                <TableRow
                  key={practice.id}
                  className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    if (onPracticeClick) {
                      onPracticeClick(practice.id);
                    }
                  }}
                  data-testid={`row-practice-${practice.id}`}
                >
                  <TableCell className="font-mono text-sm" data-testid={`text-practice-id-${practice.id}`}>
                    {practice.id}
                  </TableCell>
                  <TableCell className="font-medium" data-testid={`text-practice-name-${practice.id}`}>
                    {practice.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{practice.portfolioId}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {practice.stipendCap !== undefined
                      ? formatCurrency(practice.stipendCap)
                      : "—"}
                  </TableCell>
                  {showAllocations && (
                    <>
                      <TableCell className="text-right font-mono text-blue-600 dark:text-blue-400">
                        {practice.allocatedIn !== undefined
                          ? formatCurrency(practice.allocatedIn)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-purple-600 dark:text-purple-400">
                        {practice.allocatedOut !== undefined
                          ? formatCurrency(practice.allocatedOut)
                          : "—"}
                      </TableCell>
                    </>
                  )}
                  <TableCell className="text-right font-mono">
                    {practice.stipendPaid !== undefined
                      ? formatCurrency(practice.stipendPaid)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {practice.stipendCommitted !== undefined
                      ? formatCurrency(practice.stipendCommitted)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-green-600 dark:text-green-400">
                    {practice.availableBalance !== undefined
                      ? formatCurrency(practice.availableBalance)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {practice.availablePerPP !== undefined
                      ? formatCurrency(practice.availablePerPP)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-orange-600 dark:text-orange-400">
                    {practice.unapprovedStipend !== undefined
                      ? formatCurrency(practice.unapprovedStipend)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {practice.utilizationPercent !== undefined
                      ? `${practice.utilizationPercent.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

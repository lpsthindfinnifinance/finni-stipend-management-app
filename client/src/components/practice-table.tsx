import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Practice {
  id: string;
  name: string;
  portfolioId: string;
  stipendCap?: number;
  availableBalance?: number;
  stipendPaid?: number;
  stipendCommitted?: number;
}

interface PracticeTableProps {
  practices: Practice[];
  onPracticeClick?: (practiceId: string) => void;
  expandable?: boolean;
}

export function PracticeTable({
  practices,
  onPracticeClick,
  expandable = false,
}: PracticeTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (practiceId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(practiceId)) {
      newExpanded.delete(practiceId);
    } else {
      newExpanded.add(practiceId);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            {expandable && <TableHead className="w-10"></TableHead>}
            <TableHead className="font-medium">Practice ID</TableHead>
            <TableHead className="font-medium">Practice Name</TableHead>
            <TableHead className="font-medium">Portfolio</TableHead>
            <TableHead className="font-medium text-right">Stipend Cap</TableHead>
            <TableHead className="font-medium text-right">Stipend Paid</TableHead>
            <TableHead className="font-medium text-right">Stipend Committed</TableHead>
            <TableHead className="font-medium text-right">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {practices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={expandable ? 9 : 8}
                className="text-center py-8 text-muted-foreground"
              >
                No practices found
              </TableCell>
            </TableRow>
          ) : (
            practices.map((practice) => (
              <TableRow
                key={practice.id}
                className="hover-elevate cursor-pointer"
                onClick={() => {
                  if (expandable) {
                    toggleRow(practice.id);
                  }
                  if (onPracticeClick) {
                    onPracticeClick(practice.id);
                  }
                }}
                data-testid={`row-practice-${practice.id}`}
              >
                {expandable && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(practice.id);
                      }}
                    >
                      {expandedRows.has(practice.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                )}
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

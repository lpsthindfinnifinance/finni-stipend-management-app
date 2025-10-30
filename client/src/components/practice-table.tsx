import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
}

interface PracticeTableProps {
  practices: Practice[];
  onPracticeClick?: (practiceId: string) => void;
}

export function PracticeTable({
  practices,
  onPracticeClick,
}: PracticeTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Practice ID</TableHead>
            <TableHead className="font-medium">Practice Name</TableHead>
            <TableHead className="font-medium">Portfolio</TableHead>
            <TableHead className="font-medium text-right">Stipend Cap (Till PP26)</TableHead>
            <TableHead className="font-medium text-right">Stipend Paid</TableHead>
            <TableHead className="font-medium text-right">Stipend Committed</TableHead>
            <TableHead className="font-medium text-right">Available (till PP26)</TableHead>
            <TableHead className="font-medium text-right">Available per PP</TableHead>
            <TableHead className="font-medium text-right">Unapproved Stipend</TableHead>
            <TableHead className="font-medium text-right">Utilization %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {practices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={10}
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
      </Table>
    </div>
  );
}

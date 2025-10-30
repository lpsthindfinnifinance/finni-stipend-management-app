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
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="font-medium bg-background">Practice ID</TableHead>
            <TableHead className="font-medium bg-background">Practice Name</TableHead>
            <TableHead className="font-medium bg-background">Portfolio</TableHead>
            <TableHead className="font-medium text-right bg-background">Stipend Cap (Till PP26)</TableHead>
            <TableHead className="font-medium text-right bg-background">Stipend Paid</TableHead>
            <TableHead className="font-medium text-right bg-background">Stipend Committed</TableHead>
            <TableHead className="font-medium text-right bg-background">Available (till PP26)</TableHead>
            <TableHead className="font-medium text-right bg-background">Available per Pay Period</TableHead>
            <TableHead className="font-medium text-right bg-background">Stipend Requested</TableHead>
            <TableHead className="font-medium text-right bg-background">Utilization %</TableHead>
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime, getStatusLabel } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

interface LedgerEntry {
  id: number;
  transactionType: string;
  amount: string | number;
  description?: string | null;
  createdAt: Date | string;
  runningBalance?: number;
}

interface LedgerTableProps {
  entries: LedgerEntry[];
}

export function LedgerTable({ entries }: LedgerTableProps) {
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-medium">Date</TableHead>
            <TableHead className="font-medium">Transaction Type</TableHead>
            <TableHead className="font-medium">Description</TableHead>
            <TableHead className="font-medium text-right">Amount</TableHead>
            <TableHead className="font-medium text-right">Running Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No ledger entries found
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => {
              const amount = typeof entry.amount === "string" 
                ? parseFloat(entry.amount) 
                : entry.amount;
              const isPositive = amount >= 0;

              return (
                <TableRow key={entry.id} data-testid={`row-ledger-${entry.id}`}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {getStatusLabel(entry.transactionType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description || "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right font-mono font-semibold ${
                      isPositive
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {formatCurrency(amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {entry.runningBalance !== undefined
                      ? formatCurrency(entry.runningBalance)
                      : "—"}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

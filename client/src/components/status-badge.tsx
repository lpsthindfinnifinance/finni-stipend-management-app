import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "@/lib/formatters";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <Badge
      className={`${getStatusColor(status)} ${className}`}
      data-testid={`badge-status-${status}`}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}

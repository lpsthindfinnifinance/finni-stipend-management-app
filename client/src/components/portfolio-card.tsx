import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PortfolioCardProps {
  portfolio: {
    id: string;
    name: string;
    psmName?: string;
    totalCap: number;
    allocated: number;
    remaining: number;
  };
  onViewDetails?: () => void;
}

export function PortfolioCard({ portfolio, onViewDetails }: PortfolioCardProps) {
  const utilizationPercent = portfolio.totalCap > 0
    ? ((portfolio.allocated / portfolio.totalCap) * 100)
    : 0;

  return (
    <Card className="hover-elevate" data-testid={`card-portfolio-${portfolio.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-medium">{portfolio.name}</CardTitle>
            {portfolio.psmName && (
              <p className="text-sm text-muted-foreground mt-1">
                PSM: {portfolio.psmName}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {portfolio.id}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Total Cap</span>
            <span className="text-lg font-mono font-semibold" data-testid={`text-total-cap-${portfolio.id}`}>
              {formatCurrency(portfolio.totalCap)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Allocated</span>
            <span className="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-allocated-${portfolio.id}`}>
              {formatCurrency(portfolio.allocated)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Remaining</span>
            <span className="text-lg font-mono font-semibold text-green-600 dark:text-green-400" data-testid={`text-remaining-${portfolio.id}`}>
              {formatCurrency(portfolio.remaining)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilization</span>
            <span data-testid={`text-utilization-${portfolio.id}`}>{utilizationPercent.toFixed(1)}%</span>
          </div>
          <Progress value={utilizationPercent} className="h-2" />
        </div>
      </CardContent>
      {onViewDetails && (
        <CardFooter className="pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={onViewDetails}
            data-testid={`button-view-details-${portfolio.id}`}
          >
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

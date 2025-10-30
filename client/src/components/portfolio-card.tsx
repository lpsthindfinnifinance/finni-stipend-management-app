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
    utilized: number;
    committed: number;
    remaining: number;
    remainingPerPP: number;
    utilizationPercent: number;
    practiceCount: number;
  };
  onViewDetails?: () => void;
}

export function PortfolioCard({ portfolio, onViewDetails }: PortfolioCardProps) {
  // Determine progress bar color based on utilization
  const getUtilizationColor = (percent: number) => {
    if (percent >= 95) return "bg-red-500";
    if (percent >= 80) return "bg-orange-500";
    if (percent >= 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <Card className="hover-elevate" data-testid={`card-portfolio-${portfolio.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-medium">{portfolio.name}</CardTitle>
            {portfolio.psmName && (
              <p className="text-sm text-muted-foreground mt-1">
                PSM: {portfolio.psmName}
              </p>
            )}
          </div>
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-primary">
              {portfolio.id}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Total Cap</span>
            <span className="text-lg font-mono font-semibold" data-testid={`text-total-cap-${portfolio.id}`}>
              {formatCurrency(portfolio.totalCap)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Utilized</span>
            <span className="text-base font-mono font-semibold text-blue-600 dark:text-blue-400" data-testid={`text-utilized-${portfolio.id}`}>
              {formatCurrency(portfolio.utilized)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Committed</span>
            <span className="text-base font-mono font-semibold text-purple-600 dark:text-purple-400" data-testid={`text-committed-${portfolio.id}`}>
              {formatCurrency(portfolio.committed)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Remaining</span>
            <span className="text-base font-mono font-semibold text-green-600 dark:text-green-400" data-testid={`text-remaining-${portfolio.id}`}>
              {formatCurrency(portfolio.remaining)}
            </span>
          </div>
          <div className="flex justify-between items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Remaining per PP</span>
            <span className="text-base font-mono font-semibold text-teal-600 dark:text-teal-400" data-testid={`text-remaining-per-pp-${portfolio.id}`}>
              {formatCurrency(portfolio.remainingPerPP)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilization</span>
            <span data-testid={`text-utilization-${portfolio.id}`}>{portfolio.utilizationPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${getUtilizationColor(portfolio.utilizationPercent)}`}
              style={{ width: `${Math.min(portfolio.utilizationPercent, 100)}%` }}
            />
          </div>
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

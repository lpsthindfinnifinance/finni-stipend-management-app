import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

const PORTFOLIOS = [
  { value: "G1", label: "Portfolio G1" },
  { value: "G2", label: "Portfolio G2" },
  { value: "G3", label: "Portfolio G3" },
  { value: "G4", label: "Portfolio G4" },
  { value: "G5", label: "Portfolio G5" },
] as const;

export function PortfolioSwitcher() {
  const { toast } = useToast();
  
  const { data: user } = useQuery<{ id: string; role: string; portfolioId: string | null }>({
    queryKey: ["/api/auth/user"],
  });

  const switchPortfolioMutation = useMutation({
    mutationFn: async (newPortfolio: string) => {
      await apiRequest("PATCH", "/api/auth/switch-portfolio", { portfolioId: newPortfolio });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Portfolio Switched",
        description: "Your portfolio has been updated. The page will refresh.",
      });
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  // Only show portfolio switcher for PSM and Lead PSM roles
  if (user.role !== "PSM" && user.role !== "Lead PSM") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <Select
        value={user.portfolioId || "G1"}
        onValueChange={(value) => switchPortfolioMutation.mutate(value)}
        disabled={switchPortfolioMutation.isPending}
      >
        <SelectTrigger 
          className="w-[140px] h-8"
          data-testid="select-portfolio-switcher"
        >
          <SelectValue>
            <span className="text-sm">{user.portfolioId || "G1"}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {PORTFOLIOS.map((portfolio) => (
            <SelectItem 
              key={portfolio.value} 
              value={portfolio.value}
              data-testid={`option-portfolio-${portfolio.value.toLowerCase()}`}
            >
              <span>{portfolio.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

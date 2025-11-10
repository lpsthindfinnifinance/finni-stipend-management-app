import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeTable } from "@/components/practice-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

export default function Practices() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [search, setSearch] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("all");
  const [hideZeroCap, setHideZeroCap] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Build URL with query parameters
  const buildPracticesUrl = () => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (portfolioFilter) params.append('portfolio', portfolioFilter);
    return `/api/practices?${params.toString()}`;
  };

  const { data: practices, isLoading } = useQuery({
    queryKey: [buildPracticesUrl()],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="w-full px-6 py-6 space-y-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Practice Management
          </h1>
          <p className="text-muted-foreground">
            View and manage all ABA practices across portfolios
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by practice slug or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-practice"
                  />
                </div>
                <Select value={portfolioFilter} onValueChange={setPortfolioFilter}>
                  <SelectTrigger data-testid="select-portfolio-filter">
                    <SelectValue placeholder="All Portfolios" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Portfolios</SelectItem>
                    <SelectItem value="G1">G1</SelectItem>
                    <SelectItem value="G2">G2</SelectItem>
                    <SelectItem value="G3">G3</SelectItem>
                    <SelectItem value="G4">G4</SelectItem>
                    <SelectItem value="G5">G5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="hide-zero-cap"
                  checked={hideZeroCap}
                  onCheckedChange={(checked) => setHideZeroCap(checked === true)}
                  data-testid="checkbox-hide-zero-cap"
                />
                <Label htmlFor="hide-zero-cap" className="text-sm cursor-pointer">
                  Hide zero cap practices
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Practice Table */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="text-lg">Practices</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 min-h-0">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading practices...
              </div>
            ) : (
              <div className="h-full overflow-auto">
                <PracticeTable
                  practices={
                    Array.isArray(practices)
                      ? practices.filter((p) => !hideZeroCap || (p.stipendCap && p.stipendCap > 0))
                      : []
                  }
                  onPracticeClick={(id) => {
                    window.location.href = `/practices/${id}`;
                  }}
                  userRole={user?.role ?? undefined}
                  userPortfolioId={user?.portfolioId ?? undefined}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

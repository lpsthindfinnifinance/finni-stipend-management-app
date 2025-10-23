import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeTable } from "@/components/practice-table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

export default function Practices() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [portfolioFilter, setPortfolioFilter] = useState("all");

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
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by practice ID or name..."
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
          </CardContent>
        </Card>

        {/* Practice Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Practices</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading practices...
              </div>
            ) : (
              <PracticeTable
                practices={practices || []}
                onPracticeClick={(id) => {
                  window.location.href = `/practices/${id}`;
                }}
                expandable
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

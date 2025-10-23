import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Allocations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

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

  const { data: allocations, isLoading } = useQuery({
    queryKey: ["/api/allocations"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground mb-2">
              Inter-PSM Allocations
            </h1>
            <p className="text-muted-foreground">
              Transfer stipend budget between PSMs
            </p>
          </div>
          <Button data-testid="button-new-allocation">
            <Plus className="h-4 w-4 mr-2" />
            New Allocation
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Allocation History</CardTitle>
            <CardDescription>
              View transfers between Practice Success Managers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No allocations yet</p>
              <p className="text-sm">
                Inter-PSM allocation feature coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

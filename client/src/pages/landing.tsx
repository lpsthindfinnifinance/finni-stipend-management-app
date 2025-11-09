import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, TrendingUp, Shield, BarChart3 } from "lucide-react";
import finniCat from "@assets/finni.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-block">
              <img 
                    src={finniCat} 
                    alt="Finni Health" 
                    className="h-[96px]"
                    data-testid="finni-cat"
                  />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-semibold text-foreground">
            Finni Health
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-medium text-muted-foreground">
            Stipend Management System
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive stipend management for 60+ ABA practices with multi-level approval workflows, 
            practice-level ledger tracking, and real-time portfolio analytics.
          </p>

          <Button
            size="lg"
            className="text-lg px-8"
            onClick={() => {
              window.location.href = "/api/login";
            }}
            data-testid="button-login"
          >
            Sign In
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-16 md:pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Portfolio Management</CardTitle>
                <CardDescription>
                  Track 5 portfolios (G1-G5) with real-time cap allocations and utilization metrics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Approval Workflows</CardTitle>
                <CardDescription>
                  Multi-level approval process with PSM, Lead PSM, and Finance team validation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Practice Ledger</CardTitle>
                <CardDescription>
                  Complete transaction history with remeasurements, allocations, and audit trails
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

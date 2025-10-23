import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="inline-block">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold text-foreground">
            404
          </h1>
          <h2 className="text-2xl font-medium text-muted-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Button
          onClick={() => {
            window.location.href = "/";
          }}
          data-testid="button-go-home"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

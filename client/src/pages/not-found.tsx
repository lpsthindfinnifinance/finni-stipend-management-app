import { Button } from "@/components/ui/button";
import finniCat404 from "@assets/finni_404.png";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md px-4">
        <div className="inline-block">
              <img 
                    src={finniCat404} 
                    alt="Finni Cat 404" 
                    className="h-[360px]"
                    data-testid="finni-cat"
                  />
          </div>
        <div className="space-y-2">
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
          Go to Hompegae
        </Button>
      </div>
    </div>
  );
}






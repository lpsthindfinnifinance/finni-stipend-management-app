import { Button } from "@/components/ui/button";
// import { Frown } from "lucide-react"; // No longer needed
import finniCat404 from "@assets/finni_404.png";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative flex flex-col items-center justify-center text-center space-y-6 max-w-lg">
        
        {/* Giant 404 text in the background */}
        <h1 className="text-[14rem] font-bold text-muted-foreground/10 absolute -top-20 -z-10 opacity-75">
          404
        </h1>

        {/* =============================================
          === 🐱 YOUR SAD FINNI-CAT IMAGE ===
          ============================================= */}
        <Image 
          src={finniCat404} 
          alt="Sad Finni Cat" 
          width={180} // Adjust width as needed
          height={180} // Adjust height as needed
          data-testid="finni-cat-404"
          className="opacity-90 mt-8" // Added mt-8 to give it a little space
        />

        {/* Main Text Content */}
        <div className="space-y-3 pt-4">
          <h2 className="text-3xl font-bold text-foreground">
            Oops! This page is lost.
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Even our best agent (Finni the Cat) couldn't find what you're looking for. 
            It might have been moved or deleted.
          </p>
        </div>

        {/* Go to Dashboard Button */}
        <Button
           onClick={() => {
             window.location.href = "/"           
           }}
           data-testid="button-go-home"
         >
           Go to Homepage
        </Button>
      </div>
    </div>
  );
}









// Old code ----------------------------------------------------------------------------------------------------------------------

// import { Button } from "@/components/ui/button";
// import { FileQuestion } from "lucide-react";

// export default function NotFound() {
//   return (
//     <div className="min-h-screen flex items-center justify-center bg-background">
//       <div className="text-center space-y-6 max-w-md px-4">
//         <div className="inline-block">
//           <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto">
//             <FileQuestion className="h-10 w-10 text-muted-foreground" />
//           </div>
//         </div>
        
//         <div className="space-y-2">
//           <h1 className="text-4xl font-semibold text-foreground">
//             404
//           </h1>
//           <h2 className="text-2xl font-medium text-muted-foreground">
//             Page Not Found
//           </h2>
//           <p className="text-muted-foreground">
//             The page you're looking for doesn't exist or has been moved.
//           </p>
//         </div>

//         <Button
//           onClick={() => {
//             window.location.href = "/";
//           }}
//           data-testid="button-go-home"
//         >
//           Go to Dashboard
//         </Button>
//       </div>
//     </div>
//   );
// }

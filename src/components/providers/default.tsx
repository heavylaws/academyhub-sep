import { AuthProvider } from "./auth.tsx";
import { ConvexProvider } from "./convex.tsx";
import { QueryClientProvider } from "./query-client.tsx";
import { ThemeProvider } from "./theme.tsx";
import { Toaster } from "../ui/sonner.tsx";
import { TooltipProvider } from "../ui/tooltip.tsx";
import { AdminTutorialProvider } from "@/components/tutorial/tutorial-provider.tsx";

export function DefaultProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider>
      <AuthProvider>
        <AdminTutorialProvider>
          <QueryClientProvider>
            <TooltipProvider>
              <ThemeProvider>
                <Toaster />
                {children}
              </ThemeProvider>
            </TooltipProvider>
          </QueryClientProvider>
        </AdminTutorialProvider>
      </AuthProvider>
    </ConvexProvider>
  );
}

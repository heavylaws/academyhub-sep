import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] w-full items-center justify-center p-6">
          <Card className="max-w-md w-full border-destructive/30 bg-destructive/5 text-center shadow-lg">
            <CardHeader className="flex flex-col items-center gap-2">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <AlertTriangle className="size-6" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while rendering this section.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 overflow-hidden rounded bg-background/80 p-2.5 text-left text-xs font-mono text-destructive">
                  {this.state.error.message}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="gap-1.5"
              >
                <RefreshCw className="size-3.5" />
                Try Again
              </Button>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                className="gap-1.5"
              >
                Reload Page
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

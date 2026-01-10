import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 rounded-xl border border-border bg-card/50">
          <div className="flex items-center gap-2 text-warning mb-3">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">
              {this.props.componentName ? `${this.props.componentName} Error` : "Something went wrong"}
            </span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
            {this.state.error?.message || "An unexpected error occurred. Please try again."}
          </p>

          <div className="flex gap-2">
            {this.props.showRetry !== false && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={this.handleReload}
            >
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Minimal fallback for critical components
export const MinimalErrorFallback = () => (
  <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
    <AlertTriangle className="h-4 w-4 mr-2" />
    Failed to load
  </div>
);

// Chart-specific fallback
export const ChartErrorFallback = () => (
  <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center min-h-[300px]">
    <AlertTriangle className="h-8 w-8 text-warning mb-3" />
    <p className="text-sm text-muted-foreground">Chart failed to load</p>
    <Button
      variant="outline"
      size="sm"
      className="mt-3"
      onClick={() => window.location.reload()}
    >
      Reload
    </Button>
  </div>
);

export default ErrorBoundary;

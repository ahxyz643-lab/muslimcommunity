import { Component, type ReactNode } from "react";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; message?: string };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error) {
    console.error("[ErrorBoundary]", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
            <h2 className="font-serif text-xl text-foreground">Something went wrong</h2>
            <p className="text-xs text-muted-foreground">{this.state.message || "Please refresh the page."}</p>
            <button
              onClick={() => location.reload()}
              className="mt-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              Reload
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
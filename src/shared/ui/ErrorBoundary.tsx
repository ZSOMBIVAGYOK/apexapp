import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Copy, Check } from "lucide-react";
import { Button } from "./Button";
import { Card } from "./Card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    this.handleReset();
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleCopyError = async () => {
    const errorDetails = [
      `Időpont: ${new Date().toISOString()}`,
      `URL: ${typeof window !== "undefined" ? window.location.pathname : ""}`,
      `Hibaüzenet: ${this.state.error?.message || "Ismeretlen hiba"}`,
      `Komponens: ${this.state.errorInfo?.componentStack?.slice(0, 500) || "N/A"}`
    ]
      .join("\n")
      // Privacy-safe sanitization: strip emails and tokens
      .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, "[EMAIL]")
      .replace(/(?:ghp_|Bearer\s+|AIza)[A-Za-z0-9_-]{10,}/g, "[TOKEN]");

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    } catch {
      // ignore
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center select-none">
          <Card variant="surface" radius="20" className="p-8 max-w-lg w-full space-y-5 text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-20 bg-status-caution/15 text-status-caution">
              <AlertTriangle className="h-7 w-7" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2 className="text-20 font-bold text-text-primary">
                {this.props.fallbackTitle || "Hopp, valami hiba történt ezen az oldalon"}
              </h2>
              <p className="text-13 text-text-secondary leading-relaxed">
                Nem kell aggódnod, az adataid biztonságban vannak. Próbáld meg újratölteni az oldalt, vagy térj vissza a kezdőlapra.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-12 bg-bg-elevated border border-border-hairline text-left">
                <span className="text-11 font-mono text-status-caution block truncate">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={this.handleReload}
              >
                Újratöltés
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Home className="h-3.5 w-3.5" />}
                onClick={this.handleGoHome}
              >
                Kezdőlap
              </Button>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={this.state.copied ? <Check className="h-3.5 w-3.5 text-status-ready" /> : <Copy className="h-3.5 w-3.5" />}
                onClick={this.handleCopyError}
              >
                {this.state.copied ? "Másolva ✓" : "Hiba másolása"}
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

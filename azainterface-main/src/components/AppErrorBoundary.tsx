import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : "Erro inesperado.",
    };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // Keep this log for postmortem without crashing the whole app in production.
    console.error("[AppErrorBoundary] Unhandled UI error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-md p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Algo deu errado</h1>
              <p className="text-sm text-muted-foreground">Evitamos a tela branca e preservamos sua sessão.</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {this.state.errorMessage || "Um erro inesperado ocorreu na interface."}
          </p>
          <Button onClick={this.handleReload} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar aplicativo
          </Button>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;

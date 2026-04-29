import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "Inter, sans-serif",
          background: "#f8fafc",
          color: "#1e293b",
        }}>
          <div style={{
            maxWidth: 480,
            textAlign: "center",
            background: "#fff",
            borderRadius: 12,
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Нещо се обърка
            </h1>
            <p style={{ color: "#64748b", marginBottom: "1rem", fontSize: "0.875rem" }}>
              Възникна неочаквана грешка. Моля, опреснете страницата.
            </p>
            <pre style={{
              background: "#f1f5f9",
              padding: "0.75rem",
              borderRadius: 8,
              fontSize: "0.75rem",
              textAlign: "left",
              overflow: "auto",
              maxHeight: 120,
              color: "#dc2626",
            }}>
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1.5rem",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Опресни страницата
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

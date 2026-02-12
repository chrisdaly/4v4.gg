import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
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
          minHeight: "60vh",
          padding: "var(--space-8)",
          textAlign: "center",
          gap: "var(--space-4)",
        }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-xl)",
            color: "var(--gold)",
            letterSpacing: "0.04em",
          }}>
            Something went wrong
          </div>
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--grey-light)",
            maxWidth: 480,
            lineHeight: 1.5,
          }}>
            {this.state.error?.message || "An unexpected error occurred."}
          </div>
          <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xs)",
                color: "var(--gold)",
                background: "rgba(252, 219, 51, 0.08)",
                border: "1px solid var(--gold)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-6)",
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => { window.location.href = "/"; }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-xs)",
                color: "var(--grey-light)",
                background: "transparent",
                border: "1px solid var(--grey-mid)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-6)",
                cursor: "pointer",
                letterSpacing: "0.5px",
              }}
            >
              Go home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

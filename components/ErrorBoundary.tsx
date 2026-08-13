"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-muted, #999)",
        }}>
          <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Etwas ist schiefgelaufen.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "var(--text-primary, #fff)",
              cursor: "pointer",
            }}
          >
            Erneut versuchen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

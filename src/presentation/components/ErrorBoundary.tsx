"use client";

import React, { Component, type ReactNode } from "react";
import { AppError } from "@/shared/errors";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component to catch React errors
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to error reporting service in production
    // Note: Using console.error here as logger might not be available in component context
    if (typeof console !== "undefined" && console.error) {
      console.error("ErrorBoundary caught an error:", error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error);
      }

      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-white text-xl mono hud-panel max-w-md text-center p-6">
            <p className="mb-4 console-text text-red-400">
              {this.state.error instanceof AppError
                ? this.state.error.message
                : "An unexpected error occurred"}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-neon-outline hover-lock"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


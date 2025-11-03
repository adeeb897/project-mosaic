import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            margin: '1rem',
            border: '1px solid #dc2626',
            borderRadius: '0.5rem',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>
            Something went wrong
          </h2>

          <p style={{ marginBottom: '1rem' }}>
            We&apos;re sorry, but something unexpected happened. Please try refreshing the page or
            contact support if the problem persists.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                marginRight: '0.5rem',
              }}
            >
              Try Again
            </button>

            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Refresh Page
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  padding: '1rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

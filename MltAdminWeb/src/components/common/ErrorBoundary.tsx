import React from 'react';
import { Alert, Button, Container, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { errorHandler, AppError } from '../../utils/errorHandler';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: AppError; resetError: () => void }>;
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = errorHandler.normalizeError(error);
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = errorHandler.normalizeError(error);

    // Log the error
    errorHandler.logError(appError, 'ErrorBoundary');

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(appError, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback && this.state.error) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <Container size="sm" py="xl">
          <Alert color="red" title="Something went wrong" icon={<IconAlertCircle size={16} />}>
            <Stack gap="sm">
              <Text size="sm">
                An unexpected error occurred. Please try refreshing the page or contact support if
                the problem persists.
              </Text>
              {this.state.error && (
                <Text size="xs" c="dimmed">
                  Error: {this.state.error.message}
                </Text>
              )}
              <Stack gap="xs">
                <Button onClick={this.resetError} size="sm">
                  Try Again
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </Stack>
            </Stack>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: unknown, context?: string) => {
    return errorHandler.handleError(error, context);
  }, []);

  const handleAsync = React.useCallback(
    <T,>(operation: () => Promise<T>, context?: string): Promise<T> => {
      return errorHandler.handleAsync(operation, context);
    },
    [],
  );

  return {
    handleError,
    handleAsync,
    showErrorNotification: errorHandler.showErrorNotification.bind(errorHandler),
    showSuccessNotification: errorHandler.showSuccessNotification.bind(errorHandler),
    showWarningNotification: errorHandler.showWarningNotification.bind(errorHandler),
  };
};

// HOC to wrap components with error handling
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: AppError; resetError: () => void }>,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Error Handling System Usage Examples
 *
 * This file demonstrates how to use the comprehensive error handling system
 * created for the MLT Admin Web application.
 */

import {
  errorHandler,
  safeAsync,
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  NetworkError,
  TimeoutError,
  ServerError,
  RateLimitError,
  ErrorCode,
} from './errorHandler';

// Example 1: Basic error handling in async functions
export const exampleAsyncFunction = async () => {
  try {
    // Your async operation here
    const result = await someApiCall();
    return result;
  } catch (error) {
    // The error will be automatically normalized and logged
    throw errorHandler.normalizeError(error);
  }
};

// Example 2: Using safeAsync wrapper
export const exampleSafeAsync = async () => {
  return await safeAsync(async () => {
    // Your async operation here
    return await someApiCall();
  }, 'exampleSafeAsync');
};

// Example 4: Custom error creation
export const exampleCustomErrors = () => {
  // Create specific error types
  throw new ValidationError('Invalid email format', 'email');
  throw new AuthenticationError('Invalid credentials');
  throw new NotFoundError('User');
  throw new NetworkError('Connection failed');
  throw new TimeoutError('Request timed out');
  throw new ServerError('Database connection failed');
  throw new RateLimitError('Too many requests');
};

// Example 6: Error handling in React components
// The following is a usage pattern, not a real component. Do not use as-is.
/*
export const exampleReactComponent = () => {
  const { handleError, handleAsync } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await handleAsync(async () => {
        // Your async operation
        await submitForm();
      }, 'Form submission');

      // Show success notification
      errorHandler.showSuccessNotification('Form submitted successfully');
    } catch (error) {
      // Error is already handled by handleAsync
      console.log('Error handled:', error);
    }
  };

  const handleManualError = () => {
    try {
      // Some operation that might fail
      riskyOperation();
    } catch (error) {
      handleError(error, 'Manual error handling');
    }
  };
};
*/

// Example 7: Error boundary usage (React component example)
export const exampleErrorBoundary = () => {
  // In a React component, you would use:
  // return (
  //   <ErrorBoundary
  //     onError={(error, errorInfo) => {
  //       console.log('Error caught by boundary:', error);
  //       console.log('Error info:', errorInfo);
  //     }}
  //   >
  //     <YourComponent />
  //   </ErrorBoundary>
  // );

  console.log('Error boundary example - see comments above');
};

// Example 8: Custom fallback component (React component example)
export const exampleWithCustomFallback = () => {
  // In a React component, you would use:
  // const CustomErrorFallback = ({ error, resetError }) => (
  //   <div>
  //     <h2>Custom Error Fallback</h2>
  //     <p>Error: {error.message}</p>
  //     <p>Code: {error.code}</p>
  //     <button onClick={resetError}>Try Again</button>
  //   </div>
  // );
  //
  // return (
  //   <ErrorBoundary fallback={CustomErrorFallback}>
  //     <YourComponent />
  //   </ErrorBoundary>
  // );

  console.log('Custom fallback example - see comments above');
};

// Example 9: Error handling in API services
export const exampleApiService = {
  async fetchData() {
    return await safeAsync(async () => {
      const response = await fetch('/api/data');
      if (!response.ok) {
        throw new AppError('Failed to fetch data', ErrorCode.NETWORK_ERROR, response.status);
      }
      return await response.json();
    }, 'fetchData');
  },

  async createItem(data: Record<string, unknown>) {
    return await safeAsync(async () => {
      // Validate data
      if (!data.name) {
        throw new AppError('Name is required', ErrorCode.VALIDATION_ERROR);
      }
      if (!data.email) {
        throw new AppError('Email is required', ErrorCode.VALIDATION_ERROR);
      }

      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new AppError('Failed to create item', ErrorCode.BAD_REQUEST, response.status);
      }

      return await response.json();
    }, 'createItem');
  },
};

// Example 10: Error handling in form validation
interface FormData {
  email: string;
  password: string;
}

export const exampleFormValidation = {
  validateEmail(email: string) {
    if (!email) {
      throw new ValidationError('Email is required', 'email');
    }

    if (!email.includes('@')) {
      throw new ValidationError('Invalid email format', 'email');
    }
  },

  validatePassword(password: string) {
    if (!password) {
      throw new ValidationError('Password is required', 'password');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', 'password');
    }
  },

  validateForm(data: FormData) {
    try {
      this.validateEmail(data.email);
      this.validatePassword(data.password);
    } catch (error) {
      // Re-throw as validation error
      throw errorHandler.normalizeError(error);
    }
  },
};

// Example 11: Error handling with notifications
export const exampleWithNotifications = async () => {
  try {
    await someOperation();
    errorHandler.showSuccessNotification('Operation completed successfully');
  } catch (error) {
    // Error notification is automatically shown by handleError
    errorHandler.handleError(error, 'exampleWithNotifications');
  }
};

// Example 12: Error handling without notifications
export const exampleWithoutNotifications = async () => {
  try {
    await someOperation();
  } catch (error) {
    // Handle error without showing notification
    errorHandler.handleError(error, 'exampleWithoutNotifications', false);

    // Custom error handling
    if (error instanceof NetworkError) {
      // Handle network errors specifically
      console.log('Network error occurred');
    }
  }
};

// Example 13: Getting user-friendly error messages
export const exampleUserFriendlyMessages = (error: unknown) => {
  const message = errorHandler.normalizeError(error).message;
  console.log('User-friendly message:', message);

  // You can also check error types
  const normalizedError = errorHandler.normalizeError(error);
  if (normalizedError.code === ErrorCode.VALIDATION_ERROR) {
    console.log('This is a validation error');
  }
};

// Example 14: Error handling in file uploads
export const exampleFileUpload = async (file: File) => {
  return await safeAsync(async () => {
    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new AppError('File size exceeds limit', ErrorCode.FILE_TOO_LARGE);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new AppError('Invalid file type', ErrorCode.INVALID_FILE_TYPE);
    }

    // Upload file
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/fileupload/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new AppError('Upload failed', ErrorCode.UPLOAD_FAILED, response.status);
    }

    return await response.json();
  }, 'fileUpload');
};

// Mock functions for examples
const someApiCall = async () => ({ data: 'example' });
// const processData = () => 'processed';
// const submitForm = async () => Promise.resolve();
// const riskyOperation = () => {
//   throw new Error('Example error');
// };
// const useErrorHandler = () => ({
//   handleError: () => {},
//   handleAsync: async (fn: any) => await fn(),
// });
const someOperation = async () => Promise.resolve();

// Mock hook for examples
// const useErrorHandler = () => ({
//   handleError: () => {},
//   handleAsync: async (fn: any) => await fn(),
// });

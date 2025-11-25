import { notifications } from '@mantine/notifications';
import { API_ERROR_MESSAGES } from '../constants/validation';

// Type definitions for HTTP errors
interface HttpErrorResponse {
  status?: number;
  data?: {
    message?: string;
    code?: string;
  };
}

interface HttpError {
  response?: HttpErrorResponse;
  code?: string;
  message?: string;
}

// Custom Error Classes
export class AppError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly data?: unknown;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status?: number,
    data?: unknown,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.data = data;
    this.isOperational = isOperational;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400, { field });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND_ERROR', 404);
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timed out') {
    super(message, 'TIMEOUT_ERROR', 408);
    this.name = 'TimeoutError';
  }
}

export class ServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 'SERVER_ERROR', 500);
    this.name = 'ServerError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

// Error Codes
export const ErrorCode = {
  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // HTTP Status Errors
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  SERVER_ERROR: 'SERVER_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',

  // Business Logic Errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_OPERATION: 'INVALID_OPERATION',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // File/Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',

  // Shopify Specific Errors
  SHOPIFY_CONNECTION_FAILED: 'SHOPIFY_CONNECTION_FAILED',
  SHOPIFY_STORE_NOT_FOUND: 'SHOPIFY_STORE_NOT_FOUND',
  SHOPIFY_INVALID_CREDENTIALS: 'SHOPIFY_INVALID_CREDENTIALS',
  SHOPIFY_SYNC_FAILED: 'SHOPIFY_SYNC_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// Error Message Mapping
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // General Errors
  [ErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
  [ErrorCode.NETWORK_ERROR]: API_ERROR_MESSAGES.NETWORK_ERROR,
  [ErrorCode.TIMEOUT_ERROR]: API_ERROR_MESSAGES.TIMEOUT_ERROR,
  [ErrorCode.VALIDATION_ERROR]: API_ERROR_MESSAGES.VALIDATION_ERROR,

  // Authentication & Authorization
  [ErrorCode.AUTHENTICATION_ERROR]: API_ERROR_MESSAGES.UNAUTHORIZED_ERROR,
  [ErrorCode.AUTHORIZATION_ERROR]: API_ERROR_MESSAGES.FORBIDDEN_ERROR,
  [ErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please log in again.',

  // HTTP Status Errors
  [ErrorCode.BAD_REQUEST]: 'Invalid request. Please check your input and try again.',
  [ErrorCode.NOT_FOUND]: API_ERROR_MESSAGES.NOT_FOUND_ERROR,
  [ErrorCode.CONFLICT]: 'This resource already exists or conflicts with existing data.',
  [ErrorCode.SERVER_ERROR]: API_ERROR_MESSAGES.SERVER_ERROR,
  [ErrorCode.RATE_LIMIT_ERROR]: API_ERROR_MESSAGES.RATE_LIMIT_ERROR,

  // Business Logic Errors
  [ErrorCode.INSUFFICIENT_STOCK]: 'Insufficient stock available for this operation.',
  [ErrorCode.INVALID_OPERATION]: 'This operation is not allowed in the current state.',
  [ErrorCode.DUPLICATE_ENTRY]: 'This entry already exists.',

  // File/Upload Errors
  [ErrorCode.FILE_TOO_LARGE]: 'File size exceeds the maximum allowed limit.',
  [ErrorCode.INVALID_FILE_TYPE]: 'File type is not supported.',
  [ErrorCode.UPLOAD_FAILED]: 'File upload failed. Please try again.',

  // Shopify Specific Errors
  [ErrorCode.SHOPIFY_CONNECTION_FAILED]:
    'Failed to connect to Shopify store. Please check your credentials.',
  [ErrorCode.SHOPIFY_STORE_NOT_FOUND]: 'Shopify store not found. Please verify your store name.',
  [ErrorCode.SHOPIFY_INVALID_CREDENTIALS]:
    'Invalid Shopify credentials. Please check your access token.',
  [ErrorCode.SHOPIFY_SYNC_FAILED]: 'Failed to sync data from Shopify. Please try again.',
};

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Convert any error to AppError
   */
  public normalizeError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError(error.message, ErrorCode.UNKNOWN_ERROR);
    }

    if (typeof error === 'string') {
      return new AppError(error, ErrorCode.UNKNOWN_ERROR);
    }

    return new AppError('An unknown error occurred', ErrorCode.UNKNOWN_ERROR);
  }

  /**
   * Convert HTTP error response to AppError
   */
  public handleHttpError(error: unknown): AppError {
    const httpError = error as HttpError;
    const status = httpError.response?.status;
    const message = httpError.response?.data?.message || httpError.message || 'Request failed';
    const code = httpError.response?.data?.code;

    switch (status) {
      case 400:
        return new AppError(message, code || ErrorCode.BAD_REQUEST, status);
      case 401:
        return new AuthenticationError(message);
      case 403:
        return new AuthorizationError(message);
      case 404:
        return new NotFoundError();
      case 408:
        return new TimeoutError(message);
      case 409:
        return new AppError(message, ErrorCode.CONFLICT, status);
      case 429:
        return new RateLimitError(message);
      case 500:
      case 502:
      case 503:
        return new ServerError(message);
      default:
        if (httpError.code === 'ECONNABORTED' || httpError.message?.includes('timeout')) {
          return new TimeoutError();
        }
        if (httpError.code === 'NETWORK_ERROR' || !httpError.response) {
          return new NetworkError();
        }
        return new AppError(message, code || ErrorCode.UNKNOWN_ERROR, status);
    }
  }

  /**
   * Log error with appropriate level
   */
  public logError(error: AppError, context?: string): void {
    const logMessage = {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    };

    if (this.isDevelopment) {
      console.group(`🚨 Error: ${error.code}`);
      console.error('Message:', error.message);
      console.error('Status:', error.status);
      console.error('Context:', context);
      console.error('Stack:', error.stack);
      console.error('Data:', error.data);
      console.groupEnd();
    } else {
      console.error('Error:', logMessage);
    }
  }

  /**
   * Show error notification
   */
  public showErrorNotification(error: AppError, title?: string): void {
    const errorMessage = ERROR_MESSAGES[error.code as ErrorCode] || error.message;

    notifications.show({
      title: title || 'Error',
      message: errorMessage,
      color: 'red',
      autoClose: 5000,
    });
  }

  /**
   * Show success notification
   */
  public showSuccessNotification(message: string, title: string = 'Success'): void {
    notifications.show({
      title,
      message,
      color: 'green',
      autoClose: 3000,
    });
  }

  /**
   * Show warning notification
   */
  public showWarningNotification(message: string, title: string = 'Warning'): void {
    notifications.show({
      title,
      message,
      color: 'yellow',
      autoClose: 4000,
    });
  }

  /**
   * Handle error with logging and notification
   */
  public handleError(error: unknown, context?: string, showNotification: boolean = true): AppError {
    const normalizedError = this.normalizeError(error);

    this.logError(normalizedError, context);

    if (showNotification) {
      this.showErrorNotification(normalizedError);
    }

    return normalizedError;
  }

  /**
   * Handle async operation with error handling
   */
  public async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string,
    showNotification: boolean = true,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context, showNotification);
      throw this.normalizeError(error);
    }
  }
}

// Utility Functions
export const errorHandler = ErrorHandler.getInstance();

/**
 * Create error from HTTP response
 */
export const createErrorFromResponse = (response: unknown): AppError => {
  return errorHandler.handleHttpError(response);
};

/**
 * Safe async wrapper
 */
export const safeAsync = <T>(operation: () => Promise<T>, context?: string): Promise<T> => {
  return errorHandler.handleAsync(operation, context);
};

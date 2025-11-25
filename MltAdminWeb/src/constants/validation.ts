// Validation Constants and Regex Patterns

// Regex Patterns
export const VALIDATION_PATTERNS = {
  // Email validation
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Phone number patterns
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,

  // Password patterns
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PASSWORD_MEDIUM: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,

  // URL patterns
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,

  // Shopify patterns
  SHOPIFY_STORE_NAME: /^[a-zA-Z0-9][a-zA-Z0-9\-]{1,60}[a-zA-Z0-9]$/,
  SHOPIFY_ACCESS_TOKEN: /^shpat_[a-zA-Z0-9]{32}$/,
  SHOPIFY_DOMAIN: /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/,

  // File patterns
  PDF_FILE: /\.(pdf)$/i,
  IMAGE_FILE: /\.(jpg|jpeg|png|gif|bmp|svg)$/i,
  CSV_FILE: /\.(csv)$/i,
  EXCEL_FILE: /\.(xlsx|xls)$/i,

  // General patterns
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^[0-9]+$/,
  ALPHA: /^[a-zA-Z]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // Special characters
  NO_SPECIAL_CHARS: /^[a-zA-Z0-9\s]+$/,
  SAFE_FILENAME: /^[a-zA-Z0-9\-_\.\s]+$/,
} as const;

// Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_URL: 'Please enter a valid URL',
  PASSWORD_TOO_WEAK:
    'Password must be at least 8 characters with uppercase, lowercase, number and special character',
  PASSWORD_TOO_SHORT: 'Password must be at least 6 characters',
  INVALID_SHOPIFY_STORE: 'Store name must be 3-60 characters, alphanumeric with hyphens',
  INVALID_SHOPIFY_TOKEN: 'Access token must start with "shpat_" followed by 32 characters',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds limit',
  UPLOAD_FAILED: 'File upload failed',
  NETWORK_ERROR: 'Network error occurred',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error occurred',
} as const;

// File Size Limits (in bytes)
export const FILE_SIZE_LIMITS = {
  SMALL: 1024 * 1024, // 1MB
  MEDIUM: 5 * 1024 * 1024, // 5MB
  LARGE: 10 * 1024 * 1024, // 10MB
  EXTRA_LARGE: 50 * 1024 * 1024, // 50MB
} as const;

// Common String Constants
export const COMMON_STRINGS = {
  LOADING: 'Loading...',
  ERROR: 'Error',
  SUCCESS: 'Success',
  WARNING: 'Warning',
  INFO: 'Info',
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  CREATE: 'Create',
  UPDATE: 'Update',
  CONFIRM: 'Confirm',
  CLOSE: 'Close',
  YES: 'Yes',
  NO: 'No',
  OK: 'OK',
  RETRY: 'Retry',
  REFRESH: 'Refresh',
  BACK: 'Back',
  NEXT: 'Next',
  PREVIOUS: 'Previous',
  SUBMIT: 'Submit',
  RESET: 'Reset',
  CLEAR: 'Clear',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  EXPORT: 'Export',
  IMPORT: 'Import',
  DOWNLOAD: 'Download',
  UPLOAD: 'Upload',
  PRINT: 'Print',
  SHARE: 'Share',
  COPY: 'Copy',
  PASTE: 'Paste',
  CUT: 'Cut',
  UNDO: 'Undo',
  REDO: 'Redo',
  SELECT_ALL: 'Select All',
  DESELECT_ALL: 'Deselect All',
  EXPAND: 'Expand',
  COLLAPSE: 'Collapse',
  SHOW_MORE: 'Show More',
  SHOW_LESS: 'Show Less',
  VIEW_DETAILS: 'View Details',
  HIDE_DETAILS: 'Hide Details',
} as const;

// API Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect to server. Please check your internet connection.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  UNAUTHORIZED_ERROR: 'Your session has expired. Please log in again.',
  FORBIDDEN_ERROR: 'You do not have permission to perform this action.',
  NOT_FOUND_ERROR: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'An unexpected error occurred. Please try again later.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
} as const;

// Validation Functions
export const validateEmail = (email: string): boolean => VALIDATION_PATTERNS.EMAIL.test(email);
export const validatePhone = (phone: string): boolean => VALIDATION_PATTERNS.PHONE.test(phone);
export const validateUrl = (url: string): boolean => VALIDATION_PATTERNS.URL.test(url);
export const validateShopifyStoreName = (storeName: string): boolean =>
  VALIDATION_PATTERNS.SHOPIFY_STORE_NAME.test(storeName);
export const validateShopifyAccessToken = (token: string): boolean =>
  VALIDATION_PATTERNS.SHOPIFY_ACCESS_TOKEN.test(token);

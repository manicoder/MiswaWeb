// Common TypeScript type definitions to avoid using 'any' and empty objects

// Generic utility types
export type UnknownRecord = Record<string, unknown>;
export type StringRecord = Record<string, string>;
export type NumberRecord = Record<string, number>;
export type BooleanRecord = Record<string, boolean>;

// Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: unknown;
}

export interface NetworkError extends Error {
  response?: {
    status?: number;
    data?: unknown;
    statusText?: string;
  };
  request?: unknown;
  config?: unknown;
}

// Event handler types
export type GenericEventHandler = (event: Event) => void;
export type MouseEventHandler = (event: MouseEvent) => void;
export type KeyboardEventHandler = (event: KeyboardEvent) => void;
export type ChangeEventHandler = (event: React.ChangeEvent<HTMLInputElement>) => void;
export type FormEventHandler = (event: React.FormEvent<HTMLFormElement>) => void;
export type ClickEventHandler = (event: React.MouseEvent<HTMLButtonElement>) => void;

// File upload types
export interface FileUploadError {
  file: File;
  message: string;
  code?: string;
}

export interface FileUploadProgress {
  file: File;
  progress: number;
  loaded: number;
  total: number;
}

// API Response types
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface ApiResponse<T = unknown> extends BaseApiResponse {
  data?: T;
}

export interface PaginatedResponse<T = unknown> extends BaseApiResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormFieldError {
  field: string;
  message: string;
}

// Component props types
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export interface LoadingProps {
  isLoading: boolean;
  loadingText?: string;
}

export interface ErrorProps {
  error?: string | null;
  onRetry?: () => void;
}

// Modal/Dialog types
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Toast/Notification types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  type: NotificationType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

// Generic CRUD types
export interface CreateRequest<T> {
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateRequest<T> {
  id: string;
  data: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;
}

export interface DeleteRequest {
  id: string;
}

// Shopify specific types
export interface ShopifyCredentials {
  storeName: string;
  accessToken: string;
  shopDomain?: string;
}

export interface ShopifyStoreInfo {
  id: string;
  name: string;
  domain: string;
  email?: string;
  currency?: string;
  timezone?: string;
}

// File handling types
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

export interface UploadedFile extends FileMetadata {
  id: string;
  url: string;
  uploadedAt: string;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | undefined;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

// Theme and styling types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'orange' | 'red';
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Configuration types
export interface AppConfig {
  apiBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: Record<string, boolean>;
}

// User permission types
export interface Permission {
  resource: string;
  actions: string[];
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Permission[];
}

// Generic utility functions type
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
export type ParameterizedCallback<P, T = void> = (params: P) => T;
export type AsyncParameterizedCallback<P, T = void> = (params: P) => Promise<T>;

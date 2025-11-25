import axios, { AxiosRequestConfig } from 'axios';
import { ENV } from '../config/environment';
import { errorHandler, createErrorFromResponse } from '../utils/errorHandler';

const API_BASE_URL = ENV.apiUrl;

// Validate that API_BASE_URL is absolute
if (!API_BASE_URL.startsWith('http')) {
  console.error('❌ API_BASE_URL is not absolute:', API_BASE_URL);
  throw new Error('API_BASE_URL must be absolute URL starting with http:// or https://');
}

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: ENV.apiTimeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mlt-admin-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Convert to AppError for consistent handling
    const appError = createErrorFromResponse(error);

    if (appError.status === 401) {
      // Remove token and reload to trigger authentication check
      localStorage.removeItem('mlt-admin-token');
      window.location.reload();
      return Promise.reject(appError);
    }

    return Promise.reject(appError);
  },
);

// API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',

  // Store Connections (NEW - matches backend)
  STORE_CONNECTIONS: '/storeconnection',
  STORE_CONNECTION_DISCONNECT: (id: string) => `/storeconnection/${id}/disconnect`,

  // Health and Version
  HEALTH: '/health',
  API_VERSION: '/health/version',

  // Shopify Store Connection
  SHOPIFY_CONNECT: '/storeconnection',
  SHOPIFY_DISCONNECT: '/shopify/disconnect',
  SHOPIFY_STATUS: '/shopify/status',
  SHOPIFY_VERIFY: '/shopify/verify',

  // Shopify Products
  SHOPIFY_PRODUCTS: '/shopify/products',
  SHOPIFY_PRODUCT_COUNT: '/shopify/products/count',
  SHOPIFY_PRODUCT_DETAILS: (id: string) => `/shopify/products/${encodeURIComponent(id)}`,
  SHOPIFY_SYNC_PRODUCTS: '/shopify/products/sync',

  // Shopify Customers
  SHOPIFY_CUSTOMERS: '/shopify/customers',
  SHOPIFY_CUSTOMER_DETAILS: (id: string) => `/shopify/customers/${id}`,
  SHOPIFY_SYNC_CUSTOMERS: '/shopify/customers/sync',

  // Shopify Orders
  SHOPIFY_ORDERS: '/shopify/orders',
  SHOPIFY_ORDER_DETAILS: (id: string) => `/shopify/orders/${id}`,
  SHOPIFY_SYNC_ORDERS: '/shopify/orders/sync',

  // Shopify Inventory
  SHOPIFY_INVENTORY: '/shopify/inventory',
  SHOPIFY_INVENTORY_ITEM: (id: string) => `/shopify/inventory/${id}`,
  SHOPIFY_INVENTORY_UPDATE_VARIANT: '/shopify/inventory/update-variant',
  SHOPIFY_INVENTORY_VALIDATE_SKUS: '/shopify/inventory/validate-skus',
  SHOPIFY_SYNC_INVENTORY: '/shopify/inventory/sync',

  // Shopify Cost Fetching
  SHOPIFY_COSTS_FETCH: '/shopify/costs/fetch',
  SHOPIFY_COSTS_PROGRESS: (jobId: string) => `/shopify/costs/progress/${jobId}`,
  SHOPIFY_COSTS_CANCEL: (jobId: string) => `/shopify/costs/cancel/${jobId}`,
  SHOPIFY_COSTS_STATS: '/shopify/costs/stats',

  // Shopify Locations and Inventory by Location
  SHOPIFY_LOCATIONS: '/shopify/locations',
  SHOPIFY_INVENTORY_BY_LOCATION: '/shopify/inventory/location',

  // Shopify Dashboard
  SHOPIFY_DASHBOARD_STATS: '/shopify/dashboard/stats',
  SHOPIFY_DASHBOARD_RECENT_ORDERS: '/shopify/dashboard/recent-orders',
  SHOPIFY_DASHBOARD_ANALYTICS: '/shopify/dashboard/analytics',

  // Shopify Analytics
  SHOPIFY_TOP_SELLING_PRODUCTS: '/shopify/analytics/top-selling-products',

  // Legacy endpoints
  PRODUCTS: '/products',
  PRODUCT_DETAILS: (id: string) => `/products/${id}`,
  CUSTOMERS: '/customers',
  CUSTOMER_DETAILS: (id: string) => `/customers/${id}`,
  ORDERS: '/orders',
  ORDER_DETAILS: (id: string) => `/orders/${id}`,
  INVENTORY: '/inventory',
  INVENTORY_ITEM: (id: string) => `/inventory/${id}`,
  DASHBOARD_STATS: '/dashboard/stats',
  DASHBOARD_RECENT_ORDERS: '/dashboard/recent-orders',
  DASHBOARD_ANALYTICS: '/dashboard/analytics',

  // Finance endpoints
  FINANCE_SALES_SUMMARY: '/finance/sales/summary',
  FINANCE_SALES_ANALYTICS: '/finance/sales-analytics',
  FINANCE_REVENUE_BREAKDOWN: '/finance/sales/revenue-breakdown',
  FINANCE_PRODUCT_PERFORMANCE: '/finance/sales/product-performance',
  FINANCE_SALES_ORDERS: '/finance/sales/orders',
  FINANCE_SALES_ORDER_DETAILS: (id: string) => `/finance/sales/orders/${id}`,
  FINANCE_EXPENSES: '/finance/expenses',
  FINANCE_EXPENSE_CATEGORIES: '/finance/expense-categories',
  FINANCE_PAYMENT_MODES: '/finance/payment-modes',
  FINANCE_EXPENSE_TAGS: '/finance/expense-tags',
  FINANCE_CHART_OF_ACCOUNTS: '/finance/chart-of-accounts',
  FINANCE_PRODUCT_COSTS: '/finance/product-costs',
  FINANCE_PROFIT_LOSS: '/finance/profit-loss',
  FINANCE_PROFIT_LOSS_COMPARISON: '/finance/profit-loss/comparison',
  FINANCE_PAYOUTS: '/finance/payouts',
  FINANCE_TAXES: '/finance/taxes',
  FINANCE_TAX_REPORT: '/finance/taxes/report',
  FINANCE_DASHBOARD: '/finance/dashboard',
  FINANCE_REPORTS: '/finance/reports',

  // Purchase Order Management
  FINANCE_SUPPLIERS: '/finance/suppliers',
  FINANCE_PURCHASE_ORDERS: '/finance/purchase-orders',
  FINANCE_PURCHASE_ORDER_WORKFLOW: (id: string) => `/finance/purchase-orders/${id}/workflow`,
  FINANCE_PURCHASE_ORDER_STATUS: (id: string) => `/finance/purchase-orders/${id}/status`,
  FINANCE_PURCHASE_ORDER_TRANSITIONS: (id: string) => `/finance/purchase-orders/${id}/transitions`,
  FINANCE_PURCHASE_ORDER_JOURNEY: (id: string) => `/finance/purchase-orders/${id}/journey`,
  FINANCE_SUPPLIER_PAYMENTS: '/finance/supplier-payments',
} as const;

// Generic API methods with error handling
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    errorHandler.handleAsync(() => apiClient.get<T>(url, config), `GET ${url}`),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    errorHandler.handleAsync(() => apiClient.post<T>(url, data, config), `POST ${url}`),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    errorHandler.handleAsync(() => apiClient.put<T>(url, data, config), `PUT ${url}`),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    errorHandler.handleAsync(() => apiClient.patch<T>(url, data, config), `PATCH ${url}`),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    errorHandler.handleAsync(() => apiClient.delete<T>(url, config), `DELETE ${url}`),
};

// Version API with error handling
export const fetchApiVersion = async (): Promise<string> => {
  try {
    const response = await apiClient.get(API_ENDPOINTS.API_VERSION);
    return response.data.apiVersion;
  } catch {
    // Handle network errors or other issues
    console.error('API request failed');
    throw new Error('Network error');
  }
};

// Logout API with error handling
export const logout = async (): Promise<boolean> => {
  try {
    // Create a separate axios instance for logout to avoid interceptor conflicts
    const logoutClient = axios.create({
      baseURL: API_BASE_URL,
      timeout: ENV.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token manually
    const token = localStorage.getItem('mlt-admin-token');
    if (token) {
      logoutClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    const response = await logoutClient.post(API_ENDPOINTS.LOGOUT);
    return response.data.success;
  } catch {
    // Even if logout fails, clear local token
    localStorage.removeItem('mlt-admin-token');
    return false;
  }
};

export default apiClient;

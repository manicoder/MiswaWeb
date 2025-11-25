import { api, API_ENDPOINTS } from './api';
import type {
  ShopifyStore,
  ShopifyStoreConnection,
  ShopifyConnectionStatus,
  ShopifyApiResponse,
  ShopifyProductsResponse,
  ShopifyCustomersResponse,
  ShopifyOrdersResponse,
  ShopifyProduct,
  ShopifyCustomer,
  ShopifyOrder,
  ShopifyLocationsResponse,
  ShopifyInventoryResponse,
} from '../types/shopify';
import { safeAsync, AppError, ErrorCode } from '../utils/errorHandler';

export class ShopifyService {
  /**
   * Connect a Shopify store
   */
  static async connectStore(
    connection: ShopifyStoreConnection,
  ): Promise<ShopifyApiResponse<ShopifyStore>> {
    return await safeAsync(async () => {
      const requestData = {
        platform: 'shopify',
        storeName: connection.storeName,
        accessToken: connection.accessToken,
        apiKey: '', // Not needed for Shopify
        secretKey: '', // Not needed for Shopify
        setAsDefault: true, // Set as default store
      };

      const response = await api.post<{ success: boolean; message: string; store?: ShopifyStore }>(
        API_ENDPOINTS.SHOPIFY_CONNECT,
        requestData,
      );

      // Credentials are now stored securely in the database
      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
          data: {
            id: response.data.store?.id || '',
            storeName: connection.storeName,
            shopDomain: connection.shopDomain || `${connection.storeName}.myshopify.com`,
            isConnected: true,
            connectedAt: new Date().toISOString(),
            status: 'active',
          },
        };
      }

      return {
        success: false,
        error: response.data.message || 'Failed to connect store',
      };
    }, 'connectStore');
  }

  /**
   * Disconnect the current Shopify store
   */
  static async disconnectStore(): Promise<ShopifyApiResponse<void>> {
    return await safeAsync(async () => {
      const response = await api.post<ShopifyApiResponse<void>>(API_ENDPOINTS.SHOPIFY_DISCONNECT);
      return response.data;
    }, 'disconnectStore');
  }

  /**
   * Get Shopify connection status
   */
  static async getConnectionStatus(): Promise<ShopifyConnectionStatus> {
    return await safeAsync(async () => {
      const response = await api.get<
        ShopifyApiResponse<{ isConnected: boolean; store?: ShopifyStore }>
      >(API_ENDPOINTS.SHOPIFY_STATUS);

      if (response.data.success && response.data.data) {
        return {
          isConnected: response.data.data.isConnected,
          store: response.data.data.store,
          error: response.data.data.isConnected ? undefined : 'Store connection invalid',
        };
      }

      return {
        isConnected: false,
        error: response.data.error || response.data.message || 'No Shopify store connected',
      };
    }, 'getConnectionStatus');
  }

  /**
   * Verify Shopify store connection
   */
  static async verifyConnection(): Promise<ShopifyApiResponse<boolean>> {
    return await safeAsync(async () => {
      const response = await api.post<ShopifyApiResponse<boolean>>(API_ENDPOINTS.SHOPIFY_VERIFY);
      return response.data;
    }, 'verifyConnection');
  }

  /**
   * Get Shopify products with pagination and filtering
   */
  static async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'archived' | 'draft';
    vendor?: string;
    product_type?: string;
  }): Promise<ShopifyProductsResponse> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.get<ShopifyApiResponse<ShopifyProductsResponse>>(
        API_ENDPOINTS.SHOPIFY_PRODUCTS,
        {
          params,
        },
      );

      return response.data.data as ShopifyProductsResponse;
    }, 'getProducts');
  }

  /**
   * Get a specific Shopify product
   */
  static async getProduct(id: string): Promise<ShopifyProduct> {
    try {
      const response = await api.get<ShopifyProduct>(API_ENDPOINTS.SHOPIFY_PRODUCT_DETAILS(id));
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch product: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Sync products from Shopify
   */
  static async syncProducts(
    forceRefresh: boolean = false,
  ): Promise<ShopifyApiResponse<{ synced: number; total: number }>> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.post<ShopifyApiResponse<{ synced: number; total: number }>>(
        `${API_ENDPOINTS.SHOPIFY_SYNC_PRODUCTS}?forceRefresh=${forceRefresh}`,
        undefined,
        {
          timeout: 0, // Infinite timeout for sync operations
        },
      );
      return response.data;
    }, 'syncProducts');
  }

  /**
   * Get Shopify customers with pagination and filtering
   */
  static async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    state?: string;
  }): Promise<ShopifyCustomersResponse> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.state) queryParams.append('state', params.state);

      const response = await api.get<
        ShopifyApiResponse<{
          customers: ShopifyCustomer[];
          total: number;
          page: number;
          limit: number;
          hasMore: boolean;
        }>
      >(
        `${API_ENDPOINTS.SHOPIFY_CUSTOMERS}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
      );

      if (!response.data.data) {
        throw new AppError('No data returned from customers API', ErrorCode.NOT_FOUND);
      }

      return response.data.data;
    }, 'getCustomers');
  }

  /**
   * Get a specific Shopify customer
   */
  static async getCustomer(id: string): Promise<ShopifyCustomer> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.get<ShopifyApiResponse<ShopifyCustomer>>(
        API_ENDPOINTS.SHOPIFY_CUSTOMER_DETAILS(id),
      );

      if (!response.data.data) {
        throw new AppError('Customer not found', ErrorCode.NOT_FOUND);
      }

      return response.data.data;
    }, 'getCustomer');
  }

  /**
   * Sync customers from Shopify
   */
  static async syncCustomers(): Promise<ShopifyApiResponse<{ synced: number; total: number }>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const response = await api.post<ShopifyApiResponse<{ synced: number; total: number }>>(
        API_ENDPOINTS.SHOPIFY_SYNC_CUSTOMERS,
        undefined,
        {
          timeout: 0, // Infinite timeout for sync operations
        },
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to sync customers');
    }
  }

  /**
   * Get Shopify orders with pagination and filtering
   */
  static async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    financial_status?: string;
    fulfillment_status?: string;
    created_at_min?: string;
    created_at_max?: string;
  }): Promise<ShopifyOrdersResponse> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.get<ShopifyApiResponse<ShopifyOrdersResponse>>(
        API_ENDPOINTS.SHOPIFY_ORDERS,
        { params },
      );

      if (!response.data.data) {
        throw new AppError('Orders data not found', ErrorCode.NOT_FOUND);
      }

      return response.data.data;
    }, 'getOrders');
  }

  /**
   * Get a specific Shopify order
   */
  static async getOrder(id: string): Promise<ShopifyOrder> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.get<ShopifyApiResponse<ShopifyOrder>>(
        API_ENDPOINTS.SHOPIFY_ORDER_DETAILS(id),
      );

      if (!response.data.data) {
        throw new AppError('Order not found', ErrorCode.NOT_FOUND);
      }

      return response.data.data;
    }, 'getOrder');
  }

  /**
   * Sync orders from Shopify
   */
  static async syncOrders(): Promise<ShopifyApiResponse<{ synced: number; total: number }>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const response = await api.post<ShopifyApiResponse<{ synced: number; total: number }>>(
        API_ENDPOINTS.SHOPIFY_SYNC_ORDERS,
      );
      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to sync orders');
    }
  }

  /**
   * Get dashboard statistics
   * NOTE: This endpoint is not yet implemented in the backend
   */
  static async getDashboardStats(): Promise<Record<string, unknown>> {
    // Stub implementation - endpoint not available in backend
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalProducts: 0,
    };
  }

  /**
   * Get recent orders for dashboard
   * NOTE: This endpoint is not yet implemented in the backend
   */
  static async getRecentOrders(_limit: number = 5): Promise<ShopifyOrder[]> {
    // Stub implementation - endpoint not available in backend
    return [];
  }

  /**
   * Get analytics data
   * NOTE: This endpoint is not yet implemented in the backend
   */
  static async getAnalytics(_params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<Record<string, unknown>> {
    // Stub implementation - endpoint not available in backend
    return {
      revenue: [],
      orders: [],
      customers: [],
    };
  }

  /**
   * Validate store name format
   */
  static validateStoreName(storeName: string): boolean {
    // Shopify store names should be lowercase, alphanumeric with hyphens
    const storeNameRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
    return storeNameRegex.test(storeName) && storeName.length >= 3 && storeName.length <= 60;
  }

  /**
   * Validate access token format
   */
  static validateAccessToken(token: string): boolean {
    // Shopify access tokens start with 'shpat_' followed by alphanumeric characters
    // Total length is typically around 32-40 characters
    const tokenRegex = /^shpat_[a-zA-Z0-9]{20,}$/;
    return tokenRegex.test(token) && token.length >= 25;
  }

  /**
   * Generate shop domain from store name
   */
  static generateShopDomain(storeName: string): string {
    if (storeName.includes('.myshopify.com')) {
      return storeName;
    }
    return `${storeName}.myshopify.com`;
  }

  /**
   * Get total product count
   */
  static async getProductCount(): Promise<ShopifyApiResponse<{ totalProducts: number }>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const response = await api.get<ShopifyApiResponse<{ totalProducts: number }>>(
        API_ENDPOINTS.SHOPIFY_PRODUCT_COUNT,
      );

      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to fetch product count');
    }
  }

  /**
   * Get all locations for the store
   */
  static async getLocations(): Promise<ShopifyApiResponse<ShopifyLocationsResponse>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const response = await api.get<ShopifyApiResponse<ShopifyLocationsResponse>>(
        API_ENDPOINTS.SHOPIFY_LOCATIONS,
      );

      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to fetch locations');
    }
  }

  /**
   * Get inventory by location
   */
  static async getInventoryByLocation(
    locationId: string,
    params?: {
      limit?: number;
      after?: string;
    },
  ): Promise<ShopifyApiResponse<ShopifyInventoryResponse>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const queryParams = new URLSearchParams();

      // Add locationId as query parameter
      queryParams.append('locationId', locationId);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.after) queryParams.append('after', params.after);

      const response = await api.get<ShopifyApiResponse<ShopifyInventoryResponse>>(
        `${API_ENDPOINTS.SHOPIFY_INVENTORY_BY_LOCATION}?${queryParams.toString()}`,
      );

      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to fetch inventory by location');
    }
  }

  /**
   * Update a product variant (including inventory, price, SKU, barcode)
   */
  static async updateProductVariant(data: {
    productId: string;
    variantId: string;
    title?: string;
    status?: string;
    sku?: string;
    barcode?: string;
    price?: number;
    compareAtPrice?: number;
    available?: number;
  }): Promise<ShopifyApiResponse<Record<string, unknown>>> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const updateData = {
        productId: data.productId,
        variantId: data.variantId,
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.available !== undefined && { inventoryQuantity: data.available }),
      };

      const response = await api.post<ShopifyApiResponse<Record<string, unknown>>>(
        API_ENDPOINTS.SHOPIFY_INVENTORY_UPDATE_VARIANT,
        updateData,
      );

      return response.data;
    }, 'updateProductVariant');
  }

  /**
   * Update multiple product variants in bulk
   */
  static async updateProductVariantsBulk(
    updates: Array<{
      productId: string;
      variantId: string;
      title?: string;
      status?: string;
      sku?: string;
      barcode?: string;
      price?: number;
      compareAtPrice?: number;
      available?: number;
    }>,
  ): Promise<
    ShopifyApiResponse<{ successful: number; failed: number; errors: Record<string, unknown>[] }>
  > {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const bulkData = {
        updates: updates.map((data) => ({
          productId: data.productId,
          variantId: data.variantId,
          ...(data.title !== undefined && { title: data.title }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.sku !== undefined && { sku: data.sku }),
          ...(data.barcode !== undefined && { barcode: data.barcode }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
          ...(data.available !== undefined && { inventoryQuantity: data.available }),
        })),
      };

      const response = await api.put<
        ShopifyApiResponse<{
          successful: number;
          failed: number;
          errors: Record<string, unknown>[];
        }>
      >(`${API_ENDPOINTS.SHOPIFY_INVENTORY}/bulk-update`, bulkData);

      return response.data;
    } catch (error: unknown) {
      const responseData = error instanceof Error ? error.message : 'Unknown error';
      throw new AppError(
        `Failed to bulk update product variants: ${responseData}`,
        ErrorCode.BAD_REQUEST,
      );
    }
  }

  /**
   * Validate SKUs from CSV data against Shopify products
   */
  static async validateSkus(csvData: Array<{ sku: string; fnsku: string }>): Promise<
    ShopifyApiResponse<{
      foundProducts: Array<{
        productId: string;
        variantId: string;
        productTitle: string;
        sku: string;
        currentBarcode: string;
        newBarcode: string;
        status: string;
        price: string;
        imageUrl: string;
      }>;
      notFoundSkus: Array<{
        sku: string;
        fnsku: string;
        reason: string;
      }>;
      totalCsvRows: number;
      foundCount: number;
      notFoundCount: number;
      summary: string;
    }>
  > {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const requestData = {
        csvData: csvData.map((row) => ({
          sku: row.sku,
          fnsku: row.fnsku,
        })),
      };

      const response = await api.post<
        ShopifyApiResponse<{
          foundProducts: Array<{
            productId: string;
            variantId: string;
            productTitle: string;
            sku: string;
            currentBarcode: string;
            newBarcode: string;
            status: string;
            price: string;
            imageUrl: string;
          }>;
          notFoundSkus: Array<{
            sku: string;
            fnsku: string;
            reason: string;
          }>;
          totalCsvRows: number;
          foundCount: number;
          notFoundCount: number;
          summary: string;
        }>
      >(API_ENDPOINTS.SHOPIFY_INVENTORY_VALIDATE_SKUS, requestData);

      return response.data;
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to validate SKUs');
    }
  }

  /**
   * Export not found SKUs as CSV
   */
  static async exportNotFoundSkusCsv(
    notFoundSkus: Array<{
      sku: string;
      fnsku: string;
      reason: string;
    }>,
    options?: {
      title?: string;
      storeName?: string;
    },
  ): Promise<void> {
    try {
      const requestData = {
        notFoundSkus,
        title: options?.title || 'Not Found SKUs Report',
        storeName: options?.storeName,
        generatedAt: new Date(),
      };

      const response = await api.post(
        `${API_ENDPOINTS.SHOPIFY_INVENTORY}/export-not-found-csv`,
        requestData,
        {
          responseType: 'blob',
        },
      );

      // Create blob and download
      const blob = new Blob([response.data as BlobPart], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NotFoundSKUs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to export CSV');
    }
  }

  /**
   * Export not found SKUs as PDF
   */
  static async exportNotFoundSkusPdf(
    notFoundSkus: Array<{
      sku: string;
      fnsku: string;
      reason: string;
    }>,
    options?: {
      title?: string;
      storeName?: string;
    },
  ): Promise<void> {
    try {
      const requestData = {
        notFoundSkus,
        title: options?.title || 'Not Found SKUs Report',
        storeName: options?.storeName,
        generatedAt: new Date(),
      };

      const response = await api.post(
        `${API_ENDPOINTS.SHOPIFY_INVENTORY}/export-not-found-pdf`,
        requestData,
        {
          responseType: 'blob',
        },
      );

      // Create blob and download
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `NotFoundSKUs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error((responseData?.message as string) || 'Failed to export PDF');
    }
  }

  // Cost Fetching Methods
  static async startCostFetching(): Promise<
    ShopifyApiResponse<{
      jobId: string;
      message: string;
      totalVariants: number;
      duration: number;
    }>
  > {
    return await safeAsync(async () => {
      const response = await api.post<
        ShopifyApiResponse<{
          jobId: string;
          message: string;
          totalVariants: number;
          duration: number;
        }>
      >(API_ENDPOINTS.SHOPIFY_COSTS_FETCH);
      return response.data;
    }, 'startCostFetching');
  }

  static async getCostFetchingProgress(jobId: string): Promise<
    ShopifyApiResponse<{
      jobId: string;
      status: string;
      current: number;
      total: number;
      updated: number;
      failed: number;
      percentage: number;
      currentItem: string;
      startTime: string;
      endTime?: string;
      duration?: number;
      error?: string;
    }>
  > {
    return await safeAsync(async () => {
      const response = await api.get<
        ShopifyApiResponse<{
          jobId: string;
          status: string;
          current: number;
          total: number;
          updated: number;
          failed: number;
          percentage: number;
          currentItem: string;
          startTime: string;
          endTime?: string;
          duration?: number;
          error?: string;
        }>
      >(API_ENDPOINTS.SHOPIFY_COSTS_PROGRESS(jobId));
      return response.data;
    }, 'getCostFetchingProgress');
  }

  static async cancelCostFetching(jobId: string): Promise<
    ShopifyApiResponse<{
      jobId: string;
      cancelled: boolean;
    }>
  > {
    return await safeAsync(async () => {
      const response = await api.post<
        ShopifyApiResponse<{
          jobId: string;
          cancelled: boolean;
        }>
      >(API_ENDPOINTS.SHOPIFY_COSTS_CANCEL(jobId));
      return response.data;
    }, 'cancelCostFetching');
  }

  static async getCostStats(): Promise<
    ShopifyApiResponse<{
      totalVariants: number;
      variantsWithCost: number;
      variantsWithoutCost: number;
      costPercentage: number;
    }>
  > {
    return await safeAsync(async () => {
      const response = await api.get<
        ShopifyApiResponse<{
          totalVariants: number;
          variantsWithCost: number;
          variantsWithoutCost: number;
          costPercentage: number;
        }>
      >(API_ENDPOINTS.SHOPIFY_COSTS_STATS);
      return response.data;
    }, 'getCostStats');
  }

  /**
   * Get top selling products
   */
  static async getTopSellingProducts(params?: {
    startDate?: string;
    endDate?: string;
    currency?: string;
    limit?: number;
  }): Promise<
    ShopifyApiResponse<{
      topProducts: Array<{
        name: string;
        quantity: number;
        revenue: number;
        cost: number;
        profit: number;
        margin: number;
      }>;
      dateRange: {
        startDate?: string;
        endDate?: string;
      };
      currency: string;
      limit: number;
    }>
  > {
    return await safeAsync(async () => {
      const response = await api.get<
        ShopifyApiResponse<{
          topProducts: Array<{
            name: string;
            quantity: number;
            revenue: number;
            cost: number;
            profit: number;
            margin: number;
          }>;
          dateRange: {
            startDate?: string;
            endDate?: string;
          };
          currency: string;
          limit: number;
        }>
      >(API_ENDPOINTS.SHOPIFY_TOP_SELLING_PRODUCTS, {
        params,
      });
      return response.data;
    }, 'getTopSellingProducts');
  }
}

export default ShopifyService;

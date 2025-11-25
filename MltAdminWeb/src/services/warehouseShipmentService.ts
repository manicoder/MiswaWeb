import { api } from './api';
import { safeAsync } from '../utils/errorHandler';

export interface Warehouse {
  id: number;
  name: string;
  location?: string;
  isActive?: boolean;
}

export interface WarehouseShipment {
  id: number;
  shipmentNumber: string;
  status: 'draft' | 'created' | 'dispatched' | 'received' | 'completed';
  notes?: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  updatedAt: string;
  createdBy: string;
  dispatchedBy?: string;
  receivedBy?: string;
  items: WarehouseShipmentItem[];
  totalItemsCount: number;
  totalDispatchedCount: number;
  totalReceivedCount: number;
  totalValue: number;
  sourceWarehouse?: Warehouse;
  destinationWarehouse?: Warehouse;
}

export interface WarehouseShipmentItem {
  id: number;
  shipmentId: number;
  productBarcode: string;
  shopifyProductId: string;
  shopifyVariantId: string;
  productTitle: string;
  variantTitle?: string;
  sku?: string;
  quantityPlanned: number;
  quantityDispatched: number;
  quantityReceived: number;
  unitPrice: number;
  compareAtPrice?: number;
  currency: string;
  productImageUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isExistingItem?: boolean;
}

export interface BarcodeProductInfo {
  shopifyProductId: string;
  shopifyVariantId: string;
  productTitle: string;
  variantTitle?: string;
  sku?: string;
  barcode: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  imageUrl?: string;
  availableQuantity: number;
  isFound: boolean;
  errorMessage?: string;
}

export interface CreateShipmentRequest {
  notes?: string;
}

export interface AddProductRequest {
  shipmentId: number;
  barcode: string;
  quantity: number;
  notes?: string;
}

export interface DispatchShipmentRequest {
  shipmentId: number;
  items: Array<{
    itemId: number;
    quantityDispatched: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface ReceiveShipmentRequest {
  shipmentId: number;
  items: Array<{
    itemId: number;
    quantityReceived: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface ShipmentListResponse {
  shipments: WarehouseShipment[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Add new interfaces for database product lookup
interface DatabaseProduct {
  id: string;
  title: string;
  variantTitle?: string;
  sku: string;
  barcode: string;
  price: number;
  currency: string;
  imageUrl?: string;
  availableQuantity: number;
  category?: string;
  platform: 'shopify' | 'amazon' | 'flipkart';
  isActive: boolean;
}

interface ProductSearchParams {
  query: string;
  page?: number;
  pageSize?: number;
  platform?: string;
  category?: string;
}

interface ProductSearchResult {
  products: DatabaseProduct[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
}

interface BulkUploadRequest {
  shipmentId: number;
  csvData: Array<{
    sku: string;
    quantity: number;
    notes?: string;
  }>;
}

interface BulkUploadResult {
  success: boolean;
  processedCount: number;
  errorCount: number;
  errors: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
}

class WarehouseShipmentService {
  private baseUrl = '/warehouseshipment';

  async getShipments(params?: {
    pageNumber?: number;
    pageSize?: number;
    status?: string;
  }): Promise<ApiResponse<ShipmentListResponse>> {
    return await safeAsync(async () => {
      const searchParams = new URLSearchParams();
      if (params?.pageNumber) searchParams.append('pageNumber', params.pageNumber.toString());
      if (params?.pageSize) searchParams.append('pageSize', params.pageSize.toString());
      if (params?.status) searchParams.append('status', params.status);

      const url = `${this.baseUrl}?${searchParams.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data as ShipmentListResponse };
    }, 'getShipments');
  }

  async getShipmentById(id: number): Promise<ApiResponse<WarehouseShipment>> {
    return await safeAsync(async () => {
      const response = await api.get(`${this.baseUrl}/${id}`);
      return { success: true, data: response.data as WarehouseShipment };
    }, 'getShipmentById');
  }

  async createShipment(request: CreateShipmentRequest): Promise<ApiResponse<WarehouseShipment>> {
    return await safeAsync(async () => {
      const response = await api.post(this.baseUrl, request);
      return { success: true, data: response.data as WarehouseShipment };
    }, 'createShipment');
  }

  async deleteShipment(id: number): Promise<ApiResponse<void>> {
    return await safeAsync(async () => {
      await api.delete(`${this.baseUrl}/${id}`);
      return { success: true, data: undefined };
    }, 'deleteShipment');
  }

  // Database-based product lookup by barcode
  async getProductByBarcode(barcode: string): Promise<ApiResponse<BarcodeProductInfo>> {
    return await safeAsync(async () => {
      const response = await api.get(
        `${this.baseUrl}/products/barcode/${encodeURIComponent(barcode)}`,
      );

      // Backend returns BarcodeProductInfoDto directly
      const productInfo = response.data as BarcodeProductInfo;

      return {
        success: true,
        data: {
          barcode: productInfo.barcode,
          shopifyProductId: productInfo.shopifyProductId,
          shopifyVariantId: productInfo.shopifyVariantId,
          productTitle: productInfo.productTitle,
          variantTitle: productInfo.variantTitle,
          sku: productInfo.sku,
          price: productInfo.price,
          compareAtPrice: productInfo.compareAtPrice,
          currency: productInfo.currency,
          imageUrl: productInfo.imageUrl,
          availableQuantity: productInfo.availableQuantity,
          isFound: productInfo.isFound,
          errorMessage: productInfo.errorMessage,
        },
      };
    }, 'getProductByBarcode');
  }

  // Search products in database
  async searchProducts(params: ProductSearchParams): Promise<ApiResponse<ProductSearchResult>> {
    try {
      const queryParams = new URLSearchParams({
        q: params.query,
        page: (params.page || 1).toString(),
        pageSize: (params.pageSize || 10).toString(),
        ...(params.platform && { platform: params.platform }),
        ...(params.category && { category: params.category }),
      });

      const response = await api.get(`${this.baseUrl}/products/search?${queryParams}`);
      const data = response.data as Record<string, unknown>;

      if (data.success) {
        return {
          success: true,
          data: {
            products: (data.products as DatabaseProduct[]) || [],
            totalCount: (data.totalCount as number) || 0,
            pageCount: (data.pageCount as number) || 0,
            currentPage: (data.currentPage as number) || 1,
          },
        };
      } else {
        const emptyResult: ProductSearchResult = {
          products: [],
          totalCount: 0,
          pageCount: 0,
          currentPage: 1,
        };
        return {
          success: false,
          data: emptyResult,
          error: (data.message as string) || 'Failed to search products',
        };
      }
    } catch (error) {
      console.error('Error searching products:', error);
      const emptyResult: ProductSearchResult = {
        products: [],
        totalCount: 0,
        pageCount: 0,
        currentPage: 1,
      };
      return {
        success: false,
        data: emptyResult,
        error: 'Failed to search products',
      };
    }
  }

  // Add product to shipment by barcode
  async addProductToShipment(request: {
    shipmentId: number;
    barcode: string;
    quantity: number;
    notes?: string;
    // New optional fields for direct product addition
    shopifyProductId?: string;
    shopifyVariantId?: string;
    productTitle?: string;
    variantTitle?: string;
    sku?: string;
    price?: number;
    compareAtPrice?: number;
    currency?: string;
    productImageUrl?: string;
  }): Promise<ApiResponse<{ isExistingItem: boolean }>> {
    try {
      // Use correct endpoint format from backend controller
      const response = await api.post(`${this.baseUrl}/items`, request);

      // Backend returns the created/updated item with isExistingItem property
      const responseData = response.data as Record<string, unknown>;
      const isExistingItem = (responseData?.isExistingItem as boolean) || false;

      // Return success response with isExistingItem flag
      return {
        success: true,
        data: {
          isExistingItem,
        },
      };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error adding product to shipment:', error);
      return {
        success: false,
        data: { isExistingItem: false },
        error: (responseData?.message as string) || 'Failed to add product to shipment',
      };
    }
  }

  // Remove product from shipment
  async removeProductFromShipment(shipmentId: number, itemId: number): Promise<ApiResponse<void>> {
    try {
      await api.delete(`${this.baseUrl}/${shipmentId}/items/${itemId}`);
      return { success: true, data: undefined };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error removing product from shipment:', error);
      return {
        success: false,
        data: undefined,
        error: (responseData?.message as string) || 'Failed to remove product from shipment',
      };
    }
  }

  // Update item quantity
  async updateItemQuantity(itemId: number, quantity: number): Promise<ApiResponse<void>> {
    try {
      await api.put(`${this.baseUrl}/items/${itemId}/quantity`, { quantity });
      return { success: true, data: undefined };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error updating item quantity:', error);
      return {
        success: false,
        data: undefined,
        error: (responseData?.message as string) || 'Failed to update item quantity',
      };
    }
  }

  async dispatchShipment(
    request: DispatchShipmentRequest,
  ): Promise<ApiResponse<WarehouseShipment>> {
    try {
      const response = await api.post(`${this.baseUrl}/${request.shipmentId}/dispatch`, request);
      return { success: true, data: response.data as WarehouseShipment };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error dispatching shipment:', error);
      return {
        success: false,
        data: {} as WarehouseShipment,
        error: (responseData?.message as string) || 'Failed to dispatch shipment',
      };
    }
  }

  async receiveShipment(request: ReceiveShipmentRequest): Promise<ApiResponse<WarehouseShipment>> {
    try {
      const response = await api.post(`${this.baseUrl}/${request.shipmentId}/receive`, request);
      return { success: true, data: response.data as WarehouseShipment };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error receiving shipment:', error);
      return {
        success: false,
        data: {} as WarehouseShipment,
        error: (responseData?.message as string) || 'Failed to receive shipment',
      };
    }
  }

  async completeShipment(id: number): Promise<ApiResponse<WarehouseShipment>> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/complete`);
      return { success: true, data: response.data as WarehouseShipment };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      console.error('Error completing shipment:', error);
      return {
        success: false,
        data: {} as WarehouseShipment,
        error: (responseData?.message as string) || 'Failed to complete shipment',
      };
    }
  }

  async updateShipmentStatus(id: number, status: string): Promise<ApiResponse<WarehouseShipment>> {
    return await safeAsync(async () => {
      const response = await api.put(`${this.baseUrl}/${id}/status`, { status });
      return { success: true, data: response.data as WarehouseShipment };
    }, 'updateShipmentStatus');
  }

  async updateShipmentNotes(id: number, notes: string): Promise<ApiResponse<WarehouseShipment>> {
    return await safeAsync(async () => {
      const response = await api.put(`${this.baseUrl}/${id}/notes`, { notes });
      return { success: true, data: response.data as WarehouseShipment };
    }, 'updateShipmentNotes');
  }

  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse<Record<string, unknown>>> {
    return await safeAsync(async () => {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);

      const url = `${this.baseUrl}/analytics?${searchParams.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data as Record<string, unknown> };
    }, 'getAnalytics');
  }

  async getPendingDispatchShipments(): Promise<ApiResponse<WarehouseShipment[]>> {
    return await safeAsync(async () => {
      const response = await api.get(`${this.baseUrl}/pending-dispatch`);
      return { success: true, data: response.data as WarehouseShipment[] };
    }, 'getPendingDispatchShipments');
  }

  async getPendingReceiveShipments(): Promise<ApiResponse<WarehouseShipment[]>> {
    return await safeAsync(async () => {
      const response = await api.get(`${this.baseUrl}/pending-receive`);
      return { success: true, data: response.data as WarehouseShipment[] };
    }, 'getPendingReceiveShipments');
  }

  // Bulk upload products from CSV
  async bulkUploadProducts(
    shipmentId: number,
    csvFile: File,
  ): Promise<ApiResponse<BulkUploadResult>> {
    return await safeAsync(async () => {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('shipmentId', shipmentId.toString());

      const response = await api.post(`${this.baseUrl}/${shipmentId}/bulk-upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = response.data as Record<string, unknown>;

      if (data.success) {
        return {
          success: true,
          data: {
            success: true,
            processedCount: data.processedCount as number,
            errorCount: data.errorCount as number,
            errors: (data.errors as Array<{ row: number; sku: string; error: string }>) || [],
          },
        };
      } else {
        const errorResult: BulkUploadResult = {
          success: false,
          processedCount: 0,
          errorCount: 0,
          errors: [],
        };
        return {
          success: false,
          data: errorResult,
          error: (data.message as string) || 'Failed to process CSV file',
        };
      }
    }, 'bulkUploadProducts');
  }

  // Get product suggestions (autocomplete)
  async getProductSuggestions(
    query: string,
    limit: number = 5,
  ): Promise<ApiResponse<DatabaseProduct[]>> {
    return await safeAsync(async () => {
      const response = await api.get(
        `${this.baseUrl}/products/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
      );
      const data = response.data as Record<string, unknown>;

      if (data.success) {
        return {
          success: true,
          data: (data.products as DatabaseProduct[]) || [],
        };
      } else {
        return {
          success: false,
          data: [],
          error: (data.message as string) || 'Failed to get product suggestions',
        };
      }
    }, 'getProductSuggestions');
  }
}

export const warehouseShipmentService = new WarehouseShipmentService();

// Export new types
export type {
  DatabaseProduct,
  ProductSearchParams,
  ProductSearchResult,
  BulkUploadRequest,
  BulkUploadResult,
};

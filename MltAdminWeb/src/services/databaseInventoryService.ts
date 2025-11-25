import api from './api';
import { safeAsync, AppError, ErrorCode } from '../utils/errorHandler';
import { ShopifyService } from './shopifyService';

// Types for database-backed inventory
export interface InventoryItem {
  productId: string;
  title: string;
  status: string;
  imageUrl: string;
  imageAltText: string;
  variants: InventoryVariant[];
}

export interface InventoryVariant {
  variantId: string;
  sku: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  inventoryItemId: string;
  available: number;
  inventoryLevels?: InventoryLevel[]; // Add location-specific inventory levels
}

export interface InventoryLevel {
  locationId: string;
  locationName: string;
  available: number;
}

export interface InventoryParams {
  search?: string;
  status?: string;
  inventoryFilter?: string; // 'all', 'in_stock', 'out_of_stock', 'low_stock'
  page?: number;
  limit?: number;
  method?: string; // 'window', 'offset'
}

export interface DatabaseInventoryResponse {
  success: boolean;
  data?: {
    inventory: InventoryItem[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      currentPage: number;
      totalPages: number;
      pageSize: number;
    };
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
  error?: string;
}

export interface InventoryCountResponse {
  success: boolean;
  data?: {
    all: number;
    inStock: number;
    outOfStock: number;
    lowStock: number;
    active: number;
    draft: number;
    archived: number;
  };
  error?: string;
}

class DatabaseInventoryService {
  /**
   * Fetch inventory with database-backed pagination
   */
  async fetchInventory(params: InventoryParams = {}): Promise<DatabaseInventoryResponse> {
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

      // Add pagination parameters
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.inventoryFilter) queryParams.append('inventoryFilter', params.inventoryFilter);
      if (params.method) queryParams.append('method', params.method);

      const response = await api.get(`/shopify/inventory?${queryParams}`);
      const responseData = response.data as Record<string, unknown>;

      if (!responseData.success) {
        throw new AppError(
          (responseData.error as string) || 'Failed to fetch inventory',
          ErrorCode.BAD_REQUEST,
        );
      }

      const data = responseData.data as Record<string, unknown>;
      return {
        success: true,
        data: {
          inventory: (data?.inventory as InventoryItem[]) || [],
          pageInfo: {
            hasNextPage:
              ((data?.pageInfo as Record<string, unknown>)?.hasNextPage as boolean) || false,
            hasPreviousPage:
              ((data?.pageInfo as Record<string, unknown>)?.hasPreviousPage as boolean) || false,
            currentPage: ((data?.pageInfo as Record<string, unknown>)?.currentPage as number) || 1,
            totalPages: ((data?.pageInfo as Record<string, unknown>)?.totalPages as number) || 1,
            pageSize:
              ((data?.pageInfo as Record<string, unknown>)?.pageSize as number) ||
              params.limit ||
              50,
          },
          total: (data?.total as number) || 0,
          page: (data?.page as number) || 1,
          pageSize: (data?.pageSize as number) || params.limit || 50,
          totalPages: (data?.totalPages as number) || 1,
          hasMore: (data?.hasMore as boolean) || false,
          hasPrevious: (data?.hasPrevious as boolean) || false,
        },
      };
    }, 'fetchInventory');
  }

  /**
   * Get inventory count statistics
   */
  async getInventoryCount(): Promise<InventoryCountResponse> {
    return await safeAsync(async () => {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new AppError(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
          ErrorCode.BAD_REQUEST,
        );
      }

      const response = await api.get('/shopify/inventory/count');
      const responseData = response.data as Record<string, unknown>;

      if (!responseData.success) {
        throw new AppError(
          (responseData.error as string) || 'Failed to fetch inventory counts',
          ErrorCode.BAD_REQUEST,
        );
      }

      return {
        success: true,
        data: responseData.data as InventoryCountResponse['data'],
      };
    }, 'getInventoryCount');
  }

  /**
   * Search inventory items
   */
  async searchInventory(
    query: string,
    params: InventoryParams = {},
  ): Promise<DatabaseInventoryResponse> {
    return this.fetchInventory({ ...params, search: query });
  }
}

export const databaseInventoryService = new DatabaseInventoryService();
export default databaseInventoryService;

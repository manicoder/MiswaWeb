import { api, API_ENDPOINTS } from './api';
import type {
  OrderSyncResult,
  OrderListResult,
  OrderCountResult,
  ShopifyOrder,
} from '../types/orders';

class OrderSyncService {
  async syncOrders(forceRefresh = false): Promise<OrderSyncResult> {
    try {
      const response = await api.post(
        `${API_ENDPOINTS.SHOPIFY_SYNC_ORDERS}?forceRefresh=${forceRefresh}`,
        undefined,
        {
          timeout: 0, // Infinite timeout for sync operations
        },
      );
      return response.data as OrderSyncResult;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error syncing orders:', error);
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Failed to sync orders',
        };
      }
      return {
        success: false,
        error: 'Failed to sync orders',
      };
    }
  }

  // New method for real-time progress tracking
  async syncOrdersWithProgress(
    forceRefresh = false,
    onProgress?: (progress: { current: number; total: number; message: string }) => void,
  ): Promise<OrderSyncResult> {
    // Simulate progress updates since backend doesn't support SSE yet
    const progressInterval = setInterval(() => {
      if (onProgress) {
        onProgress({
          current: Math.floor(Math.random() * 50) + 10,
          total: 100,
          message: 'Syncing orders from Shopify...',
        });
      }
    }, 1000);

    try {
      const result = await this.syncOrders(forceRefresh);

      // Clear progress interval
      clearInterval(progressInterval);

      // Show completion progress
      if (onProgress && result.success) {
        onProgress({
          current: result.synced || 0,
          total: result.synced || 0,
          message: 'Sync completed successfully!',
        });
      }

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      const response = await api.get('/shopify/orders/sync/stats');
      const responseData = response.data as Record<string, unknown>;

      if (!responseData.success) {
        throw new Error((responseData.error as string) || 'Failed to get sync stats');
      }

      const data = responseData.data as Record<string, unknown>;
      const lastSyncAt = data.lastSyncTimestamp as string;

      return lastSyncAt ? new Date(lastSyncAt) : null;
    } catch (error: unknown) {
      console.error('Error getting last sync timestamp:', error);
      return null;
    }
  }

  async incrementalSyncOrders(sinceDate?: Date): Promise<OrderSyncResult> {
    try {
      let params = '';
      if (sinceDate) {
        // Format the date as ISO string for the backend
        params = `?sinceDate=${sinceDate.toISOString()}`;
      }

      const response = await api.post(`/shopify/orders/sync/incremental${params}`, undefined, {
        timeout: 0, // Infinite timeout
      });
      return response.data as OrderSyncResult;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error incremental syncing orders:', error);
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Failed to incremental sync orders',
        };
      }
      return {
        success: false,
        error: 'Failed to incremental sync orders',
      };
    }
  }

  async syncRecentOrders(daysBack = 30): Promise<OrderSyncResult> {
    try {
      const response = await api.post(
        `/shopify/orders/sync/recent?daysBack=${daysBack}`,
        undefined,
        {
          timeout: 0, // Infinite timeout
        },
      );
      return response.data as OrderSyncResult;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error syncing recent orders:', error);
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Failed to sync recent orders',
        };
      }
      return {
        success: false,
        error: 'Failed to sync recent orders',
      };
    }
  }

  async syncUnfulfilledOrders(): Promise<OrderSyncResult> {
    try {
      const response = await api.post(`/shopify/orders/sync/unfulfilled`, undefined, {
        timeout: 0, // Infinite timeout
      });
      return response.data as OrderSyncResult;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error syncing unfulfilled orders:', error);
        return {
          success: false,
          error: err.response?.data?.error || err.message || 'Failed to sync unfulfilled orders',
        };
      }
      return {
        success: false,
        error: 'Failed to sync unfulfilled orders',
      };
    }
  }

  async getLocalOrders(
    params: {
      search?: string;
      status?: string;
      fulfillmentStatus?: string;
      page?: number;
      limit?: number;
      method?: string;
    } = {},
  ): Promise<OrderListResult> {
    try {
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.fulfillmentStatus)
        queryParams.append('fulfillmentStatus', params.fulfillmentStatus);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.method) queryParams.append('method', params.method);

      const response = await api.get(`/shopify/orders/local?${queryParams.toString()}`);
      return (response.data as { data: OrderListResult }).data;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error fetching local orders:', error);
        throw new Error(err.response?.data?.error || err.message || 'Failed to fetch orders');
      }
      throw new Error('Failed to fetch orders');
    }
  }

  async getOrderCount(): Promise<OrderCountResult> {
    try {
      const response = await api.get(`/shopify/orders/count`);
      return (response.data as { data: OrderCountResult }).data;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { error?: string } }; message?: string };
        console.error('Error fetching order count:', error);
        throw new Error(err.response?.data?.error || err.message || 'Failed to fetch order count');
      }
      throw new Error('Failed to fetch order count');
    }
  }

  async hasLocalOrders(): Promise<boolean> {
    try {
      const count = await this.getOrderCount();
      return count.total > 0;
    } catch {
      return false;
    }
  }

  // Helper method to format order data for display
  formatOrderForDisplay(order: ShopifyOrder) {
    return {
      ...order,
      displayName: order.name || order.orderNumber,
      displayCustomer: order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
        : 'No customer info',
      displayTotal: `${order.currency} ${parseFloat(order.totalPrice).toFixed(2)}`,
      displayStatus: order.displayFulfillmentStatus || order.fulfillmentStatus,
      displayFinancialStatus: order.displayFinancialStatus,
      displayDate: new Date(order.createdAt).toLocaleDateString(),
      displayTime: new Date(order.createdAt).toLocaleTimeString(),
      totalItems: order.lineItems.reduce((sum: number, item) => sum + item.quantity, 0),
    };
  }

  // Helper method to get status color
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'fulfilled':
        return 'green';
      case 'unfulfilled':
        return 'orange';
      case 'cancelled':
        return 'red';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  }

  // Helper method to get financial status color
  getFinancialStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'green';
      case 'unpaid':
        return 'red';
      case 'refunded':
        return 'purple';
      case 'pending':
        return 'yellow';
      default:
        return 'gray';
    }
  }
}

// Export the service instance and types
export const orderSyncService = new OrderSyncService();
export type { OrderSyncResult, OrderListResult, OrderCountResult, ShopifyOrder };

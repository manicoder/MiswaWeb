import { api } from './api';
import type { PaginatedResponse, LoadMoreParams } from '../hooks/usePagination';
import { ShopifyService } from './shopifyService';

export interface ShopifyOrder {
  id: string;
  name: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: string;
  currency: string;
  fulfillmentStatus: string;
  displayFulfillmentStatus: string;
  displayFinancialStatus: string;
  platform: 'shopify';
  status: string;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  lineItems: Array<{
    id: string;
    title: string;
    quantity: number;
    originalTotalPrice: string;
    image?: {
      url: string;
      altText?: string;
    };
  }>;
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address1: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  status: string;
  tags: string[];
  variants: Array<{
    id: string;
    title: string;
    price: string;
    compareAtPrice?: string;
    sku: string;
    inventoryQuantity: number;
    barcode?: string;
  }>;
  images: Array<{
    id: string;
    url: string;
    altText?: string;
    width?: number;
    height?: number;
  }>;
}

export interface OrdersParams extends LoadMoreParams {
  orderType?: 'all' | 'unfulfilled' | 'today';
  status?: string;
  fulfillmentStatus?: string;
  financialStatus?: string;
  startDate?: string;
  endDate?: string;
  createdAtMin?: string;
  createdAtMax?: string;
}

export interface ProductsParams extends LoadMoreParams {
  status?: 'active' | 'draft' | 'archived';
  vendor?: string;
  productType?: string;
}

class PaginatedShopifyService {
  /**
   * Fetch orders with cursor-based pagination
   */
  async fetchOrders(params: OrdersParams = {}): Promise<PaginatedResponse<ShopifyOrder>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const queryParams = new URLSearchParams();

      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.after) queryParams.append('after', params.after);

      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.orderType) queryParams.append('orderType', params.orderType);
      if (params.status) queryParams.append('status', params.status);
      if (params.fulfillmentStatus)
        queryParams.append('fulfillment_status', params.fulfillmentStatus);
      if (params.financialStatus) queryParams.append('financial_status', params.financialStatus);
      if (params.startDate) queryParams.append('start_date', params.startDate);
      if (params.endDate) queryParams.append('end_date', params.endDate);
      if (params.createdAtMin) queryParams.append('created_at_min', params.createdAtMin);
      if (params.createdAtMax) queryParams.append('created_at_max', params.createdAtMax);

      // Add cache busting parameter to ensure fresh data
      queryParams.append('_t', Date.now().toString());

      const response = await api.get(`/shopify/orders?${queryParams}`);
      const responseData = response.data as Record<string, unknown>;

      if (!responseData.success) {
        throw new Error((responseData.error as string) || 'Failed to fetch orders');
      }

      // Transform the response to match our expected format
      const data = responseData.data as Record<string, unknown>;
      const orders = (data?.orders as unknown[]) || [];
      const pageInfo = (data?.pageInfo as Record<string, unknown>) || {};

      return {
        success: true,
        data: {
          items: orders.map((order: unknown): ShopifyOrder => {
            const o = order as Record<string, unknown>;
            return {
              id: o.id as string,
              name: (o.name as string) || (o.orderNumber as string) || `#${o.id}`,
              orderNumber: (o.orderNumber as string) || (o.name as string) || `#${o.id}`,
              createdAt: o.createdAt as string,
              updatedAt: o.updatedAt as string,
              totalPrice: (o.totalPrice as string) || '0.00',
              currency: (o.currency as string) || 'INR',
              fulfillmentStatus: (o.fulfillmentStatus as string) || 'unfulfilled',
              displayFulfillmentStatus:
                (o.displayFulfillmentStatus as string) ||
                (o.fulfillmentStatus as string) ||
                'Unfulfilled',
              displayFinancialStatus:
                (o.displayFinancialStatus as string) || (o.financialStatus as string) || 'Pending',
              platform: 'shopify' as const,
              status: (o.fulfillmentStatus as string) || 'unfulfilled',
              customer: o.customer
                ? {
                    id: (o.customer as Record<string, unknown>).id as string,
                    firstName: ((o.customer as Record<string, unknown>).firstName as string) || '',
                    lastName: ((o.customer as Record<string, unknown>).lastName as string) || '',
                    email: ((o.customer as Record<string, unknown>).email as string) || '',
                  }
                : undefined,
              lineItems: ((o.lineItems as unknown[]) || []).map((item: unknown) => {
                const i = item as Record<string, unknown>;
                return {
                  id: i.id as string,
                  title: (i.title as string) || (i.name as string) || 'Unknown Product',
                  quantity: (i.quantity as number) || 1,
                  originalTotalPrice:
                    (i.originalTotalPrice as string) || (i.price as string) || '0.00',
                  image: i.image
                    ? {
                        url:
                          ((i.image as Record<string, unknown>).url as string) ||
                          ((i.image as Record<string, unknown>).src as string),
                        altText:
                          ((i.image as Record<string, unknown>).altText as string) ||
                          ((i.image as Record<string, unknown>).alt as string) ||
                          (i.title as string),
                      }
                    : undefined,
                };
              }),
              shippingAddress: o.shippingAddress
                ? {
                    firstName:
                      ((o.shippingAddress as Record<string, unknown>).firstName as string) || '',
                    lastName:
                      ((o.shippingAddress as Record<string, unknown>).lastName as string) || '',
                    address1:
                      ((o.shippingAddress as Record<string, unknown>).address1 as string) || '',
                    city: ((o.shippingAddress as Record<string, unknown>).city as string) || '',
                    province:
                      ((o.shippingAddress as Record<string, unknown>).province as string) || '',
                    country:
                      ((o.shippingAddress as Record<string, unknown>).country as string) || '',
                    zip: ((o.shippingAddress as Record<string, unknown>).zip as string) || '',
                  }
                : undefined,
            };
          }),
          pageInfo: {
            hasNextPage: (pageInfo.hasNextPage as boolean) || false,
            hasPreviousPage: (pageInfo.hasPreviousPage as boolean) || false,
            startCursor: (pageInfo.startCursor as string) || null,
            endCursor: (pageInfo.endCursor as string) || null,
          },
          total: (data?.total as number) || orders.length,
          hasMore: (data?.hasMore as boolean) || (pageInfo.hasNextPage as boolean) || false,
        },
      };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error(
        (responseData?.error as string) || (err.message as string) || 'Failed to fetch orders',
      );
    }
  }

  /**
   * Fetch products with page-based pagination
   */
  async fetchProducts(params: ProductsParams = {}): Promise<PaginatedResponse<ShopifyProduct>> {
    try {
      // First check if Shopify connection exists
      const connectionStatus = await ShopifyService.getConnectionStatus();

      if (!connectionStatus.isConnected) {
        throw new Error(
          connectionStatus.error || 'No Shopify store connected. Please connect your store first.',
        );
      }

      const queryParams = new URLSearchParams();

      // Add pagination parameters - switch from cursor to page-based
      if (params.limit) queryParams.append('limit', params.limit.toString());

      // Convert cursor-based pagination to page-based
      const page = params.after ? parseInt(params.after) + 1 : 1;
      queryParams.append('page', page.toString());

      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.vendor) queryParams.append('vendor', params.vendor);
      if (params.productType) queryParams.append('product_type', params.productType);

      // Remove cache busting to allow proper React Query caching
      // queryParams.append('_t', Date.now().toString());

      const response = await api.get(`/shopify/products?${queryParams}`);
      const responseData = response.data as Record<string, unknown>;

      if (!responseData.success) {
        throw new Error((responseData.error as string) || 'Failed to fetch products');
      }

      // Transform the response to match our expected format
      const data = responseData.data as Record<string, unknown>;
      const products = (data?.products as unknown[]) || [];
      const pageInfo = (data?.pageInfo as Record<string, unknown>) || {};

      return {
        success: true,
        data: {
          items: products.map((product: unknown): ShopifyProduct => {
            const p = product as Record<string, unknown>;
            return {
              id: p.id as string,
              title: p.title as string,
              handle: p.handle as string,
              vendor: (p.vendor as string) || '',
              productType: (p.productType as string) || '',
              createdAt: p.createdAt as string,
              updatedAt: p.updatedAt as string,
              publishedAt: p.publishedAt as string,
              status: p.status as string,
              tags: ((p.tags as string[]) || []).filter(Boolean),
              variants: ((p.variants as unknown[]) || []).map((variant: unknown) => {
                const v = variant as Record<string, unknown>;
                return {
                  id: v.id as string,
                  title: v.title as string,
                  price: v.price as string,
                  sku: v.sku as string,
                  inventoryQuantity: (v.inventoryQuantity as number) || 0,
                  barcode: v.barcode as string,
                };
              }),
              images: ((p.images as unknown[]) || []).map((image: unknown) => {
                const img = image as Record<string, unknown>;
                return {
                  id: img.id as string,
                  url: img.url as string,
                  altText: img.altText as string,
                  width: img.width as number,
                  height: img.height as number,
                };
              }),
            };
          }),
          pageInfo: {
            hasNextPage: (pageInfo.hasNextPage as boolean) || (data?.hasMore as boolean) || false,
            hasPreviousPage:
              (pageInfo.hasPreviousPage as boolean) || (data?.hasPrevious as boolean) || false,
            startCursor: (page - 1).toString(),
            endCursor: page.toString(),
          },
          total: (data?.total as number) || products.length,
          hasMore: (data?.hasMore as boolean) || (pageInfo.hasNextPage as boolean) || false,
          // Add page-specific data
          currentPage: (data?.page as number) || page,
          totalPages:
            (data?.totalPages as number) ||
            Math.ceil(((data?.total as number) || products.length) / (params.limit || 50)),
          pageSize: (data?.pageSize as number) || params.limit || 50,
        },
      };
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      const responseData = (err.response as Record<string, unknown>)?.data as Record<
        string,
        unknown
      >;
      throw new Error(
        (responseData?.error as string) || (err.message as string) || 'Failed to fetch products',
      );
    }
  }

  /**
   * Search orders with cursor-based pagination
   */
  async searchOrders(
    query: string,
    params: OrdersParams = {},
  ): Promise<PaginatedResponse<ShopifyOrder>> {
    return this.fetchOrders({
      ...params,
      search: query,
    });
  }

  /**
   * Search products with page-based pagination
   */
  async searchProducts(
    query: string,
    params: ProductsParams = {},
  ): Promise<PaginatedResponse<ShopifyProduct>> {
    return this.fetchProducts({
      ...params,
      search: query,
    });
  }
}

export const paginatedShopifyService = new PaginatedShopifyService();
export default paginatedShopifyService;

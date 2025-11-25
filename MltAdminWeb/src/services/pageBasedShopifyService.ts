import { api } from './api';
import type { PagePaginationParams, PagePaginationResponse } from '../hooks/usePagePagination';
import type { ShopifyProduct } from './paginatedShopifyService';
import { ShopifyService } from './shopifyService';

export interface ProductPageParams extends PagePaginationParams {
  status?: 'active' | 'draft' | 'archived';
  vendor?: string;
  productType?: string;
}

class PageBasedShopifyService {
  /**
   * Fetch products with page-based pagination
   */
  async fetchProducts(
    params: ProductPageParams = {},
  ): Promise<PagePaginationResponse<ShopifyProduct>> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // First check if Shopify connection exists
        const connectionStatus = await ShopifyService.getConnectionStatus();

        if (!connectionStatus.isConnected) {
          throw new Error(
            connectionStatus.error ||
              'No Shopify store connected. Please connect your store first.',
          );
        }

        const queryParams = new URLSearchParams();

        // Add pagination parameters
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        // Add search and filter parameters
        if (params.search) queryParams.append('search', params.search);
        if (params.status) queryParams.append('status', params.status);
        if (params.vendor) queryParams.append('vendor', params.vendor);
        if (params.productType) queryParams.append('product_type', params.productType);

        // Add retry attempt parameter for debugging
        if (attempt > 1) {
          queryParams.append('retry', attempt.toString());
        }

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
                productType: (p.productType as string) || (p.product_type as string) || '',
                createdAt: (p.createdAt as string) || (p.created_at as string),
                updatedAt: (p.updatedAt as string) || (p.updated_at as string),
                publishedAt: (p.publishedAt as string) || (p.published_at as string),
                status: (p.status as string) || 'active',
                tags: Array.isArray(p.tags)
                  ? (p.tags as string[])
                  : ((p.tags as string) || '').split(',').filter(Boolean),
                variants: ((p.variants as unknown[]) || []).map((variant: unknown) => {
                  const v = variant as Record<string, unknown>;
                  return {
                    id: v.id as string,
                    title: v.title as string,
                    price: v.price as string,
                    compareAtPrice: (v.compareAtPrice as string) || undefined,
                    sku: (v.sku as string) || '',
                    inventoryQuantity:
                      (v.inventoryQuantity as number) || (v.inventory_quantity as number) || 0,
                    barcode: (v.barcode as string) || '',
                  };
                }),
                images: ((p.images as unknown[]) || []).map((image: unknown) => {
                  const img = image as Record<string, unknown>;
                  return {
                    id: img.id as string,
                    url: (img.url as string) || (img.src as string),
                    altText:
                      (img.altText as string) || (img.alt_text as string) || (img.alt as string),
                    width: img.width as number,
                    height: img.height as number,
                  };
                }),
              };
            }),
            total: (data?.total as number) || 0,
            page: (data?.page as number) || 1,
            pageSize: (data?.pageSize as number) || params.limit || 50,
            totalPages: (data?.totalPages as number) || 1,
            hasMore: (data?.hasMore as boolean) || false,
            hasPrevious: (data?.hasPrevious as boolean) || false,
          },
        };
      } catch (error: unknown) {
        lastError = error as Error;

        // Check if it's a timeout error
        const isTimeoutError =
          error instanceof Error &&
          (error.message.includes('timeout') ||
            error.message.includes('TIMEOUT_ERROR') ||
            (error as any).status === 408);

        if (isTimeoutError && attempt < maxRetries) {
          console.warn(`Attempt ${attempt} failed with timeout, retrying...`);
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        // If it's not a timeout error or we've exhausted retries, throw the error
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

    // If we get here, all retries failed
    throw lastError || new Error('Failed to fetch products after multiple attempts');
  }

  /**
   * Search products with page-based pagination
   */
  async searchProducts(
    query: string,
    params: ProductPageParams = {},
  ): Promise<PagePaginationResponse<ShopifyProduct>> {
    return this.fetchProducts({
      ...params,
      search: query,
    });
  }
}

export const pageBasedShopifyService = new PageBasedShopifyService();
export default pageBasedShopifyService;

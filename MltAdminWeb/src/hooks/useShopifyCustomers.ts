import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import useShopifyConnection from './useShopifyConnection';

export interface IShopifyCustomersQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  acceptsMarketing: boolean;
  state: string;
  ordersCount: number;
  totalSpent: string;
  tags: string;
  lastOrder?: Record<string, unknown>;
  defaultAddress?: Record<string, unknown>;
  addresses: Record<string, unknown>[];
  platform: 'shopify';
}

export interface IShopifyCustomersResponse {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

const fetchCustomers = async (
  params: IShopifyCustomersQueryParams = {},
): Promise<IShopifyCustomersResponse> => {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.state) queryParams.append('state', params.state);

  const response = await api.get(`/shopify/customers?${queryParams.toString()}`);

  const result = response.data as Record<string, unknown>;

  if (!result.success) {
    throw new Error((result.error as string) || 'Failed to fetch customers');
  }

  // Transform the GraphQL response data to match our interface
  const data = result.data as Record<string, unknown>;
  const customers = (data?.customers as Record<string, unknown>[]) || [];
  const total = (data?.total as number) || customers.length;
  const limit = params.limit || 50;
  const page = params.page || 1;

  // Calculate pagination info
  const isPaginated = total > limit;
  const effectiveLimit = isPaginated ? limit : total;
  const effectivePage = isPaginated ? page : 1;
  const effectiveTotalPages = isPaginated ? Math.ceil(total / limit) : 1;

  return {
    customers: customers.map(
      (customer: Record<string, unknown>): Customer => ({
        id: customer.id as string,
        firstName: (customer.first_name as string) || '',
        lastName: (customer.last_name as string) || '',
        email: (customer.email as string) || '',
        phone: (customer.phone as string) || '',
        createdAt: customer.created_at as string,
        updatedAt: customer.updated_at as string,
        acceptsMarketing: (customer.accepts_marketing as boolean) || false,
        state: (customer.state as string) || 'enabled',
        ordersCount: (customer.orders_count as number) || 0,
        totalSpent: (customer.total_spent as string) || '0.00',
        tags: (customer.tags as string) || '',
        lastOrder: customer.last_order as Record<string, unknown>,
        defaultAddress: customer.default_address as Record<string, unknown>,
        addresses: (customer.addresses as Record<string, unknown>[]) || [],
        platform: 'shopify' as const,
      }),
    ),
    total: total,
    page: effectivePage,
    limit: effectiveLimit,
    hasMore: isPaginated && page < effectiveTotalPages,
    totalPages: effectiveTotalPages,
  };
};

const searchCustomers = async (query: string): Promise<IShopifyCustomersResponse> => {
  const response = await api.get(`/shopify/customers/search?q=${encodeURIComponent(query)}`);

  const result = response.data as Record<string, unknown>;

  if (!result.success) {
    throw new Error((result.error as string) || 'Failed to search customers');
  }

  // Transform GraphQL response
  const data = result.data as Record<string, unknown>;
  const customers = (data?.customers as Record<string, unknown>[]) || [];

  return {
    customers: customers.map(
      (customer: Record<string, unknown>): Customer => ({
        id: customer.id as string,
        firstName: (customer.first_name as string) || '',
        lastName: (customer.last_name as string) || '',
        email: (customer.email as string) || '',
        phone: (customer.phone as string) || '',
        createdAt: customer.created_at as string,
        updatedAt: customer.updated_at as string,
        acceptsMarketing: (customer.accepts_marketing as boolean) || false,
        state: (customer.state as string) || 'enabled',
        ordersCount: (customer.orders_count as number) || 0,
        totalSpent: (customer.total_spent as string) || '0.00',
        tags: (customer.tags as string) || '',
        lastOrder: customer.last_order as Record<string, unknown>,
        defaultAddress: customer.default_address as Record<string, unknown>,
        addresses: (customer.addresses as Record<string, unknown>[]) || [],
        platform: 'shopify' as const,
      }),
    ),
    total: customers.length,
    page: 1,
    limit: customers.length,
    hasMore: false,
    totalPages: 1,
  };
};

export const useShopifyCustomers = (params: IShopifyCustomersQueryParams = {}) => {
  const queryClient = useQueryClient();
  const { isConnected, isLoading: isCheckingConnection } = useShopifyConnection();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['shopify-customers', params],
    queryFn: () => fetchCustomers(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry if it's a 400/401/403 error (likely store disconnected)
      const err = error as Record<string, unknown>;
      const response = err.response as Record<string, unknown>;
      const status = response?.status as number;
      if (status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    enabled: isConnected && !isCheckingConnection, // Only fetch when connected and not checking status
  });

  const invalidateCustomers = () => {
    queryClient.invalidateQueries({ queryKey: ['shopify-customers'] });
  };

  return {
    data,
    customers: data?.customers || [],
    total: data?.total || 0,
    page: data?.page || 1,
    limit: data?.limit || 50,
    hasMore: data?.hasMore || false,
    totalPages: data?.totalPages || 0,
    isLoading,
    isFetching,
    error,
    refetch,
    invalidateCustomers,
  };
};

export const useShopifyCustomerSearch = (searchQuery: string, enabled: boolean = true) => {
  const { isConnected, isLoading: isCheckingConnection } = useShopifyConnection();

  return useQuery({
    queryKey: ['shopify-customers-search', searchQuery],
    queryFn: () => searchCustomers(searchQuery),
    enabled: enabled && searchQuery.length > 0 && isConnected && !isCheckingConnection, // Wait for connection check
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: unknown) => {
      // Don't retry if it's a 400/401/403 error (likely store disconnected)
      const err = error as Record<string, unknown>;
      const response = err.response as Record<string, unknown>;
      const status = response?.status as number;
      if (status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
  });
};

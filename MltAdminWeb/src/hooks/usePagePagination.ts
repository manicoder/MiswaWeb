import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

export interface PagePaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

export interface PagePaginationData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  hasPrevious: boolean;
}

export interface PagePaginationResponse<T> {
  success: boolean;
  data: PagePaginationData<T>;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UsePagePaginationOptions<T> {
  queryKey: string[];
  fetchFn: (params: PagePaginationParams) => Promise<PagePaginationResponse<T>>;
  pageSize?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  initialPage?: number;
  initialSearch?: string;
}

export interface UsePagePaginationResult<T> {
  data: T[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  isRetrying: boolean; // New field to track retry state

  // Pagination info
  currentPage: number;
  totalPages: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;

  // Search
  searchQuery: string;
  isSearching: boolean;

  // Actions
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  search: (query: string) => void;
  clearSearch: () => void;
  refresh: () => Promise<void>;
  changePageSize: (newPageSize: number) => void;
}

export function usePagePagination<T>({
  queryKey,
  fetchFn,
  pageSize: initialPageSize = 50,
  enabled = true,
  staleTime = 0,
  gcTime = 1000 * 60 * 5, // 5 minutes
  initialPage = 1,
  initialSearch = '',
}: UsePagePaginationOptions<T>): UsePagePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSearching, setIsSearching] = useState(false);

  // Query for fetching data - include pageSize in dependencies
  const {
    data: queryData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [...queryKey, currentPage, pageSize, searchQuery],
    queryFn: async () => {
      const params: PagePaginationParams = {
        page: currentPage,
        limit: pageSize,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      return fetchFn(params);
    },
    enabled,
    staleTime,
    gcTime,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // 🚀 Don't refetch when component remounts if data is still fresh
    refetchOnReconnect: false, // 🚀 Don't refetch on network reconnect
    notifyOnChangeProps: ['data', 'error', 'isLoading'], // 🚀 Only re-render when these specific props change
    retry: (failureCount, error) => {
      // Don't retry if it's a connection error or authentication error
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('no shopify store connected') ||
          errorMessage.includes('authentication') ||
          errorMessage.includes('unauthorized')
        ) {
          return false;
        }
      }
      // Retry up to 2 times for other errors (including timeouts)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      let title = 'Error loading data';
      let message = error.message;

      // Provide more specific error messages for common scenarios
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT_ERROR')) {
        title = 'Request Timeout';
        message =
          'The request took too long to complete. This might be due to a large number of products. Please try again or contact support if the issue persists.';
      } else if (error.message.includes('no shopify store connected')) {
        title = 'No Store Connected';
        message = 'Please connect your Shopify store first to view products.';
      } else if (
        error.message.includes('authentication') ||
        error.message.includes('unauthorized')
      ) {
        title = 'Authentication Error';
        message = 'Please log in again to continue.';
      }

      notifications.show({
        title,
        message,
        color: 'red',
        autoClose: 8000, // Show timeout errors longer
      });
    }
  }, [error]);

  // Navigation functions
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= (queryData?.data?.totalPages || 1)) {
        setCurrentPage(page);
      }
    },
    [queryData?.data?.totalPages],
  );

  const nextPage = useCallback(() => {
    if (queryData?.data?.hasMore) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [queryData?.data?.hasMore]);

  const previousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const search = useCallback((query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
    // The query will automatically trigger due to dependency change
    setTimeout(() => setIsSearching(false), 100);
  }, []);

  const clearSearch = useCallback(() => {
    setIsSearching(true);
    setSearchQuery('');
    setCurrentPage(1);
    setTimeout(() => setIsSearching(false), 100);
  }, []);

  const changePageSize = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Extract data with defaults
  const data = queryData?.data?.items || [];
  const total = queryData?.data?.total || 0;
  const totalPages = queryData?.data?.totalPages || 1;
  const hasNextPage = queryData?.data?.hasMore || false;
  const hasPreviousPage = queryData?.data?.hasPrevious || false;

  return {
    data,
    isLoading,
    isFetching,
    error,
    isRetrying: isFetching && !isLoading, // Show retrying state when fetching but not initial loading

    currentPage,
    totalPages,
    pageSize,
    total,
    hasNextPage,
    hasPreviousPage,

    searchQuery,
    isSearching,

    goToPage,
    nextPage,
    previousPage,
    search,
    clearSearch,
    refresh,
    changePageSize,
  };
}

export default usePagePagination;

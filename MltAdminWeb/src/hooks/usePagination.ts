import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';

export interface PaginatedData<T> {
  items: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage?: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
  total: number;
  hasMore: boolean;
  // Page-specific properties
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: PaginatedData<T>;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface LoadMoreParams {
  limit?: number;
  after?: string;
  search?: string;
  [key: string]: unknown;
}

export interface UsePaginationOptions<T> {
  queryKey: string[];
  fetchFn: (params: LoadMoreParams) => Promise<PaginatedResponse<T>>;
  initialLimit?: number;
  loadMoreLimit?: number;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export interface UsePaginationResult<T> {
  data: T[];
  allData: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  isFetching: boolean;
  error: Error | null;

  hasMore: boolean;
  canLoadMore: boolean;
  currentCursor: string | null;
  totalLoaded: number;

  searchQuery: string;
  isSearching: boolean;

  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => Promise<void>;
  reset: () => void;
}

export function usePagination<T>({
  queryKey,
  fetchFn,
  initialLimit = 50,
  loadMoreLimit = 100,
  enabled = true,
  staleTime = 0,
  gcTime = 1000 * 60 * 5, // 5 minutes
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const queryClient = useQueryClient();

  const [allData, setAllData] = useState<T[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Create the query key with search
  const finalQueryKey = useMemo(() => {
    const baseKey = [...queryKey];
    if (searchQuery) {
      baseKey.push('search', searchQuery);
    }
    return baseKey;
  }, [queryKey, searchQuery]);

  // Initial data fetch
  const {
    data: queryData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: finalQueryKey,
    queryFn: async () => {
      const params: LoadMoreParams = {
        limit: initialLimit,
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
  });

  // Handle success/error using useEffect
  useEffect(() => {
    if (queryData?.success && queryData.data) {
      setAllData(queryData.data.items);
      setCurrentCursor(queryData.data.pageInfo.endCursor || null);
      setHasMore(queryData.data.pageInfo.hasNextPage);
    }
  }, [queryData]);

  useEffect(() => {
    if (error) {
      notifications.show({
        title: 'Error loading data',
        message: error.message,
        color: 'red',
      });
    }
  }, [error]);

  // Load more mutation
  const loadMoreMutation = useMutation({
    mutationFn: async () => {
      if (!currentCursor || !hasMore) return null;

      const params: LoadMoreParams = {
        limit: loadMoreLimit,
        after: currentCursor,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      return fetchFn(params);
    },
    onSuccess: (data) => {
      if (data?.success && data.data) {
        setAllData((prev) => [...prev, ...data.data.items]);
        setCurrentCursor(data.data.pageInfo.endCursor || null);
        setHasMore(data.data.pageInfo.hasNextPage);
      }
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error loading more data',
        message: error.message,
        color: 'red',
      });
    },
  });

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      setIsSearching(true);
      const params: LoadMoreParams = {
        limit: initialLimit,
        search: query,
      };

      return fetchFn(params);
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setAllData(data.data.items);
        setCurrentCursor(data.data.pageInfo.endCursor || null);
        setHasMore(data.data.pageInfo.hasNextPage);

        // Update the cache
        queryClient.setQueryData(finalQueryKey, data);
      }
      setIsSearching(false);
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Search failed',
        message: error.message,
        color: 'red',
      });
      setIsSearching(false);
    },
  });

  const loadMore = useCallback(async () => {
    if (loadMoreMutation.isPending || !hasMore) return;
    await loadMoreMutation.mutateAsync();
  }, [loadMoreMutation, hasMore]);

  const refresh = useCallback(async () => {
    setAllData([]);
    setCurrentCursor(null);
    setHasMore(true);
    await refetch();
  }, [refetch]);

  const search = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      setAllData([]);
      setCurrentCursor(null);
      setHasMore(true);
      await searchMutation.mutateAsync(query);
    },
    [searchMutation],
  );

  const clearSearch = useCallback(async () => {
    setSearchQuery('');
    setAllData([]);
    setCurrentCursor(null);
    setHasMore(true);
    await refetch();
  }, [refetch]);

  const reset = useCallback(() => {
    setAllData([]);
    setCurrentCursor(null);
    setHasMore(true);
    setSearchQuery('');
    setIsSearching(false);
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const data = queryData?.success ? allData : [];
  const canLoadMore = hasMore && !loadMoreMutation.isPending && !isLoading;
  const isLoadingMore = loadMoreMutation.isPending;

  return {
    data,
    allData,
    isLoading,
    isLoadingMore,
    isFetching,
    error: error as Error | null,

    hasMore,
    canLoadMore,
    currentCursor,
    totalLoaded: data.length,

    searchQuery,
    isSearching,

    loadMore,
    refresh,
    search,
    clearSearch,
    reset,
  };
}

export default usePagination;

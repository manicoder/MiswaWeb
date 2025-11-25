import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShopifyService } from '../services/shopifyService';
import { api } from '../services/api';
import type { ShopifyConnectionStatus } from '../types/shopify';

export const useShopifyConnection = () => {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);
  const [credentialsCheck, setCredentialsCheck] = useState(0); // Force re-check of credentials

  // Check if user is authenticated (JWT token exists)
  const hasJwtToken = !!localStorage.getItem('mlt-admin-token');

  // Query to get connection status - use general store connections endpoint for consistency
  const {
    data: connectionStatus,
    isLoading: isCheckingConnection,
    error: connectionError,
    refetch: refetchConnection,
  } = useQuery<ShopifyConnectionStatus>({
    queryKey: ['shopify', 'connection', credentialsCheck],
    queryFn: async (): Promise<ShopifyConnectionStatus> => {
      console.log('🔍 Checking Shopify connection status...', { hasJwtToken, credentialsCheck });

      if (!hasJwtToken) {
        console.log('❌ No JWT token found');
        return {
          isConnected: false,
          error: 'No authentication token',
        };
      }

      try {
        // First try the general store connections endpoint
        console.log('📡 Fetching store connections from /storeconnection...');
        const response = await api.get('/storeconnection');
        const result = response.data as Record<string, unknown>;
        console.log('📦 Store connections response:', result);

        // Look for a connected Shopify store
        const stores = (result.stores as Record<string, unknown>[]) || [];
        const shopifyStore = stores.find(
          (store: Record<string, unknown>) =>
            (store.platform as string) === 'shopify' && (store.status as string) === 'connected',
        );

        if (shopifyStore) {
          console.log('✅ Found connected Shopify store:', shopifyStore);
          const connectionStatus: ShopifyConnectionStatus = {
            isConnected: true,
            store: {
              id: shopifyStore.id as string,
              storeName: shopifyStore.storeName as string,
              shopDomain: `${shopifyStore.storeName as string}.myshopify.com`,
              isConnected: true,
              connectedAt: (shopifyStore.createdAt as string) || new Date().toISOString(),
              status: 'active' as const,
            },
          };

          return connectionStatus;
        }

        console.log('❌ No connected Shopify store found');
        // No Shopify store found - this is normal, not an error
        return {
          isConnected: false,
          error: undefined, // No error, just no connection
        };
      } catch (error: unknown) {
        console.log('⚠️ General endpoint failed, trying fallback...', error);
        // If general endpoint fails, fallback to Shopify-specific endpoint
        try {
          const fallbackStatus = await ShopifyService.getConnectionStatus();
          console.log('📡 Fallback status:', fallbackStatus);
          return fallbackStatus;
        } catch {
          const err = error as Record<string, unknown>;
          const response = err.response as Record<string, unknown>;
          const status = response?.status as number;

          if (status >= 400 && status < 500) {
            // 4xx errors are usually "no connection" rather than "failed to connect"
            const responseData = response?.data as Record<string, unknown>;
            const errorMessage =
              (responseData?.error as string) || (responseData?.message as string);

            // Check if this is a "no connection" message vs actual connection failure
            if (
              errorMessage?.toLowerCase().includes('no shopify store connected') ||
              errorMessage?.toLowerCase().includes('no connection') ||
              errorMessage?.toLowerCase().includes('not connected')
            ) {
              console.log('❌ No connection found (4xx error)');
              return {
                isConnected: false,
                error: undefined, // No error, just no connection
              };
            }

            // This is an actual connection error
            console.log('❌ Connection error:', errorMessage);
            return {
              isConnected: false,
              error: errorMessage || 'Failed to connect to Shopify',
            };
          }

          // Network or server errors
          console.log('❌ Network/server error:', error);
          return {
            isConnected: false,
            error: 'Failed to connect to Shopify. Please check your connection and try again.',
          };
        }
      }
    },
    retry: (failureCount, error: unknown) => {
      // Don't retry if it's a 400 error (no connection)
      const err = error as Record<string, unknown>;
      const response = err.response as Record<string, unknown>;
      const status = response?.status as number;

      if (status === 400) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - longer to reduce frequent checks
    enabled: hasJwtToken, // Only check status if user is authenticated
    refetchOnMount: false, // Don't refetch on every component mount
    refetchOnWindowFocus: false,
  });

  // Mutation to connect store
  const connectMutation = useMutation({
    mutationFn: ShopifyService.connectStore,
    onMutate: () => {
      setIsConnecting(true);
    },
    onSuccess: () => {
      // Force re-check of credentials and invalidate only connection-related queries
      setCredentialsCheck((prev) => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
      // Don't invalidate ALL shopify queries - this was clearing the product cache!
      // queryClient.invalidateQueries({ queryKey: ['shopify'] });

      // Refresh the entire app to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500); // Reduced from 1000ms to 500ms for faster response
    },
    onError: (error) => {
      console.error('Failed to connect store:', error);
    },
    onSettled: () => {
      setIsConnecting(false);
    },
  });

  // Mutation to disconnect store
  const disconnectMutation = useMutation({
    mutationFn: ShopifyService.disconnectStore,
    onMutate: () => {
      // Immediately update connection status to prevent further queries
      queryClient.setQueryData(['shopify', 'connection', credentialsCheck], {
        isConnected: false,
        error: undefined, // No error, just disconnected
      });
    },
    onSuccess: () => {
      // Force re-check of credentials and clear store-specific data on disconnect
      setCredentialsCheck((prev) => prev + 1);

      // Clear store-specific data but be more precise
      queryClient.removeQueries({ queryKey: ['shopify-orders'] });
      queryClient.removeQueries({ queryKey: ['shopify-customers'] });
      queryClient.removeQueries({ queryKey: ['shopify-products-enhanced'] }); // Clear product cache on disconnect
      queryClient.removeQueries({ queryKey: ['enhanced-unfulfilled-products'] });
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });

      // Ensure connection status is set to disconnected
      queryClient.setQueryData(['shopify', 'connection', credentialsCheck], {
        isConnected: false,
        error: undefined, // No error, just disconnected
      });

      // Refresh the entire app to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 500); // Reduced from 1000ms to 500ms for faster response
    },
    onError: (error) => {
      console.error('Failed to disconnect store:', error);
      // Revert the optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
    },
  });

  // Mutation to verify connection
  const verifyMutation = useMutation({
    mutationFn: ShopifyService.verifyConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
    },
  });

  const isConnected = hasJwtToken && connectionStatus?.isConnected; // Connected if authenticated and store is connected
  const store = connectionStatus?.store;
  // Only treat as error if there's an actual error message, not just no connection
  const hasError =
    !!connectionError || (!!connectionStatus?.error && connectionStatus.error !== undefined);
  const isLoading = isCheckingConnection || isConnecting;

  const connect = useCallback(
    (connectionData: Parameters<typeof ShopifyService.connectStore>[0]) => {
      return connectMutation.mutateAsync(connectionData);
    },
    [connectMutation],
  );

  const disconnect = useCallback(() => {
    return disconnectMutation.mutateAsync();
  }, [disconnectMutation]);

  const verify = useCallback(() => {
    return verifyMutation.mutateAsync();
  }, [verifyMutation]);

  const refresh = useCallback(() => {
    console.log('🔄 Refreshing Shopify connection status...', { hasJwtToken, credentialsCheck });
    if (hasJwtToken) {
      setCredentialsCheck((prev) => prev + 1);
      // Force invalidate the connection query cache with the current credentialsCheck
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection', credentialsCheck] });
      queryClient.invalidateQueries({ queryKey: ['shopify', 'connection'] });
      queryClient.invalidateQueries({ queryKey: ['storeconnection'] });
      // Force refetch the connection status
      refetchConnection();
      console.log('✅ Connection refresh triggered');
    } else {
      console.log('❌ Cannot refresh - no JWT token');
    }
  }, [hasJwtToken, refetchConnection, queryClient, credentialsCheck]);

  return {
    isConnected,
    isLoading,
    hasError,
    connectionStatus,
    store,

    connect,
    disconnect,
    verify,
    refresh,

    error: connectionError,
    isCheckingConnection,
  };
};

export default useShopifyConnection;

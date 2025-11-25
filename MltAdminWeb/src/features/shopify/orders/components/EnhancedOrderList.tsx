import React, { useState, useMemo } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Badge,
  Avatar,
  Tabs,
  Loader,
  Alert,
  Card,
  ActionIcon,
  ScrollArea,
  Tooltip,
  Center,
  Skeleton,
  Progress,
  Transition,
  Collapse,
  useMantineTheme,
  Popover,
  Box,
  Divider,
  Chip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconUser,
  IconShoppingCart,
  IconAlertCircle,
  IconClearAll,
  IconCloudDownload,
  IconChevronDown,
  IconChevronRight,
  IconCalendar,
  IconFilter,
  IconX,
  IconCalendarTime,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
import { usePagination } from '../../../../hooks/usePagination';
import { paginatedShopifyService } from '../../../../services/paginatedShopifyService';
import type { ShopifyOrder, OrdersParams } from '../../../../services/paginatedShopifyService';
import LoadMoreButton from '../../../../components/LoadMoreButton';
import ShopifyConnectionGuard from '../../../../components/shopify/ShopifyConnectionGuardWithModal';
import SquareImage from '../../../../components/common/SquareImage';
import ExportButton from '../../../../components/common/ExportButton';
import { ShopifyExportConfigs } from '../../../../utils/exportUtils';
import { orderSyncService, type OrderSyncResult } from '../../../../services/orderSyncService';
import { notifications } from '@mantine/notifications';
import { SyncProgress } from '../../../../components/common/SyncProgress';
import { api } from '../../../../services/api';
import { useTheme } from '../../../../contexts/useTheme';

interface ProductOrder {
  orderNumber: string;
  orderDate: string;
  customer?: ShopifyOrder['customer'];
}

const EnhancedOrderList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('');
  const [financialFilter, setFinancialFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [orderType, setOrderType] = useState<
    'all' | 'unfulfilled' | 'today' | 'unfulfilled-products' | 'top-selling'
  >('unfulfilled');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productFilter, setProductFilter] = useState<string>('');
  const [isTabSwitching, setIsTabSwitching] = useState(false);
  const [tabTransition, setTabTransition] = useState(true);

  // Date picker states
  const [datePickerOpened, setDatePickerOpened] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  // Sync state variables
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<OrderSyncResult | null>(null);
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Store unfulfilled orders data for products tab
  const [unfulfilledOrdersData, setUnfulfilledOrdersData] = useState<ShopifyOrder[]>([]);

  // Store top selling products data
  const [topSellingProducts, setTopSellingProducts] = useState<
    Array<{
      name: string;
      productId?: string;
      imageUrl?: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
    }>
  >([]);
  const [topSellingLoading, setTopSellingLoading] = useState(false);

  // Track expanded orders for item details dropdown
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');
  const theme = useMantineTheme();
  const { colorScheme } = useTheme();

  const [activeQuickRange, setActiveQuickRange] = useState<string | null>(null);

  // Initialize date picker with current filter values
  React.useEffect(() => {
    if (startDateFilter) {
      setTempStartDate(new Date(startDateFilter));
    }
    if (endDateFilter) {
      setTempEndDate(new Date(endDateFilter));
    }
  }, [startDateFilter, endDateFilter]);

  // Create fetch function for orders - Different API calls based on orderType
  const fetchOrders = useMemo(() => {
    return async (params: OrdersParams) => {
      const baseParams = {
        ...params,
        status: statusFilter || undefined,
        fulfillmentStatus: fulfillmentFilter || undefined,
        financialStatus: financialFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      };

      switch (orderType) {
        case 'unfulfilled':
          return paginatedShopifyService.fetchOrders({
            ...baseParams,
            orderType: 'unfulfilled',
            // Exclude voided, cancelled, archived orders
            status: 'open', // Only open orders
            fulfillmentStatus: 'unfulfilled',
          });
        case 'today': {
          const today = new Date();
          const todayString = today.toISOString().split('T')[0];
          return paginatedShopifyService.fetchOrders({
            ...baseParams,
            orderType: 'today',
            createdAtMin: `${todayString}T00:00:00Z`,
            createdAtMax: `${todayString}T23:59:59Z`,
          });
        }
        case 'unfulfilled-products':
          // Don't make API call - use unfulfilled orders data
          return Promise.resolve({
            success: true,
            data: {
              items: [],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
              total: 0,
              hasMore: false,
            },
          });
        case 'top-selling':
          // Don't make API call - use top selling products data
          return Promise.resolve({
            success: true,
            data: {
              items: [],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
              total: 0,
              hasMore: false,
            },
          });
        case 'all':
        default:
          // Use database endpoint for "All Orders" tab
          return fetchLocalOrders({
            ...baseParams,
            orderType: 'all',
          });
      }
    };
  }, [statusFilter, fulfillmentFilter, financialFilter, startDateFilter, endDateFilter, orderType]);

  // Fetch orders from local database
  const fetchLocalOrders = async (params: OrdersParams) => {
    try {
      const queryParams = new URLSearchParams();

      // Add pagination parameters
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.after) queryParams.append('page', (parseInt(params.after) + 1).toString());

      // Add search and filter parameters
      if (params.search) queryParams.append('search', params.search);
      if (params.status) queryParams.append('status', params.status);
      if (params.fulfillmentStatus)
        queryParams.append('fulfillmentStatus', params.fulfillmentStatus);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);

      const response = await api.get(`/shopify/orders/local?${queryParams}`);
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

                // Parse image from the database JSON structure
                let image = undefined;
                if (i.image) {
                  // Image can be either a string URL or an object with url/altText
                  if (typeof i.image === 'string') {
                    // Direct URL string from database
                    image = {
                      url: i.image as string,
                      altText: (i.title as string) || 'Product Image',
                    };
                  } else {
                    // Object with url/altText properties
                    const imageData = i.image as Record<string, unknown>;
                    image = {
                      url: (imageData.url as string) || (imageData.src as string) || '',
                      altText:
                        (imageData.altText as string) ||
                        (imageData.alt as string) ||
                        (i.title as string) ||
                        'Product Image',
                    };
                  }
                }

                return {
                  id: i.id as string,
                  title: (i.title as string) || (i.name as string) || 'Unknown Product',
                  quantity: (i.quantity as number) || 1,
                  originalTotalPrice:
                    (i.originalTotalPrice as string) || (i.price as string) || '0.00',
                  image: image,
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
  };

  // Use pagination hook - Include orderType in queryKey for separate data per tab
  const {
    data: allOrders,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    canLoadMore,
    totalLoaded,
    searchQuery: currentSearchQuery,
    isSearching,
    loadMore,
    refresh,
    search,
    clearSearch,
  } = usePagination<ShopifyOrder>({
    queryKey: [
      'shopify-orders-enhanced',
      orderType,
      statusFilter,
      fulfillmentFilter,
      financialFilter,
      startDateFilter,
      endDateFilter,
    ],
    fetchFn: fetchOrders,
    initialLimit: 50,
    loadMoreLimit: 100,
  });

  // Orders come directly from API based on orderType - no client-side filtering needed
  const orders = allOrders || [];

  // Update unfulfilled orders data when unfulfilled tab is loaded
  React.useEffect(() => {
    if (orderType === 'unfulfilled' && allOrders && allOrders.length > 0) {
      setUnfulfilledOrdersData(allOrders);
    }
  }, [orderType, allOrders]);

  // Extract unique products from unfulfilled orders
  const unfulfilledProducts = useMemo(() => {
    if (orderType !== 'unfulfilled-products') return [];

    // Use stored unfulfilled orders data, not API data
    const unfulfilledOrders = unfulfilledOrdersData;

    const productsMap = new Map();

    unfulfilledOrders.forEach((order) => {
      order.lineItems.forEach((item) => {
        const key = item.title;
        if (productsMap.has(key)) {
          const existing = productsMap.get(key);
          existing.quantity += item.quantity;
          existing.orders.push({
            orderNumber: order.orderNumber,
            orderDate: order.createdAt,
            customer: order.customer,
          });
        } else {
          productsMap.set(key, {
            id: item.id,
            title: item.title,
            quantity: item.quantity,
            price: item.originalTotalPrice,
            image: item.image,
            orders: [
              {
                orderNumber: order.orderNumber,
                orderDate: order.createdAt,
                customer: order.customer,
              },
            ],
          });
        }
      });
    });

    return Array.from(productsMap.values()).filter((product) => {
      // Search filter
      const matchesSearch =
        !productSearchQuery ||
        product.title.toLowerCase().includes(productSearchQuery.toLowerCase());

      // Quantity filter
      let matchesQuantityFilter = true;
      if (productFilter) {
        switch (productFilter) {
          case 'high-quantity':
            matchesQuantityFilter = product.quantity >= 5;
            break;
          case 'medium-quantity':
            matchesQuantityFilter = product.quantity >= 2 && product.quantity <= 4;
            break;
          case 'single-quantity':
            matchesQuantityFilter = product.quantity === 1;
            break;
          default:
            matchesQuantityFilter = true;
        }
      }

      return matchesSearch && matchesQuantityFilter;
    });
  }, [unfulfilledOrdersData, orderType, productSearchQuery, productFilter]);

  // Handle search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await search(searchQuery.trim());
    } else {
      await clearSearch();
    }
  };

  // Handle search input enter key
  const handleSearchKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle date picker apply
  const handleDatePickerApply = () => {
    if (tempStartDate) {
      setStartDateFilter(tempStartDate.toISOString().split('T')[0]);
    }
    if (tempEndDate) {
      setEndDateFilter(tempEndDate.toISOString().split('T')[0]);
    }
    setDatePickerOpened(false);
  };

  // Handle date picker clear
  const handleDatePickerClear = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setStartDateFilter('');
    setEndDateFilter('');
    setDatePickerOpened(false);
  };

  // Handle quick date filters
  const handleQuickDateFilter = (range: string) => {
    if (activeQuickRange === range) {
      // Deselect if already active
      setStartDateFilter('');
      setEndDateFilter('');
      setTempStartDate(null);
      setTempEndDate(null);
      setActiveQuickRange(null);
      return;
    }
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    switch (range) {
      case 'today':
        setStartDateFilter(today.toISOString().split('T')[0]);
        setEndDateFilter(today.toISOString().split('T')[0]);
        setTempStartDate(today);
        setTempEndDate(today);
        setActiveQuickRange('today');
        break;
      case 'yesterday':
        setStartDateFilter(yesterday.toISOString().split('T')[0]);
        setEndDateFilter(yesterday.toISOString().split('T')[0]);
        setTempStartDate(yesterday);
        setTempEndDate(yesterday);
        setActiveQuickRange('yesterday');
        break;
      case 'last7days':
        setStartDateFilter(lastWeek.toISOString().split('T')[0]);
        setEndDateFilter(today.toISOString().split('T')[0]);
        setTempStartDate(lastWeek);
        setTempEndDate(today);
        setActiveQuickRange('last7days');
        break;
      case 'last30days':
        setStartDateFilter(lastMonth.toISOString().split('T')[0]);
        setEndDateFilter(today.toISOString().split('T')[0]);
        setTempStartDate(lastMonth);
        setTempEndDate(today);
        setActiveQuickRange('last30days');
        break;
      case 'clear':
        setStartDateFilter('');
        setEndDateFilter('');
        setTempStartDate(null);
        setTempEndDate(null);
        setActiveQuickRange(null);
        break;
    }
  };

  // When manual date is picked, clear quick range
  React.useEffect(() => {
    if (tempStartDate || tempEndDate) {
      // If the selected range doesn't match a quick filter, clear quick filter
      let match = false;
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastWeekStr = lastWeek.toISOString().split('T')[0];
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().split('T')[0];
      if (
        tempStartDate &&
        tempEndDate &&
        tempStartDate.toISOString().split('T')[0] === todayStr &&
        tempEndDate.toISOString().split('T')[0] === todayStr
      )
        match = activeQuickRange === 'today';
      else if (
        tempStartDate &&
        tempEndDate &&
        tempStartDate.toISOString().split('T')[0] === yesterdayStr &&
        tempEndDate.toISOString().split('T')[0] === yesterdayStr
      )
        match = activeQuickRange === 'yesterday';
      else if (
        tempStartDate &&
        tempEndDate &&
        tempStartDate.toISOString().split('T')[0] === lastWeekStr &&
        tempEndDate.toISOString().split('T')[0] === todayStr
      )
        match = activeQuickRange === 'last7days';
      else if (
        tempStartDate &&
        tempEndDate &&
        tempStartDate.toISOString().split('T')[0] === lastMonthStr &&
        tempEndDate.toISOString().split('T')[0] === todayStr
      )
        match = activeQuickRange === 'last30days';
      else match = false;
      if (!match && activeQuickRange) setActiveQuickRange(null);
    }
  }, [tempStartDate, tempEndDate, activeQuickRange]);

  // Get active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    if (statusFilter) count++;
    if (fulfillmentFilter) count++;
    if (financialFilter) count++;
    if (startDateFilter) count++;
    if (endDateFilter) count++;
    if (currentSearchQuery) count++;
    if (productSearchQuery) count++;
    if (productFilter) count++;
    return count;
  };

  // Fetch top selling products
  const fetchTopSellingProducts = async () => {
    try {
      setTopSellingLoading(true);
      const response = await api.get<{
        success: boolean;
        data?: {
          topProducts: Array<{
            name: string;
            productId?: string;
            imageUrl?: string;
            quantity: number;
            revenue: number;
            cost: number;
            profit: number;
            margin: number;
          }>;
        };
      }>('/shopify/analytics/top-selling-products', {
        params: {
          startDate: startDateFilter || undefined,
          endDate: endDateFilter || undefined,
          currency: 'INR',
          limit: 20,
        },
      });

      if (response.data.success && response.data.data) {
        setTopSellingProducts(response.data.data.topProducts || []);
      } else {
        setTopSellingProducts([]);
      }
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      setTopSellingProducts([]);
    } finally {
      setTopSellingLoading(false);
    }
  };

  // Format date range display
  const formatDateRangeDisplay = () => {
    if (!startDateFilter && !endDateFilter) return 'Select date range';
    if (startDateFilter && endDateFilter) {
      return `${new Date(startDateFilter).toLocaleDateString()} - ${new Date(endDateFilter).toLocaleDateString()}`;
    }
    if (startDateFilter) return `From ${new Date(startDateFilter).toLocaleDateString()}`;
    if (endDateFilter) return `Until ${new Date(endDateFilter).toLocaleDateString()}`;
    return 'Select date range';
  };

  // Handle clear filters
  const handleClearFilters = async () => {
    setStatusFilter('');
    setFulfillmentFilter('');
    setFinancialFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSearchQuery('');
    setProductSearchQuery('');
    setProductFilter('');
    setTempStartDate(null);
    setTempEndDate(null);
    await clearSearch();
  };

  // Handle smooth tab switching
  const handleTabChange = async (value: string | null) => {
    if (!value || value === orderType) return;

    // For unfulfilled-products tab, no loading needed since it's in-memory processing
    if (value === 'unfulfilled-products') {
      setOrderType(
        value as 'all' | 'unfulfilled' | 'today' | 'unfulfilled-products' | 'top-selling',
      );
      return;
    }

    // For top-selling tab, fetch data if not already loaded
    if (value === 'top-selling') {
      if (topSellingProducts.length === 0) {
        await fetchTopSellingProducts();
      }
      setOrderType(
        value as 'all' | 'unfulfilled' | 'today' | 'unfulfilled-products' | 'top-selling',
      );
      return;
    }

    // If switching FROM unfulfilled-products or top-selling to another tab, also make it instant
    if (orderType === 'unfulfilled-products' || orderType === 'top-selling') {
      setOrderType(
        value as 'all' | 'unfulfilled' | 'today' | 'unfulfilled-products' | 'top-selling',
      );
      return;
    }

    setIsTabSwitching(true);
    setTabTransition(false);

    // Small delay for smooth UX
    setTimeout(() => {
      setOrderType(value as 'all' | 'unfulfilled' | 'today' | 'unfulfilled-products');
      setTabTransition(true);

      // Complete tab switching after content loads
      setTimeout(() => {
        setIsTabSwitching(false);
      }, 500);
    }, 150);
  };

  // Handle sync orders with progress tracking
  const handleSync = async (forceRefresh = false) => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setSyncProgress({ current: 0, total: 0, message: 'Starting sync...' });

      const result = await orderSyncService.syncOrdersWithProgress(forceRefresh, (progress) => {
        setSyncProgress(progress);
      });

      if (result.success) {
        setSyncResult(result);
        await refresh(); // Refresh the orders list after sync
        notifications.show({
          title: 'Sync Completed',
          message: `Successfully synced ${result.synced || 0} orders`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Sync Failed',
          message: result.error || 'Failed to sync orders',
          color: 'red',
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      notifications.show({
        title: 'Sync Error',
        message: error.message || 'Failed to sync orders',
        color: 'red',
      });
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  // Handle incremental sync
  const handleIncrementalSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      setSyncProgress({ current: 0, total: 0, message: 'Starting incremental sync...' });

      // Get the last sync timestamp for more accurate incremental syncing
      const lastSyncTimestamp = await orderSyncService.getLastSyncTimestamp();

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress((prev) =>
          prev
            ? {
                ...prev,
                current: Math.min(prev.current + Math.floor(Math.random() * 10) + 5, 90),
                message: lastSyncTimestamp
                  ? `Checking for orders updated since ${lastSyncTimestamp.toLocaleString()}...`
                  : 'Checking for updated orders...',
              }
            : null,
        );
      }, 800);

      const result = await orderSyncService.incrementalSyncOrders(lastSyncTimestamp || undefined);

      clearInterval(progressInterval);

      if (result.success) {
        setSyncProgress({ current: 100, total: 100, message: 'Incremental sync completed!' });
        setSyncResult(result);
        await refresh();
        notifications.show({
          title: 'Incremental Sync Completed',
          message: `Successfully synced ${result.data?.totalFetched || 0} updated orders`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Incremental Sync Failed',
          message: result.error || 'Failed to sync updated orders',
          color: 'red',
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      notifications.show({
        title: 'Incremental Sync Error',
        message: error.message || 'Failed to sync updated orders',
        color: 'red',
      });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncProgress(null), 1000);
    }
  };

  // Handle recent orders sync
  const handleRecentSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);

      const result = await orderSyncService.syncRecentOrders(30);

      if (result.success) {
        setSyncResult(result);
        await refresh();
        notifications.show({
          title: 'Recent Orders Sync Completed',
          message: `Successfully synced ${result.data?.totalFetched || 0} recent orders (last 30 days)`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Recent Orders Sync Failed',
          message: result.error || 'Failed to sync recent orders',
          color: 'red',
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      notifications.show({
        title: 'Recent Orders Sync Error',
        message: error.message || 'Failed to sync recent orders',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Handle unfulfilled orders sync
  const handleUnfulfilledSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);

      const result = await orderSyncService.syncUnfulfilledOrders();

      if (result.success) {
        setSyncResult(result);
        await refresh();
        notifications.show({
          title: 'Unfulfilled Orders Sync Completed',
          message: `Successfully synced ${result.data?.totalFetched || 0} unfulfilled orders`,
          color: 'green',
        });
      } else {
        notifications.show({
          title: 'Unfulfilled Orders Sync Failed',
          message: result.error || 'Failed to sync unfulfilled orders',
          color: 'red',
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      notifications.show({
        title: 'Unfulfilled Orders Sync Error',
        message: error.message || 'Failed to sync unfulfilled orders',
        color: 'red',
      });
    } finally {
      setSyncing(false);
    }
  };

  // Skeleton loading components
  const OrderCardSkeleton = () => (
    <Stack gap="sm" px="sm">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} withBorder>
          <Stack gap="sm">
            <Group justify="space-between">
              <Skeleton height={16} width="30%" />
              <Skeleton height={12} width="25%" />
            </Group>
            <Group>
              <Skeleton height={32} width={32} radius="xl" />
              <Stack gap={0} style={{ flex: 1 }}>
                <Skeleton height={14} width="60%" />
                <Skeleton height={12} width="40%" />
              </Stack>
            </Group>
            <Group justify="space-between">
              <Skeleton height={16} width="25%" />
              <Group gap="xs">
                <Skeleton height={20} width={60} radius="xl" />
                <Skeleton height={20} width={50} radius="xl" />
              </Group>
            </Group>
            <Group justify="flex-end" gap="xs">
              <Skeleton height={24} width={24} radius="sm" />
              <Skeleton height={24} width={24} radius="sm" />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );

  const OrderTableSkeleton = () => (
    <ScrollArea>
      <Table stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: '80px' }}>Photo</Table.Th>
            <Table.Th style={{ minWidth: '150px' }}>Order</Table.Th>
            <Table.Th style={{ minWidth: '200px' }}>Customer</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Total</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Payment</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Fulfillment</Table.Th>
            <Table.Th style={{ minWidth: '150px' }}>Date</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <SquareImage isLoading={true} fallbackIcon="cart" />
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={12} width="60%" />
                </Stack>
              </Table.Td>
              <Table.Td>
                <Group gap="sm">
                  <Skeleton height={32} width={32} radius="xl" />
                  <Stack gap={0}>
                    <Skeleton height={14} width="70%" />
                    <Skeleton height={12} width="50%" />
                  </Stack>
                </Group>
              </Table.Td>
              <Table.Td>
                <Skeleton height={14} width="80%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="60%" radius="xl" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="70%" radius="xl" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={14} width="90%" />
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  // Utility functions for formatting
  const getFulfillmentStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';

    if (statusLower.includes('fulfilled')) {
      return (
        <Badge color="green" variant="light">
          {status}
        </Badge>
      );
    } else if (statusLower.includes('partially')) {
      return (
        <Badge color="yellow" variant="light">
          {status}
        </Badge>
      );
    } else {
      return (
        <Badge color="red" variant="light">
          {status}
        </Badge>
      );
    }
  };

  const getFinancialStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'unknown';

    if (statusLower.includes('paid')) {
      return (
        <Badge color="green" variant="light">
          {status}
        </Badge>
      );
    } else if (statusLower.includes('pending')) {
      return (
        <Badge color="yellow" variant="light">
          {status}
        </Badge>
      );
    } else if (statusLower.includes('refunded')) {
      return (
        <Badge color="gray" variant="light">
          {status}
        </Badge>
      );
    } else {
      return (
        <Badge color="blue" variant="light">
          {status}
        </Badge>
      );
    }
  };

  const formatPrice = (price: string, currency: string) => {
    const numPrice = parseFloat(price || '0');

    // Currency symbol mapping - consistent with products component
    const currencySymbols: Record<string, string> = {
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerAvatar = (customer?: ShopifyOrder['customer']) => (
    <Avatar size="sm" radius="xl">
      {customer ? (
        `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase()
      ) : (
        <IconUser size={16} />
      )}
    </Avatar>
  );

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Handle product click to navigate to product details
  const handleProductClick = (productId?: string) => {
    if (productId) {
      navigate(`/shopify/products/${productId}`);
    }
  };

  const renderContent = () => {
    // Error state (only show error when not loading and no data)
    if (error && (!allOrders || allOrders.length === 0) && !isLoading) {
      return (
        <Container size="sm" py="xl">
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Stack gap="sm">
              <Text fw={500}>Failed to load orders</Text>
              <Text size="sm">{error.message}</Text>
              <Button size="sm" onClick={refresh} leftSection={<IconRefresh size={14} />}>
                Try Again
              </Button>
            </Stack>
          </Alert>
        </Container>
      );
    }

    return (
      <Container size="xl" py={isMobile ? 'xs' : 'md'}>
        {/* Header */}
        <Stack mb={isMobile ? 'md' : 'lg'} gap={isMobile ? 'xs' : 'sm'}>
          <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap">
            <Group gap="sm">
              <IconShoppingCart size={isMobile ? 28 : 32} color="var(--mantine-color-blue-6)" />
              <Title order={isMobile ? 3 : 1} size={isMobile ? '1.5rem' : undefined}>
                Orders List
              </Title>
            </Group>
            <Group gap="sm">
              <Tooltip label="Refresh orders">
                <ActionIcon
                  size={isMobile ? 'md' : 'lg'}
                  variant="subtle"
                  onClick={refresh}
                  loading={isLoading}
                >
                  <IconRefresh size={isMobile ? 16 : 18} />
                </ActionIcon>
              </Tooltip>
              <Button
                leftSection={<IconCloudDownload size={16} />}
                onClick={() => handleSync(false)}
                loading={syncing}
                disabled={syncing}
                size={isMobile ? 'sm' : 'md'}
                variant="light"
                color="blue"
              >
                {syncing ? 'Syncing...' : 'Sync Orders'}
              </Button>
              <Button
                leftSection={<IconCloudDownload size={16} />}
                onClick={() => handleSync(true)}
                loading={syncing}
                disabled={syncing}
                size={isMobile ? 'sm' : 'md'}
                variant="light"
                color="orange"
              >
                {syncing ? 'Syncing...' : 'Force Sync'}
              </Button>
              <Button
                leftSection={<IconCloudDownload size={16} />}
                onClick={() => handleIncrementalSync()}
                loading={syncing}
                disabled={syncing}
                size={isMobile ? 'sm' : 'md'}
                variant="light"
                color="green"
              >
                {syncing ? 'Syncing...' : 'Incremental Sync'}
              </Button>
              <Button
                leftSection={<IconCloudDownload size={16} />}
                onClick={() => handleRecentSync()}
                loading={syncing}
                disabled={syncing}
                size={isMobile ? 'sm' : 'md'}
                variant="light"
                color="teal"
              >
                {syncing ? 'Syncing...' : 'Recent (30d)'}
              </Button>
              <Button
                leftSection={<IconCloudDownload size={16} />}
                onClick={() => handleUnfulfilledSync()}
                loading={syncing}
                disabled={syncing}
                size={isMobile ? 'sm' : 'md'}
                variant="light"
                color="red"
              >
                {syncing ? 'Syncing...' : 'Unfulfilled'}
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Sync Progress Indicator */}
        {syncProgress && (
          <SyncProgress
            isVisible={syncing}
            current={syncProgress.current}
            total={syncProgress.total}
            message={syncProgress.message}
            onComplete={() => setSyncProgress(null)}
          />
        )}

        {/* Order Type Tabs with Integrated Progress Indicator */}
        <div style={{ position: 'relative', marginBottom: 'var(--mantine-spacing-md)' }}>
          <Tabs value={orderType} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab
                value="unfulfilled"
                disabled={isTabSwitching || (isLoading && (!allOrders || allOrders.length === 0))}
                style={{
                  minHeight: '40px',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '20px',
                  }}
                >
                  <div
                    style={{
                      minWidth: '80px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Unfulfilled
                    </Text>
                  </div>
                  <div
                    style={{
                      minWidth: '20px',
                      maxWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {((isTabSwitching && orderType === 'unfulfilled') ||
                      (isLoading &&
                        (!allOrders || allOrders.length === 0) &&
                        orderType === 'unfulfilled')) && <Loader size="xs" />}
                  </div>
                </div>
              </Tabs.Tab>
              <Tabs.Tab
                value="unfulfilled-products"
                disabled={false} // Never disable this tab since it doesn't depend on API loading
                style={{
                  minHeight: '40px',
                  minWidth: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '20px',
                  }}
                >
                  <div
                    style={{
                      minWidth: '100px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Unfulfilled Products
                    </Text>
                  </div>
                  <div
                    style={{
                      minWidth: '20px',
                      maxWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {/* No loading indicator for this tab since it's instant */}
                  </div>
                </div>
              </Tabs.Tab>
              <Tabs.Tab
                value="today"
                disabled={isTabSwitching || (isLoading && (!allOrders || allOrders.length === 0))}
                style={{
                  minHeight: '40px',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '20px',
                  }}
                >
                  <div
                    style={{
                      minWidth: '80px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Today
                    </Text>
                  </div>
                  <div
                    style={{
                      minWidth: '20px',
                      maxWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {((isTabSwitching && orderType === 'today') ||
                      (isLoading &&
                        (!allOrders || allOrders.length === 0) &&
                        orderType === 'today')) && <Loader size="xs" />}
                  </div>
                </div>
              </Tabs.Tab>
              <Tabs.Tab
                value="all"
                disabled={isTabSwitching || (isLoading && (!allOrders || allOrders.length === 0))}
                style={{
                  minHeight: '40px',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '20px',
                  }}
                >
                  <div
                    style={{
                      minWidth: '80px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      All Orders
                    </Text>
                  </div>
                  <div
                    style={{
                      minWidth: '20px',
                      maxWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {((isTabSwitching && orderType === 'all') ||
                      (isLoading &&
                        (!allOrders || allOrders.length === 0) &&
                        orderType === 'all')) && <Loader size="xs" />}
                  </div>
                </div>
              </Tabs.Tab>
              <Tabs.Tab
                value="top-selling"
                disabled={false} // Never disable this tab since it doesn't depend on API loading
                style={{
                  minHeight: '40px',
                  minWidth: '140px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    minHeight: '20px',
                  }}
                >
                  <div
                    style={{
                      minWidth: '100px',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Top Selling
                    </Text>
                  </div>
                  <div
                    style={{
                      minWidth: '20px',
                      maxWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {topSellingLoading && <Loader size="xs" />}
                  </div>
                </div>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Progress Bar as Tabs Underline - No Extra Space */}
          <Progress
            value={100}
            size="xs"
            radius={0}
            color="blue"
            striped
            animated
            style={{
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              zIndex: 1,
              transition: 'opacity 0.3s ease',
              opacity:
                (isTabSwitching || (isLoading && (!allOrders || allOrders.length === 0))) &&
                orderType !== 'unfulfilled-products'
                  ? 1
                  : 0,
            }}
          />
        </div>

        {/* Sync Result Display */}
        {syncResult && (
          <Alert
            color="green"
            variant="light"
            mb="md"
            withCloseButton
            onClose={() => setSyncResult(null)}
          >
            <Stack gap="xs">
              <Text fw={500}>Sync Completed Successfully</Text>
              <Text size="sm">
                Synced {syncResult.data?.totalFetched || 0} orders with{' '}
                {syncResult.data?.totalLineItems || 0} line items in{' '}
                {syncResult.data?.durationMs || 0}ms
              </Text>
            </Stack>
          </Alert>
        )}

        <Paper withBorder radius="md" py={isMobile ? 'sm' : 'md'} px={0}>
          {/* Enhanced Search and Filters */}
          <Stack gap="md" mb="md" px={isMobile ? 'sm' : 'md'}>
            {/* Search Bar */}
            <Group justify="space-between" wrap="wrap">
              <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
                <TextInput
                  placeholder={
                    orderType === 'unfulfilled-products'
                      ? 'Search products...'
                      : orderType === 'top-selling'
                        ? 'Search products...'
                        : 'Search orders...'
                  }
                  leftSection={<IconSearch size={16} />}
                  value={
                    orderType === 'unfulfilled-products'
                      ? productSearchQuery
                      : orderType === 'top-selling'
                        ? productSearchQuery
                        : searchQuery
                  }
                  onChange={(e) =>
                    orderType === 'unfulfilled-products' || orderType === 'top-selling'
                      ? setProductSearchQuery(e.target.value)
                      : setSearchQuery(e.target.value)
                  }
                  onKeyPress={handleSearchKeyPress}
                  size={isMobile ? 'sm' : 'md'}
                  style={{
                    width: isMobile ? '100%' : isTablet ? '250px' : '300px',
                    minWidth: isMobile ? '100%' : '200px',
                  }}
                />
                {orderType !== 'unfulfilled-products' && orderType !== 'top-selling' && (
                  <Button
                    onClick={handleSearch}
                    loading={isSearching}
                    size={isMobile ? 'sm' : 'md'}
                  >
                    Search
                  </Button>
                )}
              </Group>

              <Group gap="sm">
                {/* Active Filters Badge */}
                {getActiveFiltersCount() > 0 && (
                  <Chip variant="light" color="blue" size="sm" icon={<IconFilter size={14} />}>
                    {getActiveFiltersCount()} filter{getActiveFiltersCount() !== 1 ? 's' : ''}
                  </Chip>
                )}

                <ExportButton
                  data={
                    orderType === 'unfulfilled-products'
                      ? unfulfilledProducts
                      : orderType === 'top-selling'
                        ? topSellingProducts
                        : orders
                  }
                  exportConfig={{
                    ...(orderType === 'unfulfilled-products'
                      ? ShopifyExportConfigs.unfulfilledProducts
                      : orderType === 'top-selling'
                        ? ShopifyExportConfigs.topSellingProducts
                        : ShopifyExportConfigs.orders),
                    title: `Shopify ${
                      orderType === 'unfulfilled-products'
                        ? 'Unfulfilled Products'
                        : orderType === 'top-selling'
                          ? 'Top Selling Products'
                          : 'Orders'
                    } Export - ${orderType.replace('-', ' ').toUpperCase()}`,
                    subtitle: `${
                      orderType === 'unfulfilled-products'
                        ? unfulfilledProducts.length
                        : orderType === 'top-selling'
                          ? topSellingProducts.length
                          : orders.length
                    } ${
                      orderType === 'unfulfilled-products'
                        ? 'products'
                        : orderType === 'top-selling'
                          ? 'products'
                          : 'orders'
                    } ${currentSearchQuery || productSearchQuery ? `matching "${currentSearchQuery || productSearchQuery}"` : ''}`,
                    filename: `shopify_${
                      orderType === 'unfulfilled-products'
                        ? 'unfulfilled_products'
                        : orderType === 'top-selling'
                          ? 'top_selling_products'
                          : 'orders'
                    }_${orderType}`,
                  }}
                  disabled={isLoading || isTabSwitching}
                  size="sm"
                />

                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="light"
                    color="gray"
                    size="sm"
                    leftSection={<IconClearAll size={14} />}
                    onClick={() => {
                      handleClearFilters();
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </Group>
            </Group>

            {/* Enhanced Filters Section */}
            {orderType === 'all' && (
              <Paper withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                <Stack gap="md">
                  <Group gap="sm" align="center">
                    <IconFilter size={16} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" fw={500}>
                      Filters
                    </Text>
                  </Group>

                  <Group gap="md" wrap="wrap">
                    {/* Status Filter */}
                    <Select
                      placeholder="Order Status"
                      value={statusFilter}
                      onChange={(value) => setStatusFilter(value || '')}
                      data={[
                        { value: '', label: 'All Status' },
                        { value: 'open', label: 'Open' },
                        { value: 'closed', label: 'Closed' },
                        { value: 'cancelled', label: 'Cancelled' },
                      ]}
                      size="sm"
                      style={{ width: isMobile ? '100%' : '160px' }}
                      clearable
                      leftSection={<IconAlertCircle size={14} />}
                    />

                    {/* Fulfillment Filter */}
                    <Select
                      placeholder="Fulfillment Status"
                      value={fulfillmentFilter}
                      onChange={(value) => setFulfillmentFilter(value || '')}
                      data={[
                        { value: '', label: 'All Fulfillment' },
                        { value: 'fulfilled', label: 'Fulfilled' },
                        { value: 'unfulfilled', label: 'Unfulfilled' },
                        { value: 'partially_fulfilled', label: 'Partially Fulfilled' },
                      ]}
                      size="sm"
                      style={{ width: isMobile ? '100%' : '180px' }}
                      clearable
                      leftSection={<IconShoppingCart size={14} />}
                    />

                    {/* Financial Filter */}
                    <Select
                      placeholder="Payment Status"
                      value={financialFilter}
                      onChange={(value) => setFinancialFilter(value || '')}
                      data={[
                        { value: '', label: 'All Payment' },
                        { value: 'paid', label: 'Paid' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'refunded', label: 'Refunded' },
                      ]}
                      size="sm"
                      style={{ width: isMobile ? '100%' : '160px' }}
                      clearable
                      leftSection={<IconUser size={14} />}
                    />

                    {/* Enhanced Date Range Picker */}
                    <Popover
                      opened={datePickerOpened}
                      onChange={setDatePickerOpened}
                      position="bottom-start"
                      shadow="md"
                      closeOnClickOutside={false}
                      closeOnEscape={true}
                    >
                      <Popover.Target>
                        <UnstyledButton
                          onClick={() => setDatePickerOpened(true)}
                          style={{
                            border: '1px solid var(--mantine-color-gray-4)',
                            borderRadius: 'var(--mantine-radius-sm)',
                            padding: '8px 12px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: isMobile ? '100%' : '200px',
                            fontSize: 'var(--mantine-font-size-sm)',
                          }}
                        >
                          <IconCalendar size={14} />
                          <Text size="sm" style={{ flex: 1, textAlign: 'left' }}>
                            {formatDateRangeDisplay()}
                          </Text>
                          {(startDateFilter || endDateFilter) && (
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDatePickerClear();
                              }}
                            >
                              <IconX size={12} />
                            </ActionIcon>
                          )}
                        </UnstyledButton>
                      </Popover.Target>
                      <Popover.Dropdown>
                        <Box p="md" onClick={(e) => e.stopPropagation()}>
                          <Stack gap="md">
                            <Text size="sm" fw={500}>
                              Select Date Range
                            </Text>

                            {/* Quick Date Filters */}
                            <Group gap="xs" wrap="wrap">
                              <Chip
                                variant={activeQuickRange === 'today' ? 'filled' : 'light'}
                                color={activeQuickRange === 'today' ? 'blue' : undefined}
                                size="sm"
                                onClick={() => handleQuickDateFilter('today')}
                                checked={activeQuickRange === 'today'}
                              >
                                Today
                              </Chip>
                              <Chip
                                variant={activeQuickRange === 'yesterday' ? 'filled' : 'light'}
                                color={activeQuickRange === 'yesterday' ? 'blue' : undefined}
                                size="sm"
                                onClick={() => handleQuickDateFilter('yesterday')}
                                checked={activeQuickRange === 'yesterday'}
                              >
                                Yesterday
                              </Chip>
                              <Chip
                                variant={activeQuickRange === 'last7days' ? 'filled' : 'light'}
                                color={activeQuickRange === 'last7days' ? 'blue' : undefined}
                                size="sm"
                                onClick={() => handleQuickDateFilter('last7days')}
                                checked={activeQuickRange === 'last7days'}
                              >
                                Last 7 Days
                              </Chip>
                              <Chip
                                variant={activeQuickRange === 'last30days' ? 'filled' : 'light'}
                                color={activeQuickRange === 'last30days' ? 'blue' : undefined}
                                size="sm"
                                onClick={() => handleQuickDateFilter('last30days')}
                                checked={activeQuickRange === 'last30days'}
                              >
                                Last 30 Days
                              </Chip>
                              <Chip
                                variant={
                                  !activeQuickRange && !tempStartDate && !tempEndDate
                                    ? 'filled'
                                    : 'light'
                                }
                                color={
                                  !activeQuickRange && !tempStartDate && !tempEndDate
                                    ? 'gray'
                                    : undefined
                                }
                                size="sm"
                                onClick={() => handleQuickDateFilter('clear')}
                                checked={!activeQuickRange && !tempStartDate && !tempEndDate}
                              >
                                Clear
                              </Chip>
                            </Group>

                            <Divider />

                            {/* Calendar */}
                            <Group gap="md" wrap="wrap">
                              <TextInput
                                type="date"
                                placeholder="From"
                                value={
                                  tempStartDate ? tempStartDate.toISOString().split('T')[0] : ''
                                }
                                onChange={(e) => {
                                  const date = e.target.value ? new Date(e.target.value) : null;
                                  setTempStartDate(date);
                                }}
                                size="sm"
                                style={{ flex: 1 }}
                                leftSection={<IconCalendar size={14} />}
                                rightSection={
                                  tempStartDate && (
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      onClick={() => setTempStartDate(null)}
                                    >
                                      <IconX size={12} />
                                    </ActionIcon>
                                  )
                                }
                                max={new Date().toISOString().split('T')[0]}
                              />
                              <TextInput
                                type="date"
                                placeholder="To"
                                value={tempEndDate ? tempEndDate.toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const date = e.target.value ? new Date(e.target.value) : null;
                                  setTempEndDate(date);
                                }}
                                size="sm"
                                style={{ flex: 1 }}
                                leftSection={<IconCalendarTime size={14} />}
                                rightSection={
                                  tempEndDate && (
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      onClick={() => setTempEndDate(null)}
                                    >
                                      <IconX size={12} />
                                    </ActionIcon>
                                  )
                                }
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </Group>

                            {/* Action Buttons */}
                            <Group justify="space-between">
                              <Button
                                variant="light"
                                size="sm"
                                onClick={handleDatePickerClear}
                                leftSection={<IconX size={14} />}
                              >
                                Clear
                              </Button>
                              <Group gap="xs">
                                <Button
                                  variant="light"
                                  size="sm"
                                  onClick={() => setDatePickerOpened(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleDatePickerApply}
                                  disabled={!tempStartDate && !tempEndDate}
                                >
                                  Apply
                                </Button>
                              </Group>
                            </Group>
                          </Stack>
                        </Box>
                      </Popover.Dropdown>
                    </Popover>
                  </Group>
                </Stack>
              </Paper>
            )}

            {/* Product Filters for Unfulfilled Products Tab */}
            {orderType === 'unfulfilled-products' && (
              <Paper withBorder p="md" style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                <Stack gap="md">
                  <Group gap="sm" align="center">
                    <IconFilter size={16} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" fw={500}>
                      Product Filters
                    </Text>
                  </Group>

                  <Group gap="md" wrap="wrap">
                    <Select
                      placeholder="Filter by quantity"
                      value={productFilter}
                      onChange={(value) => setProductFilter(value || '')}
                      data={[
                        { value: '', label: 'All Products' },
                        { value: 'high-quantity', label: 'High Quantity (5+)' },
                        { value: 'medium-quantity', label: 'Medium Quantity (2-4)' },
                        { value: 'single-quantity', label: 'Single Items' },
                      ]}
                      size="sm"
                      style={{ width: isMobile ? '100%' : '200px' }}
                      clearable
                      leftSection={<IconShoppingCart size={14} />}
                    />
                  </Group>
                </Stack>
              </Paper>
            )}
          </Stack>

          {/* Results Summary */}
          {((allOrders && allOrders.length > 0) ||
            (orderType === 'unfulfilled-products' && unfulfilledOrdersData.length > 0) ||
            (orderType === 'top-selling' && topSellingProducts.length > 0)) && (
            <Group justify="space-between" px={isMobile ? 'sm' : 'md'} mb="sm">
              <Text size="sm" c="dimmed">
                {orderType === 'unfulfilled-products'
                  ? `${unfulfilledProducts.length} products shown (from ${unfulfilledOrdersData.length} unfulfilled orders)`
                  : orderType === 'top-selling'
                    ? `${topSellingProducts.length} top selling products shown`
                    : `${orders.length} orders shown`}
                {orderType === 'unfulfilled' && ' (unfulfilled only)'}
                {orderType === 'today' && ' (today only)'}
                {orderType === 'top-selling' && ' (by revenue)'}
                {orderType !== 'unfulfilled-products' &&
                  orderType !== 'top-selling' &&
                  orders.length !== totalLoaded &&
                  ` of ${totalLoaded} loaded`}
                {orderType !== 'unfulfilled-products' &&
                  orderType !== 'top-selling' &&
                  hasMore &&
                  ' (more available)'}
              </Text>
              {orderType === 'unfulfilled-products' && productSearchQuery && (
                <Text size="sm" c="blue">
                  Searching for: "{productSearchQuery}"
                </Text>
              )}
              {orderType !== 'unfulfilled-products' &&
                orderType !== 'top-selling' &&
                currentSearchQuery && (
                  <Text size="sm" c="blue">
                    Searching for: "{currentSearchQuery}"
                  </Text>
                )}
            </Group>
          )}

          {/* Orders Table/Cards with Smooth Transitions */}
          <Transition
            mounted={
              orderType === 'unfulfilled-products' || orderType === 'top-selling'
                ? true
                : tabTransition
            }
            transition="fade"
            duration={orderType === 'unfulfilled-products' || orderType === 'top-selling' ? 0 : 200}
            timingFunction="ease"
          >
            {(styles) => (
              <div style={styles}>
                {(isTabSwitching || (isLoading && (!allOrders || allOrders.length === 0))) &&
                orderType !== 'unfulfilled-products' &&
                orderType !== 'top-selling' ? (
                  // Show skeletons during tab switching or initial loading (except for unfulfilled-products and top-selling)
                  isMobile ? (
                    <OrderCardSkeleton />
                  ) : (
                    <OrderTableSkeleton />
                  )
                ) : orderType === 'unfulfilled-products' ? (
                  // Products Display for Unfulfilled Products Tab
                  unfulfilledOrdersData.length === 0 ? (
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <IconShoppingCart size={48} color="var(--mantine-color-gray-5)" />
                        <Text size="lg" fw={500} c="dimmed">
                          No unfulfilled orders data
                        </Text>
                        <Text size="sm" c="dimmed">
                          Please visit the "Unfulfilled" tab first to load the data
                        </Text>
                        <Button
                          variant="light"
                          onClick={() => setOrderType('unfulfilled')}
                          size="sm"
                        >
                          Go to Unfulfilled Orders
                        </Button>
                      </Stack>
                    </Center>
                  ) : unfulfilledProducts.length === 0 ? (
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <IconShoppingCart size={48} color="var(--mantine-color-gray-5)" />
                        <Text size="lg" fw={500} c="dimmed">
                          No unfulfilled products found
                        </Text>
                        <Text size="sm" c="dimmed">
                          {productSearchQuery
                            ? 'Try adjusting your search criteria'
                            : 'All products are fulfilled'}
                        </Text>
                      </Stack>
                    </Center>
                  ) : (
                    <ScrollArea>
                      <Table stickyHeader>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ minWidth: '80px' }}>Photo</Table.Th>
                            <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                            <Table.Th style={{ minWidth: '100px' }}>Quantity</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
                            <Table.Th style={{ minWidth: '200px' }}>Orders</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {unfulfilledProducts.map((product) => (
                            <Table.Tr key={product.id}>
                              <Table.Td>
                                <SquareImage
                                  src={product.image?.url}
                                  alt={product.image?.altText || product.title}
                                  fallbackIcon="package"
                                  size={80}
                                />
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500}>
                                  {product.title}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={
                                    product.quantity >= 5
                                      ? 'red'
                                      : product.quantity >= 2
                                        ? 'yellow'
                                        : 'blue'
                                  }
                                  variant="light"
                                >
                                  {product.quantity}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500}>
                                  {formatPrice(product.price, 'INR')}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap="xs">
                                  {product.orders
                                    .slice(0, 3)
                                    .map((order: ProductOrder, index: number) => (
                                      <Group key={index} gap="xs">
                                        <Text size="xs" c="blue">
                                          {order.orderNumber}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                          {order.customer
                                            ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                                            : 'Guest'}
                                        </Text>
                                      </Group>
                                    ))}
                                  {product.orders.length > 3 && (
                                    <Text size="xs" c="dimmed">
                                      +{product.orders.length - 3} more orders
                                    </Text>
                                  )}
                                </Stack>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )
                ) : orderType === 'top-selling' ? (
                  // Top Selling Products Display
                  topSellingLoading ? (
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <Loader size="lg" />
                        <Text size="lg" fw={500} c="dimmed">
                          Loading top selling products...
                        </Text>
                      </Stack>
                    </Center>
                  ) : topSellingProducts.length === 0 ? (
                    <Center py="xl">
                      <Stack align="center" gap="md">
                        <IconShoppingCart size={48} color="var(--mantine-color-gray-5)" />
                        <Text size="lg" fw={500} c="dimmed">
                          No top selling products found
                        </Text>
                        <Text size="sm" c="dimmed">
                          Try adjusting your date range or sync more orders
                        </Text>
                      </Stack>
                    </Center>
                  ) : (
                    <ScrollArea>
                      <Table stickyHeader>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th style={{ minWidth: '60px' }}>Photo</Table.Th>
                            <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                            <Table.Th style={{ minWidth: '100px' }}>Quantity Sold</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Revenue</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Cost</Table.Th>
                            <Table.Th style={{ minWidth: '120px' }}>Profit</Table.Th>
                            <Table.Th style={{ minWidth: '100px' }}>Margin</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {topSellingProducts.map((product, index) => (
                            <Table.Tr key={index}>
                              <Table.Td>
                                <UnstyledButton
                                  onClick={() => handleProductClick(product.productId)}
                                  style={{
                                    cursor: product.productId ? 'pointer' : 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <SquareImage
                                    src={product.imageUrl}
                                    alt={product.name}
                                    fallbackIcon="package"
                                    size={40}
                                  />
                                </UnstyledButton>
                              </Table.Td>
                              <Table.Td>
                                <UnstyledButton
                                  onClick={() => handleProductClick(product.productId)}
                                  style={{
                                    cursor: product.productId ? 'pointer' : 'default',
                                    textAlign: 'left',
                                    width: '100%',
                                  }}
                                >
                                  <Text
                                    size="sm"
                                    fw={500}
                                    c={product.productId ? 'blue' : 'inherit'}
                                  >
                                    {product.name}
                                  </Text>
                                </UnstyledButton>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={
                                    product.quantity >= 10
                                      ? 'red'
                                      : product.quantity >= 5
                                        ? 'yellow'
                                        : 'blue'
                                  }
                                  variant="light"
                                >
                                  {product.quantity}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500} c="green">
                                  ₹{product.revenue.toFixed(2)}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" c="dimmed">
                                  ₹{product.cost.toFixed(2)}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500} c={product.profit >= 0 ? 'green' : 'red'}>
                                  ₹{product.profit.toFixed(2)}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={
                                    product.margin >= 20
                                      ? 'green'
                                      : product.margin >= 10
                                        ? 'yellow'
                                        : 'red'
                                  }
                                  variant="light"
                                >
                                  {product.margin.toFixed(1)}%
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )
                ) : orders.length === 0 ? (
                  <Center py="xl">
                    <Stack align="center" gap="md">
                      <IconShoppingCart size={48} color="var(--mantine-color-gray-5)" />
                      <Text size="lg" fw={500} c="dimmed">
                        No orders found
                      </Text>
                      <Text size="sm" c="dimmed">
                        {currentSearchQuery
                          ? 'Try adjusting your search criteria'
                          : 'No orders available'}
                      </Text>
                    </Stack>
                  </Center>
                ) : isMobile ? (
                  // Mobile Card Layout
                  <Stack gap="sm" px="sm">
                    {orders.map((order) => (
                      <Card key={order.id} withBorder style={{ transition: 'all 0.2s ease' }}>
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Group gap="xs" align="center">
                              {order.lineItems.length > 1 && (
                                <ActionIcon
                                  size="xs"
                                  variant="subtle"
                                  onClick={() => toggleOrderExpansion(order.id)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {expandedOrders.has(order.id) ? (
                                    <IconChevronDown size={12} />
                                  ) : (
                                    <IconChevronRight size={12} />
                                  )}
                                </ActionIcon>
                              )}
                              <Text fw={500} size="sm">
                                {order.orderNumber}
                              </Text>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {formatDate(order.createdAt)}
                            </Text>
                          </Group>

                          <Group>
                            {getCustomerAvatar(order.customer)}
                            <Stack gap={0}>
                              <Text size="sm" fw={500}>
                                {order.customer
                                  ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                                  : 'Guest Customer'}
                              </Text>
                              {order.customer?.email && (
                                <Text size="xs" c="blue">
                                  {order.customer.email}
                                </Text>
                              )}
                            </Stack>
                          </Group>

                          <Group justify="space-between">
                            <Text fw={500}>{formatPrice(order.totalPrice, order.currency)}</Text>
                            <Group gap="xs">
                              {getFulfillmentStatusBadge(order.displayFulfillmentStatus)}
                              {getFinancialStatusBadge(order.displayFinancialStatus)}
                            </Group>
                          </Group>

                          {/* Product images grid for mobile */}
                          {order.lineItems.length > 1 && (
                            <Group gap={4} wrap="nowrap" style={{ maxWidth: '100%' }}>
                              {order.lineItems.slice(0, 6).map((item, index) => (
                                <SquareImage
                                  key={index}
                                  src={item.image?.url}
                                  alt={item.image?.altText || item.title || 'Product image'}
                                  fallbackIcon="package"
                                  size={order.lineItems.length <= 4 ? 32 : 28}
                                />
                              ))}
                              {order.lineItems.length > 6 && (
                                <Text size="xs" c="dimmed" style={{ fontSize: '10px' }}>
                                  +{order.lineItems.length - 6}
                                </Text>
                              )}
                            </Group>
                          )}

                          {/* Expanded items for mobile */}
                          {order.lineItems.length > 1 && (
                            <Collapse in={expandedOrders.has(order.id)}>
                              <div
                                style={{
                                  backgroundColor: 'var(--mantine-color-gray-0)',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  marginTop: '8px',
                                }}
                              >
                                <Stack gap="sm">
                                  <Text size="sm" fw={500} c="dimmed">
                                    Order Items ({order.lineItems.length})
                                  </Text>
                                  <Stack gap="xs">
                                    {order.lineItems.map((item, index) => (
                                      <Group key={index} gap="sm" align="flex-start">
                                        <SquareImage
                                          src={item.image?.url}
                                          alt={item.image?.altText || item.title || 'Product image'}
                                          fallbackIcon="package"
                                          size={32}
                                        />
                                        <Stack gap={2} style={{ flex: 1 }}>
                                          <Text size="sm" fw={500} lineClamp={2}>
                                            {item.title}
                                          </Text>
                                          <Text size="xs" c="dimmed">
                                            Qty: {item.quantity}
                                          </Text>
                                          <Text size="xs" fw={500}>
                                            {formatPrice(item.originalTotalPrice, order.currency)}
                                          </Text>
                                        </Stack>
                                      </Group>
                                    ))}
                                  </Stack>
                                </Stack>
                              </div>
                            </Collapse>
                          )}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  // Desktop Table Layout
                  <ScrollArea>
                    <Table stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ minWidth: '80px' }}>Photo</Table.Th>
                          <Table.Th style={{ minWidth: '150px' }}>Order</Table.Th>
                          <Table.Th style={{ minWidth: '200px' }}>Customer</Table.Th>
                          <Table.Th style={{ minWidth: '120px' }}>Total</Table.Th>
                          <Table.Th style={{ minWidth: '120px' }}>Payment</Table.Th>
                          <Table.Th style={{ minWidth: '120px' }}>Fulfillment</Table.Th>
                          <Table.Th style={{ minWidth: '150px' }}>Date</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {orders.map((order, index) => {
                          const isDark = colorScheme === 'dark';
                          const altRowColor = isDark ? theme.colors.dark[6] : theme.colors.gray[0];
                          const highlightRowColor = isDark
                            ? theme.colors.blue[9]
                            : theme.colors.blue[0];
                          const expandedRowColor = isDark
                            ? theme.colors.blue[8]
                            : theme.colors.blue[1];
                          const isExpanded = expandedOrders.has(order.id);

                          return (
                            <React.Fragment key={order.id}>
                              <Table.Tr
                                style={{
                                  transition: 'all 0.2s ease',
                                  backgroundColor: isExpanded
                                    ? highlightRowColor
                                    : index % 2 === 0
                                      ? 'transparent'
                                      : altRowColor,
                                }}
                              >
                                {/* Photo cell: expand button (if multi-item) + images */}
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                    minWidth: 120,
                                  }}
                                >
                                  <Group gap={6} wrap="nowrap" align="center">
                                    {order.lineItems.length > 1 && (
                                      <ActionIcon
                                        size="md"
                                        variant="subtle"
                                        onClick={() => toggleOrderExpansion(order.id)}
                                        style={{ cursor: 'pointer' }}
                                        aria-label={
                                          expandedOrders.has(order.id) ? 'Collapse' : 'Expand'
                                        }
                                      >
                                        {expandedOrders.has(order.id) ? (
                                          <IconChevronDown size={20} />
                                        ) : (
                                          <IconChevronRight size={20} />
                                        )}
                                      </ActionIcon>
                                    )}
                                    {order.lineItems.length === 1 ? (
                                      <SquareImage
                                        src={order.lineItems[0]?.image?.url}
                                        alt={
                                          order.lineItems[0]?.image?.altText ||
                                          order.lineItems[0]?.title ||
                                          `Product image for order ${order.orderNumber}`
                                        }
                                        fallbackIcon="cart"
                                      />
                                    ) : (
                                      <Group
                                        gap={3}
                                        wrap="nowrap"
                                        style={{ maxWidth: '120px', alignItems: 'center' }}
                                      >
                                        {order.lineItems.slice(0, 8).map((item, index) => (
                                          <SquareImage
                                            key={index}
                                            src={item.image?.url}
                                            alt={
                                              item.image?.altText || item.title || 'Product image'
                                            }
                                            fallbackIcon="package"
                                            size={order.lineItems.length <= 4 ? 28 : 24}
                                          />
                                        ))}
                                        {order.lineItems.length > 8 && (
                                          <Text
                                            size="xs"
                                            c="dimmed"
                                            style={{ fontSize: '11px', fontWeight: 500 }}
                                          >
                                            +{order.lineItems.length - 8}
                                          </Text>
                                        )}
                                      </Group>
                                    )}
                                  </Group>
                                </Table.Td>
                                {/* ...rest of the Table.Td cells (Order, Customer, etc.)... */}
                                {/* Order number cell, no expand button here */}
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  <Stack gap={2}>
                                    <Text size="sm" fw={500}>
                                      {order.orderNumber}
                                    </Text>
                                    {order.lineItems.length > 0 && (
                                      <Text size="xs" c="dimmed">
                                        {order.lineItems.length} item
                                        {order.lineItems.length !== 1 ? 's' : ''}
                                      </Text>
                                    )}
                                  </Stack>
                                </Table.Td>
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  <Group gap="sm">
                                    {getCustomerAvatar(order.customer)}
                                    <Stack gap={0}>
                                      <Text size="sm" fw={500}>
                                        {order.customer
                                          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                                          : 'Guest Customer'}
                                      </Text>
                                      {order.customer?.email && (
                                        <Text size="xs" c="blue">
                                          {order.customer.email}
                                        </Text>
                                      )}
                                    </Stack>
                                  </Group>
                                </Table.Td>
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  <Text size="sm" fw={500}>
                                    {formatPrice(order.totalPrice, order.currency)}
                                  </Text>
                                </Table.Td>
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  {getFinancialStatusBadge(order.displayFinancialStatus)}
                                </Table.Td>
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  {getFulfillmentStatusBadge(order.displayFulfillmentStatus)}
                                </Table.Td>
                                <Table.Td
                                  style={{
                                    height: order.lineItems.length > 1 ? '80px' : '60px',
                                    verticalAlign: 'middle',
                                    minHeight: order.lineItems.length > 1 ? '80px' : '60px',
                                  }}
                                >
                                  <Text size="sm">{formatDate(order.createdAt)}</Text>
                                </Table.Td>
                              </Table.Tr>

                              {/* Expanded items row */}
                              {order.lineItems.length > 1 && (
                                <Table.Tr
                                  style={{
                                    display: isExpanded ? 'table-row' : 'none',
                                    backgroundColor: highlightRowColor,
                                  }}
                                >
                                  <Table.Td colSpan={7} style={{ padding: 0 }}>
                                    <div
                                      style={{
                                        backgroundColor: expandedRowColor,
                                        padding: '12px',
                                        borderTop: `1px solid ${isDark ? theme.colors.dark[4] : theme.colors.gray[3]}`,
                                      }}
                                    >
                                      <Stack gap="sm">
                                        <Text size="sm" fw={500} c="dimmed">
                                          Order Items ({order.lineItems.length})
                                        </Text>
                                        <Group gap="md" wrap="wrap">
                                          {order.lineItems.map((item, index) => (
                                            <Card
                                              key={index}
                                              withBorder
                                              style={{ minWidth: '200px' }}
                                            >
                                              <Group gap="sm">
                                                <SquareImage
                                                  src={item.image?.url}
                                                  alt={
                                                    item.image?.altText ||
                                                    item.title ||
                                                    'Product image'
                                                  }
                                                  fallbackIcon="package"
                                                  size={40}
                                                />
                                                <Stack gap={2} style={{ flex: 1 }}>
                                                  <Text size="sm" fw={500} lineClamp={2}>
                                                    {item.title}
                                                  </Text>
                                                  <Text size="xs" c="dimmed">
                                                    Qty: {item.quantity}
                                                  </Text>
                                                  <Text size="xs" fw={500}>
                                                    {formatPrice(
                                                      item.originalTotalPrice,
                                                      order.currency,
                                                    )}
                                                  </Text>
                                                </Stack>
                                              </Group>
                                            </Card>
                                          ))}
                                        </Group>
                                      </Stack>
                                    </div>
                                  </Table.Td>
                                </Table.Tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </div>
            )}
          </Transition>

          {/* Load More Button - Hide for unfulfilled products tab */}
          {allOrders &&
            allOrders.length > 0 &&
            orderType !== 'unfulfilled-products' &&
            orderType !== 'top-selling' && (
              <LoadMoreButton
                onLoadMore={loadMore}
                hasMore={hasMore}
                isLoading={isLoadingMore}
                disabled={!canLoadMore}
                totalLoaded={totalLoaded}
                variant="outline"
                size="md"
              />
            )}
        </Paper>
      </Container>
    );
  };

  return (
    <ShopifyConnectionGuard
      title="Shopify Orders"
      description="Connect your Shopify store to view and manage your orders."
    >
      {renderContent()}
    </ShopifyConnectionGuard>
  );
};

export default EnhancedOrderList;

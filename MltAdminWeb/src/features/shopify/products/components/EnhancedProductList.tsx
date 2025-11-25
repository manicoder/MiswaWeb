import React, { useState, useMemo, useEffect } from 'react';
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
  Badge,
  Card,
  ActionIcon,
  Loader,
  Alert,
  Center,
  Table,
  ScrollArea,
  Tooltip,
  Grid,
  Tabs,
  Skeleton,
  Progress,
  FileInput,
} from '@mantine/core';
import {
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconShoppingBag,
  IconEye,
  IconEdit,
  IconClearAll,
  IconLayoutGrid,
  IconList,
  IconFileTypeCsv,
  IconUpload,
  IconBarcode,
  IconCheck,
  IconX,
  IconFileTypePdf,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import { useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { usePagePagination } from '../../../../hooks/usePagePagination';
import { pageBasedShopifyService } from '../../../../services/pageBasedShopifyService';
import type { ProductPageParams } from '../../../../services/pageBasedShopifyService';
import type { ShopifyProduct } from '../../../../services/paginatedShopifyService';
import PagePagination from '../../../../components/common/PagePagination';
import ShopifyConnectionGuard from '../../../../components/shopify/ShopifyConnectionGuardWithModal';
import SquareImage from '../../../../components/common/SquareImage';
import ExportButton from '../../../../components/common/ExportButton';
import { ShopifyExportConfigs } from '../../../../utils/exportUtils';
import { ShopifyService } from '../../../../services/shopifyService';
import SmartSearchProductList from './SmartSearchProductList';
import { useProductStore } from '../../../../stores/productStore';
import { useCostFetching } from '../../../../contexts/CostFetchingContext';

// Type definitions for validation results
interface ValidationProduct {
  productId: string;
  variantId: string;
  productTitle: string;
  sku: string;
  currentBarcode: string;
  newBarcode: string;
  status: string;
  price: string;
  imageUrl: string;
}

interface NotFoundSku {
  sku: string;
  fnsku: string;
  reason: string;
}

interface ValidationResults {
  foundProducts: ValidationProduct[];
  notFoundSkus: NotFoundSku[];
  totalCsvRows: number;
  foundCount: number;
  notFoundCount: number;
  summary: string;
}

interface MatchResults {
  matched: number;
  total: number;
  updated: string[];
  replaced: string[];
  added: string[];
}

interface UpdateItem {
  productId: string;
  variantId: string;
  productInfo: string;
  updateData: {
    productId: string;
    variantId: string;
    barcode: string;
  };
}

interface CsvRow {
  sku: string;
  fnsku: string;
}

const EnhancedProductList: React.FC = () => {
  const navigate = useNavigate();

  // Professional Zustand state management - direct access to prevent infinite loops
  const searchQuery = useProductStore((state) => state.filters.search);
  const statusFilter = useProductStore((state) => state.filters.status);
  const activeTab = useProductStore((state) => state.filters.tab);
  const currentPage = useProductStore((state) => state.filters.page);
  const viewMode = useProductStore((state) => state.ui.viewMode);

  // Actions - direct access
  const setSearch = useProductStore((state) => state.setSearch);
  const setStatus = useProductStore((state) => state.setStatus);
  const setTab = useProductStore((state) => state.setTab);
  const setPage = useProductStore((state) => state.setPage);
  const setViewMode = useProductStore((state) => state.setViewMode);

  // Add initial sync state management
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [initialSyncComplete, setInitialSyncComplete] = useState(false);
  const [syncError, setSyncError] = useState<string>('');

  // CSV Barcode Update State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [updatingIndividual, setUpdatingIndividual] = useState<Set<string>>(new Set());
  const [updatedProducts, setUpdatedProducts] = useState<Set<string>>(new Set());
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResults>({
    matched: 0,
    total: 0,
    updated: [],
    replaced: [],
    added: [],
  });

  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // Add state for sync operations
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  // Check if initial sync is needed - but cache the result to prevent re-checking on remount
  useEffect(() => {
    const checkInitialSync = async () => {
      try {
        console.log('🔄 Checking initial sync status...');
        setSyncError('');

        // First check if products exist (without showing full page loader yet)
        const countResponse = await ShopifyService.getProductCount();
        const hasProducts =
          countResponse.success && countResponse.data && countResponse.data.totalProducts > 0;

        if (!hasProducts) {
          // No products exist, NOW show initial sync loader and start sync
          setIsInitialSync(true);
          console.log('⚠️ No products found, starting initial sync...');
          const syncResponse = await ShopifyService.syncProducts(false);

          if (syncResponse.success && syncResponse.data) {
            console.log('✅ Initial sync completed successfully');
            setInitialSyncComplete(true);
            setSyncMessage(
              `✅ Successfully synced ${syncResponse.data.synced || 0} products from Shopify`,
            );
            setTimeout(() => setSyncMessage(''), 5001);
            // Cache this result in localStorage to prevent re-checking on navigation
            localStorage.setItem('shopify-sync-complete', 'true');
          } else {
            console.error('❌ Initial sync failed:', syncResponse.error);
            setSyncError(syncResponse.error || 'Initial sync failed');
          }
        } else {
          // Products already exist, no sync needed - set complete immediately
          console.log('✅ Products found in database, sync complete');
          setInitialSyncComplete(true);
          // Cache this result in localStorage to prevent re-checking on navigation
          localStorage.setItem('shopify-sync-complete', 'true');
        }
      } catch (error: unknown) {
        console.error('❌ Initial sync check failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to check for products';
        setSyncError(errorMessage);
        // If we can't check, assume products exist to avoid blocking the UI
        setInitialSyncComplete(true);
      } finally {
        setIsInitialSync(false);
      }
    };

    // Check localStorage first to avoid unnecessary API calls on component remount
    const cachedSyncStatus = localStorage.getItem('shopify-sync-complete');

    if (cachedSyncStatus === 'true') {
      console.log('🚀 Using cached sync status - sync already complete');
      setInitialSyncComplete(true);
      setIsInitialSync(false);
    } else {
      checkInitialSync();
    }
  }, []);

  // Custom refresh function that syncs products from Shopify
  const handleRefreshProducts = async () => {
    setIsRefreshing(true);
    setSyncMessage('');

    try {
      // Call sync products API with forceRefresh=true
      const response = await ShopifyService.syncProducts(true);

      if (response.success && response.data) {
        setSyncMessage(`✅ Synced ${response.data.synced || 0} products from Shopify`);

        // Refresh the local product list
        await refresh();
      } else {
        setSyncMessage(`❌ Sync failed: ${response.error}`);
      }
    } catch (error: unknown) {
      console.error('Product sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSyncMessage(`❌ Sync failed: ${errorMessage}`);
    } finally {
      setIsRefreshing(false);

      // Clear sync message after 5 seconds
      setTimeout(() => setSyncMessage(''), 5001);
    }
  };

  // CSV Processing Functions
  const parseCsvFile = (file: File): Promise<CsvRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

          const skuIndex = headers.findIndex((h) => h.includes('sku'));
          const fnskuIndex = headers.findIndex((h) => h.includes('fnsku') || h.includes('barcode'));

          if (skuIndex === -1 || fnskuIndex === -1) {
            throw new Error('CSV must contain SKU and FNSKU columns');
          }

          const data: { sku: string; fnsku: string }[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map((v) => v.trim());
            if (values[skuIndex] && values[fnskuIndex]) {
              data.push({
                sku: values[skuIndex],
                fnsku: values[fnskuIndex],
              });
            }
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleCsvUpload = async (file: File | null) => {
    setCsvFile(file);
    setValidationResults(null);
    setMatchResults({
      matched: 0,
      total: 0,
      updated: [],
      replaced: [],
      added: [],
    });

    if (!file) {
      setCsvData([]);
      return;
    }

    try {
      const data = await parseCsvFile(file);
      setCsvData(data);
      console.log('CSV data loaded:', data);

      // Automatically validate SKUs after CSV upload
      await validateSkus(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error reading CSV: ${errorMessage}`);
      setCsvFile(null);
      setCsvData([]);
    }
  };

  const validateSkus = async (csvData: CsvRow[]) => {
    if (!csvData.length) {
      return;
    }

    setIsValidating(true);
    // Reset individual update states when validating new data
    setUpdatingIndividual(new Set());
    setUpdatedProducts(new Set());

    try {
      const response = await ShopifyService.validateSkus(csvData);

      if (response.success && response.data) {
        setValidationResults(response.data);
        console.log('SKU validation results:', response.data);
      } else {
        alert(`Error validating SKUs: ${response.error || 'Unknown error'}`);
      }
    } catch (error: unknown) {
      console.error('SKU validation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error validating SKUs: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Export Functions
  const exportNotFoundSkusCsv = async () => {
    if (!validationResults?.notFoundSkus?.length) return;

    try {
      await ShopifyService.exportNotFoundSkusCsv(validationResults.notFoundSkus, {
        title: 'Not Found SKUs Report',
        storeName: 'Shopify Store',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error exporting CSV: ${errorMessage}`);
    }
  };

  const exportNotFoundSkusPdf = async () => {
    if (!validationResults?.notFoundSkus?.length) return;

    try {
      await ShopifyService.exportNotFoundSkusPdf(validationResults.notFoundSkus, {
        title: 'Not Found SKUs Report',
        storeName: 'Shopify Store',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error exporting PDF: ${errorMessage}`);
    }
  };

  const updateIndividualProduct = async (product: ValidationProduct) => {
    const productKey = `${product.productId}-${product.variantId}`;

    // Add to updating set
    setUpdatingIndividual((prev) => new Set(prev).add(productKey));

    try {
      const response = await ShopifyService.updateProductVariant({
        productId: product.productId,
        variantId: product.variantId,
        barcode: product.newBarcode,
      });

      if (response.success) {
        // Add to updated set
        setUpdatedProducts((prev) => new Set(prev).add(productKey));

        // Show success message
        alert(`✅ Successfully updated barcode for ${product.productTitle}!`);
      } else {
        throw new Error(response.error || 'Failed to save to Shopify');
      }
    } catch (error: unknown) {
      console.error(`Failed to update ${product.productTitle}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to update ${product.productTitle}: ${errorMessage}`);
    } finally {
      // Remove from updating set
      setUpdatingIndividual((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productKey);
        return newSet;
      });
    }
  };

  const processBarcodeUpdate = async () => {
    if (!validationResults || !validationResults.foundProducts.length) {
      alert('Please upload a CSV file and ensure products are validated first.');
      return;
    }

    setIsProcessing(true);
    const updated: string[] = [];
    const replaced: string[] = [];
    const added: string[] = [];
    const updatedItems: UpdateItem[] = [];

    // Use validation results to create update items, but skip already updated products
    validationResults.foundProducts.forEach((product) => {
      const productKey = `${product.productId}-${product.variantId}`;

      // Skip products that have already been updated individually
      if (updatedProducts.has(productKey)) {
        return;
      }

      const productInfo = `${product.productTitle} (${product.sku})`;

      updatedItems.push({
        productId: product.productId,
        variantId: product.variantId,
        productInfo,
        updateData: {
          productId: product.productId,
          variantId: product.variantId,
          barcode: product.newBarcode,
        },
      });

      if (product.currentBarcode && product.currentBarcode !== product.newBarcode) {
        replaced.push(`${productInfo}: ${product.currentBarcode} → ${product.newBarcode}`);
      } else if (!product.currentBarcode) {
        added.push(`${productInfo}: Added ${product.newBarcode}`);
      }

      updated.push(productInfo);
    });

    setMatchResults({
      matched: validationResults.foundProducts.length,
      total: validationResults.totalCsvRows,
      updated,
      replaced,
      added,
    });

    // Check if there are any items to update
    if (updatedItems.length === 0) {
      alert(
        `ℹ️ All ${validationResults.foundProducts.length} products have already been updated individually!`,
      );
      setIsProcessing(false);
      return;
    }

    // Auto-save all updated items to Shopify
    if (updatedItems.length > 0) {
      try {
        let savedCount = 0;
        let failedCount = 0;
        const failedItems: string[] = [];

        setUploadProgress(0);

        for (let i = 0; i < updatedItems.length; i++) {
          const item = updatedItems[i];

          try {
            setUploadProgress(Math.round(((i + 1) / updatedItems.length) * 100));

            // Call Shopify API to save barcode
            const response = await ShopifyService.updateProductVariant({
              productId: item.updateData.productId,
              variantId: item.updateData.variantId,
              barcode: item.updateData.barcode,
            });

            if (response.success) {
              savedCount++;
              // Add to updated products set
              const productKey = `${item.updateData.productId}-${item.updateData.variantId}`;
              setUpdatedProducts((prev) => new Set(prev).add(productKey));
            } else {
              throw new Error(response.error || 'Failed to save to Shopify');
            }
          } catch (error: unknown) {
            console.error(`Failed to save ${item.productInfo}:`, error);
            failedCount++;
            failedItems.push(item.productInfo);
          }
        }

        // Show final results
        const totalUpdatedCount = updatedProducts.size;
        const skippedCount =
          validationResults.foundProducts.length - updatedItems.length - savedCount;

        let message = `✅ Bulk Update Complete!\n\n`;

        if (savedCount > 0) {
          message += `✓ ${savedCount} items updated in this batch\n`;
        }

        if (totalUpdatedCount > savedCount) {
          message += `✓ ${
            totalUpdatedCount - savedCount
          } items were already updated individually\n`;
        }

        message += `✓ Total updated: ${totalUpdatedCount} of ${validationResults.foundProducts.length} products\n`;

        if (skippedCount > 0) {
          message += `⚠️ ${skippedCount} items were skipped (already up to date)\n`;
        }

        if (failedCount > 0) {
          message += `\n✗ ${failedCount} items failed to save\n`;
          if (failedItems.length > 0) {
            message += `\nFailed items:\n${failedItems.join('\n')}`;
          }
        }

        if (savedCount > 0 || totalUpdatedCount === validationResults.foundProducts.length) {
          alert(message);
        }

        setUploadProgress(0);
      } catch (error: unknown) {
        console.error('Error during auto-save process:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Error during auto-save process: ${errorMessage}`);
      }
    }

    setIsProcessing(false);
  };

  // Create fetch function for products - stable reference to prevent cache invalidation
  const fetchProducts = useMemo(() => {
    return async (params: ProductPageParams) => {
      console.log('🔍 fetchProducts API call:', { params, statusFilter });
      // React Query will handle caching and prevent duplicate requests
      return pageBasedShopifyService.fetchProducts({
        ...params,
        status: (statusFilter as 'active' | 'draft' | 'archived') || undefined,
      });
    };
  }, [statusFilter]); // Include statusFilter dependency as it's used in the function

  // Utility function to get inventory count (needed before pagination hook)
  const getInventoryCount = (variants: ShopifyProduct['variants']) => {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((total: number, variant) => total + (variant.inventoryQuantity || 0), 0);
  };

  // Use page-based pagination hook - ONLY enabled after initial sync completes
  // Initialize hook with Zustand state to prevent refetching on component remount
  const {
    data: products,
    isLoading,
    error,
    isRetrying,
    totalPages,
    pageSize: hookPageSize,
    total,
    hasNextPage,
    refresh,
    changePageSize,
    goToPage: goToPageHook,
    search: searchHook,
    clearSearch: clearSearchHook,
    currentPage: hookCurrentPage,
    searchQuery: hookSearchQuery,
  } = usePagePagination<ShopifyProduct>({
    queryKey: ['shopify-products-enhanced'], // 🚀 STABLE: Remove statusFilter to prevent cache misses
    fetchFn: fetchProducts,
    pageSize: 50,
    enabled: initialSyncComplete, // 🎯 KEY CHANGE: Only enable after sync completes
    staleTime: 1000 * 60 * 60 * 24, // 🚀 ENHANCED: Cache data for 24 hours - very aggressive caching
    gcTime: 1000 * 60 * 60 * 24 * 2, // 🚀 ENHANCED: Keep in memory for 48 hours for seamless navigation
    // 🚀 CRITICAL: Initialize hook with Zustand state to prevent refetching on back navigation
    initialPage: currentPage,
    initialSearch: searchQuery,
  });

  // Debug logging to track navigation behavior
  useEffect(() => {
    console.log('🔄 EnhancedProductList state sync check:', {
      'Zustand currentPage': currentPage,
      'Hook currentPage': hookCurrentPage,
      'Zustand searchQuery': searchQuery,
      'Hook searchQuery': hookSearchQuery,
      initialSyncComplete: initialSyncComplete,
    });
  }, [currentPage, hookCurrentPage, searchQuery, hookSearchQuery, initialSyncComplete]);

  // Show retry notification
  useEffect(() => {
    if (isRetrying) {
      notifications.show({
        title: 'Retrying...',
        message: 'The previous request timed out. Retrying with a different approach.',
        color: 'yellow',
        autoClose: 3000,
      });
    }
  }, [isRetrying]);

  // Professional pagination and search functions that update Zustand
  const goToPage = (page: number) => {
    setPage(page);
    goToPageHook(page);
  };

  const search = (query: string) => {
    setSearch(query);
    searchHook(query);
  };

  const clearSearch = () => {
    setSearch('');
    clearSearchHook();
  };

  // Filter products by stock status after fetching - Optimized with useMemo
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    switch (activeTab) {
      case 'limited-stock':
        return products.filter((product) => {
          const inventory = getInventoryCount(product.variants);
          return inventory > 0 && inventory <= 10;
        });
      case 'out-of-stock':
        return products.filter((product) => {
          const inventory = getInventoryCount(product.variants);
          return inventory === 0;
        });
      case 'all':
      default:
        return products;
    }
  }, [products, activeTab]);

  // Get counts for each tab - Optimized with useMemo
  const stockCounts = useMemo(() => {
    if (!products) return { all: 0, limitedStock: 0, outOfStock: 0 };

    const all = products.length;
    const limitedStock = products.filter((product) => {
      const inventory = getInventoryCount(product.variants);
      return inventory > 0 && inventory <= 10;
    }).length;
    const outOfStock = products.filter((product) => {
      const inventory = getInventoryCount(product.variants);
      return inventory === 0;
    }).length;

    return { all, limitedStock, outOfStock };
  }, [products]);

  // Handle instant tab switching - No loading since it's just client-side filtering
  const handleTabChange = (value: string | null) => {
    if (!value || value === activeTab) return;
    setTab(value as 'all' | 'limited-stock' | 'out-of-stock' | 'smart-search' | 'barcode-update');
    // No loading states needed - it's just filtering existing data!
  };

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

  // Handle clear filters
  const handleClearFilters = async () => {
    setStatus('');
    setSearch('');
    handleTabChange('all');
    await clearSearch();
  };

  // Add this function inside the EnhancedProductList component
  const handleClearCsvUpload = () => {
    setCsvFile(null);
    setCsvData([]);
    setValidationResults(null);
    setMatchResults({
      matched: 0,
      total: 0,
      updated: [],
      replaced: [],
      added: [],
    });
    setUpdatedProducts(new Set());
    setUpdatingIndividual(new Set());
    setUploadProgress(0);
  };

  const { startCostFetching, isRunning } = useCostFetching();

  const handleStartCostFetching = async () => {
    try {
      await startCostFetching();
    } catch (err) {
      console.error('Error starting cost fetching:', err);
    }
  };

  // Skeleton loading components
  const ProductGridSkeleton = () => (
    <Grid px={isMobile ? 'sm' : 'md'}>
      {Array.from({ length: isMobile ? 2 : isTablet ? 4 : 8 }).map((_, index) => (
        <Grid.Col key={index} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
          <Card withBorder h="100%">
            <Stack gap="sm" h="100%">
              <Center>
                <SquareImage isLoading={true} />
              </Center>
              <Stack gap="xs" style={{ flex: 1 }}>
                <Skeleton height={16} width="80%" />
                <Skeleton height={12} width="60%" />
                <Group justify="space-between">
                  <Skeleton height={14} width="40%" />
                  <Skeleton height={20} width="30%" radius="xl" />
                </Group>
                <Group justify="space-between">
                  <Skeleton height={14} width="35%" />
                  <Skeleton height={12} width="45%" />
                </Group>
                <Skeleton height={12} width="55%" />
              </Stack>
              <Group justify="flex-end" gap="xs">
                <Skeleton height={24} width={24} radius="sm" />
                <Skeleton height={24} width={24} radius="sm" />
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      ))}
    </Grid>
  );

  const ProductTableSkeleton = () => (
    <ScrollArea>
      <Table stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
            <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
            <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
            <Table.Th style={{ minWidth: '100px' }}>Inventory</Table.Th>
            <Table.Th style={{ minWidth: '120px' }}>Created</Table.Th>
            <Table.Th style={{ minWidth: '100px', textAlign: 'center' }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {Array.from({ length: 8 }).map((_, index) => (
            <Table.Tr key={index}>
              <Table.Td>
                <SquareImage isLoading={true} />
              </Table.Td>
              <Table.Td>
                <Stack gap={2}>
                  <Skeleton height={14} width="80%" />
                  <Skeleton height={12} width="50%" />
                </Stack>
              </Table.Td>
              <Table.Td>
                <Skeleton height={20} width="60%" radius="xl" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={14} width="80%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={14} width="40%" />
              </Table.Td>
              <Table.Td>
                <Skeleton height={14} width="70%" />
              </Table.Td>
              <Table.Td>
                <Group gap="xs" justify="center">
                  <Skeleton height={24} width={24} radius="sm" />
                  <Skeleton height={24} width={24} radius="sm" />
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );

  // Utility functions
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'green',
      draft: 'yellow',
      archived: 'gray',
    };

    const statusLower = status?.toLowerCase() || 'unknown';

    return (
      <Badge color={colors[statusLower] || 'blue'} variant="light">
        {status || 'Unknown'}
      </Badge>
    );
  };

  const formatPrice = (variants: ShopifyProduct['variants'], currency: string = 'INR') => {
    if (!variants || variants.length === 0) return 'No price';

    const prices = variants.map((v) => parseFloat(v.price || '0'));
    const compareAtPrices = variants
      .map((v) => parseFloat(v.compareAtPrice || '0'))
      .filter((p) => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const maxCompareAtPrice = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : null;

    // Currency symbol mapping - can be expanded based on store currency
    const currencySymbols: Record<string, string> = {
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || currency;

    let priceString = '';
    if (minPrice === maxPrice) {
      priceString = `${symbol}${minPrice.toFixed(2)}`;
    } else {
      priceString = `${symbol}${minPrice.toFixed(2)} - ${symbol}${maxPrice.toFixed(2)}`;
    }

    // Show compare at price if it exists and is higher than the current price
    if (maxCompareAtPrice && maxCompareAtPrice > maxPrice) {
      // For single price, show compare at price
      if (minPrice === maxPrice) {
        priceString = `<span style='text-decoration:line-through;color:#888;'>${symbol}${maxCompareAtPrice.toFixed(2)}</span> ${symbol}${minPrice.toFixed(2)}`;
      } else {
        // For price range, show compare at price for the max price
        priceString = `${symbol}${minPrice.toFixed(2)} - <span style='text-decoration:line-through;color:#888;'>${symbol}${maxCompareAtPrice.toFixed(2)}</span> ${symbol}${maxPrice.toFixed(2)}`;
      }
    }

    return priceString;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Professional page-based product details navigation
  const handleProductClick = (productId: string) => {
    console.log('🎯 Navigating to product details page for:', productId);
    // Extract numeric ID from GraphQL format for clean URLs
    const numericId = productId.replace('gid://shopify/Product/', '');
    navigate(`/shopify/products/${numericId}`);
  };

  const renderContent = () => {
    // Show initial sync loading state with skeleton layout
    if (isInitialSync) {
      return (
        <Container size="xl" py={isMobile ? 'xs' : 'md'}>
          {/* Header with sync message */}
          <Stack mb={isMobile ? 'md' : 'lg'} gap={isMobile ? 'xs' : 'sm'}>
            <Group justify="space-between" align={isMobile ? 'flex-start' : 'center'} wrap="wrap">
              <Group gap="sm">
                <IconShoppingBag size={isMobile ? 28 : 32} color="var(--mantine-color-blue-6)" />
                <Title order={isMobile ? 3 : 1} size={isMobile ? '1.5rem' : undefined}>
                  Products List
                </Title>
              </Group>
              <Group gap="sm">
                <Button
                  leftSection={<IconRefresh size={16} />}
                  loading={true}
                  disabled={true}
                  variant="light"
                  size={isMobile ? 'sm' : 'md'}
                >
                  {isMobile ? 'Syncing...' : 'Syncing Products...'}
                </Button>
              </Group>
            </Group>

            {/* Sync Status Alert */}
            <Alert color="blue" variant="light" icon={<Loader size={16} />}>
              <Stack gap="xs">
                <Text fw={500}>Syncing Products from Shopify</Text>
                <Text size="sm">
                  We're downloading all your products from Shopify for the first time. This might
                  take a few moments depending on your product count.
                </Text>
              </Stack>
            </Alert>
          </Stack>

          {/* Stock Tabs Skeleton */}
          <div
            style={{
              position: 'relative',
              marginBottom: 'var(--mantine-spacing-md)',
            }}
          >
            <Tabs value="all">
              <Tabs.List>
                <Tabs.Tab
                  value="all"
                  disabled={true}
                  style={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      All Products
                    </Text>
                    <div
                      style={{
                        minWidth: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Loader size="xs" />
                    </div>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab
                  value="limited-stock"
                  disabled={true}
                  style={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Limited Stock
                    </Text>
                    <div
                      style={{
                        minWidth: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Skeleton height={16} width={20} radius="xl" />
                    </div>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab
                  value="out-of-stock"
                  disabled={true}
                  style={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Out of Stock
                    </Text>
                    <div
                      style={{
                        minWidth: '20px',
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      <Skeleton height={16} width={20} radius="xl" />
                    </div>
                  </Group>
                </Tabs.Tab>
                <Tabs.Tab
                  value="smart-search"
                  disabled={true}
                  style={{
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                    <IconSearch size={16} />
                    <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Smart Search
                    </Text>
                  </Group>
                </Tabs.Tab>
              </Tabs.List>
            </Tabs>

            {/* Animated Progress Bar */}
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
              }}
            />
          </div>

          <Paper withBorder radius="md" py={isMobile ? 'sm' : 'md'} px={0}>
            {/* Search and Filters Skeleton */}
            <Stack gap="md" mb="md" px={isMobile ? 'sm' : 'md'}>
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
                  <Skeleton height={36} width={isMobile ? '100%' : '250px'} />
                  <Skeleton height={36} width={80} />
                  <Skeleton height={36} width={120} />
                </Group>
                <Group gap="sm">
                  <Skeleton height={36} width={100} />
                  <Skeleton height={36} width={36} />
                </Group>
              </Group>
            </Stack>

            {/* Product List Skeleton */}
            {viewMode === 'grid' || isMobile ? <ProductGridSkeleton /> : <ProductTableSkeleton />}
          </Paper>
        </Container>
      );
    }

    // Show sync error state
    if (syncError && !initialSyncComplete) {
      return (
        <Container size="sm" py="xl">
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Stack gap="sm">
              <Text fw={500}>Failed to sync products</Text>
              <Text size="sm">{syncError}</Text>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                leftSection={<IconRefresh size={14} />}
              >
                Retry
              </Button>
            </Stack>
          </Alert>
        </Container>
      );
    }

    // Error state (only show error when not loading and no data)
    if (error && products.length === 0 && !isLoading && initialSyncComplete) {
      return (
        <Container size="sm" py="xl">
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            <Stack gap="sm">
              <Text fw={500}>Failed to load products</Text>
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
              <IconShoppingBag size={isMobile ? 28 : 32} color="var(--mantine-color-blue-6)" />
              <Title order={isMobile ? 3 : 1} size={isMobile ? '1.5rem' : undefined}>
                Products List
              </Title>
            </Group>
            <Group gap="sm">
              <Button
                leftSection={<IconCurrencyRupee size={16} />}
                onClick={handleStartCostFetching}
                disabled={isRunning || isInitialSync || !initialSyncComplete}
                variant="light"
                color="green"
                size={isMobile ? 'sm' : 'md'}
              >
                {isMobile ? 'Fetch Costs' : 'Fetch Product Costs'}
              </Button>
              <Button
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefreshProducts}
                loading={isRefreshing}
                disabled={isInitialSync || !initialSyncComplete}
                variant="light"
                size={isMobile ? 'sm' : 'md'}
              >
                {isMobile ? 'Refresh' : 'Refresh Products'}
              </Button>
            </Group>
          </Group>
        </Stack>

        {/* Sync Status Message */}
        {syncMessage && (
          <Alert
            color={syncMessage.includes('✅') ? 'green' : 'red'}
            variant="light"
            mb="md"
            withCloseButton
            onClose={() => setSyncMessage('')}
          >
            {syncMessage}
          </Alert>
        )}

        {/* Stock Tabs with Integrated Progress Indicator */}
        <div
          style={{
            position: 'relative',
            marginBottom: 'var(--mantine-spacing-md)',
          }}
        >
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab
                value="all"
                disabled={
                  isInitialSync ||
                  !initialSyncComplete ||
                  (isLoading && (!products || products.length === 0))
                }
                style={{
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    All Products
                  </Text>
                  <div
                    style={{
                      minWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {stockCounts.all > 0 &&
                      !(isLoading && (!products || products.length === 0)) && (
                        <Badge size="xs" color="blue" variant="light">
                          {stockCounts.all}
                        </Badge>
                      )}
                    {isLoading && (!products || products.length === 0) && activeTab === 'all' && (
                      <Loader size="xs" />
                    )}
                  </div>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab
                value="limited-stock"
                disabled={
                  isInitialSync ||
                  !initialSyncComplete ||
                  (isLoading && (!products || products.length === 0))
                }
                style={{
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Limited Stock
                  </Text>
                  <div
                    style={{
                      minWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {stockCounts.limitedStock > 0 &&
                      !(isLoading && (!products || products.length === 0)) && (
                        <Badge size="xs" color="yellow" variant="light">
                          {stockCounts.limitedStock}
                        </Badge>
                      )}
                    {isLoading &&
                      (!products || products.length === 0) &&
                      activeTab === 'limited-stock' && <Loader size="xs" />}
                  </div>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab
                value="out-of-stock"
                disabled={
                  isInitialSync ||
                  !initialSyncComplete ||
                  (isLoading && (!products || products.length === 0))
                }
                style={{
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Out of Stock
                  </Text>
                  <div
                    style={{
                      minWidth: '20px',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {stockCounts.outOfStock > 0 &&
                      !(isLoading && (!products || products.length === 0)) && (
                        <Badge size="xs" color="red" variant="light">
                          {stockCounts.outOfStock}
                        </Badge>
                      )}
                    {isLoading &&
                      (!products || products.length === 0) &&
                      activeTab === 'out-of-stock' && <Loader size="xs" />}
                  </div>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab
                value="smart-search"
                style={{
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                  <IconSearch size={16} />
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Smart Search
                  </Text>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab
                value="barcode-update"
                style={{
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Group gap="xs" wrap="nowrap" style={{ minHeight: '20px' }}>
                  <IconBarcode size={16} />
                  <Text size="sm" style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Barcode Update
                  </Text>
                  {csvData.length > 0 && (
                    <Badge size="xs" color="blue" variant="light">
                      {csvData.length}
                    </Badge>
                  )}
                </Group>
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Progress Bar only for initial loading - not for tab switches */}
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
              opacity: isLoading && (!products || products.length === 0) ? 1 : 0,
            }}
          />
        </div>

        <Paper withBorder radius="md" py={isMobile ? 'sm' : 'md'} px={0}>
          {/* Search and Filters - Hidden for Smart Search tab */}
          {activeTab !== 'smart-search' && (
            <Stack gap="md" mb="md" px={isMobile ? 'sm' : 'md'}>
              <Group justify="space-between" wrap="wrap">
                <Group gap="sm" wrap="wrap" style={{ flex: 1 }}>
                  <TextInput
                    placeholder="Search products..."
                    leftSection={<IconSearch size={16} />}
                    value={searchQuery}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    size="md"
                    style={{
                      width: isMobile ? '100%' : isTablet ? '200px' : '250px',
                      minWidth: isMobile ? '100%' : '150px',
                    }}
                  />
                  <Button onClick={handleSearch} loading={isLoading} size="md">
                    Search
                  </Button>
                  <Select
                    placeholder="Status"
                    value={statusFilter}
                    onChange={(value) => setStatus(value || '')}
                    data={[
                      { value: '', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'draft', label: 'Draft' },
                      { value: 'archived', label: 'Archived' },
                    ]}
                    size="md"
                    style={{ width: isMobile ? '100%' : '140px' }}
                    clearable
                  />
                </Group>

                <Group gap="sm">
                  <ExportButton
                    data={filteredProducts}
                    exportConfig={{
                      ...ShopifyExportConfigs.products,
                      title: `Shopify Products Export - ${activeTab
                        .replace('-', ' ')
                        .toUpperCase()}`,
                      subtitle: `${filteredProducts.length} products ${
                        searchQuery ? `matching "${searchQuery}"` : ''
                      }`,
                      filename: `shopify_products_${activeTab}`,
                    }}
                    disabled={isLoading}
                    size="sm"
                  />

                  {(statusFilter || searchQuery || activeTab !== 'all') && (
                    <Button
                      variant="light"
                      color="gray"
                      size="sm"
                      leftSection={<IconClearAll size={14} />}
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                  {!isMobile && (
                    <Tooltip label={`Switch to ${viewMode === 'grid' ? 'table' : 'grid'} view`}>
                      <ActionIcon
                        variant="outline"
                        size="lg"
                        onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                        color="blue"
                      >
                        {viewMode === 'grid' ? (
                          <IconList size={18} />
                        ) : (
                          <IconLayoutGrid size={18} />
                        )}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </Group>
            </Stack>
          )}

          {/* Results Summary */}
          {products.length > 0 && (
            <Group justify="space-between" px={isMobile ? 'sm' : 'md'} mb="sm">
              <Text size="sm" c="dimmed">
                {filteredProducts.length} products shown
                {activeTab !== 'all' && ` (${activeTab.replace('-', ' ')})`}
                {total !== filteredProducts.length && ` of ${total} total`}
                {hasNextPage && ' (more available)'}
              </Text>
              {searchQuery && (
                <Text size="sm" c="blue">
                  Searching for: "{searchQuery}"
                </Text>
              )}
            </Group>
          )}

          {/* Smart Search Tab Content */}
          {activeTab === 'smart-search' ? (
            <Stack gap="lg" px={isMobile ? 'sm' : 'md'}>
              <SmartSearchProductList />
            </Stack>
          ) : activeTab === 'barcode-update' ? (
            <Stack gap="lg" px={isMobile ? 'sm' : 'md'}>
              {/* CSV Upload Section */}
              <Paper withBorder radius="md" p="lg" style={{ backgroundColor: '#f8f9fa' }}>
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <Stack gap={0} style={{ flex: 1, minWidth: '250px' }}>
                      <Group gap="xs" align="center" mb={2}>
                        <IconFileTypeCsv size={22} />
                        <Text size="xl" fw={700} style={{ letterSpacing: -0.5 }}>
                          SKU → FNSKU Barcode Update
                        </Text>
                      </Group>
                    </Stack>
                    <Group gap="xs" align="flex-end">
                      {validationResults && validationResults.foundProducts.length > 0 && (
                        <Button
                          leftSection={<IconUpload size={16} />}
                          onClick={processBarcodeUpdate}
                          loading={isProcessing}
                          color="green"
                          size="md"
                          disabled={
                            validationResults.foundProducts.filter(
                              (product) =>
                                !updatedProducts.has(`${product.productId}-${product.variantId}`),
                            ).length === 0
                          }
                        >
                          {(() => {
                            const remainingCount = validationResults.foundProducts.filter(
                              (product) =>
                                !updatedProducts.has(`${product.productId}-${product.variantId}`),
                            ).length;
                            const totalCount = validationResults.foundProducts.length;
                            const updatedCount = totalCount - remainingCount;
                            if (remainingCount === 0) {
                              return `All ${totalCount} products updated ✅`;
                            } else if (updatedCount === 0) {
                              return `Bulk Update All (${totalCount} items)`;
                            } else {
                              return `Bulk Update Remaining (${remainingCount} of ${totalCount})`;
                            }
                          })()}
                        </Button>
                      )}
                      {(csvFile || validationResults || matchResults.matched > 0) && (
                        <Button
                          leftSection={<IconClearAll size={16} />}
                          color="gray"
                          variant="light"
                          size="md"
                          onClick={handleClearCsvUpload}
                        >
                          Clear
                        </Button>
                      )}
                    </Group>
                  </Group>
                  <FileInput
                    placeholder="Select CSV file..."
                    accept=".csv"
                    value={csvFile}
                    onChange={handleCsvUpload}
                    leftSection={<IconFileTypeCsv size={16} />}
                    description="CSV should contain SKU and FNSKU columns"
                    disabled={isValidating}
                    size="md"
                  />
                  {isValidating && (
                    <Group gap="sm">
                      <Loader size="sm" />
                      <Text size="sm" c="blue">
                        Validating SKUs against Shopify products...
                      </Text>
                    </Group>
                  )}
                  {isProcessing && uploadProgress > 0 && (
                    <Progress value={uploadProgress} color="blue" />
                  )}
                </Stack>
              </Paper>

              {/* Validation Results */}
              {validationResults && (
                <Stack gap="lg">
                  {/* Summary Alert */}
                  <Alert
                    color={validationResults.foundCount > 0 ? 'green' : 'orange'}
                    title={
                      <Group gap={6}>
                        <IconAlertCircle size={18} />{' '}
                        <Text span size="lg" fw={600}>
                          SKU Validation Results
                        </Text>
                      </Group>
                    }
                  >
                    <Text size="sm">{validationResults.summary}</Text>
                  </Alert>

                  {/* Validation Results Tabs */}
                  <Tabs defaultValue="found" variant="outline">
                    <Tabs.List mb="md">
                      <Tabs.Tab value="found" leftSection={<IconCheck size={16} />} color="green">
                        Found Products ({validationResults.foundProducts.length})
                      </Tabs.Tab>
                      {validationResults.notFoundSkus.length > 0 && (
                        <Tabs.Tab value="not-found" leftSection={<IconX size={16} />} color="red">
                          Not Found SKUs ({validationResults.notFoundSkus.length})
                        </Tabs.Tab>
                      )}
                    </Tabs.List>

                    {/* Found Products Tab */}
                    <Tabs.Panel value="found">
                      {validationResults.foundProducts.length > 0 ? (
                        <Stack gap="xs">
                          {validationResults.foundProducts.map((product, index) => {
                            const productKey = `${product.productId}-${product.variantId}`;
                            const isUpdating = updatingIndividual.has(productKey);
                            const isUpdated = updatedProducts.has(productKey);

                            return (
                              <Paper
                                key={index}
                                withBorder
                                p="md"
                                style={{
                                  backgroundColor: isUpdated ? '#f0f9ff' : 'white',
                                  borderColor: isUpdated ? '#22c55e' : undefined,
                                  opacity: isUpdated ? 0.9 : 1,
                                }}
                              >
                                <Group gap="md" justify="space-between" align="flex-start">
                                  {/* Left Side: Image and Product Details */}
                                  <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                                    {/* Product Image */}
                                    {product.imageUrl && (
                                      <div
                                        style={{
                                          width: '60px',
                                          height: '60px',
                                          flexShrink: 0,
                                        }}
                                      >
                                        <img
                                          src={product.imageUrl}
                                          alt={product.productTitle}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                          }}
                                        />
                                      </div>
                                    )}

                                    {/* Product Details */}
                                    <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                      <Text
                                        size="md"
                                        fw={500}
                                        lineClamp={2}
                                        c={isUpdated ? 'dimmed' : undefined}
                                      >
                                        {product.productTitle}
                                        {isUpdated && (
                                          <Text span c="green" fw={600} ml="xs">
                                            ✓
                                          </Text>
                                        )}
                                      </Text>
                                      <Group gap="xs" wrap="wrap">
                                        <Badge size="sm" color="blue" variant="light">
                                          SKU: {product.sku}
                                        </Badge>
                                        <Badge size="sm" color="gray" variant="light">
                                          ₹{product.price}
                                        </Badge>
                                        <Badge size="sm" color="green" variant="outline">
                                          {product.status}
                                        </Badge>
                                      </Group>
                                      <Group gap="md" wrap="nowrap" align="flex-start">
                                        <Stack gap={2}>
                                          <Text size="xs" fw={500} c="dimmed">
                                            Current Barcode:
                                          </Text>
                                          <Text
                                            size="sm"
                                            c={product.currentBarcode ? 'dark' : 'dimmed'}
                                          >
                                            {product.currentBarcode || 'No barcode'}
                                          </Text>
                                        </Stack>
                                        <Stack gap={2}>
                                          <Text size="xs" fw={500} c="green">
                                            New Barcode:
                                          </Text>
                                          <Text size="sm" c="green" fw={500}>
                                            {product.newBarcode}
                                          </Text>
                                        </Stack>
                                      </Group>
                                    </Stack>
                                  </Group>

                                  {/* Right Side: Update Icon Button */}
                                  <div style={{ flexShrink: 0 }}>
                                    <Tooltip
                                      label={isUpdated ? 'Already Updated' : 'Update Barcode'}
                                      position="left"
                                    >
                                      <ActionIcon
                                        size="xl"
                                        color={isUpdated ? 'green' : 'blue'}
                                        variant={isUpdated ? 'light' : 'filled'}
                                        loading={isUpdating}
                                        disabled={isUpdated}
                                        onClick={() => updateIndividualProduct(product)}
                                      >
                                        {isUpdated ? (
                                          <IconCheck size={20} />
                                        ) : (
                                          <IconBarcode size={20} />
                                        )}
                                      </ActionIcon>
                                    </Tooltip>
                                  </div>
                                </Group>
                              </Paper>
                            );
                          })}
                        </Stack>
                      ) : (
                        <Center py="xl">
                          <Stack align="center" gap="md">
                            <IconCheck size={48} color="var(--mantine-color-gray-5)" />
                            <Text size="lg" fw={500} c="dimmed">
                              No products found
                            </Text>
                            <Text size="sm" c="dimmed" ta="center">
                              No products found matching the uploaded SKUs
                            </Text>
                          </Stack>
                        </Center>
                      )}
                    </Tabs.Panel>

                    {/* Not Found SKUs Tab */}
                    {validationResults.notFoundSkus.length > 0 && (
                      <Tabs.Panel value="not-found">
                        <Stack gap="xs">
                          {/* Export Buttons */}
                          <Group justify="flex-end" gap="xs">
                            <Button
                              size="sm"
                              variant="outline"
                              leftSection={<IconFileTypeCsv size={16} />}
                              onClick={exportNotFoundSkusCsv}
                              disabled={!validationResults?.notFoundSkus?.length}
                            >
                              Export CSV
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              leftSection={<IconFileTypePdf size={16} />}
                              onClick={exportNotFoundSkusPdf}
                              disabled={!validationResults?.notFoundSkus?.length}
                            >
                              Export PDF
                            </Button>
                          </Group>

                          {validationResults.notFoundSkus.map((notFound, index) => (
                            <Paper
                              key={index}
                              withBorder
                              p="md"
                              style={{ backgroundColor: 'white' }}
                            >
                              <Group gap="md" justify="space-between" align="center">
                                <Stack gap={4} style={{ flex: 1 }}>
                                  <Group gap="xs" wrap="wrap">
                                    <Badge size="sm" color="red" variant="light">
                                      SKU: {notFound.sku}
                                    </Badge>
                                    <Badge size="sm" color="gray" variant="light">
                                      FNSKU: {notFound.fnsku}
                                    </Badge>
                                  </Group>
                                  <Text size="sm" c="dimmed">
                                    {notFound.reason}
                                  </Text>
                                </Stack>
                                <ActionIcon size="xl" color="red" variant="light" disabled>
                                  <IconX size={20} />
                                </ActionIcon>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      </Tabs.Panel>
                    )}
                  </Tabs>
                </Stack>
              )}

              {/* Update Results */}
              {matchResults.matched > 0 && (
                <Alert color="green" title="✅ Barcode Update Complete">
                  <Text size="sm">
                    Successfully updated {matchResults.matched} product variants and saved to
                    Shopify.
                  </Text>

                  {matchResults.replaced && matchResults.replaced.length > 0 && (
                    <Text size="xs" c="orange" mt="xs" fw={500}>
                      Replaced {matchResults.replaced.length} existing barcodes
                    </Text>
                  )}

                  {matchResults.added && matchResults.added.length > 0 && (
                    <Text size="xs" c="blue" mt="xs" fw={500}>
                      Added {matchResults.added.length} new barcodes
                    </Text>
                  )}
                </Alert>
              )}
            </Stack>
          ) : (
            <>
              {/* Products Display - Show skeleton during loading states */}
              {isLoading && (!products || products.length === 0) ? (
                // Show skeletons during initial loading or when no cached data
                viewMode === 'grid' || isMobile ? (
                  <ProductGridSkeleton />
                ) : (
                  <ProductTableSkeleton />
                )
              ) : filteredProducts.length === 0 ? (
                <Center py="xl">
                  <Stack align="center" gap="md">
                    <IconShoppingBag size={48} color="var(--mantine-color-gray-5)" />
                    <Text size="lg" fw={500} c="dimmed">
                      {activeTab === 'all'
                        ? 'No products found'
                        : activeTab === 'limited-stock'
                          ? 'No limited stock products'
                          : 'No out of stock products'}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {searchQuery
                        ? 'Try adjusting your search criteria'
                        : activeTab === 'all'
                          ? 'No products available'
                          : activeTab === 'limited-stock'
                            ? 'No products with limited stock (1-10 items)'
                            : 'No products are currently out of stock'}
                    </Text>
                  </Stack>
                </Center>
              ) : viewMode === 'grid' || isMobile ? (
                // Grid Layout (mobile always uses grid)
                <Grid px={isMobile ? 'sm' : 'md'}>
                  {filteredProducts.map((product) => (
                    <Grid.Col key={product.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                      <Card
                        withBorder
                        h="100%"
                        style={{
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          },
                        }}
                        onClick={() => handleProductClick(product.id)}
                      >
                        <Stack gap="sm" h="100%">
                          <Center>
                            <SquareImage
                              src={product.images?.[0]?.url}
                              alt={product.images?.[0]?.altText || product.title}
                              fallbackIcon="package"
                            />
                          </Center>

                          <Stack gap="xs" style={{ flex: 1 }}>
                            <Text fw={500} size="sm" lineClamp={2}>
                              {product.title}
                            </Text>

                            <Group justify="flex-end">{getStatusBadge(product.status)}</Group>

                            <Group justify="space-between">
                              <Text
                                fw={500}
                                size="sm"
                                dangerouslySetInnerHTML={{
                                  __html: formatPrice(product.variants, 'INR'),
                                }}
                              />
                              <Text size="xs" c="dimmed">
                                {getInventoryCount(product.variants)} in stock
                              </Text>
                            </Group>

                            <Text size="xs" c="dimmed">
                              Created: {formatDate(product.createdAt)}
                            </Text>
                          </Stack>

                          <Group justify="flex-end" gap="xs">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleProductClick(product.id);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="gray" size="sm">
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Group>
                        </Stack>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              ) : (
                // Table Layout
                <ScrollArea>
                  <Table stickyHeader>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
                        <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                        <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                        <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
                        <Table.Th style={{ minWidth: '100px' }}>Inventory</Table.Th>
                        <Table.Th style={{ minWidth: '120px' }}>Created</Table.Th>
                        <Table.Th style={{ minWidth: '100px', textAlign: 'center' }}>
                          Actions
                        </Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredProducts.map((product) => (
                        <Table.Tr
                          key={product.id}
                          style={{
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleProductClick(product.id)}
                        >
                          <Table.Td>
                            <SquareImage
                              src={product.images?.[0]?.url}
                              alt={product.images?.[0]?.altText || product.title}
                              fallbackIcon="package"
                            />
                          </Table.Td>
                          <Table.Td>
                            <Stack gap={2}>
                              <Text size="sm" fw={500} lineClamp={2}>
                                {product.title}
                              </Text>
                              {product.variants.length > 1 && (
                                <Text size="xs" c="dimmed">
                                  {product.variants.length} variants
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>{getStatusBadge(product.status)}</Table.Td>
                          <Table.Td>
                            <Text
                              size="sm"
                              fw={500}
                              dangerouslySetInnerHTML={{
                                __html: formatPrice(product.variants, 'INR'),
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{getInventoryCount(product.variants)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">{formatDate(product.createdAt)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs" justify="center">
                              <ActionIcon
                                variant="subtle"
                                color="blue"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleProductClick(product.id);
                                }}
                              >
                                <IconEye size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="gray" size="sm">
                                <IconEdit size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              )}

              {/* Page Pagination - Only show after initial sync completes */}
              {initialSyncComplete && products.length > 0 && (
                <Group justify="center" mt="xl" mb="md">
                  <PagePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={hookPageSize}
                    total={total}
                    onPageChange={goToPage}
                    onPageSizeChange={changePageSize}
                    isLoading={isLoading}
                    compact={isMobile}
                    showPageSizeSelector={true}
                  />
                </Group>
              )}
            </>
          )}
        </Paper>
      </Container>
    );
  };

  return (
    <ShopifyConnectionGuard
      title="Shopify Products"
      description="Connect your Shopify store to view and manage your products."
    >
      {renderContent()}
    </ShopifyConnectionGuard>
  );
};

export default EnhancedProductList;

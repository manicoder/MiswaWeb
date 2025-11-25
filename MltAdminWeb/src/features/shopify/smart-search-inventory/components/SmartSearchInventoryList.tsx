import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Group,
  Button,
  Text,
  Textarea,
  FileInput,
  Alert,
  Tabs,
  Table,
  Badge,
  Skeleton,
  ScrollArea,
  useMantineTheme,
  useMantineColorScheme,
} from '@mantine/core';
import {
  IconSearch,
  IconClearAll,
  IconUpload,
  IconInfoCircle,
  IconLoader2,
  IconX,
  IconFilter,
  IconCheck,
  IconAlertTriangle,
  IconX as IconXCircle,
  IconCurrencyRupee,
} from '@tabler/icons-react';

import { ShopifyService } from '../../../../services/shopifyService';
import type { ShopifyLocation, ProductInventory } from '../../../../types/shopify';
import SquareImage from '../../../../components/common/SquareImage';
import ExportButton from '../../../../components/common/ExportButton';
import type { ExportColumn } from '../../../../utils/exportUtils';
import { useCostFetching } from '../../../../contexts/CostFetchingContext';
import GlobalCostFetchingProgress from '../../../../components/common/GlobalCostFetchingProgress';

interface ProductVariant {
  variantId: string;
  sku?: string;
  barcode?: string;
  price: string;
  compareAtPrice?: string;
  available: number;
  inventoryItemId: string;
}

interface SearchResult {
  sku: string;
  status: 'found' | 'not-found';
  product?: ProductInventory;
  variant?: ProductVariant;
}

const SmartSearchInventoryList: React.FC = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';
  const { startCostFetching, isRunning } = useCostFetching();

  // Cost fetching handler
  const handleStartCostFetching = async () => {
    try {
      await startCostFetching();
    } catch (err) {
      console.error('Error starting cost fetching:', err);
    }
  };

  // Smart search states
  const [bulkSearchInput, setBulkSearchInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [smartSearchActive, setSmartSearchActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFoundSkus, setNotFoundSkus] = useState<string[]>([]);
  const [searchStats, setSearchStats] = useState<{
    totalSearched: number;
    found: number;
    notFound: number;
  }>({ totalSearched: 0, found: 0, notFound: 0 });
  const [allInventoryLoaded, setAllInventoryLoaded] = useState(false);
  const [skuSearchResults, setSkuSearchResults] = useState<Array<SearchResult>>([]);

  // Progress tracking states
  const [searchProgress, setSearchProgress] = useState<{
    step: string;
    percentage: number;
    isLoading: boolean;
  }>({ step: '', percentage: 0, isLoading: false });

  // Stock filter states
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'out-of-stock' | 'low-stock'>(
    'all',
  );

  // Location states
  const [locations, setLocations] = useState<ShopifyLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Multi-location search results
  const [searchResultsByLocation, setSearchResultsByLocation] = useState<
    Record<string, Array<SearchResult>>
  >({});

  // Load locations on component mount
  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await ShopifyService.getLocations();

      if (response.success && response.data) {
        const activeLocations = response.data.locations.filter((location) => location.isActive);

        setLocations(activeLocations);

        // Set first active location as default for display purposes only
        // This doesn't trigger any inventory loading for Smart Search
        if (activeLocations.length > 0 && !selectedLocationId) {
          setSelectedLocationId(activeLocations[0].id);
        }
      } else {
        setError(response.error || 'Failed to load locations');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load locations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedLocationId]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Skip auto-loading inventory for Smart Search component since it handles its own data loading
  // This prevents conflicts with the smart search functionality
  useEffect(() => {
    // Smart Search component doesn't need regular inventory loading
    // All inventory loading is handled by the search functions
  }, []);

  const processCsvFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line);

          if (lines.length === 0) {
            resolve([]);
            return;
          }

          // Check if first line has headers (contains "SKU")
          const firstLine = lines[0];
          const hasHeaders = firstLine.toLowerCase().includes('sku');

          let skus: string[] = [];

          if (hasHeaders) {
            // Parse CSV with headers
            const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());
            const skuColumnIndex = headers.findIndex((h) => h === 'sku' || h.includes('sku'));

            if (skuColumnIndex === -1) {
              // No SKU column found, treat all values as potential SKUs
              lines.forEach((line) => {
                const values = line
                  .split(',')
                  .map((v) => v.trim())
                  .filter((v) => v);
                skus.push(...values);
              });
            } else {
              // Use SKU column
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v) => v.trim());
                if (values[skuColumnIndex] && values[skuColumnIndex].trim()) {
                  skus.push(values[skuColumnIndex].trim());
                }
              }
            }
          } else {
            // No headers, treat as comma-separated values
            lines.forEach((line) => {
              const values = line
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v);
              skus.push(...values);
            });
          }

          // Remove duplicates and empty values
          skus = [...new Set(skus.filter((sku) => sku && sku.length > 0))];

          resolve(skus);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const handleBulkSearch = async () => {
    let terms: string[] = [];

    try {
      // Ensure locations are loaded first
      if (locations.length === 0) {
        setError('Please wait for locations to load before searching');
        return;
      }

      // Validate active locations
      const activeLocations = locations.filter((loc) => loc.isActive);
      if (activeLocations.length === 0) {
        setError('No active locations available for search');
        return;
      }

      if (csvFile) {
        terms = await processCsvFile(csvFile);
      } else if (bulkSearchInput.trim()) {
        terms = bulkSearchInput
          .split(',')
          .map((term) => term.trim())
          .filter((term) => term);
      }

      if (terms.length === 0) {
        setError('Please provide search terms via CSV file or comma-separated input');
        return;
      }

      // Validate search terms
      if (terms.length > 1000) {
        setError('Too many search terms. Please limit to 1000 SKUs per search');
        return;
      }

      // Check for duplicate terms
      const uniqueTerms = [...new Set(terms)];
      if (uniqueTerms.length !== terms.length) {
        terms = uniqueTerms;
      }

      // Clear any existing search results and state to ensure fresh start
      setSkuSearchResults([]);
      setSearchResultsByLocation({});
      setAllInventoryLoaded(false);
      setNotFoundSkus([]);
      setSearchStats({ totalSearched: 0, found: 0, notFound: 0 });
      setError(null);
      setStockFilter('all'); // Reset filter

      setSmartSearchActive(true);

      // Wait a moment to ensure state is cleared
      await new Promise((resolve) => setTimeout(resolve, 100));

      await searchAllLocations(terms);
    } catch (err: unknown) {
      const errorMessage = `Failed to process search terms: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMessage);
      setSearchProgress({ step: 'Search failed', percentage: 0, isLoading: false });
      setAllInventoryLoaded(true); // Ensure UI is not stuck in loading state
    }
  };

  const handleClearSmartSearch = () => {
    setSmartSearchActive(false);
    setBulkSearchInput('');
    setCsvFile(null);
    setError(null);
    setSkuSearchResults([]);
    setSearchResultsByLocation({});
    setAllInventoryLoaded(false);
    setNotFoundSkus([]);
    setSearchStats({ totalSearched: 0, found: 0, notFound: 0 });
    setSearchProgress({ step: '', percentage: 0, isLoading: false });
    setStockFilter('all'); // Reset stock filter
  };

  // New function to search across all locations with improved error handling
  const searchAllLocations = async (searchTerms: string[]) => {
    let processedLocations = 0;

    try {
      const activeLocations = locations.filter((loc) => loc.isActive);

      if (activeLocations.length === 0) {
        throw new Error('No active locations found');
      }

      // Validate search terms
      if (searchTerms.length === 0) {
        throw new Error('No search terms provided');
      }

      // Start progress tracking
      setSearchProgress({
        step: 'Initializing multi-location search...',
        percentage: 0,
        isLoading: true,
      });

      const resultsByLocation: Record<string, Array<SearchResult>> = {};

      const allFoundSkus = new Set<string>();
      const searchErrors: string[] = [];

      // Search each active location with enhanced error handling
      for (const location of activeLocations) {
        try {
          processedLocations++;
          const progressPercentage = Math.round((processedLocations / activeLocations.length) * 80); // Reserve 20% for final processing
          setSearchProgress({
            step: `Searching ${location.name}... (${processedLocations}/${activeLocations.length})`,
            percentage: progressPercentage,
            isLoading: true,
          });

          // Add timeout for individual location search
          const locationSearchPromise = searchSingleLocation(location.id, searchTerms);
          const timeoutPromise = new Promise<never>(
            (_, reject) =>
              setTimeout(
                () => reject(new Error(`Timeout searching location ${location.name}`)),
                120000,
              ), // 2 minute timeout
          );

          const locationResults = await Promise.race([locationSearchPromise, timeoutPromise]);
          resultsByLocation[location.id] = locationResults;

          console.log(`📊 Location ${location.name} results:`, {
            total: locationResults.length,
            found: locationResults.filter((r) => r.status === 'found').length,
            notFound: locationResults.filter((r) => r.status === 'not-found').length,
          });

          // Track found SKUs across all locations
          locationResults.forEach((result) => {
            if (result.status === 'found') {
              allFoundSkus.add(result.sku);
            }
          });
        } catch (error: unknown) {
          const errorMessage = `Location ${location.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          searchErrors.push(errorMessage);

          // Create empty results for this location to maintain consistency
          resultsByLocation[location.id] = searchTerms.map((sku) => ({
            sku,
            status: 'not-found' as const,
          }));
        }

        // Adaptive delay based on API performance
        const delay = searchErrors.length > 0 ? 500 : 300; // Longer delay if we've had errors
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Final processing
      setSearchProgress({ step: 'Finalizing results...', percentage: 90, isLoading: true });

      // Validate results before storing
      const validResults = Object.keys(resultsByLocation).length > 0;
      if (!validResults) {
        throw new Error('No valid results obtained from any location');
      }

      // Store results by location
      setSearchResultsByLocation(resultsByLocation);

      // Set default location to first location with results, or first active location
      const locationWithResults = activeLocations.find((loc) =>
        resultsByLocation[loc.id]?.some((r) => r.status === 'found'),
      );
      const defaultLocation = locationWithResults || activeLocations[0];

      if (defaultLocation && resultsByLocation[defaultLocation.id]) {
        setSelectedLocationId(defaultLocation.id);
        setSkuSearchResults(resultsByLocation[defaultLocation.id]);
      }

      // Calculate overall stats
      const totalFound = allFoundSkus.size;
      const totalNotFound = searchTerms.length - totalFound;
      const notFoundSkus = searchTerms.filter((sku) => !allFoundSkus.has(sku));

      setSearchStats({
        totalSearched: searchTerms.length,
        found: totalFound,
        notFound: totalNotFound,
      });
      setNotFoundSkus(notFoundSkus);

      // Complete the search
      const successMessage =
        searchErrors.length > 0
          ? `Multi-location search completed with ${searchErrors.length} location errors!`
          : 'Multi-location search completed successfully!';

      setSearchProgress({ step: successMessage, percentage: 100, isLoading: false });
      setAllInventoryLoaded(true);

      // Show errors if any, but don't fail the entire search
      if (searchErrors.length > 0) {
        setError(
          `Search completed but some locations had issues: ${searchErrors.slice(0, 2).join(', ')}${searchErrors.length > 2 ? ` and ${searchErrors.length - 2} more...` : ''}`,
        );
      }

      // Clear progress after a short delay
      setTimeout(() => {
        setSearchProgress({ step: '', percentage: 0, isLoading: false });
      }, 3000);
    } catch (error: unknown) {
      const detailedError = `Failed to perform multi-location search: ${error instanceof Error ? error.message : 'Unknown error'}. Processed ${processedLocations}/${locations.length} locations.`;
      setError(detailedError);
      setSearchProgress({ step: 'Search failed', percentage: 0, isLoading: false });
      setAllInventoryLoaded(true);
    }
  };

  // Helper function to search a single location with retry logic
  const searchSingleLocation = async (locationId: string, searchTerms: string[]) => {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        // Step 1: Load all SKUs from this location
        const allSkus = await loadAllSkusOnly(locationId);

        if (allSkus.length === 0) {
          return searchTerms.map((sku) => ({
            sku,
            status: 'not-found' as const,
          }));
        }

        // Step 2: Find matching SKUs
        const foundSkuMatches = findMatchingSKUs(searchTerms, allSkus);

        // Step 3: Load full product details for found SKUs
        const fullProductDetails =
          foundSkuMatches.length > 0
            ? await loadProductDetailsForFoundSKUs(locationId, foundSkuMatches)
            : [];

        // Step 4: Create final results for this location
        const locationResults = createFinalSkuResults(searchTerms, fullProductDetails);

        return locationResults;
      } catch (error: unknown) {
        attempt++;

        if (attempt > maxRetries) {
          throw new Error(
            `Failed after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        // Wait longer between retries
        const backoffDelay = attempt * 1000; // 1s, 2s delays

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected error in retry logic');
  };

  // Helper function to load all inventory and extract SKUs with improved error handling
  const loadAllSkusOnly = async (
    locationId: string,
  ): Promise<Array<{ sku: string; productId: string; variantId: string }>> => {
    const allSkus: Array<{ sku: string; productId: string; variantId: string }> = [];
    let cursor = '';
    let hasMore = true;
    let pageCount = 0;
    let consecutiveErrors = 0;
    const maxPages = 100; // Increased safety limit
    const maxConsecutiveErrors = 3;

    while (hasMore && pageCount < maxPages && consecutiveErrors < maxConsecutiveErrors) {
      try {
        pageCount++;

        // Add timeout for individual API calls
        const apiCallPromise = ShopifyService.getInventoryByLocation(locationId, {
          limit: 250,
          after: cursor || undefined,
        });

        const timeoutPromise = new Promise<never>(
          (_, reject) => setTimeout(() => reject(new Error('API call timeout')), 45000), // 45 second timeout per call
        );

        const response = await Promise.race([apiCallPromise, timeoutPromise]);

        if (response.success && response.data) {
          const inventory = response.data.inventory || [];

          // Reset consecutive errors on successful response
          consecutiveErrors = 0;

          inventory.forEach((product: ProductInventory) => {
            if (product.variants && Array.isArray(product.variants)) {
              product.variants.forEach((variant: ProductVariant) => {
                if (variant.sku && variant.sku.trim() !== '') {
                  allSkus.push({
                    sku: variant.sku.trim(),
                    productId: product.productId,
                    variantId: variant.variantId,
                  });
                }
              });
            }
          });

          hasMore = response.data.hasMore;
          if (hasMore && response.data.pageInfo?.endCursor) {
            cursor = response.data.pageInfo.endCursor;
          } else {
            hasMore = false;
          }

          // Progressive delay to avoid rate limiting
          const delay = Math.min(200 + pageCount * 50, 1000); // 200ms to 1s max
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          consecutiveErrors++;

          if (consecutiveErrors >= maxConsecutiveErrors) {
            break;
          }

          // Wait longer before retrying after error
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch {
        hasMore = false;
      }
    }

    if (consecutiveErrors >= maxConsecutiveErrors) {
      throw new Error(`Failed to load SKUs after ${consecutiveErrors} consecutive errors`);
    }

    if (pageCount >= maxPages) {
      console.warn(
        `Reached maximum page limit (${maxPages}) when loading SKUs. Results may be incomplete.`,
      );
    }

    return allSkus;
  };

  // Helper function to find matching SKUs
  const findMatchingSKUs = (
    searchSkus: string[],
    allSkus: Array<{ sku: string; productId: string; variantId: string }>,
  ): Array<{ sku: string; productId: string; variantId: string }> => {
    const matches: Array<{ sku: string; productId: string; variantId: string }> = [];

    searchSkus.forEach((searchSku) => {
      const searchSkuClean = searchSku.toString().toLowerCase().trim();

      const foundMatch = allSkus.find((skuData) => {
        const inventorySkuClean = skuData.sku.toString().toLowerCase().trim();
        const isMatch = inventorySkuClean === searchSkuClean;
        return isMatch;
      });

      if (foundMatch) {
        matches.push(foundMatch);
      } else {
        // Show similar SKUs for debugging (more flexible matching)
        // Commented out to avoid unused variable warning
        /*
        const similarSkus = allSkus
          .filter((s) => {
            const inventorySku = s.sku.toString().toLowerCase().trim();
            return inventorySku.includes(searchSkuClean) || searchSkuClean.includes(inventorySku);
          })
          .slice(0, 5)
          .map((s) => s.sku);
        // Similar SKUs are calculated but not used in this version
        */
      }
    });

    return matches;
  };

  // Helper function to get full product details for found SKUs from already loaded inventory
  const loadProductDetailsForFoundSKUs = async (
    locationId: string,
    foundSkus: Array<{ sku: string; productId: string; variantId: string }>,
  ): Promise<ProductInventory[]> => {
    if (foundSkus.length === 0) return [];

    // Since we already loaded all inventory to get SKUs, we can reuse that data
    // But we need to load it again to get full details (images, etc.) for just the found products
    const foundProducts: ProductInventory[] = [];
    const foundProductIds = new Set(foundSkus.map((s) => s.productId));

    // Load inventory again but filter to only found products
    let cursor = '';
    let hasMore = true;
    let pageCount = 0;

    while (hasMore && pageCount < 50) {
      try {
        pageCount++;

        const response = await ShopifyService.getInventoryByLocation(locationId, {
          limit: 250,
          after: cursor || undefined,
        });

        if (response.success && response.data) {
          const inventory = response.data.inventory || [];

          // Filter to only products that have matching SKUs
          const matchingProducts = inventory.filter((product: ProductInventory) =>
            foundProductIds.has(product.productId),
          );

          foundProducts.push(...matchingProducts);

          hasMore = response.data.hasMore;
          if (hasMore && response.data.pageInfo?.endCursor) {
            cursor = response.data.pageInfo.endCursor;
          } else {
            hasMore = false;
          }

          // If we've found all the products we need, we can stop early
          if (foundProducts.length >= foundProductIds.size) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch {
        hasMore = false;
      }
    }

    return foundProducts;
  };

  // Helper function to create final SKU results
  const createFinalSkuResults = (
    searchSkus: string[],
    productDetails: ProductInventory[],
  ): Array<SearchResult> => {
    const results: Array<SearchResult> = [];

    searchSkus.forEach((searchSku) => {
      let found = false;
      const searchSkuClean = searchSku.toString().toLowerCase().trim();

      for (const product of productDetails) {
        for (const variant of product.variants) {
          if (variant.sku) {
            const variantSkuClean = variant.sku.toString().toLowerCase().trim();
            if (variantSkuClean === searchSkuClean) {
              results.push({
                sku: searchSku,
                status: 'found',
                product,
                variant,
              });
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }

      if (!found) {
        results.push({
          sku: searchSku,
          status: 'not-found',
        });
      }
    });

    return results;
  };

  const getStatusBadge = (status: string | undefined) => {
    if (!status) {
      return (
        <Badge color="gray" variant="light">
          Unknown
        </Badge>
      );
    }

    const statusLower = status?.toLowerCase() || 'unknown';
    switch (statusLower) {
      case 'active':
        return (
          <Badge color="green" variant="light">
            Active
          </Badge>
        );
      case 'draft':
        return (
          <Badge color="yellow" variant="light">
            Draft
          </Badge>
        );
      case 'archived':
        return (
          <Badge color="gray" variant="light">
            Archived
          </Badge>
        );
      default:
        return (
          <Badge color="gray" variant="light">
            {status}
          </Badge>
        );
    }
  };

  const formatPrice = (price: string, currency: string = 'INR') => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return price;

    const currencySymbols: Record<string, string> = {
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${numericPrice.toLocaleString()}`;
  };

  // Helper function to determine stock status
  const getStockStatus = (available: number): 'in-stock' | 'out-of-stock' | 'low-stock' => {
    if (available === 0) return 'out-of-stock';
    if (available <= 5) return 'low-stock'; // Consider 5 or less as low stock
    return 'in-stock';
  };

  // Helper function to get stock badge
  const getStockBadge = (available: number) => {
    const status = getStockStatus(available);
    switch (status) {
      case 'in-stock':
        return (
          <Badge color="green" variant="light" leftSection={<IconCheck size="0.8rem" />}>
            In Stock
          </Badge>
        );
      case 'low-stock':
        return (
          <Badge color="orange" variant="light" leftSection={<IconAlertTriangle size="0.8rem" />}>
            Low Stock
          </Badge>
        );
      case 'out-of-stock':
        return (
          <Badge color="red" variant="light" leftSection={<IconXCircle size="0.8rem" />}>
            Out of Stock
          </Badge>
        );
      default:
        return (
          <Badge color="gray" variant="light">
            Unknown
          </Badge>
        );
    }
  };

  // Filter results based on stock status
  const getFilteredResults = () => {
    const currentResults =
      smartSearchActive && selectedLocationId && searchResultsByLocation[selectedLocationId]
        ? searchResultsByLocation[selectedLocationId]
        : skuSearchResults;

    if (stockFilter === 'all') return currentResults;

    return currentResults.filter((result) => {
      if (!result.variant || result.status !== 'found') return false;
      const stockStatus = getStockStatus(result.variant.available);
      return stockStatus === stockFilter;
    });
  };

  // Smart Search Inventory export configuration
  const smartSearchExportConfig = {
    columns: [
      {
        key: 'serialNumber',
        label: 'Sr.#',
        width: 8,
        formatter: (_: unknown, __: unknown, index: number) => (index + 1).toString(),
      },
      { key: 'sku', label: 'SKU', width: 20 },
      {
        key: 'status',
        label: 'Search Status',
        width: 15,
        formatter: (status: string) => (status === 'found' ? 'Found' : 'Not Found'),
      },
      {
        key: 'product.status',
        label: 'Product Status',
        width: 15,
        formatter: (status: string) => status || '-',
      },
      {
        key: 'product.title',
        label: 'Product Title',
        width: 30,
        formatter: (title: string) => title || '-',
      },
      {
        key: 'variant.compareAtPrice',
        label: 'MRP',
        width: 12,
        formatter: (price: string) => (price ? `₹${parseFloat(price).toFixed(2)}` : '-'),
      },
      {
        key: 'variant.available',
        label: 'Stock Quantity',
        width: 12,
        formatter: (available: number) => (available !== undefined ? available.toString() : '-'),
      },
      {
        key: 'variant.stockStatus',
        label: 'Stock Status',
        width: 15,
        formatter: (available: number) => {
          if (available === undefined) return '-';
          return getStockStatus(available).replace('-', ' ').toUpperCase();
        },
      },
    ] as ExportColumn<unknown>[],
    title: 'Smart Search Inventory Results',
    filename: 'smart_search_inventory',
  };

  if (loading) {
    return (
      <Container size="xl" py="md">
        <Stack gap="md">
          <Skeleton height={40} width="300px" />
          <Paper withBorder radius="md" p="md">
            <Skeleton height={200} />
          </Paper>
        </Stack>
      </Container>
    );
  }

  if (error && locations.length === 0) {
    return (
      <Container size="xl" py="md">
        <Alert icon={<IconInfoCircle size="1rem" />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header */}
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div style={{ flex: 1, minWidth: '250px' }}>
              <Title order={2} c={isDark ? 'blue.4' : 'blue.6'}>
                Smart Search Inventory
              </Title>
              <Text c="dimmed" size="sm">
                Bulk SKU search with intelligent matching and real-time progress tracking
              </Text>
              <GlobalCostFetchingProgress />
            </div>
            <Group>
              <Button
                leftSection={<IconCurrencyRupee size={16} />}
                onClick={handleStartCostFetching}
                disabled={isRunning}
                variant="light"
                color="green"
              >
                Fetch Product Costs
              </Button>
            </Group>
          </Group>
        </Stack>

        {error && (
          <Alert color="red" onClose={() => setError(null)} withCloseButton>
            {error}
          </Alert>
        )}

        {/* Search Input Section */}
        <Paper
          withBorder
          radius="lg"
          p="xl"
          style={{
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            borderColor: isDark ? theme.colors.dark[4] : theme.colors.gray[3],
            color: isDark ? 'white' : theme.colors.dark[7],
          }}
        >
          <Stack gap="lg">
            <Group>
              <IconSearch size="1.5rem" color={isDark ? 'white' : theme.colors.blue[6]} />
              <Title order={3} c={isDark ? 'white' : 'dark.7'}>
                Smart Bulk Search
              </Title>
            </Group>

            <Text size="sm" c={isDark ? 'white' : 'dark.6'} style={{ opacity: 0.9 }}>
              Upload CSV with SKU column or enter comma-separated SKUs for intelligent inventory
              matching
            </Text>

            <Stack gap="md">
              <Group align="flex-end" grow style={{ flexDirection: 'row' }}>
                <FileInput
                  label="Upload CSV File"
                  description="Supports SKU column headers"
                  placeholder="Choose your CSV file..."
                  value={csvFile}
                  onChange={setCsvFile}
                  accept=".csv,.txt"
                  leftSection={<IconUpload size="1rem" />}
                  clearable
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                      color: isDark ? 'white' : theme.colors.dark[7],
                      borderColor: isDark ? 'rgba(255,255,255,0.3)' : theme.colors.gray[4],
                      '&::placeholder': {
                        color: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.gray[6],
                      },
                    },
                    label: { color: isDark ? 'white' : theme.colors.dark[7], fontWeight: 600 },
                    description: { color: isDark ? 'rgba(255,255,255,0.8)' : theme.colors.dark[5] },
                  }}
                />

                <Text
                  size="sm"
                  fw={600}
                  c={isDark ? 'white' : 'dark.6'}
                  style={{
                    opacity: 0.8,
                    alignSelf: 'center',
                    minWidth: '30px',
                    textAlign: 'center',
                  }}
                >
                  OR
                </Text>

                <Textarea
                  label="Manual Input"
                  placeholder="SKU1, SKU2, BARCODE1..."
                  value={bulkSearchInput}
                  onChange={(e) => setBulkSearchInput(e.currentTarget.value)}
                  minRows={2}
                  maxRows={3}
                  style={{ flex: 1 }}
                  styles={{
                    input: {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'white',
                      color: isDark ? 'white' : theme.colors.dark[7],
                      borderColor: isDark ? 'rgba(255,255,255,0.3)' : theme.colors.gray[4],
                      '&::placeholder': {
                        color: isDark ? 'rgba(255,255,255,0.6)' : theme.colors.gray[6],
                      },
                    },
                    label: { color: isDark ? 'white' : theme.colors.dark[7], fontWeight: 600 },
                  }}
                />
              </Group>
            </Stack>

            <Group justify="center" gap="md" style={{ flexWrap: 'wrap' }}>
              <Button
                size="lg"
                leftSection={
                  searchProgress.isLoading ? (
                    <IconLoader2 className="animate-spin" size="1.2rem" />
                  ) : (
                    <IconSearch size="1.2rem" />
                  )
                }
                onClick={handleBulkSearch}
                disabled={
                  (!csvFile && !bulkSearchInput.trim()) ||
                  searchProgress.isLoading ||
                  loading ||
                  locations.length === 0
                }
                style={
                  isDark
                    ? {
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        border: '2px solid rgba(255,255,255,0.3)',
                        minWidth: '180px',
                      }
                    : {
                        backgroundColor: theme.colors.blue[6],
                        color: 'white',
                        border: `2px solid ${theme.colors.blue[5]}`,
                        minWidth: '180px',
                      }
                }
                loading={searchProgress.isLoading}
              >
                {loading
                  ? 'Loading locations...'
                  : searchProgress.isLoading
                    ? 'Searching...'
                    : locations.length === 0
                      ? 'No locations available'
                      : 'Start Smart Search'}
              </Button>

              {smartSearchActive && !searchProgress.isLoading && (
                <Button
                  size="lg"
                  variant="outline"
                  color="red"
                  leftSection={<IconClearAll size="1.2rem" />}
                  onClick={handleClearSmartSearch}
                  style={
                    isDark
                      ? {
                          borderColor: 'rgba(255,255,255,0.5)',
                          color: 'white',
                          minWidth: '140px',
                        }
                      : {
                          borderColor: theme.colors.red[5],
                          color: theme.colors.red[6],
                          minWidth: '140px',
                        }
                  }
                >
                  Clear Search
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* Progress Indicator */}
        {searchProgress.isLoading && (
          <Paper withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Text fw={600} c={isDark ? 'blue.4' : 'blue.6'} size="sm">
                  {searchProgress.step}
                </Text>
                <Text fw={600} c={isDark ? 'green.4' : 'green.6'} size="sm">
                  {searchProgress.percentage}%
                </Text>
              </Group>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: isDark ? theme.colors.dark[4] : theme.colors.gray[2],
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${searchProgress.percentage}%`,
                    height: '100%',
                    backgroundColor: isDark ? theme.colors.blue[4] : theme.colors.blue[6],
                    transition: 'width 0.3s ease',
                    borderRadius: '4px',
                  }}
                />
              </div>
            </Stack>
          </Paper>
        )}

        {/* Results Section */}
        {smartSearchActive && !searchProgress.isLoading && (
          <Paper withBorder radius="md" p="lg">
            <Stack gap="lg">
              {/* Results Summary */}
              <Stack gap="md">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Group gap="lg" style={{ flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <Text size="xl" fw={700} c={isDark ? 'blue.4' : 'blue.6'}>
                        {searchStats.totalSearched}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Total Searched
                      </Text>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <Text size="xl" fw={700} c={isDark ? 'green.4' : 'green.6'}>
                        {searchStats.found}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Found
                      </Text>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <Text size="xl" fw={700} c={isDark ? 'red.4' : 'red.6'}>
                        {searchStats.notFound}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Not Found
                      </Text>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <Text size="xl" fw={700} c={isDark ? 'orange.4' : 'orange.6'}>
                        {searchStats.totalSearched > 0
                          ? Math.round((searchStats.found / searchStats.totalSearched) * 100)
                          : 0}
                        %
                      </Text>
                      <Text size="xs" c="dimmed">
                        Match Rate
                      </Text>
                    </div>
                  </Group>

                  <ExportButton
                    data={getFilteredResults()}
                    exportConfig={{
                      ...smartSearchExportConfig,
                      subtitle: `${getFilteredResults().length} SKUs ${stockFilter !== 'all' ? `(${stockFilter.replace('-', ' ')} filter)` : ''} from ${locations.find((loc) => loc.id === selectedLocationId)?.name || 'Unknown Location'}`,
                    }}
                    disabled={skuSearchResults.length === 0}
                    size="sm"
                  />
                </Group>
              </Stack>

              {/* Not Found SKUs */}
              {notFoundSkus.length > 0 && (
                <Paper
                  withBorder
                  radius="md"
                  p="md"
                  style={{
                    borderColor: '#ef4444',
                    backgroundColor: 'var(--mantine-color-red-0)',
                  }}
                >
                  <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                      <IconX size="1rem" color="#ef4444" />
                      <Text fw={600} c="red">
                        Missing SKUs ({notFoundSkus.length})
                      </Text>
                    </Group>
                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      onClick={() => {
                        const skuList = notFoundSkus.join('\n');
                        navigator.clipboard.writeText(skuList);
                      }}
                    >
                      Copy List
                    </Button>
                  </Group>
                  <Paper
                    radius="sm"
                    p="xs"
                    style={{
                      maxHeight: '100px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--mantine-color-red-1)',
                      border: '1px solid #ef4444',
                    }}
                  >
                    <Text size="xs" ff="monospace" style={{ lineHeight: 1.4, opacity: 0.95 }}>
                      {notFoundSkus.slice(0, 50).join(', ')}
                      {notFoundSkus.length > 50 && ` ... and ${notFoundSkus.length - 50} more`}
                    </Text>
                  </Paper>
                </Paper>
              )}
            </Stack>
          </Paper>
        )}
        {/* Location Tabs and Results Table */}
        <Tabs
          value={selectedLocationId}
          onChange={(value) => {
            const newLocationId = value || '';
            setSelectedLocationId(newLocationId);

            // If we have search results for this location, update the display
            if (smartSearchActive && searchResultsByLocation[newLocationId]) {
              setSkuSearchResults(searchResultsByLocation[newLocationId]);
              setStockFilter('all'); // Reset filter when changing location
            }
          }}
        >
          <Tabs.List>
            {locations.map((location) => (
              <Tabs.Tab key={location.id} value={location.id}>
                {location.name}
              </Tabs.Tab>
            ))}
          </Tabs.List>

          {locations.map((location) => (
            <Tabs.Panel key={location.id} value={location.id} pt="lg">
              <Paper withBorder radius="md">
                {/* Smart Search Results Only */}
                {smartSearchActive && !searchProgress.isLoading ? (
                  // Smart Search SKU-based Results
                  !allInventoryLoaded ? (
                    <div style={{ padding: '2rem' }}>
                      <Text c="dimmed" ta="center">
                        Loading all inventory for smart search...
                      </Text>
                      <Text size="xs" c="dimmed" ta="center">
                        This may take a moment to load all products
                      </Text>
                    </div>
                  ) : skuSearchResults.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                      <Text c="dimmed">
                        No SKUs to search. Please upload a CSV or enter SKUs manually.
                      </Text>
                    </div>
                  ) : (
                    <Stack gap="md">
                      {/* Stock Filter Buttons */}
                      <Group gap="xs" style={{ flexWrap: 'wrap' }}>
                        <Text
                          size="sm"
                          fw={600}
                          c="dimmed"
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <IconFilter size="1rem" />
                          Filter by Stock:
                        </Text>
                        <Button
                          size="xs"
                          variant={stockFilter === 'all' ? 'filled' : 'light'}
                          color="blue"
                          onClick={() => setStockFilter('all')}
                        >
                          All (
                          {
                            (smartSearchActive &&
                            selectedLocationId &&
                            searchResultsByLocation[selectedLocationId]
                              ? searchResultsByLocation[selectedLocationId]
                              : skuSearchResults
                            ).length
                          }
                          )
                        </Button>
                        <Button
                          size="xs"
                          variant={stockFilter === 'in-stock' ? 'filled' : 'light'}
                          color="green"
                          leftSection={<IconCheck size="0.8rem" />}
                          onClick={() => setStockFilter('in-stock')}
                        >
                          In Stock (
                          {
                            (smartSearchActive &&
                            selectedLocationId &&
                            searchResultsByLocation[selectedLocationId]
                              ? searchResultsByLocation[selectedLocationId]
                              : skuSearchResults
                            ).filter(
                              (r) =>
                                r.variant &&
                                r.status === 'found' &&
                                getStockStatus(r.variant.available) === 'in-stock',
                            ).length
                          }
                          )
                        </Button>
                        <Button
                          size="xs"
                          variant={stockFilter === 'low-stock' ? 'filled' : 'light'}
                          color="orange"
                          leftSection={<IconAlertTriangle size="0.8rem" />}
                          onClick={() => setStockFilter('low-stock')}
                        >
                          Low Stock (
                          {
                            (smartSearchActive &&
                            selectedLocationId &&
                            searchResultsByLocation[selectedLocationId]
                              ? searchResultsByLocation[selectedLocationId]
                              : skuSearchResults
                            ).filter(
                              (r) =>
                                r.variant &&
                                r.status === 'found' &&
                                getStockStatus(r.variant.available) === 'low-stock',
                            ).length
                          }
                          )
                        </Button>
                        <Button
                          size="xs"
                          variant={stockFilter === 'out-of-stock' ? 'filled' : 'light'}
                          color="red"
                          leftSection={<IconXCircle size="0.8rem" />}
                          onClick={() => setStockFilter('out-of-stock')}
                        >
                          Out of Stock (
                          {
                            (smartSearchActive &&
                            selectedLocationId &&
                            searchResultsByLocation[selectedLocationId]
                              ? searchResultsByLocation[selectedLocationId]
                              : skuSearchResults
                            ).filter(
                              (r) =>
                                r.variant &&
                                r.status === 'found' &&
                                getStockStatus(r.variant.available) === 'out-of-stock',
                            ).length
                          }
                          )
                        </Button>
                      </Group>

                      <ScrollArea type="auto" style={{ width: '100%' }}>
                        <Table striped highlightOnHover withTableBorder>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th style={{ minWidth: '120px' }}>SKU</Table.Th>
                              <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                              <Table.Th style={{ minWidth: '90px' }}>Product Status</Table.Th>
                              <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
                              <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                              <Table.Th style={{ minWidth: '100px' }}>MRP</Table.Th>
                              <Table.Th style={{ minWidth: '70px' }}>Stock Qty</Table.Th>
                              <Table.Th style={{ minWidth: '110px' }}>Stock Status</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {getFilteredResults().map((result) => (
                              <Table.Tr
                                key={result.sku}
                                style={{
                                  borderLeft:
                                    result.status === 'found'
                                      ? '3px solid #22c55e'
                                      : result.status === 'not-found'
                                        ? '3px solid #ef4444'
                                        : '3px solid #f59e0b',
                                }}
                              >
                                <Table.Td>
                                  <Text size="sm" ff="monospace" fw={500}>
                                    {result.sku}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  {result.status === 'found' ? (
                                    <Badge color="green" variant="light">
                                      Found
                                    </Badge>
                                  ) : result.status === 'not-found' ? (
                                    <Badge color="red" variant="light">
                                      Not Found
                                    </Badge>
                                  ) : (
                                    <Badge color="yellow" variant="light">
                                      Loading...
                                    </Badge>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.product ? (
                                    getStatusBadge(result.product.status)
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.product ? (
                                    <SquareImage
                                      src={result.product.imageUrl}
                                      alt={result.product.imageAltText || result.product.title}
                                      fallbackIcon="package"
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: 40,
                                        height: 40,
                                        backgroundColor: '#f8f9fa',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <Text size="xs" c="dimmed">
                                        -
                                      </Text>
                                    </div>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.product ? (
                                    <Text fw={500}>{result.product.title}</Text>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.variant?.compareAtPrice ? (
                                    <Text size="sm" fw={500}>
                                      {formatPrice(result.variant.compareAtPrice)}
                                    </Text>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.variant ? (
                                    <Text size="sm" fw={500}>
                                      {result.variant.available}
                                    </Text>
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  {result.variant ? (
                                    getStockBadge(result.variant.available)
                                  ) : (
                                    <Text c="dimmed">-</Text>
                                  )}
                                </Table.Td>
                              </Table.Tr>
                            ))}
                          </Table.Tbody>
                        </Table>
                      </ScrollArea>
                    </Stack>
                  )
                ) : !smartSearchActive ? (
                  // Welcome message for Smart Search - No regular inventory shown
                  <Paper
                    p="xl"
                    radius="md"
                    withBorder
                    style={{ margin: '2rem', textAlign: 'center' }}
                  >
                    <Stack gap="lg" align="center">
                      <div style={{ fontSize: '3rem' }}>🔍</div>
                      <Text size="xl" fw={600} c="blue">
                        Smart Multi-Location Search
                      </Text>
                      <Text size="md" maw={500} ta="center" style={{ opacity: 0.8 }}>
                        Upload a CSV file or enter SKUs manually to search across all your store
                        locations. After searching, use the location tabs below to see stock levels
                        at each location.
                      </Text>
                      <Text size="sm" ta="center" style={{ opacity: 0.7 }}>
                        🌍 Search once, explore stock across all locations
                      </Text>
                    </Stack>
                  </Paper>
                ) : null}
              </Paper>
            </Tabs.Panel>
          ))}
        </Tabs>
      </Stack>
    </Container>
  );
};

export default SmartSearchInventoryList;

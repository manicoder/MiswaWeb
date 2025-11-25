import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Title,
  Paper,
  Stack,
  Table,
  Badge,
  Text,
  Alert,
  Group,
  Button,
  Skeleton,
  ScrollArea,
  TextInput,
  Select,
  ActionIcon,
  Box,
  Card,
  Grid,
  Center,
  Tabs,
  Textarea,
  FileInput,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconRefresh,
  IconSearch,
  IconClearAll,
  IconPackage,
  IconTrendingUp,
  IconTrendingDown,
  IconEqual,
  IconCloudDownload,
  IconCheck,
  IconUpload,
  IconFileText,
  IconListSearch,
  IconCurrencyRupee,
} from '@tabler/icons-react';
import { useShopifyConnection } from '../../../../hooks/useShopifyConnection';
import databaseInventoryService, {
  type InventoryItem,
  type InventoryParams,
  type DatabaseInventoryResponse,
} from '../../../../services/databaseInventoryService';
import { ShopifyService } from '../../../../services/shopifyService';
import type { ShopifyLocation } from '../../../../types/shopify';
import SquareImage from '../../../../components/common/SquareImage';
import ExportButton from '../../../../components/common/ExportButton';
import PagePagination from '../../../../components/common/PagePagination';
import { useCostFetching } from '../../../../contexts/CostFetchingContext';
import GlobalCostFetchingProgress from '../../../../components/common/GlobalCostFetchingProgress';

interface InventoryLevel {
  locationId: string;
  locationName: string;
  available: number;
}

const InventoryStatsCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ label, value, icon, color, onClick, isActive }) => (
  <Card
    shadow="sm"
    padding="md"
    radius="md"
    withBorder
    style={{
      cursor: onClick ? 'pointer' : 'default',
      borderColor: isActive ? `var(--mantine-color-${color}-6)` : undefined,
      backgroundColor: isActive ? `var(--mantine-color-${color}-0)` : undefined,
    }}
    onClick={onClick}
  >
    <Group justify="space-between">
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {label}
        </Text>
        <Text fw={700} size="xl">
          {value.toLocaleString()}
        </Text>
      </div>
      <Box c={color}>{icon}</Box>
    </Group>
  </Card>
);

const DatabaseBackedInventoryList: React.FC = () => {
  const { isConnected, isLoading: connectionLoading } = useShopifyConnection();
  const { startCostFetching, isRunning } = useCostFetching();

  // Cost fetching handler
  const handleStartCostFetching = async () => {
    try {
      await startCostFetching();
    } catch (err) {
      console.error('Error starting cost fetching:', err);
    }
  };

  // Inventory data state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  // Stats state - removed unused counts variable

  // Location state
  const [locations, setLocations] = useState<ShopifyLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [locationsLoading, setLocationsLoading] = useState(true);

  // Smart search state
  const [bulkSearchText, setBulkSearchText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvItemCount, setCsvItemCount] = useState<number>(0);
  const [csvData, setCsvData] = useState<string[]>([]);
  const [smartSearchResults, setSmartSearchResults] = useState<InventoryItem[]>([]);
  const [smartSearchLoading, setSmartSearchLoading] = useState(false);
  const [smartSearchError, setSmartSearchError] = useState<string | null>(null);
  // New state for tracking search results
  const [foundItems, setFoundItems] = useState<InventoryItem[]>([]);
  const [notFoundItems, setNotFoundItems] = useState<string[]>([]);
  const [searchedValues, setSearchedValues] = useState<string[]>([]);
  const [smartSearchResultsTab, setSmartSearchResultsTab] = useState<string>('summary');

  // Load locations on mount
  const loadLocations = useCallback(async () => {
    try {
      setLocationsLoading(true);

      const response = await ShopifyService.getLocations();

      if (response.success && response.data) {
        const activeLocations = response.data.locations.filter((location) => location.isActive);
        setLocations(activeLocations);
      } else {
        console.warn('Failed to load locations:', response.error);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load locations';
      console.warn('Failed to load locations:', errorMessage);
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const params: InventoryParams = {
        page: currentPage,
        limit: pageSize,
        method: 'window', // Use the most performant method
      };

      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter) params.status = statusFilter;
      if (inventoryFilter !== 'all') params.inventoryFilter = inventoryFilter;

      const response: DatabaseInventoryResponse =
        await databaseInventoryService.fetchInventory(params);

      if (response.success && response.data) {
        setInventory(response.data.inventory);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        const errorMessage = response.error || 'Failed to load inventory';
        setError(errorMessage);
        setInventory([]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(errorMessage);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, statusFilter, inventoryFilter]);

  useEffect(() => {
    if (isConnected) {
      loadLocations();
    }
  }, [isConnected, loadLocations]);

  useEffect(() => {
    if (isConnected) {
      loadInventory();
    }
  }, [isConnected, loadInventory]);

  const handleRefresh = () => {
    setError(null);
    setSuccessMessage(null);
    loadInventory();
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      // Sync products from Shopify API (this will update inventory data too)
      const syncResult = await ShopifyService.syncProducts(true); // forceRefresh = true

      if (syncResult.success) {
        // After successful sync, refresh the local data
        await loadInventory();

        // Show success message
        const message = syncResult.data
          ? `Successfully synced ${syncResult.data.synced} products from Shopify!`
          : 'Successfully synced products from Shopify!';

        setSuccessMessage(message);

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5001);
      } else {
        const errorMessage = syncResult.error || 'Failed to sync with Shopify';
        setError(errorMessage);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync with Shopify';
      setError(errorMessage);
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    // loadInventory will be triggered by useEffect
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setInventoryFilter('all');
    setActiveTab('all');
    setCurrentPage(1);
  };

  const handleInventoryFilterChange = (filter: string) => {
    setInventoryFilter(filter);
    setActiveTab(filter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  // Smart search handlers
  const handleBulkSearch = async () => {
    if (!bulkSearchText.trim() && !csvFile) {
      setSmartSearchError('Please enter SKU/Barcode/FNSKU values or upload a CSV file');
      return;
    }

    setSmartSearchLoading(true);
    setSmartSearchError(null);

    try {
      let searchValues: string[] = [];

      if (bulkSearchText.trim()) {
        // Parse bulk text - split by newlines, commas, or spaces and clean up
        searchValues = bulkSearchText
          .split(/[\n,\s]+/)
          .map((val) => val.trim())
          .filter((val) => val.length > 0);
      }

      if (csvFile && csvData.length > 0) {
        // Use already parsed CSV data
        searchValues = [...searchValues, ...csvData];
      }

      // Remove duplicates
      searchValues = [...new Set(searchValues)];

      if (searchValues.length === 0) {
        setSmartSearchError('No valid SKU/Barcode/FNSKU values found');
        return;
      }

      // Store the searched values for tracking
      setSearchedValues(searchValues);

      // Perform exact match search and separate found/not found
      const results = await performExactSearchWithTracking(searchValues);
      setFoundItems(results.found);
      setNotFoundItems(results.notFound);
      // Keep backward compatibility
      setSmartSearchResults(results.found);
      // Show summary tab after search
      setSmartSearchResultsTab('summary');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to perform smart search';
      setSmartSearchError(errorMessage);
    } finally {
      setSmartSearchLoading(false);
    }
  };

  const parseCsvFile = (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());

          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          const values: string[] = [];

          // Check if first line is header and find relevant columns
          const firstLine = lines[0].toLowerCase();
          const hasHeader =
            firstLine.includes('sku') ||
            firstLine.includes('barcode') ||
            firstLine.includes('fnsku');

          if (hasHeader) {
            // Parse with headers - look for specific columns
            const headers = lines[0]
              .split(',')
              .map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

            // Find relevant column indices
            const skuIndex = headers.findIndex((h) => h.includes('sku') && !h.includes('fnsku'));
            const barcodeIndex = headers.findIndex((h) => h.includes('barcode'));
            const fnskuIndex = headers.findIndex((h) => h.includes('fnsku'));

            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map((col) => col.trim().replace(/['"]/g, ''));

              // Add SKU if found
              if (skuIndex !== -1 && cols[skuIndex] && cols[skuIndex].length > 0) {
                values.push(cols[skuIndex]);
              }

              // Add Barcode if found
              if (barcodeIndex !== -1 && cols[barcodeIndex] && cols[barcodeIndex].length > 0) {
                values.push(cols[barcodeIndex]);
              }

              // Add FNSKU (treat as barcode) if found
              if (fnskuIndex !== -1 && cols[fnskuIndex] && cols[fnskuIndex].length > 0) {
                values.push(cols[fnskuIndex]);
              }
            }
          } else {
            // No headers - treat all non-empty columns as potential SKU/Barcode values
            for (let i = 0; i < lines.length; i++) {
              const cols = lines[i].split(',').map((col) => col.trim().replace(/['"]/g, ''));
              cols.forEach((col) => {
                if (col && col.length > 0) {
                  values.push(col);
                }
              });
            }
          }

          resolve(values);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  };

  const performExactSearchWithTracking = async (
    searchValues: string[],
  ): Promise<{
    found: InventoryItem[];
    notFound: string[];
  }> => {
    // Get all inventory without pagination for exact matching
    const params: InventoryParams = {
      page: 1,
      limit: 9999, // Get all items
      method: 'window',
    };

    const response: DatabaseInventoryResponse =
      await databaseInventoryService.fetchInventory(params);

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch inventory for search');
    }

    const allInventory = response.data.inventory;
    const foundSearchValues = new Set<string>();

    // Filter for exact matches and track which values were found
    const matchedItems = allInventory.filter((item) => {
      const hasMatch = item.variants.some((variant) => {
        const skuMatch = variant.sku && searchValues.includes(variant.sku);
        const barcodeMatch = variant.barcode && searchValues.includes(variant.barcode);

        if (skuMatch && variant.sku) foundSearchValues.add(variant.sku);
        if (barcodeMatch && variant.barcode) foundSearchValues.add(variant.barcode);

        return skuMatch || barcodeMatch;
      });
      return hasMatch;
    });

    // Find values that were not found
    const notFoundValues = searchValues.filter((value) => !foundSearchValues.has(value));

    return {
      found: matchedItems,
      notFound: notFoundValues,
    };
  };

  const handleSmartSearchClear = () => {
    setBulkSearchText('');
    setCsvFile(null);
    setCsvItemCount(0);
    setCsvData([]);
    setSmartSearchResults([]);
    setSmartSearchError(null);
    // Clear new state variables
    setFoundItems([]);
    setNotFoundItems([]);
    setSearchedValues([]);
    setSmartSearchResultsTab('summary');
  };

  const handleCsvFileChange = async (file: File | null) => {
    setCsvFile(file);
    setCsvItemCount(0);
    setCsvData([]);

    if (file) {
      try {
        // Parse CSV immediately to get count and store data
        const csvValues = await parseCsvFile(file);
        setCsvItemCount(csvValues.length);
        setCsvData(csvValues);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to read CSV';
        console.error('Error parsing CSV:', errorMessage);
        setSmartSearchError(`Error reading CSV: ${errorMessage}`);
        setCsvFile(null);
        setCsvItemCount(0);
        setCsvData([]);
      }
    }
  };

  const handleLocationTabChange = (value: string | null) => {
    if (value) {
      setSelectedLocationId(value);
      setError(null);
      setSmartSearchError(null);
    }
  };

  // Simple function to filter inventory by selected location
  const getLocationSpecificInventory = (inventory: InventoryItem[], locationId: string) => {
    if (locationId === 'all') {
      console.log('all inventory', inventory);
      return inventory; // Show all inventory
    }

    // Check if any inventory has inventoryLevels data
    const hasInventoryLevels = inventory.some((item) =>
      item.variants.some(
        (variant) => variant.inventoryLevels && variant.inventoryLevels.length > 0,
      ),
    );

    if (!hasInventoryLevels) {
      console.warn('⚠️ No inventoryLevels data found in inventory. Cannot filter by location.');
      return []; // Return empty if no location data
    }

    // Filter inventory to only show items that have stock in the selected location
    const filtered = inventory
      .map((item) => ({
        ...item,
        variants: item.variants.map((variant) => {
          // Find inventory level for this location
          const locationInventory = variant.inventoryLevels?.find(
            (il: InventoryLevel) => il.locationId === locationId,
          );
          return {
            ...variant,
            // Update available count to show location-specific inventory
            available: locationInventory?.available || 0,
          };
        }),
      }))
      .filter((item) =>
        // Only include products that have at least one variant with stock in this location
        item.variants.some((variant) => variant.available > 0),
      );

    return filtered;
  };

  // Transform inventory data for table display, filtered by selected location
  const inventoryRows = useMemo(() => {
    // Filter inventory by selected location first
    const filteredInventory = getLocationSpecificInventory(inventory, selectedLocationId);

    return filteredInventory.flatMap((item) =>
      item.variants.map((variant) => ({
        productId: item.productId,
        title: item.title,
        status: item.status,
        imageUrl: item.imageUrl,
        imageAltText: item.imageAltText,
        variantId: variant.variantId,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        available: variant.available,
        inventoryItemId: variant.inventoryItemId,
      })),
    );
  }, [inventory, selectedLocationId]);

  // Calculate statistics from the currently filtered inventory rows
  const filteredCounts = useMemo(() => {
    const all = inventoryRows.length;
    const inStock = inventoryRows.filter((row) => row.available > 0).length;
    const outOfStock = inventoryRows.filter((row) => row.available === 0).length;
    const lowStock = inventoryRows.filter((row) => row.available > 0 && row.available <= 10).length;

    return {
      all,
      inStock,
      outOfStock,
      lowStock,
    };
  }, [inventoryRows]);

  const getStockBadgeColor = (available: number) => {
    if (available === 0) return 'red';
    if (available <= 10) return 'yellow';
    return 'green';
  };

  const getStockBadgeText = (available: number) => {
    if (available === 0) return 'Out of Stock';
    if (available <= 10) return 'Low Stock';
    return 'In Stock';
  };

  if (connectionLoading) {
    return (
      <Container size="xl">
        <Skeleton height={200} />
      </Container>
    );
  }

  if (!isConnected) {
    return (
      <Container size="xl">
        <Alert icon={<IconInfoCircle size={16} />} title="Store Connection Required" color="blue">
          Please connect your Shopify store to view inventory data.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between">
          <div>
            <Title order={2}>Database-Backed Inventory</Title>
            <GlobalCostFetchingProgress />
            <Text c="dimmed" size="sm">
              {selectedLocationId === 'smart'
                ? 'Smart Search: Bulk SKU/Barcode/FNSKU lookup with exact matching'
                : selectedLocationId !== 'all'
                  ? `Location-filtered inventory • Total: ${inventoryRows.length.toLocaleString()} items (${
                      locations.find((l) => l.id === selectedLocationId)?.name ||
                      'Selected Location'
                    })`
                  : `All locations inventory • Total: ${inventoryRows.length.toLocaleString()} items${
                      searchQuery || statusFilter || inventoryFilter !== 'all' ? ' (filtered)' : ''
                    }`}
              {selectedLocationId !== 'smart' && pageSize >= 9999
                ? ' (Showing All)'
                : selectedLocationId !== 'smart'
                  ? ` (Page ${currentPage} of ${totalPages})`
                  : ''}
              <br />
              <Text component="span" size="xs" c="dimmed">
                {selectedLocationId === 'smart'
                  ? 'Upload CSV with SKU/Barcode/FNSKU columns or enter values separated by commas, spaces, or new lines'
                  : selectedLocationId !== 'all'
                    ? 'Filtered by location (client-side) • Refresh: Updates from local DB • Sync: Fetches fresh data from Shopify API'
                    : 'Refresh: Updates from local DB • Sync: Fetches fresh data from Shopify API'}
              </Text>
            </Text>
          </div>
          <Group>
            {selectedLocationId !== 'smart' && (
              <>
                <Button
                  leftSection={<IconCurrencyRupee size={16} />}
                  onClick={handleStartCostFetching}
                  disabled={isRunning || syncing}
                  variant="light"
                  color="green"
                >
                  Fetch Product Costs
                </Button>
                <ExportButton
                  data={inventoryRows}
                  exportConfig={{
                    filename:
                      selectedLocationId === 'all'
                        ? 'inventory-export-all-locations'
                        : `inventory-export-${
                            locations
                              .find((l) => l.id === selectedLocationId)
                              ?.name.toLowerCase()
                              .replace(/\s+/g, '-') || 'location'
                          }`,
                    title: 'Inventory Export',
                    subtitle:
                      selectedLocationId === 'all'
                        ? 'Database-backed inventory (all locations)'
                        : `Location-specific inventory: ${
                            locations.find((l) => l.id === selectedLocationId)?.name ||
                            'Selected Location'
                          }`,
                    columns: [
                      { key: 'title', label: 'Product Title' },
                      { key: 'sku', label: 'SKU' },
                      { key: 'barcode', label: 'Barcode' },
                      { key: 'available', label: 'Available' },
                      { key: 'price', label: 'Price' },
                      { key: 'status', label: 'Status' },
                    ],
                  }}
                />
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRefresh}
                  loading={loading}
                  disabled={syncing}
                  variant="subtle"
                >
                  Refresh
                </Button>
                <Button
                  leftSection={<IconCloudDownload size={16} />}
                  onClick={handleSync}
                  loading={syncing}
                  disabled={loading}
                  color="green"
                >
                  {syncing ? 'Syncing...' : 'Sync from Shopify'}
                </Button>
              </>
            )}
            {selectedLocationId === 'smart' && (
              <ExportButton
                data={smartSearchResults.flatMap((item) =>
                  item.variants.map((variant) => ({
                    productId: item.productId,
                    title: item.title,
                    status: item.status,
                    imageUrl: item.imageUrl,
                    imageAltText: item.imageAltText,
                    variantId: variant.variantId,
                    sku: variant.sku,
                    barcode: variant.barcode,
                    price: variant.price,
                    compareAtPrice: variant.compareAtPrice,
                    available: variant.available,
                    inventoryItemId: variant.inventoryItemId,
                  })),
                )}
                exportConfig={{
                  filename: 'smart-search-results',
                  title: 'Smart Search Results',
                  subtitle: `Found ${smartSearchResults.length} products matching your search criteria`,
                  columns: [
                    { key: 'title', label: 'Product Title' },
                    { key: 'sku', label: 'SKU' },
                    { key: 'barcode', label: 'Barcode' },
                    { key: 'available', label: 'Available' },
                    { key: 'price', label: 'Price' },
                    { key: 'status', label: 'Status' },
                  ],
                }}
              />
            )}
          </Group>
        </Group>

        {/* Location Tabs */}
        <Tabs value={selectedLocationId} onChange={handleLocationTabChange}>
          <Tabs.List>
            <Tabs.Tab value="all">All Locations</Tabs.Tab>
            {locationsLoading
              ? // Show skeleton tabs while loading locations
                Array.from({ length: 2 }).map((_, index) => (
                  <Tabs.Tab key={index} value={`skeleton-${index}`} disabled>
                    <Skeleton height={14} width={120} />
                  </Tabs.Tab>
                ))
              : locations.map((location) => (
                  <Tabs.Tab key={location.id} value={location.id}>
                    {location.name}
                    {location.address?.city && ` (${location.address.city})`}
                  </Tabs.Tab>
                ))}
            <Tabs.Tab value="smart" leftSection={<IconListSearch size={16} />}>
              Smart Search
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={selectedLocationId} pt="md">
            {/* Location Info - Only show for actual locations, not for Smart Search */}
            {selectedLocationId !== 'all' && selectedLocationId !== 'smart' && (
              <Paper p="md" withBorder mb="md">
                <Group justify="space-between" align="center">
                  <div>
                    {(() => {
                      const location = locations.find((l) => l.id === selectedLocationId);
                      return location ? (
                        <div>
                          <Text fw={600} size="lg">
                            {location.name}
                          </Text>
                          {location.address && (
                            <Text size="sm" c="dimmed">
                              {[
                                location.address.address1,
                                location.address.city,
                                location.address.province,
                                location.address.country,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </Text>
                          )}
                        </div>
                      ) : (
                        <Text>Loading location...</Text>
                      );
                    })()}
                  </div>
                  <Alert
                    color="blue"
                    style={{
                      border: 'none',
                      backgroundColor: 'transparent',
                      padding: '8px 0',
                    }}
                  >
                    <Text size="xs" c="dimmed">
                      ✅ Filtered inventory for this location (client-side filtering - instant!)
                    </Text>
                  </Alert>
                </Group>
              </Paper>
            )}

            {/* Stats Cards - Only show for regular inventory, not for Smart Search */}
            {selectedLocationId !== 'smart' && (
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <InventoryStatsCard
                    label="Total Items"
                    value={filteredCounts.all}
                    icon={<IconPackage size={24} />}
                    color="blue"
                    onClick={() => handleInventoryFilterChange('all')}
                    isActive={activeTab === 'all'}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <InventoryStatsCard
                    label="In Stock"
                    value={filteredCounts.inStock}
                    icon={<IconTrendingUp size={24} />}
                    color="green"
                    onClick={() => handleInventoryFilterChange('in_stock')}
                    isActive={activeTab === 'in_stock'}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <InventoryStatsCard
                    label="Out of Stock"
                    value={filteredCounts.outOfStock}
                    icon={<IconTrendingDown size={24} />}
                    color="red"
                    onClick={() => handleInventoryFilterChange('out_of_stock')}
                    isActive={activeTab === 'out_of_stock'}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                  <InventoryStatsCard
                    label="Low Stock"
                    value={filteredCounts.lowStock}
                    icon={<IconEqual size={24} />}
                    color="yellow"
                    onClick={() => handleInventoryFilterChange('low_stock')}
                    isActive={activeTab === 'low_stock'}
                  />
                </Grid.Col>
              </Grid>
            )}

            {/* Regular Inventory Interface - Only show for regular inventory, not for Smart Search */}
            {selectedLocationId !== 'smart' && (
              <>
                {/* Filters */}
                <Paper p="md" withBorder>
                  <Stack gap="md">
                    <Group>
                      <TextInput
                        placeholder="Search by product title, SKU, or barcode..."
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        style={{ flex: 1 }}
                      />
                      <Select
                        placeholder="Status"
                        data={[
                          { value: '', label: 'All Status' },
                          { value: 'active', label: 'Active' },
                          { value: 'draft', label: 'Draft' },
                          { value: 'archived', label: 'Archived' },
                        ]}
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value || '')}
                        clearable
                      />

                      <Button onClick={handleSearch} leftSection={<IconSearch size={16} />}>
                        Search
                      </Button>
                      <ActionIcon onClick={handleClearFilters} variant="light">
                        <IconClearAll size={16} />
                      </ActionIcon>
                    </Group>
                  </Stack>
                </Paper>

                {/* Success Alert */}
                {successMessage && (
                  <Alert icon={<IconCheck size={16} />} title="Success" color="green">
                    {successMessage}
                  </Alert>
                )}

                {/* Error Alert */}
                {error && (
                  <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
                    {error}
                  </Alert>
                )}

                {/* Regular Inventory Table and Pagination */}
                <Paper withBorder>
                  <ScrollArea>
                    <Table stickyHeader>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
                          <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                          <Table.Th style={{ minWidth: '120px' }}>SKU/Barcode</Table.Th>
                          <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
                          <Table.Th style={{ minWidth: '100px' }}>Stock</Table.Th>
                          <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {loading ? (
                          Array.from({ length: 10 }).map((_, index) => (
                            <Table.Tr key={index}>
                              <Table.Td>
                                <Skeleton height={60} width={60} />
                              </Table.Td>
                              <Table.Td>
                                <Skeleton height={40} />
                              </Table.Td>
                              <Table.Td>
                                <Skeleton height={40} />
                              </Table.Td>
                              <Table.Td>
                                <Skeleton height={40} />
                              </Table.Td>
                              <Table.Td>
                                <Skeleton height={40} />
                              </Table.Td>
                              <Table.Td>
                                <Skeleton height={40} />
                              </Table.Td>
                            </Table.Tr>
                          ))
                        ) : inventoryRows.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Center>
                                <Text c="dimmed">No inventory items found</Text>
                              </Center>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          inventoryRows.map((row, index) => (
                            <Table.Tr
                              key={`${row.variantId}-${index}`}
                              style={{
                                backgroundColor:
                                  index % 2 === 0 ? 'transparent' : 'var(--mantine-color-gray-0)',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <Table.Td>
                                <SquareImage
                                  src={row.imageUrl}
                                  alt={row.imageAltText || row.title}
                                  fallbackIcon="package"
                                />
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm" fw={500} lineClamp={2}>
                                    {row.title}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    ID: {row.productId}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm" ff="monospace">
                                    {row.sku || 'No SKU'}
                                  </Text>
                                  <Text
                                    size="xs"
                                    c={row.barcode ? 'dark' : 'dimmed'}
                                    ff="monospace"
                                    fw={row.barcode ? 700 : 400}
                                    style={{
                                      backgroundColor: row.barcode
                                        ? 'var(--mantine-color-yellow-1)'
                                        : 'transparent',
                                      padding: row.barcode ? '1px 3px' : '0',
                                      borderRadius: '3px',
                                      border: row.barcode
                                        ? '1px solid var(--mantine-color-yellow-3)'
                                        : 'none',
                                      display: row.barcode ? 'inline-block' : 'block',
                                      width: row.barcode ? 'fit-content' : 'auto',
                                    }}
                                  >
                                    {row.barcode || 'No Barcode'}
                                  </Text>
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Stack gap={2}>
                                  <Text size="sm" fw={500}>
                                    ₹{row.price}
                                  </Text>
                                  {row.compareAtPrice && (
                                    <Text size="xs" c="dimmed" td="line-through">
                                      ₹{row.compareAtPrice}
                                    </Text>
                                  )}
                                </Stack>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <Badge
                                    color={getStockBadgeColor(row.available)}
                                    variant="filled"
                                    size="sm"
                                  >
                                    {row.available}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {getStockBadgeText(row.available)}
                                  </Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  variant="light"
                                  color={
                                    row.status === 'active'
                                      ? 'green'
                                      : row.status === 'draft'
                                        ? 'yellow'
                                        : 'gray'
                                  }
                                >
                                  {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Paper>

                {/* Pagination */}
                <PagePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={handlePageSizeChange}
                  isLoading={loading}
                  showPageSizeSelector={true}
                  pageSizeOptions={[
                    { value: 25, label: '25' },
                    { value: 50, label: '50' },
                    { value: 100, label: '100' },
                    { value: 200, label: '200' },
                    { value: 9999, label: 'All' },
                  ]}
                />
              </>
            )}
          </Tabs.Panel>

          {/* Smart Search Tab */}
          <Tabs.Panel value="smart" pt="md">
            <Stack gap="lg">
              {/* Smart Search Input */}
              <Paper p="md" withBorder>
                <Stack gap="md">
                  <Text fw={500} size="sm">
                    Bulk SKU/Barcode/FNSKU Search
                  </Text>

                  <Group align="flex-start" gap="md">
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">
                        Enter SKU/Barcode/FNSKU values (one per line, or separated by
                        commas/spaces):
                      </Text>
                      <Textarea
                        placeholder="SKU001&#10;BARCODE123&#10;B0A12BCDEF&#10;SKU002, BARCODE456"
                        minRows={4}
                        maxRows={8}
                        value={bulkSearchText}
                        onChange={(e) => setBulkSearchText(e.target.value)}
                      />
                    </Stack>

                    <Stack gap="xs" style={{ minWidth: '250px' }}>
                      <Text size="xs" c="dimmed">
                        Or upload CSV file with SKU/Barcode/FNSKU columns:
                      </Text>
                      <FileInput
                        placeholder="Upload CSV file (SKU/Barcode/FNSKU)"
                        accept=".csv"
                        leftSection={<IconUpload size={16} />}
                        value={csvFile}
                        onChange={handleCsvFileChange}
                      />
                      {csvFile && (
                        <Text size="xs" c="green">
                          ✓ {csvFile.name} uploaded ({csvItemCount} items found)
                        </Text>
                      )}
                    </Stack>
                  </Group>

                  <Group justify="space-between">
                    <Group>
                      <Button
                        leftSection={<IconSearch size={16} />}
                        onClick={handleBulkSearch}
                        loading={smartSearchLoading}
                      >
                        {smartSearchLoading ? 'Searching...' : 'Search'}
                      </Button>
                      <Button
                        variant="light"
                        leftSection={<IconClearAll size={16} />}
                        onClick={handleSmartSearchClear}
                      >
                        Clear
                      </Button>
                    </Group>

                    {(bulkSearchText.trim() || csvItemCount > 0) && (
                      <Text size="xs" c="dimmed">
                        {(() => {
                          const textCount = bulkSearchText.trim()
                            ? bulkSearchText
                                .split(/[\n,\s]+/)
                                .filter((val) => val.trim().length > 0).length
                            : 0;
                          const totalCount = textCount + csvItemCount;

                          if (textCount > 0 && csvItemCount > 0) {
                            return `${totalCount} items ready (${textCount} from text + ${csvItemCount} from CSV)`;
                          } else if (textCount > 0) {
                            return `${textCount} items from text input`;
                          } else {
                            return `${csvItemCount} items from CSV`;
                          }
                        })()}
                      </Text>
                    )}
                  </Group>
                </Stack>
              </Paper>

              {/* Smart Search Error */}
              {smartSearchError && (
                <Alert icon={<IconInfoCircle size={16} />} title="Search Error" color="red">
                  {smartSearchError}
                </Alert>
              )}

              {/* Smart Search Results */}
              {searchedValues.length > 0 && !smartSearchLoading && (
                <Tabs
                  value={smartSearchResultsTab}
                  onChange={(value) => setSmartSearchResultsTab(value || 'summary')}
                >
                  <Tabs.List>
                    <Tabs.Tab value="summary" leftSection={<IconInfoCircle size={16} />}>
                      Summary
                    </Tabs.Tab>
                    {foundItems.length > 0 && (
                      <Tabs.Tab value="found" leftSection={<IconCheck size={16} />}>
                        Found ({foundItems.length})
                      </Tabs.Tab>
                    )}
                    {notFoundItems.length > 0 && (
                      <Tabs.Tab value="not-found" leftSection={<IconFileText size={16} />} c="red">
                        Not Found ({notFoundItems.length})
                      </Tabs.Tab>
                    )}
                  </Tabs.List>

                  {/* Summary Tab */}
                  <Tabs.Panel value="summary" pt="md">
                    <Stack gap="md">
                      <Paper p="lg" withBorder>
                        <Stack gap="md">
                          <Text fw={600} size="lg">
                            Search Results Summary
                          </Text>
                          <Grid>
                            <Grid.Col span={4}>
                              <Card
                                withBorder
                                padding="md"
                                style={{
                                  backgroundColor: 'var(--mantine-color-blue-0)',
                                }}
                              >
                                <Group justify="space-between">
                                  <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                      Total Searched
                                    </Text>
                                    <Text fw={700} size="xl">
                                      {searchedValues.length}
                                    </Text>
                                  </div>
                                  <IconListSearch size={32} color="var(--mantine-color-blue-6)" />
                                </Group>
                              </Card>
                            </Grid.Col>
                            <Grid.Col span={4}>
                              <Card
                                withBorder
                                padding="md"
                                style={{
                                  backgroundColor: 'var(--mantine-color-green-0)',
                                }}
                              >
                                <Group justify="space-between">
                                  <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                      Found Products
                                    </Text>
                                    <Text fw={700} size="xl" c="green">
                                      {foundItems.length}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      ({foundItems.flatMap((item) => item.variants).length}{' '}
                                      variants)
                                    </Text>
                                  </div>
                                  <IconCheck size={32} color="var(--mantine-color-green-6)" />
                                </Group>
                              </Card>
                            </Grid.Col>
                            <Grid.Col span={4}>
                              <Card
                                withBorder
                                padding="md"
                                style={{
                                  backgroundColor: 'var(--mantine-color-red-0)',
                                }}
                              >
                                <Group justify="space-between">
                                  <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                      Not Found
                                    </Text>
                                    <Text fw={700} size="xl" c="red">
                                      {notFoundItems.length}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      Missing items
                                    </Text>
                                  </div>
                                  <IconFileText size={32} color="var(--mantine-color-red-6)" />
                                </Group>
                              </Card>
                            </Grid.Col>
                          </Grid>

                          {/* Success Rate */}
                          <Paper
                            p="md"
                            withBorder
                            style={{
                              backgroundColor: 'var(--mantine-color-gray-0)',
                            }}
                          >
                            <Group justify="space-between">
                              <Text fw={500}>Search Success Rate</Text>
                              <Badge
                                size="lg"
                                color={
                                  foundItems.length / searchedValues.length > 0.7
                                    ? 'green'
                                    : foundItems.length / searchedValues.length > 0.4
                                      ? 'yellow'
                                      : 'red'
                                }
                              >
                                {Math.round((foundItems.length / searchedValues.length) * 100)}%
                              </Badge>
                            </Group>
                          </Paper>

                          {/* Quick Actions */}
                          <Group>
                            {foundItems.length > 0 && (
                              <Button
                                variant="light"
                                color="green"
                                onClick={() => setSmartSearchResultsTab('found')}
                              >
                                View Found Items ({foundItems.length})
                              </Button>
                            )}
                            {notFoundItems.length > 0 && (
                              <Button
                                variant="light"
                                color="red"
                                onClick={() => setSmartSearchResultsTab('not-found')}
                              >
                                View Missing Items ({notFoundItems.length})
                              </Button>
                            )}
                          </Group>
                        </Stack>
                      </Paper>
                    </Stack>
                  </Tabs.Panel>

                  {/* Found Items Tab */}
                  <Tabs.Panel value="found" pt="md">
                    {foundItems.length > 0 && (
                      <Stack gap="md">
                        <Paper
                          p="sm"
                          withBorder
                          style={{
                            backgroundColor: 'var(--mantine-color-green-0)',
                          }}
                        >
                          <Group justify="space-between">
                            <Text fw={500} c="green" size="lg">
                              📦 Found Items ({foundItems.length} products,{' '}
                              {foundItems.flatMap((item) => item.variants).length} variants)
                            </Text>
                            <ExportButton
                              data={foundItems.flatMap((item) =>
                                item.variants.map((variant) => ({
                                  ...item,
                                  ...variant,
                                  variantTitle: item.title,
                                  variantId: variant.variantId,
                                  variantSku: variant.sku,
                                  variantBarcode: variant.barcode,
                                  variantPrice: variant.price,
                                  variantAvailable: variant.available,
                                })),
                              )}
                              exportConfig={{
                                filename: 'smart-search-found-items',
                                title: 'Smart Search - Found Items',
                                columns: [
                                  {
                                    key: 'variantTitle',
                                    label: 'Product',
                                    width: 30,
                                  },
                                  {
                                    key: 'variantSku',
                                    label: 'SKU',
                                    width: 15,
                                  },
                                  {
                                    key: 'variantBarcode',
                                    label: 'Barcode',
                                    width: 15,
                                  },
                                  {
                                    key: 'variantPrice',
                                    label: 'Price (₹)',
                                    width: 12,
                                    formatter: (value) => `₹${value}`,
                                  },
                                  {
                                    key: 'variantAvailable',
                                    label: 'Stock',
                                    width: 10,
                                  },
                                  { key: 'status', label: 'Status', width: 12 },
                                ],
                              }}
                              size="sm"
                            />
                          </Group>
                        </Paper>

                        <Paper withBorder>
                          <ScrollArea>
                            <Table stickyHeader>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th style={{ minWidth: '60px' }}>Image</Table.Th>
                                  <Table.Th style={{ minWidth: '200px' }}>Product</Table.Th>
                                  <Table.Th style={{ minWidth: '120px' }}>SKU/Barcode</Table.Th>
                                  <Table.Th style={{ minWidth: '120px' }}>Price</Table.Th>
                                  <Table.Th style={{ minWidth: '100px' }}>Stock</Table.Th>
                                  <Table.Th style={{ minWidth: '100px' }}>Status</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {foundItems.flatMap((item, itemIndex) =>
                                  item.variants.map((variant, variantIndex) => {
                                    const globalIndex = itemIndex + variantIndex;
                                    return (
                                      <Table.Tr
                                        key={`found-${item.productId}-${variant.variantId}`}
                                        style={{
                                          backgroundColor:
                                            globalIndex % 2 === 0
                                              ? 'transparent'
                                              : 'var(--mantine-color-gray-0)',
                                          transition: 'all 0.2s ease',
                                        }}
                                      >
                                        <Table.Td>
                                          <SquareImage
                                            src={item.imageUrl}
                                            alt={item.imageAltText || item.title}
                                            fallbackIcon="package"
                                          />
                                        </Table.Td>
                                        <Table.Td>
                                          <Stack gap={2}>
                                            <Text size="sm" fw={500} lineClamp={2}>
                                              {item.title}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                              ID: {item.productId}
                                            </Text>
                                          </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                          <Stack gap={2}>
                                            <Text
                                              size="sm"
                                              ff="monospace"
                                              fw={
                                                searchedValues.includes(variant.sku || '')
                                                  ? 700
                                                  : 400
                                              }
                                              c={
                                                searchedValues.includes(variant.sku || '')
                                                  ? 'green'
                                                  : 'dark'
                                              }
                                            >
                                              {variant.sku || 'No SKU'}
                                            </Text>
                                            <Text
                                              size="xs"
                                              c={variant.barcode ? 'dark' : 'dimmed'}
                                              ff="monospace"
                                              fw={
                                                variant.barcode &&
                                                searchedValues.includes(variant.barcode)
                                                  ? 700
                                                  : variant.barcode
                                                    ? 700
                                                    : 400
                                              }
                                              style={{
                                                backgroundColor: variant.barcode
                                                  ? searchedValues.includes(variant.barcode)
                                                    ? 'var(--mantine-color-green-1)'
                                                    : 'var(--mantine-color-yellow-1)'
                                                  : 'transparent',
                                                padding: variant.barcode ? '1px 3px' : '0',
                                                borderRadius: '3px',
                                                border: variant.barcode
                                                  ? searchedValues.includes(variant.barcode)
                                                    ? '1px solid var(--mantine-color-green-3)'
                                                    : '1px solid var(--mantine-color-yellow-3)'
                                                  : 'none',
                                                display: variant.barcode ? 'inline-block' : 'block',
                                                width: variant.barcode ? 'fit-content' : 'auto',
                                                color:
                                                  variant.barcode &&
                                                  searchedValues.includes(variant.barcode)
                                                    ? 'var(--mantine-color-green-8)'
                                                    : 'var(--mantine-color-dark-6)',
                                              }}
                                            >
                                              {variant.barcode || 'No Barcode'}
                                            </Text>
                                          </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                          <Stack gap={2}>
                                            <Text size="sm" fw={500}>
                                              ₹{variant.price}
                                            </Text>
                                            {variant.compareAtPrice && (
                                              <Text size="xs" c="dimmed" td="line-through">
                                                ₹{variant.compareAtPrice}
                                              </Text>
                                            )}
                                          </Stack>
                                        </Table.Td>
                                        <Table.Td>
                                          <Group gap="xs">
                                            <Badge
                                              color={getStockBadgeColor(variant.available)}
                                              variant="filled"
                                              size="sm"
                                            >
                                              {variant.available}
                                            </Badge>
                                            <Text size="xs" c="dimmed">
                                              {getStockBadgeText(variant.available)}
                                            </Text>
                                          </Group>
                                        </Table.Td>
                                        <Table.Td>
                                          <Badge
                                            variant="light"
                                            color={
                                              item.status === 'active'
                                                ? 'green'
                                                : item.status === 'draft'
                                                  ? 'yellow'
                                                  : 'gray'
                                            }
                                          >
                                            {item.status.charAt(0).toUpperCase() +
                                              item.status.slice(1)}
                                          </Badge>
                                        </Table.Td>
                                      </Table.Tr>
                                    );
                                  }),
                                )}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea>
                        </Paper>
                      </Stack>
                    )}
                  </Tabs.Panel>

                  {/* Not Found Items Tab */}
                  <Tabs.Panel value="not-found" pt="md">
                    {notFoundItems.length > 0 && (
                      <Stack gap="md">
                        <Paper
                          p="sm"
                          withBorder
                          style={{
                            backgroundColor: 'var(--mantine-color-red-0)',
                          }}
                        >
                          <Group justify="space-between">
                            <Text fw={500} c="red" size="lg">
                              ❌ Not Found Items ({notFoundItems.length} missing)
                            </Text>
                            <Button
                              size="sm"
                              variant="light"
                              color="red"
                              leftSection={<IconCloudDownload size={16} />}
                              onClick={() => {
                                const csvContent = `SKU/Barcode/FNSKU\n${notFoundItems.join('\n')}`;
                                const blob = new Blob([csvContent], {
                                  type: 'text/csv',
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `not-found-items-${
                                  new Date().toISOString().split('T')[0]
                                }.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              Download List
                            </Button>
                          </Group>
                        </Paper>

                        <Paper withBorder>
                          <ScrollArea>
                            <Table stickyHeader>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>#</Table.Th>
                                  <Table.Th>SKU/Barcode/FNSKU</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                  <Table.Th>Type</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {notFoundItems.map((item, index) => (
                                  <Table.Tr
                                    key={`not-found-${index}`}
                                    style={{
                                      backgroundColor:
                                        index % 2 === 0
                                          ? 'var(--mantine-color-red-0)'
                                          : 'var(--mantine-color-red-1)',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    <Table.Td>
                                      <Text size="sm" c="dimmed">
                                        {index + 1}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm" ff="monospace" fw={500} c="red">
                                        {item}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Badge color="red" variant="filled" size="sm">
                                        Not Found
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="xs" c="dimmed">
                                        {item.startsWith('B0')
                                          ? 'FNSKU'
                                          : item.length > 12
                                            ? 'Barcode'
                                            : 'SKU'}
                                      </Text>
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea>
                        </Paper>
                      </Stack>
                    )}
                  </Tabs.Panel>
                </Tabs>
              )}

              {/* No Results Message */}
              {!smartSearchLoading &&
                searchedValues.length === 0 &&
                (bulkSearchText.trim() || csvFile) && (
                  <Paper p="xl" withBorder>
                    <Center>
                      <Stack align="center" gap="md">
                        <IconFileText size={48} color="var(--mantine-color-gray-5)" />
                        <Text size="lg" fw={500} c="dimmed">
                          No search performed
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          Please click the "Search" button to find products.
                        </Text>
                      </Stack>
                    </Center>
                  </Paper>
                )}

              {/* All Items Not Found Message */}
              {!smartSearchLoading &&
                searchedValues.length > 0 &&
                foundItems.length === 0 &&
                notFoundItems.length > 0 && (
                  <Paper p="xl" withBorder>
                    <Center>
                      <Stack align="center" gap="md">
                        <IconFileText size={48} color="var(--mantine-color-red-5)" />
                        <Text size="lg" fw={500} c="red">
                          No matches found
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          None of the provided SKU/Barcode/FNSKU values were found in your
                          inventory.
                          <br />
                          Check the "Not Found Items" section above for details.
                        </Text>
                      </Stack>
                    </Center>
                  </Paper>
                )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default DatabaseBackedInventoryList;
